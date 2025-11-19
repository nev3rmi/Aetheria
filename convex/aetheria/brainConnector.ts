/**
 * Aetheria Brain Connector
 *
 * Connects agents to external "brains" (n8n/Dify workflows) for decision-making.
 * Implements the Agent Brain API specification defined in BRAIN_API_SPEC.md
 */

import { ActionCtx } from '../_generated/server';
import { Doc, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';

/**
 * Agent Brain Request
 * Sent to external brain for decision-making
 */
export interface AgentBrainRequest {
  // Agent Identity
  agentId: string;
  agentName: string;
  worldId: string;

  // Agent State
  currentState: 'idle' | 'thinking' | 'working' | 'blocked';
  position?: { x: number; y: number };
  currentActivity?: {
    type: 'conversation' | 'movement' | 'task_execution' | 'waiting';
    description: string;
    startedAt: number;
  };

  // Current Task (if any)
  currentTask?: {
    id: string;
    title: string;
    description: string;
    labels: string[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'claimed' | 'in_progress' | 'blocked';
    url: string;
    claimedAt?: number;
    metadata?: {
      projectKey: string;
      issueType: string;
      reporter?: string;
    };
  };

  // Memory & Context
  recentMemories: Array<{
    description: string;
    importance: number;
    timestamp: number;
    type: 'conversation' | 'reflection' | 'observation';
  }>;

  conversationHistory?: Array<{
    from: string;
    content: string;
    timestamp: number;
  }>;

  inboxMessages: Array<{
    fromAgent: string;
    messageType: 'direct' | 'broadcast' | 'delegation' | 'help_request';
    content: string;
    threadId?: string;
    relatedTaskId?: string;
    sentAt: number;
    isUrgent: boolean;
  }>;

  // Capabilities
  availableTools: string[];

  lastToolExecution?: {
    tool: string;
    input: any;
    output: any;
    success: boolean;
    error?: string;
    duration: number;
    executedAt: number;
  };

  // Environment
  nearbyAgents: Array<{
    agentId: string;
    agentName: string;
    distance: number;
    currentActivity: string;
  }>;

  availableTasks: Array<{
    id: string;
    title: string;
    labels: string[];
    priority: string;
  }>;

  // Timestamp
  timestamp: number;

  // Call Context
  callType: 'decision' | 'tool_result' | 'task_evaluation' | 'conversation';

  evaluationContext?: {
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    requiredSkills: string[];
  };
}

/**
 * Agent Brain Response
 * Returned by external brain with decision
 */
export interface AgentBrainResponse {
  thought: string;
  action: {
    type: 'use_tool' | 'update_task' | 'send_message' | 'delegate' |
          'claim_task' | 'wait' | 'move' | 'start_conversation';
    params: any;
  };
  permittedTools?: string[];
  metadata?: {
    confidence?: number;
    priority?: 'low' | 'normal' | 'high';
    estimatedDuration?: number;
  };
}

/**
 * Abstract Brain Interface
 */
export interface AgentBrain {
  call(request: AgentBrainRequest): Promise<AgentBrainResponse>;
  getConfig(): Promise<{ webhookUrl: string; permittedTools: string[] }>;
}

/**
 * n8n Brain Implementation
 */
export class N8nBrain implements AgentBrain {
  constructor(
    private webhookUrl: string,
    private apiKey?: string,
    private timeout: number = 10000
  ) {}

  async call(request: AgentBrainRequest): Promise<AgentBrainResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Aetheria-Agent-Id': request.agentId,
      'X-Aetheria-World-Id': request.worldId,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    // Format request for n8n AI Agent (expects chatInput and sessionID)
    const n8nPayload = {
      chatInput: JSON.stringify(request, null, 2),
      sessionID: request.agentId,
    };

    console.log(`[N8n Brain] Calling webhook for agent ${request.agentName}`, {
      url: this.webhookUrl,
      callType: request.callType,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n webhook returned ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();

      // Parse n8n streaming response format
      // Response is newline-delimited JSON like:
      // {"type":"item","content":"Hello"}
      // {"type":"item","content":" world"}
      const lines = responseText.trim().split('\n');
      let fullText = '';

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.type === 'item' && item.content) {
            fullText += item.content;
          }
        } catch (e) {
          // Skip invalid JSON lines
          continue;
        }
      }

      console.log(`[N8n Brain] Received AI response (${fullText.length} chars)`);

      // Convert AI text response into structured action
      const brainResponse = this.parseAIResponse(fullText, request);

      console.log(`[N8n Brain] Converted to action:`, {
        thought: brainResponse.thought.substring(0, 100),
        actionType: brainResponse.action.type,
      });

      return brainResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`n8n webhook timeout after ${this.timeout}ms`);
      }

      console.error(`[N8n Brain] Call failed:`, error);
      throw error;
    }
  }

  /**
   * Parse AI text response and convert to structured action
   */
  private parseAIResponse(aiText: string, request: AgentBrainRequest): AgentBrainResponse {
    // Extract thought (first 200 chars of AI response)
    const thought = aiText.substring(0, 200).trim();

    // Determine action based on context and AI response
    let action: AgentBrainResponse['action'];

    // Check if there are tasks available
    if (request.availableTasks && request.availableTasks.length > 0 && !request.currentTask) {
      // Agent has no task but tasks are available - suggest claiming one
      action = {
        type: 'claim_task',
        params: {
          taskId: request.availableTasks[0].id,
          reason: 'Starting work on available task',
        },
      };
    }
    // Check if there are unread messages
    else if (request.inboxMessages && request.inboxMessages.length > 0) {
      const message = request.inboxMessages[0];
      action = {
        type: 'send_message',
        params: {
          toAgent: message.fromAgent,
          messageType: 'direct',
          content: thought.substring(0, 150),
          threadId: message.threadId,
        },
      };
    }
    // Check if working on a task
    else if (request.currentTask) {
      action = {
        type: 'update_task',
        params: {
          taskId: request.currentTask.id,
          status: 'in_progress',
          comment: thought.substring(0, 100),
        },
      };
    }
    // Default: wait and think
    else {
      action = {
        type: 'wait',
        params: {
          reason: 'Analyzing situation and planning next steps',
        },
      };
    }

    return {
      thought: aiText,
      action,
    };
  }

  async getConfig() {
    return {
      webhookUrl: this.webhookUrl,
      permittedTools: [], // TODO: Fetch from n8n if needed
    };
  }
}

/**
 * Dify Brain Implementation
 */
export class DifyBrain implements AgentBrain {
  constructor(
    private webhookUrl: string,
    private apiKey?: string,
    private timeout: number = 10000
  ) {}

  async call(request: AgentBrainRequest): Promise<AgentBrainResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Aetheria-Agent-Id': request.agentId,
      'X-Aetheria-World-Id': request.worldId,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    console.log(`[Dify Brain] Calling webhook for agent ${request.agentName}`, {
      url: this.webhookUrl,
      callType: request.callType,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dify webhook returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Dify might return data in a different format, adapt as needed
      // For now, assume it follows the same structure

      if (!data.thought || !data.action) {
        throw new Error('Invalid brain response: missing thought or action');
      }

      console.log(`[Dify Brain] Received decision from ${request.agentName}:`, {
        thought: data.thought,
        actionType: data.action.type,
      });

      return data as AgentBrainResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Dify webhook timeout after ${this.timeout}ms`);
      }

      console.error(`[Dify Brain] Call failed:`, error);
      throw error;
    }
  }

  async getConfig() {
    return {
      webhookUrl: this.webhookUrl,
      permittedTools: [],
    };
  }
}

/**
 * Custom Brain Implementation
 * For any OpenAI-compatible or custom webhook
 */
export class CustomBrain implements AgentBrain {
  constructor(
    private webhookUrl: string,
    private apiKey?: string,
    private timeout: number = 10000
  ) {}

  async call(request: AgentBrainRequest): Promise<AgentBrainResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Aetheria-Agent-Id': request.agentId,
      'X-Aetheria-World-Id': request.worldId,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    console.log(`[Custom Brain] Calling webhook for agent ${request.agentName}`, {
      url: this.webhookUrl,
      callType: request.callType,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Custom webhook returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.thought || !data.action) {
        throw new Error('Invalid brain response: missing thought or action');
      }

      console.log(`[Custom Brain] Received decision from ${request.agentName}:`, {
        thought: data.thought,
        actionType: data.action.type,
      });

      return data as AgentBrainResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Custom webhook timeout after ${this.timeout}ms`);
      }

      console.error(`[Custom Brain] Call failed:`, error);
      throw error;
    }
  }

  async getConfig() {
    return {
      webhookUrl: this.webhookUrl,
      permittedTools: [],
    };
  }
}

/**
 * Create a brain instance based on configuration
 */
export function createBrain(config: {
  brainType: 'n8n' | 'dify' | 'custom';
  webhookUrl: string;
  apiKey?: string;
  timeout?: number;
}): AgentBrain {
  const { brainType, webhookUrl, apiKey, timeout } = config;

  switch (brainType) {
    case 'n8n':
      return new N8nBrain(webhookUrl, apiKey, timeout);
    case 'dify':
      return new DifyBrain(webhookUrl, apiKey, timeout);
    case 'custom':
      return new CustomBrain(webhookUrl, apiKey, timeout);
    default:
      throw new Error(`Unknown brain type: ${brainType}`);
  }
}

/**
 * Call an agent's external brain
 * This is the main entry point for brain communication
 */
export async function callAgentBrain(
  ctx: ActionCtx,
  agentId: Id<'worlds'>, // TODO: This should be Id for agent player
  request: AgentBrainRequest
): Promise<AgentBrainResponse> {
  const startTime = Date.now();

  try {
    // Load agent brain configuration
    const worldStatus = await ctx.runQuery(internal.aetheria.brainConnector.getWorldStatus);

    if (!worldStatus) {
      throw new Error('No world found');
    }

    const brainConfig = await ctx.runQuery(internal.aetheria.brainConnector.getAgentBrain, {
      agentId: request.agentId,
      worldId: worldStatus.worldId,
    });

    if (!brainConfig) {
      throw new Error(`No brain configuration found for agent: ${request.agentId}`);
    }

    if (!brainConfig.isActive) {
      throw new Error(`Brain is disabled for agent: ${request.agentId}`);
    }

    // Create brain instance
    const brain = createBrain({
      brainType: brainConfig.brainType,
      webhookUrl: brainConfig.webhookUrl,
      apiKey: brainConfig.apiKey || undefined,
      timeout: brainConfig.configuration?.timeout || 10000,
    });

    // Call brain
    console.log(`[Brain Connector] Calling brain for agent ${request.agentName}`);
    const response = await brain.call(request);

    const duration = Date.now() - startTime;

    // Log successful call
    await ctx.runMutation(internal.aetheria.brainConnector.logBrainCall, {
      worldId: worldStatus.worldId,
      agentId: request.agentId,
      brainType: brainConfig.brainType,
      callType: request.callType,
      request,
      response,
      duration,
      success: true,
    });

    console.log(`[Brain Connector] Brain call successful (${duration}ms)`, {
      agent: request.agentName,
      thought: response.thought.substring(0, 100),
      actionType: response.action.type,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[Brain Connector] Brain call failed:`, error);

    // Log failed call
    const worldStatus = await ctx.runQuery(internal.aetheria.brainConnector.getWorldStatus);
    if (worldStatus) {
      await ctx.runMutation(internal.aetheria.brainConnector.logBrainCall, {
        worldId: worldStatus.worldId,
        agentId: request.agentId,
        brainType: 'unknown',
        callType: request.callType,
        request,
        response: undefined,
        duration,
        success: false,
        error: errorMessage,
      });
    }

    throw error;
  }
}

// ============================================================================
// INTERNAL CONVEX HELPERS
// ============================================================================

import { internalQuery, internalMutation } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Get world status (internal query)
 */
export const getWorldStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('worldStatus').first();
  },
});

/**
 * Get agent brain configuration (internal query)
 */
export const getAgentBrain = internalQuery({
  args: {
    agentId: v.string(),
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const brain = await ctx.db
      .query('agentBrains')
      .withIndex('by_agent', (q) => q.eq('worldId', args.worldId).eq('agentId', args.agentId))
      .first();

    return brain;
  },
});

/**
 * Log brain call (internal mutation)
 */
export const logBrainCall = internalMutation({
  args: {
    worldId: v.id('worlds'),
    agentId: v.string(),
    brainType: v.string(),
    callType: v.string(),
    request: v.any(),
    response: v.optional(v.any()),
    duration: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('brainCallLog', {
      worldId: args.worldId,
      agentId: args.agentId as any, // TODO: Fix type
      brainType: args.brainType,
      callType: args.callType as any,
      request: args.request,
      response: args.response,
      duration: args.duration,
      success: args.success,
      error: args.error,
      timestamp: Date.now(),
    });
  },
});

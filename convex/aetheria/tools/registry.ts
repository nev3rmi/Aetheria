/**
 * Aetheria Tool Registry
 *
 * Central registry of tools that agents can use to interact with the world.
 * Each tool is a function that can be invoked by agents based on their permissions.
 */

import { ActionCtx } from '../../_generated/server';
import { v, Infer } from 'convex/values';

/**
 * Tool Input/Output Interface
 */
export interface Tool<TInput = any, TOutput = any> {
  name: string;
  displayName: string;
  description: string;
  category: 'search' | 'code' | 'file' | 'communication' | 'jira' | 'other';
  inputSchema: any; // Convex validator
  requiresAuth: boolean;
  handler: (ctx: ActionCtx, input: TInput) => Promise<TOutput>;
}

/**
 * Tool Execution Result
 */
export interface ToolResult<T = any> {
  success: boolean;
  output?: T;
  error?: string;
  duration: number;
  timestamp: number;
}

/**
 * Registry of all available tools
 */
export const TOOL_REGISTRY: Map<string, Tool> = new Map();

/**
 * Register a tool in the global registry
 */
export function registerTool<TInput, TOutput>(tool: Tool<TInput, TOutput>) {
  TOOL_REGISTRY.set(tool.name, tool);
  console.log(`[Tool Registry] Registered tool: ${tool.name}`);
}

/**
 * Execute a tool by name
 *
 * @param ctx - Action context
 * @param toolName - Name of the tool to execute
 * @param input - Tool input parameters
 * @param agentId - Agent executing the tool (for permission checks)
 * @returns Tool execution result
 */
export async function executeTool(
  ctx: ActionCtx,
  toolName: string,
  input: any,
  agentId: string
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Check if tool exists
    const tool = TOOL_REGISTRY.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
        duration: Date.now() - startTime,
        timestamp: startTime,
      };
    }

    // TODO: Check agent permissions
    // const hasPermission = await checkToolPermission(ctx, agentId, toolName);
    // if (!hasPermission) {
    //   return {
    //     success: false,
    //     error: `Agent does not have permission to use tool: ${toolName}`,
    //     duration: Date.now() - startTime,
    //     timestamp: startTime,
    //   };
    // }

    // Validate input
    // TODO: Add proper input validation using tool.inputSchema

    // Execute tool
    console.log(`[Tool Registry] Executing tool: ${toolName}`, { agentId, input });
    const output = await tool.handler(ctx, input);

    const duration = Date.now() - startTime;

    console.log(`[Tool Registry] Tool executed successfully: ${toolName} (${duration}ms)`);

    return {
      success: true,
      output,
      duration,
      timestamp: startTime,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[Tool Registry] Tool execution failed: ${toolName}`, error);

    return {
      success: false,
      error: errorMessage,
      duration,
      timestamp: startTime,
    };
  }
}

/**
 * Get list of all registered tools
 */
export function listTools(): Array<{
  name: string;
  displayName: string;
  description: string;
  category: string;
}> {
  return Array.from(TOOL_REGISTRY.values()).map(tool => ({
    name: tool.name,
    displayName: tool.displayName,
    description: tool.description,
    category: tool.category,
  }));
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: Tool['category']): Tool[] {
  return Array.from(TOOL_REGISTRY.values()).filter(tool => tool.category === category);
}

/**
 * Check if a tool exists
 */
export function toolExists(toolName: string): boolean {
  return TOOL_REGISTRY.has(toolName);
}

// ============================================================================
// CORE TOOLS
// ============================================================================

/**
 * Web Search Tool
 * Uses Tavily API for web search
 */
registerTool({
  name: 'web_search',
  displayName: 'Web Search',
  description: 'Search the web for information using Tavily API',
  category: 'search',
  requiresAuth: true,
  inputSchema: v.object({
    query: v.string(),
    maxResults: v.optional(v.number()),
  }),
  handler: async (ctx, input: { query: string; maxResults?: number }) => {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new Error('TAVILY_API_KEY not configured. Set environment variable to use web search.');
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: input.query,
        max_results: input.maxResults || 5,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      answer: data.answer,
      results: data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })),
    };
  },
});

/**
 * Calculator Tool
 * Evaluates mathematical expressions safely
 */
registerTool({
  name: 'calculator',
  displayName: 'Calculator',
  description: 'Evaluate mathematical expressions',
  category: 'other',
  requiresAuth: false,
  inputSchema: v.object({
    expression: v.string(),
  }),
  handler: async (ctx, input: { expression: string }) => {
    // Simple safe evaluation using Function (limited to math operations)
    // In production, use a proper math library like mathjs

    // Sanitize input - only allow numbers, operators, and parentheses
    const sanitized = input.expression.replace(/[^0-9+\-*/().]/g, '');

    if (sanitized !== input.expression) {
      throw new Error('Invalid expression: contains disallowed characters');
    }

    try {
      // Create a safe evaluation context
      const result = Function(`"use strict"; return (${sanitized})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid result');
      }

      return {
        expression: input.expression,
        result,
      };
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  },
});

/**
 * Text Analysis Tool
 * Analyzes text for various properties
 */
registerTool({
  name: 'text_analysis',
  displayName: 'Text Analysis',
  description: 'Analyze text for word count, character count, and other properties',
  category: 'other',
  requiresAuth: false,
  inputSchema: v.object({
    text: v.string(),
  }),
  handler: async (ctx, input: { text: string }) => {
    const text = input.text;

    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = text.length;
    const characterCountNoSpaces = text.replace(/\s/g, '').length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphCount = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;

    return {
      wordCount,
      characterCount,
      characterCountNoSpaces,
      sentenceCount,
      paragraphCount,
      averageWordLength: characterCountNoSpaces / wordCount || 0,
      averageWordsPerSentence: wordCount / sentenceCount || 0,
    };
  },
});

/**
 * JSON Parser Tool
 * Safely parses and validates JSON
 */
registerTool({
  name: 'json_parser',
  displayName: 'JSON Parser',
  description: 'Parse and validate JSON strings',
  category: 'other',
  requiresAuth: false,
  inputSchema: v.object({
    jsonString: v.string(),
  }),
  handler: async (ctx, input: { jsonString: string }) => {
    try {
      const parsed = JSON.parse(input.jsonString);

      return {
        valid: true,
        parsed,
        type: Array.isArray(parsed) ? 'array' : typeof parsed,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  },
});

/**
 * URL Fetcher Tool
 * Fetches content from a URL
 */
registerTool({
  name: 'url_fetch',
  displayName: 'URL Fetcher',
  description: 'Fetch content from a URL',
  category: 'search',
  requiresAuth: false,
  inputSchema: v.object({
    url: v.string(),
    method: v.optional(v.union(v.literal('GET'), v.literal('POST'))),
    headers: v.optional(v.any()),
    body: v.optional(v.string()),
  }),
  handler: async (ctx, input: { url: string; method?: string; headers?: any; body?: string }) => {
    try {
      const response = await fetch(input.url, {
        method: input.method || 'GET',
        headers: input.headers || {},
        body: input.body,
      });

      const contentType = response.headers.get('content-type') || '';
      let content;

      if (contentType.includes('application/json')) {
        content = await response.json();
      } else {
        content = await response.text();
      }

      // Convert headers to plain object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers,
        content,
        contentType,
      };
    } catch (error) {
      throw new Error(`Failed to fetch URL: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  },
});

/**
 * Current Time Tool
 * Returns current timestamp and formatted date
 */
registerTool({
  name: 'current_time',
  displayName: 'Current Time',
  description: 'Get current date and time',
  category: 'other',
  requiresAuth: false,
  inputSchema: v.object({
    timezone: v.optional(v.string()),
  }),
  handler: async (ctx, input: { timezone?: string }) => {
    const now = new Date();

    return {
      timestamp: now.getTime(),
      iso: now.toISOString(),
      date: now.toDateString(),
      time: now.toTimeString(),
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
});

/**
 * Random Number Generator Tool
 * Generates random numbers
 */
registerTool({
  name: 'random_number',
  displayName: 'Random Number',
  description: 'Generate a random number within a range',
  category: 'other',
  requiresAuth: false,
  inputSchema: v.object({
    min: v.number(),
    max: v.number(),
    integer: v.optional(v.boolean()),
  }),
  handler: async (ctx, input: { min: number; max: number; integer?: boolean }) => {
    const random = Math.random() * (input.max - input.min) + input.min;

    return {
      value: input.integer ? Math.floor(random) : random,
      min: input.min,
      max: input.max,
    };
  },
});

// ============================================================================
// JIRA TOOLS (using jiraClient)
// ============================================================================

import * as jiraClient from '../jiraClient';

/**
 * Jira Search Tool
 * Search for Jira issues using JQL
 */
registerTool({
  name: 'jira_search',
  displayName: 'Jira Search',
  description: 'Search for Jira issues using JQL query language',
  category: 'jira',
  requiresAuth: true,
  inputSchema: v.object({
    jql: v.string(),
    maxResults: v.optional(v.number()),
  }),
  handler: async (ctx, input: { jql: string; maxResults?: number }) => {
    const issues = await jiraClient.searchIssues(ctx, input.jql, input.maxResults);

    return {
      total: issues.length,
      issues: issues.map(issue => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        labels: issue.fields.labels,
        priority: issue.fields.priority?.name,
      })),
    };
  },
});

/**
 * Jira Get Issue Tool
 * Get details of a specific Jira issue
 */
registerTool({
  name: 'jira_get_issue',
  displayName: 'Get Jira Issue',
  description: 'Get detailed information about a specific Jira issue',
  category: 'jira',
  requiresAuth: true,
  inputSchema: v.object({
    issueKey: v.string(),
  }),
  handler: async (ctx, input: { issueKey: string }) => {
    const issue = await jiraClient.getIssue(ctx, input.issueKey);

    return {
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: issue.fields.status.name,
      labels: issue.fields.labels,
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName,
      project: issue.fields.project.key,
      issueType: issue.fields.issuetype.name,
    };
  },
});

/**
 * Jira Add Comment Tool
 * Add a comment to a Jira issue
 */
registerTool({
  name: 'jira_add_comment',
  displayName: 'Add Jira Comment',
  description: 'Add a comment to a Jira issue',
  category: 'jira',
  requiresAuth: true,
  inputSchema: v.object({
    issueKey: v.string(),
    comment: v.string(),
  }),
  handler: async (ctx, input: { issueKey: string; comment: string }) => {
    const commentId = await jiraClient.addComment(ctx, input.issueKey, input.comment);

    return {
      success: true,
      commentId,
      issueKey: input.issueKey,
    };
  },
});

/**
 * Jira Update Status Tool
 * Transition a Jira issue to a new status
 */
registerTool({
  name: 'jira_update_status',
  displayName: 'Update Jira Status',
  description: 'Change the status of a Jira issue',
  category: 'jira',
  requiresAuth: true,
  inputSchema: v.object({
    issueKey: v.string(),
    newStatus: v.string(),
  }),
  handler: async (ctx, input: { issueKey: string; newStatus: string }) => {
    const success = await jiraClient.updateTaskStatus(ctx, input.issueKey, input.newStatus);

    return {
      success,
      issueKey: input.issueKey,
      newStatus: input.newStatus,
    };
  },
});

/**
 * Jira Add Labels Tool
 * Add labels to a Jira issue
 */
registerTool({
  name: 'jira_add_labels',
  displayName: 'Add Jira Labels',
  description: 'Add labels to a Jira issue',
  category: 'jira',
  requiresAuth: true,
  inputSchema: v.object({
    issueKey: v.string(),
    labels: v.array(v.string()),
  }),
  handler: async (ctx, input: { issueKey: string; labels: string[] }) => {
    await jiraClient.addLabels(ctx, input.issueKey, input.labels);

    return {
      success: true,
      issueKey: input.issueKey,
      addedLabels: input.labels,
    };
  },
});

/**
 * Jira Create Subtask Tool
 * Create a subtask under a parent issue
 */
registerTool({
  name: 'jira_create_subtask',
  displayName: 'Create Jira Subtask',
  description: 'Create a subtask under a parent Jira issue',
  category: 'jira',
  requiresAuth: true,
  inputSchema: v.object({
    parentKey: v.string(),
    summary: v.string(),
    description: v.string(),
    labels: v.optional(v.array(v.string())),
  }),
  handler: async (ctx, input: {
    parentKey: string;
    summary: string;
    description: string;
    labels?: string[];
  }) => {
    const subtaskKey = await jiraClient.createSubtask(
      ctx,
      input.parentKey,
      input.summary,
      input.description,
      input.labels || []
    );

    return {
      success: true,
      subtaskKey,
      parentKey: input.parentKey,
    };
  },
});

// Log registered tools on module load
console.log(`[Tool Registry] Loaded ${TOOL_REGISTRY.size} tools:`, Array.from(TOOL_REGISTRY.keys()));

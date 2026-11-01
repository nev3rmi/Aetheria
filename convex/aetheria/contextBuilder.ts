/**
 * Context Builder for Agent Brain Requests
 *
 * Gathers comprehensive context about an agent to send to external brain.
 */

import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import { QueryCtx } from '../_generated/server';
import { Doc, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { AgentBrainRequest } from './brainConnector';

/**
 * Build comprehensive brain request context for an agent (internal query export)
 */
export const buildAgentBrainRequest = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: v.string(),
    agentName: v.string(),
    callType: v.union(
      v.literal('decision'),
      v.literal('tool_result'),
      v.literal('task_evaluation'),
      v.literal('conversation')
    ),
    evaluationContext: v.optional(
      v.object({
        taskId: v.string(),
        taskTitle: v.string(),
        taskDescription: v.string(),
        requiredSkills: v.array(v.string()),
      })
    ),
    lastToolExecution: v.optional(
      v.object({
        tool: v.string(),
        input: v.any(),
        output: v.any(),
        success: v.boolean(),
        error: v.optional(v.string()),
        duration: v.number(),
        executedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    return buildAgentBrainRequestInternal(ctx, args);
  },
});

/**
 * Internal helper to build brain request
 */
async function buildAgentBrainRequestInternal(
  ctx: QueryCtx,
  args: {
    worldId: Id<'worlds'>;
    agentId: string; // PlayerId
    agentName: string;
    callType: 'decision' | 'tool_result' | 'task_evaluation' | 'conversation';
    evaluationContext?: {
      taskId: string;
      taskTitle: string;
      taskDescription: string;
      requiredSkills: string[];
    };
    lastToolExecution?: {
      tool: string;
      input: any;
      output: any;
      success: boolean;
      error?: string;
      duration: number;
      executedAt: number;
    };
  }
): Promise<AgentBrainRequest> {
  // Gather all context in parallel
  const [
    recentMemories,
    inboxMessages,
    currentTask,
    availableTasks,
    nearbyAgents,
    agentBrain,
    agentDescription,
  ] = await Promise.all([
    getRecentMemories(ctx, args.worldId, args.agentId),
    getInboxMessages(ctx, args.worldId, args.agentId),
    getCurrentTask(ctx, args.worldId, args.agentId),
    getAvailableTasks(ctx, args.worldId),
    getNearbyAgents(ctx, args.worldId, args.agentId),
    getAgentBrain(ctx, args.worldId, args.agentId),
    getAgentDescription(ctx, args.worldId, args.agentId),
  ]);

  // Build request
  const request: AgentBrainRequest = {
    agentId: args.agentId,
    agentName: args.agentName,
    worldId: args.worldId,
    identity: agentDescription?.identity,
    plan: agentDescription?.plan,
    currentState: determineAgentState(currentTask),
    recentMemories,
    inboxMessages,
    availableTools: agentBrain?.permittedTools || [],
    nearbyAgents,
    availableTasks,
    timestamp: Date.now(),
    callType: args.callType,
  };

  // Add optional fields
  if (currentTask) {
    request.currentTask = currentTask;
  }

  if (args.evaluationContext) {
    request.evaluationContext = args.evaluationContext;
  }

  if (args.lastToolExecution) {
    request.lastToolExecution = args.lastToolExecution;
  }

  return request;
}

/**
 * Get recent memories for an agent (SHORT-TERM TIER)
 *
 * This retrieves the last 10 personal memories.
 * For session-based and long-term memories, use getContextForAgent action.
 */
async function getRecentMemories(
  ctx: QueryCtx,
  worldId: Id<'worlds'>,
  agentId: string
): Promise<AgentBrainRequest['recentMemories']> {
  try {
    // TIER 1: SHORT-TERM MEMORY (last 10 personal events)
    const memories = await ctx.db
      .query('memories')
      .withIndex('playerId', (q) => q.eq('playerId', agentId as any))
      .order('desc')
      .take(10);

    return memories.map((memory) => ({
      description: memory.description,
      importance: memory.importance,
      timestamp: memory._creationTime,
      type: (memory.data?.type || 'observation') as 'conversation' | 'reflection' | 'observation',
    }));
  } catch (error) {
    console.error('[Context Builder] Error fetching memories:', error);
    return [];
  }
}

/**
 * Get unread messages from agent inbox
 */
async function getInboxMessages(
  ctx: QueryCtx,
  worldId: Id<'worlds'>,
  agentId: string
): Promise<AgentBrainRequest['inboxMessages']> {
  try {
    // Query unread messages using the unread index
    const messages = await ctx.db
      .query('agentMessages')
      .withIndex('unread', (q) =>
        q.eq('worldId', worldId).eq('toAgentId', agentId).eq('isRead', false)
      )
      .order('desc')
      .take(20);

    return messages.map((msg) => ({
      fromAgent: msg.fromAgentId,
      messageType: msg.messageType as any,
      content: msg.content,
      threadId: msg.threadId || undefined,
      relatedTaskId: msg.relatedTaskId as string | undefined,
      sentAt: msg.sentAt,
      isUrgent: msg.metadata?.priority === 'high',
    }));
  } catch (error) {
    console.error('[Context Builder] Error fetching messages:', error);
    return [];
  }
}

/**
 * Get agent's current task (if any)
 */
async function getCurrentTask(
  ctx: QueryCtx,
  worldId: Id<'worlds'>,
  agentId: string
): Promise<AgentBrainRequest['currentTask'] | undefined> {
  try {
    // Find task claimed by this agent
    const task = await ctx.db
      .query('jiraTasks')
      .withIndex('by_agent', (q) =>
        q.eq('worldId', worldId).eq('assignedAgentId', agentId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field('status'), 'claimed'),
          q.eq(q.field('status'), 'in_progress')
        )
      )
      .first();

    if (!task) return undefined;

    const metadata: any = {};
    if (task.metadata?.projectKey) metadata.projectKey = task.metadata.projectKey;
    if (task.metadata?.issueType) metadata.issueType = task.metadata.issueType;
    if (task.metadata?.reporter) metadata.reporter = task.metadata.reporter;

    return {
      id: task._id,
      title: task.issueSummary,
      description: task.issueDescription || '',
      labels: task.labels,
      priority: (task.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
      status: task.status as 'pending' | 'claimed' | 'in_progress' | 'blocked',
      url: task.issueUrl,
      claimedAt: task.claimedAt,
      metadata,
    };
  } catch (error) {
    console.error('[Context Builder] Error fetching current task:', error);
    return undefined;
  }
}

/**
 * Get available tasks agent could claim
 */
async function getAvailableTasks(
  ctx: QueryCtx,
  worldId: Id<'worlds'>
): Promise<AgentBrainRequest['availableTasks']> {
  try {
    // Get pending/unassigned tasks
    const tasks = await ctx.db
      .query('jiraTasks')
      .withIndex('by_status', (q) =>
        q.eq('worldId', worldId).eq('status', 'pending')
      )
      .take(10);

    return tasks.map((task) => ({
      id: task._id,
      title: task.issueSummary,
      labels: task.labels,
      priority: task.priority || 'medium',
    }));
  } catch (error) {
    console.error('[Context Builder] Error fetching available tasks:', error);
    return [];
  }
}

/**
 * Get nearby agents (within conversation distance)
 */
async function getNearbyAgents(
  ctx: QueryCtx,
  worldId: Id<'worlds'>,
  agentId: string
): Promise<AgentBrainRequest['nearbyAgents']> {
  try {
    // Get the world
    const world = await ctx.db.get(worldId);
    if (!world) {
      return [];
    }

    // Get all agents and players from world
    const allAgents = world.agents || [];
    const allPlayers = world.players || [];

    // Find current agent's player
    const currentAgent = allAgents.find((a: any) => a.id === agentId);
    if (!currentAgent) {
      return [];
    }

    const currentPlayer = allPlayers.find((p: any) => p.id === currentAgent.playerId);
    if (!currentPlayer || !currentPlayer.position) {
      return [];
    }

    // Calculate distances for other agents
    const nearbyAgents: AgentBrainRequest['nearbyAgents'] = [];
    const NEARBY_DISTANCE = 10; // Distance threshold

    for (const agent of allAgents) {
      if (agent.id === agentId) continue; // Skip self

      // Get agent's player
      const player = allPlayers.find((p: any) => p.id === agent.playerId);
      if (!player || !player.position) continue;

      // Calculate Euclidean distance
      const dx = player.position.x - currentPlayer.position.x;
      const dy = player.position.y - currentPlayer.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If within range, add to nearby agents
      if (distance <= NEARBY_DISTANCE) {
        // Get agent description for name
        const agentDesc = await ctx.db
          .query('agentDescriptions')
          .filter((q) => q.eq(q.field('agentId'), agent.id))
          .first();

        nearbyAgents.push({
          agentId: agent.id,
          agentName: agentDesc?.identity?.split(',')[0]?.replace('You are ', '') || 'Agent',
          distance: parseFloat(distance.toFixed(2)),
          currentActivity: player.activity?.description || 'idle',
        });
      }
    }

    // Sort by distance (closest first)
    nearbyAgents.sort((a, b) => a.distance - b.distance);

    return nearbyAgents;
  } catch (error) {
    console.error('[Context Builder] Error getting nearby agents:', error);
    return [];
  }
}

/**
 * Helper to determine agent state from activity
 */
function determineAgentStateFromActivity(activity: any): 'idle' | 'walking' | 'talking' | 'working' {
  if (!activity) return 'idle';

  const type = activity.type;
  if (type === 'walking' || type === 'pathfinding') return 'walking';
  if (type === 'conversation' || type === 'talking') return 'talking';
  if (type === 'working' || type === 'thinking') return 'working';

  return 'idle';
}

/**
 * Get agent brain configuration
 */
async function getAgentBrain(
  ctx: QueryCtx,
  worldId: Id<'worlds'>,
  agentId: string
): Promise<Doc<'agentBrains'> | null> {
  try {
    const brain = await ctx.db
      .query('agentBrains')
      .withIndex('by_agent', (q) =>
        q.eq('worldId', worldId).eq('agentId', agentId)
      )
      .filter((q) => q.eq(q.field('isActive'), true))
      .first();

    return brain;
  } catch (error) {
    console.error('[Context Builder] Error fetching agent brain:', error);
    return null;
  }
}

/**
 * Get agent description (personality and goals)
 */
async function getAgentDescription(
  ctx: QueryCtx,
  worldId: Id<'worlds'>,
  agentId: string
): Promise<{ identity: string; plan: string } | null> {
  try {
    const agentDesc = await ctx.db
      .query('agentDescriptions')
      .filter((q) => q.eq(q.field('agentId'), agentId))
      .first();

    if (!agentDesc) {
      return null;
    }

    return {
      identity: agentDesc.identity || '',
      plan: agentDesc.plan || '',
    };
  } catch (error) {
    console.error('[Context Builder] Error fetching agent description:', error);
    return null;
  }
}

/**
 * Determine agent's current state based on context
 */
function determineAgentState(
  currentTask: AgentBrainRequest['currentTask']
): 'idle' | 'thinking' | 'working' | 'blocked' {
  if (!currentTask) return 'idle';

  if (currentTask.status === 'blocked') return 'blocked';
  if (currentTask.status === 'in_progress') return 'working';
  if (currentTask.status === 'claimed') return 'thinking';

  return 'idle';
}

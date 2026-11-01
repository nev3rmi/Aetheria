/**
 * Three-Tier Memory Retrieval System
 *
 * Provides context to agents through three levels:
 * 1. SHORT-TERM: Recent personal memories (last 10 events)
 * 2. SESSION-BASED: Jira comments from current task (collaborative work)
 * 3. LONG-TERM: Graphiti knowledge graph (historical learning)
 */

import { v } from 'convex/values';
import { query, action, internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { getJiraComments, JiraComment } from './jiraCommentService';

/**
 * Three-tier context for agent decision-making
 */
export interface AgentContext {
  shortTerm: ShortTermMemory[];
  sessionBased: SessionMemory[];
  longTerm: LongTermKnowledge[];
}

/**
 * Short-term memory (personal recent events)
 */
export interface ShortTermMemory {
  id: Id<'memories'>;
  description: string;
  importance: number;
  timestamp: number;
  type: 'relationship' | 'conversation' | 'reflection';
}

/**
 * Session memory (Jira comments from current task)
 */
export interface SessionMemory {
  commentId: string;
  author: string;
  content: string;
  timestamp: string;
  isAgentComment: boolean; // True if posted by an agent
}

/**
 * Long-term knowledge (Graphiti search results)
 */
export interface LongTermKnowledge {
  episodeId: string;
  content: string;
  entities: string[];
  facts: string[];
  relevanceScore: number;
  timestamp: string;
}

/**
 * Get comprehensive context for an agent's decision
 */
export const getContextForAgent = action({
  args: {
    worldId: v.id('worlds'),
    agentId: v.id('players'),
    currentTaskId: v.optional(v.id('jiraTasks')),
    query: v.optional(v.string()), // For long-term knowledge search
  },
  handler: async (ctx, { worldId, agentId, currentTaskId, query }) => {
    const context: AgentContext = {
      shortTerm: [],
      sessionBased: [],
      longTerm: [],
    };

    // TIER 1: SHORT-TERM MEMORY (last 10 personal events)
    context.shortTerm = await ctx.runQuery(internal.aetheria.memoryRetrieval.getShortTermMemories, {
      worldId,
      agentId,
      limit: 10,
    });

    // TIER 2: SESSION-BASED MEMORY (Jira comments if on a task)
    if (currentTaskId) {
      context.sessionBased = await ctx.runAction(
        internal.aetheria.memoryRetrieval.getSessionMemories,
        {
          worldId,
          taskId: currentTaskId,
        }
      );
    }

    // TIER 3: LONG-TERM KNOWLEDGE (Graphiti search if query provided)
    if (query) {
      context.longTerm = await ctx.runAction(internal.aetheria.memoryRetrieval.getLongTermKnowledge, {
        worldId,
        agentId,
        query,
        limit: 5,
      });
    }

    return context;
  },
});

/**
 * TIER 1: Get short-term memories (recent personal events)
 */
export const getShortTermMemories = query({
  args: {
    worldId: v.id('worlds'),
    agentId: v.id('players'),
    limit: v.number(),
  },
  handler: async (ctx, { worldId, agentId, limit }): Promise<ShortTermMemory[]> => {
    // Get most recent memories for this agent
    const memories = await ctx.db
      .query('memories')
      .withIndex('playerId', (q) => q.eq('playerId', agentId))
      .order('desc')
      .take(limit);

    return memories.map((memory) => ({
      id: memory._id,
      description: memory.description,
      importance: memory.importance,
      timestamp: memory.lastAccess,
      type: memory.data.type,
    }));
  },
});

/**
 * TIER 2: Get session-based memories (Jira comments from current task)
 */
export const getSessionMemories = internalAction({
  args: {
    worldId: v.id('worlds'),
    taskId: v.id('jiraTasks'),
  },
  handler: async (ctx, { worldId, taskId }): Promise<SessionMemory[]> => {
    // Get task details
    const task = await ctx.runQuery(internal.aetheria.memoryRetrieval.getTaskDetails, {
      taskId,
    });

    if (!task) {
      return [];
    }

    // Fetch Jira comments
    const jiraComments = await ctx.runAction(getJiraComments, {
      issueKey: task.issueKey,
      maxResults: 50, // Get last 50 comments for session context
    });

    // Convert to session memories
    return jiraComments.map((comment: JiraComment) => ({
      commentId: comment.id,
      author: comment.author.displayName,
      content: comment.body,
      timestamp: comment.created,
      isAgentComment: comment.body.startsWith('🤖'), // Agent comments start with robot emoji
    }));
  },
});

/**
 * Get task details (internal query)
 */
export const getTaskDetails = query({
  args: {
    taskId: v.id('jiraTasks'),
  },
  handler: async (ctx, { taskId }) => {
    return await ctx.db.get(taskId);
  },
});

/**
 * TIER 3: Get long-term knowledge (Graphiti knowledge graph search)
 */
export const getLongTermKnowledge = internalAction({
  args: {
    worldId: v.id('worlds'),
    agentId: v.id('players'),
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, { worldId, agentId, query, limit }): Promise<LongTermKnowledge[]> => {
    const graphitiEndpoint = process.env.GRAPHITI_ENDPOINT || 'http://localhost:8000';

    try {
      // Search Graphiti knowledge graph
      const response = await fetch(`${graphitiEndpoint}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          group_ids: [worldId], // Search within this world
          num_results: limit,
        }),
      });

      if (!response.ok) {
        console.error('Graphiti search failed:', response.status);
        return [];
      }

      const results = await response.json();

      // Convert Graphiti results to long-term knowledge format
      return results.map((result: any) => ({
        episodeId: result.episode_id || result.uuid || 'unknown',
        content: result.content || result.episode_body || '',
        entities: result.entities || [],
        facts: result.facts || [],
        relevanceScore: result.score || result.similarity || 0,
        timestamp: result.created_at || result.reference_time || new Date().toISOString(),
      }));
    } catch (error: any) {
      console.error('Error querying Graphiti:', error);
      return [];
    }
  },
});

/**
 * Helper: Format context for brain request
 */
export function formatContextForBrain(context: AgentContext): string {
  let formatted = '';

  // Short-term context
  if (context.shortTerm.length > 0) {
    formatted += '## Recent Personal Context\n\n';
    for (const memory of context.shortTerm) {
      formatted += `- ${memory.description} (importance: ${memory.importance})\n`;
    }
    formatted += '\n';
  }

  // Session context
  if (context.sessionBased.length > 0) {
    formatted += '## Current Task Collaboration\n\n';
    formatted += 'Comments from team members working on this task:\n\n';
    for (const comment of context.sessionBased) {
      formatted += `**${comment.author}** (${comment.timestamp}):\n${comment.content}\n\n`;
    }
    formatted += '\n';
  }

  // Long-term knowledge
  if (context.longTerm.length > 0) {
    formatted += '## Historical Knowledge\n\n';
    formatted += 'Relevant past learnings from knowledge graph:\n\n';
    for (const knowledge of context.longTerm) {
      formatted += `**Knowledge** (relevance: ${knowledge.relevanceScore}):\n`;
      formatted += `${knowledge.content}\n`;
      if (knowledge.facts.length > 0) {
        formatted += `Facts: ${knowledge.facts.join(', ')}\n`;
      }
      formatted += '\n';
    }
  }

  return formatted;
}

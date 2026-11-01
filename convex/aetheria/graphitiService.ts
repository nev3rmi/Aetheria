/**
 * Graphiti Knowledge Graph Service
 *
 * Integrates with Graphiti for long-term knowledge storage and retrieval.
 * Graphiti provides:
 * - Entity extraction
 * - Temporal knowledge graph
 * - Relationship mapping
 * - Semantic search
 */

import { v } from 'convex/values';
import { action, internalAction } from '../_generated/server';

/**
 * Graphiti Episode (unit of knowledge)
 */
export interface GraphitiEpisode {
  name: string;
  episode_body: string;
  source: string;
  reference_time: string; // ISO timestamp
  group_id: string; // World/team ID
  metadata?: Record<string, any>;
}

/**
 * Graphiti Search Result
 */
export interface GraphitiSearchResult {
  episode_id: string;
  content: string;
  entities: string[];
  facts: string[];
  score: number;
  created_at: string;
}

/**
 * Add an episode to Graphiti knowledge graph
 */
export const addGraphitiEpisode = action({
  args: {
    name: v.string(),
    episodeBody: v.string(),
    source: v.string(),
    referenceTime: v.string(),
    groupId: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { name, episodeBody, source, referenceTime, groupId, metadata }) => {
    const graphitiEndpoint = process.env.GRAPHITI_ENDPOINT || 'http://localhost:8000';

    try {
      const episode: GraphitiEpisode = {
        name,
        episode_body: episodeBody,
        source,
        reference_time: referenceTime,
        group_id: groupId,
        metadata,
      };

      const response = await fetch(`${graphitiEndpoint}/episodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(episode),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Graphiti episode creation failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[Graphiti] Error adding episode:', error);
      throw error;
    }
  },
});

/**
 * Search Graphiti knowledge graph
 */
export const searchGraphiti = action({
  args: {
    query: v.string(),
    groupIds: v.array(v.string()),
    numResults: v.optional(v.number()),
  },
  handler: async (ctx, { query, groupIds, numResults = 5 }) => {
    const graphitiEndpoint = process.env.GRAPHITI_ENDPOINT || 'http://localhost:8000';

    try {
      const response = await fetch(`${graphitiEndpoint}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          group_ids: groupIds,
          num_results: numResults,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Graphiti search failed: ${response.status} ${errorText}`);
      }

      const results: GraphitiSearchResult[] = await response.json();
      return results;
    } catch (error: any) {
      console.error('[Graphiti] Error searching:', error);
      throw error;
    }
  },
});

/**
 * Check Graphiti health
 */
export const checkGraphitiHealth = action({
  args: {},
  handler: async (ctx) => {
    const graphitiEndpoint = process.env.GRAPHITI_ENDPOINT || 'http://localhost:8000';

    try {
      const response = await fetch(`${graphitiEndpoint}/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          healthy: false,
          error: `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        healthy: true,
        ...result,
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  },
});

/**
 * Process Jira comment into Graphiti episode
 *
 * This converts agent research findings (posted as Jira comments)
 * into Graphiti episodes for long-term knowledge retention.
 */
export const processJiraCommentToGraphiti = internalAction({
  args: {
    worldId: v.id('worlds'),
    taskId: v.id('jiraTasks'),
    issueKey: v.string(),
    commentBody: v.string(),
    agentName: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, { worldId, taskId, issueKey, commentBody, agentName, timestamp }) => {
    try {
      // Create episode name from task and agent
      const episodeName = `${issueKey}_${agentName}_${Date.now()}`;

      // Format episode body with context
      const episodeBody = `
Agent: ${agentName}
Task: ${issueKey}
Timestamp: ${new Date(timestamp).toISOString()}

${commentBody}
`.trim();

      // Add to Graphiti
      const result = await ctx.runAction(addGraphitiEpisode, {
        name: episodeName,
        episodeBody,
        source: 'jira_comment',
        referenceTime: new Date(timestamp).toISOString(),
        groupId: worldId,
        metadata: {
          taskId,
          issueKey,
          agentName,
          commentType: 'agent_research',
        },
      });

      console.log(`[Graphiti] Processed Jira comment into episode: ${episodeName}`);
      return result;
    } catch (error: any) {
      console.error('[Graphiti] Error processing Jira comment:', error);
      // Don't throw - we don't want to block the main workflow if Graphiti fails
      return null;
    }
  },
});

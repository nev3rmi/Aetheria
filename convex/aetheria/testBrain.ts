/**
 * Test Brain Configuration and Testing
 */

import { v } from 'convex/values';
import { mutation, query, action } from '../_generated/server';
import { internal } from '../_generated/api';
import { playerId } from '../aiTown/ids';

/**
 * Configure a brain for an agent (testing)
 */
export const configureBrainForAgent = mutation({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
    agentName: v.string(),
    webhookUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if brain already exists
    const existing = await ctx.db
      .query('agentBrains')
      .withIndex('by_agent', (q) =>
        q.eq('worldId', args.worldId).eq('agentId', args.agentId)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        webhookUrl: args.webhookUrl,
        permittedTools: ['web_search'], // Update tools
        isActive: true,
        lastCalledAt: undefined,
        lastError: undefined,
      });
      return { brainId: existing._id, updated: true };
    }

    // Create new brain configuration
    const brainId = await ctx.db.insert('agentBrains', {
      worldId: args.worldId,
      agentId: args.agentId,
      agentName: args.agentName,
      brainType: 'n8n',
      webhookUrl: args.webhookUrl,
      permittedTools: [
        'web_search', // Web search using DuckDuckGo
      ],
      configuration: {
        timeout: 60000, // 60 seconds for web search
        maxRetries: 2,
        personality: 'Curious AI agent who loves to gossip and learn about the world',
        specialization: ['information gathering', 'web research', 'social interaction'],
      },
      isActive: true,
      createdAt: Date.now(),
    });

    return { brainId, created: true };
  },
});

/**
 * Disable brain for an agent
 */
export const disableBrainForAgent = mutation({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
  },
  handler: async (ctx, args) => {
    const brain = await ctx.db
      .query('agentBrains')
      .withIndex('by_agent', (q) =>
        q.eq('worldId', args.worldId).eq('agentId', args.agentId)
      )
      .first();

    if (!brain) {
      return { success: false, message: 'No brain found' };
    }

    await ctx.db.patch(brain._id, {
      isActive: false,
    });

    return { success: true, brainId: brain._id };
  },
});

/**
 * List all brain configurations
 */
export const listBrains = query({
  args: {
    worldId: v.id('worlds'),
  },
  handler: async (ctx, args) => {
    const brains = await ctx.db
      .query('agentBrains')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId))
      .collect();

    return brains;
  },
});

/**
 * Test brain call directly (for debugging)
 */
export const testBrainCall = action({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Test Brain] Testing brain call for ${args.agentName}`);

    try {
      // Build a test context
      const testContext = {
        agentId: args.agentId,
        agentName: args.agentName,
        worldId: args.worldId,
        currentState: 'idle' as const,
        recentMemories: [
          {
            description: 'Just spawned in the world',
            importance: 5,
            timestamp: Date.now(),
            type: 'observation' as const,
          },
        ],
        inboxMessages: [],
        availableTools: ['read_code', 'edit_code', 'run_tests'],
        nearbyAgents: [],
        availableTasks: [],
        timestamp: Date.now(),
        callType: 'decision' as const,
      };

      // Get brain config
      const brain = await ctx.runQuery(internal.aetheria.aetheriaOperations.getAgentBrainConfig, {
        worldId: args.worldId,
        agentId: args.agentId,
      });

      if (!brain) {
        return { success: false, error: 'No brain configured for this agent' };
      }

      console.log(`[Test Brain] Found brain: ${brain.brainType} at ${brain.webhookUrl}`);

      // Format for n8n
      const n8nPayload = {
        chatInput: JSON.stringify(testContext, null, 2),
        sessionID: args.agentId,
      };

      console.log(`[Test Brain] Calling n8n webhook...`);
      console.log(`[Test Brain] Payload:`, n8nPayload);

      // Call the webhook
      const response = await fetch(brain.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Test Brain] HTTP ${response.status}: ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();
      console.log(`[Test Brain] Response:`, result);

      return {
        success: true,
        response: result,
        status: response.status,
      };
    } catch (error) {
      console.error('[Test Brain] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Get brain call logs
 */
export const getBrainLogs = query({
  args: {
    worldId: v.id('worlds'),
    agentId: v.optional(playerId),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('brainCallLog')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId));

    if (args.agentId) {
      query = query.filter((q) => q.eq(q.field('agentId'), args.agentId));
    }

    const logs = await query
      .order('desc')
      .take(args.limit || 20);

    return logs;
  },
});

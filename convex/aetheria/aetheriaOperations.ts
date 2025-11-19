/**
 * Aetheria Agent Operations
 *
 * Operations for agents with external brain connectors.
 */

import { v } from 'convex/values';
import { internalAction, internalQuery } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { internal, api } from '../_generated/api';
import { playerId, agentId } from '../aiTown/ids';
import { callAgentBrain } from './brainConnector';
import { buildAgentBrainRequest } from './contextBuilder';
import { executeAction } from './actionExecutor';

/**
 * Agent makes a decision using external brain
 */
export const agentMakeBrainDecision = internalAction({
  args: {
    worldId: v.id('worlds'),
    playerId,
    agentId,
    operationId: v.string(),
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
    console.log(`[Brain Decision] Agent ${args.agentId} making brain decision`);

    try {
      // 1. Get agent info
      const agent = await ctx.runQuery(internal.aetheria.aetheriaOperations.getAgentData, {
        worldId: args.worldId,
        agentId: args.agentId,
      });

      if (!agent) {
        throw new Error(`Agent ${args.agentId} not found`);
      }

      // 2. Build brain request context
      const requestArgs = {
        worldId: args.worldId,
        agentId: args.agentId,
        agentName: agent.name,
        callType: args.callType,
        evaluationContext: args.evaluationContext,
        lastToolExecution: args.lastToolExecution,
      };

      const request = await ctx.runQuery(
        internal.aetheria.contextBuilder.buildAgentBrainRequest,
        requestArgs
      );

      // 3. Call external brain
      const response = await callAgentBrain(ctx, args.worldId as any, request);

      console.log(`[Brain Decision] Received response from brain:`, {
        thought: response.thought,
        actionType: response.action.type,
      });

      // 4. Execute the brain's decision
      const executionResult = await executeAction(
        ctx,
        args.worldId,
        args.agentId,
        response.action,
        args.operationId
      );

      // 5. Finish operation (success or failure)
      await ctx.runMutation(api.aiTown.main.sendInput, {
        worldId: args.worldId,
        name: 'agentFinishBrainDecision',
        args: {
          agentId: args.agentId,
          operationId: args.operationId,
          thought: response.thought,
          actionType: response.action.type,
          actionParams: response.action.params,
          success: executionResult.success,
          result: executionResult.result,
          error: executionResult.error,
        },
      });
    } catch (error) {
      console.error(`[Brain Decision] Error for agent ${args.agentId}:`, error);

      // Finish with error
      await ctx.runMutation(api.aiTown.main.sendInput, {
        worldId: args.worldId,
        name: 'agentFinishBrainDecision',
        args: {
          agentId: args.agentId,
          operationId: args.operationId,
          thought: 'Brain decision failed',
          actionType: 'wait',
          actionParams: { reason: 'brain_error' },
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  },
});

/**
 * Check if an agent has a brain configured
 */
export const agentHasBrain = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const brain = await ctx.db
      .query('agentBrains')
      .withIndex('by_agent', (q) =>
        q.eq('worldId', args.worldId).eq('agentId', args.agentId)
      )
      .filter((q) => q.eq(q.field('isActive'), true))
      .first();

    return brain !== null;
  },
});

/**
 * Get agent's brain configuration
 */
export const getAgentBrainConfig = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const brain = await ctx.db
      .query('agentBrains')
      .withIndex('by_agent', (q) =>
        q.eq('worldId', args.worldId).eq('agentId', args.agentId)
      )
      .filter((q) => q.eq(q.field('isActive'), true))
      .first();

    return brain;
  },
});

/**
 * Get agent data for brain context
 */
export const getAgentData = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Query agent description
    const agentDesc = await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) =>
        q.eq('worldId', args.worldId).eq('agentId', args.agentId as any)
      )
      .first();

    if (!agentDesc) {
      return null;
    }

    return {
      id: agentDesc.agentId,
      name: agentDesc.identity,
      description: agentDesc.plan,
    };
  },
});

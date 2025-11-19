/**
 * Task Management System
 *
 * Handles task lifecycle:
 * - Claiming tasks
 * - Updating task status
 * - Task completion
 * - Task delegation
 * - Subtask management
 */

import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { playerId } from '../aiTown/ids';
import { Id } from '../_generated/dataModel';

/**
 * Claim a task for an agent
 */
export const claimTask = internalMutation({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
    taskId: v.id('jiraTasks'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // Check if task is already claimed
    if (task.assignedAgentId && task.assignedAgentId !== args.agentId) {
      return {
        success: false,
        error: `Task already claimed by ${task.assignedAgentId}`,
      };
    }

    // Check if task is already completed
    if (task.status === 'completed') {
      return {
        success: false,
        error: 'Task is already completed',
      };
    }

    // Claim the task
    await ctx.db.patch(args.taskId, {
      assignedAgentId: args.agentId,
      status: 'claimed',
      claimedAt: Date.now(),
    });

    console.log(`[Tasks] Agent ${args.agentId} claimed task ${args.taskId}`, {
      reason: args.reason,
    });

    return {
      success: true,
      taskId: args.taskId,
      message: 'Task claimed successfully',
    };
  },
});

/**
 * Update task status and add progress comment
 */
export const updateTaskStatus = internalMutation({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
    taskId: v.id('jiraTasks'),
    status: v.union(
      v.literal('pending'),
      v.literal('claimed'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('blocked')
    ),
    comment: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // Check if agent is assigned to this task
    if (task.assignedAgentId !== args.agentId) {
      return {
        success: false,
        error: `Task is assigned to ${task.assignedAgentId}, not ${args.agentId}`,
      };
    }

    // Update the task
    const updates: any = {
      status: args.status,
    };

    if (args.status === 'completed') {
      updates.completedAt = Date.now();
    }

    // Add comment to progress log if provided
    if (args.comment) {
      const progressLog = task.progressLog || [];
      progressLog.push({
        timestamp: Date.now(),
        agentId: args.agentId,
        status: args.status,
        comment: args.comment,
      });
      updates.progressLog = progressLog;
    }

    // Add metadata if provided
    if (args.metadata) {
      updates.metadata = { ...(task.metadata || {}), ...args.metadata };
    }

    await ctx.db.patch(args.taskId, updates);

    console.log(`[Tasks] Agent ${args.agentId} updated task ${args.taskId} to ${args.status}`);

    return {
      success: true,
      taskId: args.taskId,
      newStatus: args.status,
    };
  },
});

/**
 * Complete a task with results
 */
export const completeTask = internalMutation({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
    taskId: v.id('jiraTasks'),
    comment: v.string(),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation('aetheria/tasks:updateTaskStatus' as any, {
      worldId: args.worldId,
      agentId: args.agentId,
      taskId: args.taskId,
      status: 'completed',
      comment: args.comment,
      metadata: { result: args.result, completedBy: args.agentId },
    });
  },
});

/**
 * Mark task as blocked
 */
export const blockTask = internalMutation({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
    taskId: v.id('jiraTasks'),
    reason: v.string(),
    blockedOn: v.optional(
      v.object({
        type: v.union(
          v.literal('waiting_for_agent'),
          v.literal('waiting_for_task'),
          v.literal('missing_info'),
          v.literal('external_dependency')
        ),
        details: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    await ctx.db.patch(args.taskId, {
      status: 'blocked',
      metadata: {
        ...(task.metadata || {}),
        blockedReason: args.reason,
        blockedOn: args.blockedOn,
        blockedAt: Date.now(),
      },
    });

    console.log(`[Tasks] Agent ${args.agentId} blocked task ${args.taskId}`, {
      reason: args.reason,
    });

    return { success: true };
  },
});

/**
 * Get agent's current task
 */
export const getAgentTask = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
  },
  handler: async (ctx, args) => {
    const task = await ctx.db
      .query('jiraTasks')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId))
      .filter((q) =>
        q.and(
          q.eq(q.field('assignedAgentId'), args.agentId),
          q.or(
            q.eq(q.field('status'), 'claimed'),
            q.eq(q.field('status'), 'in_progress'),
            q.eq(q.field('status'), 'blocked')
          )
        )
      )
      .first();

    return task || null;
  },
});

/**
 * Get all available tasks (not claimed)
 */
export const getAvailableTasks = internalQuery({
  args: {
    worldId: v.id('worlds'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const tasks = await ctx.db
      .query('jiraTasks')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .order('desc')
      .take(limit);

    return tasks;
  },
});

/**
 * Create task delegation request
 */
export const delegateTask = internalMutation({
  args: {
    worldId: v.id('worlds'),
    parentTaskId: v.id('jiraTasks'),
    fromAgentId: playerId,
    toAgentId: playerId,
    reason: v.string(),
    subtaskDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parentTask = await ctx.db.get(args.parentTaskId);

    if (!parentTask) {
      return { success: false, error: 'Parent task not found' };
    }

    // Check if delegator is assigned to parent task
    if (parentTask.assignedAgentId !== args.fromAgentId) {
      return {
        success: false,
        error: 'Only the assigned agent can delegate this task',
      };
    }

    // Create delegation record
    const delegationId = await ctx.db.insert('taskDelegations', {
      worldId: args.worldId,
      parentTaskId: args.parentTaskId,
      fromAgentId: args.fromAgentId,
      toAgentId: args.toAgentId,
      reason: args.reason,
      status: 'pending',
      createdAt: Date.now(),
    });

    // Send delegation message to target agent
    await ctx.runMutation('aetheria/messaging:sendAgentMessage' as any, {
      worldId: args.worldId,
      fromAgentId: args.fromAgentId,
      toAgentId: args.toAgentId,
      messageType: 'delegation',
      content: `${args.reason}${args.subtaskDescription ? '\n\nSubtask: ' + args.subtaskDescription : ''}`,
      relatedTaskId: args.parentTaskId,
      metadata: { delegationId },
    });

    console.log(`[Tasks] Agent ${args.fromAgentId} delegated task to ${args.toAgentId}`);

    return {
      success: true,
      delegationId,
      message: 'Delegation request created and message sent',
    };
  },
});

/**
 * Accept delegation request
 */
export const acceptDelegation = internalMutation({
  args: {
    worldId: v.id('worlds'),
    delegationId: v.id('taskDelegations'),
    agentId: playerId,
  },
  handler: async (ctx, args) => {
    const delegation = await ctx.db.get(args.delegationId);

    if (!delegation) {
      return { success: false, error: 'Delegation not found' };
    }

    // Check if this agent is the target
    if (delegation.toAgentId !== args.agentId) {
      return { success: false, error: 'Delegation is not for this agent' };
    }

    // Update delegation status
    await ctx.db.patch(args.delegationId, {
      status: 'accepted',
      acceptedAt: Date.now(),
    });

    // Notify delegator
    await ctx.runMutation('aetheria/messaging:sendAgentMessage' as any, {
      worldId: args.worldId,
      fromAgentId: args.agentId,
      toAgentId: delegation.fromAgentId,
      messageType: 'direct',
      content: 'I accepted your delegation request and will work on it.',
      relatedTaskId: delegation.parentTaskId,
    });

    console.log(`[Tasks] Agent ${args.agentId} accepted delegation ${args.delegationId}`);

    return { success: true, parentTaskId: delegation.parentTaskId };
  },
});

/**
 * Reject delegation request
 */
export const rejectDelegation = internalMutation({
  args: {
    worldId: v.id('worlds'),
    delegationId: v.id('taskDelegations'),
    agentId: playerId,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const delegation = await ctx.db.get(args.delegationId);

    if (!delegation) {
      return { success: false, error: 'Delegation not found' };
    }

    // Check if this agent is the target
    if (delegation.toAgentId !== args.agentId) {
      return { success: false, error: 'Delegation is not for this agent' };
    }

    // Update delegation status
    await ctx.db.patch(args.delegationId, {
      status: 'rejected',
      rejectedAt: Date.now(),
      metadata: { rejectionReason: args.reason },
    });

    // Notify delegator
    await ctx.runMutation('aetheria/messaging:sendAgentMessage' as any, {
      worldId: args.worldId,
      fromAgentId: args.agentId,
      toAgentId: delegation.fromAgentId,
      messageType: 'direct',
      content: `I cannot accept your delegation request.${args.reason ? ' Reason: ' + args.reason : ''}`,
      relatedTaskId: delegation.parentTaskId,
    });

    console.log(`[Tasks] Agent ${args.agentId} rejected delegation ${args.delegationId}`);

    return { success: true };
  },
});

/**
 * Get delegation requests for an agent
 */
export const getDelegationRequests = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
    status: v.optional(
      v.union(v.literal('pending'), v.literal('accepted'), v.literal('rejected'))
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('taskDelegations')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId))
      .filter((q) => q.eq(q.field('toAgentId'), args.agentId));

    const delegations = await query.collect();

    // Filter by status if provided
    if (args.status) {
      return delegations.filter((d) => d.status === args.status);
    }

    return delegations;
  },
});

/**
 * Get task statistics for an agent
 */
export const getTaskStats = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
  },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query('jiraTasks')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId))
      .filter((q) => q.eq(q.field('assignedAgentId'), args.agentId))
      .collect();

    const byStatus = {
      pending: allTasks.filter((t) => t.status === 'pending').length,
      claimed: allTasks.filter((t) => t.status === 'claimed').length,
      in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
      failed: allTasks.filter((t) => t.status === 'failed').length,
      blocked: allTasks.filter((t) => t.status === 'blocked').length,
    };

    return {
      total: allTasks.length,
      byStatus,
      completionRate:
        allTasks.length > 0
          ? ((byStatus.completed / allTasks.length) * 100).toFixed(1) + '%'
          : '0%',
    };
  },
});

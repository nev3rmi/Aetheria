/**
 * Action Executor for Brain Responses
 *
 * Executes actions returned by external brain decisions.
 */

import { ActionCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { AgentBrainResponse } from './brainConnector';

/**
 * Execute an action returned by the brain
 */
export async function executeAction(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  action: AgentBrainResponse['action'],
  operationId?: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  console.log(`[Action Executor] Executing action for agent ${agentId}:`, {
    type: action.type,
    params: action.params,
  });

  try {
    switch (action.type) {
      case 'use_tool':
        return await executeTool(ctx, worldId, agentId, action.params);

      case 'claim_task':
        return await claimTask(ctx, worldId, agentId, action.params);

      case 'update_task':
        return await updateTask(ctx, worldId, agentId, action.params);

      case 'send_message':
        return await sendMessage(ctx, worldId, agentId, action.params);

      case 'delegate':
        return await delegateTask(ctx, worldId, agentId, action.params);

      case 'wait':
        return await waitAction(ctx, worldId, agentId, action.params);

      case 'move':
        return await moveAction(ctx, worldId, agentId, action.params);

      case 'start_conversation':
        return await startConversation(ctx, worldId, agentId, action.params);

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  } catch (error) {
    console.error('[Action Executor] Error executing action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a tool
 */
async function executeTool(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  params: { tool: string; input: any }
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // TODO: Implement tool execution
    // This should call the tool registry and execute the requested tool
    console.log(`[Action Executor] Tool execution: ${params.tool}`, params.input);

    // Placeholder - return success for now
    return {
      success: true,
      result: { message: 'Tool execution placeholder' },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}

/**
 * Claim a Jira task
 */
async function claimTask(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  params: { taskId: string; reason?: string }
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    await ctx.runMutation(internal.aetheria.tasks.claimTask, {
      worldId,
      agentId,
      taskId: params.taskId as Id<'jiraTasks'>,
      reason: params.reason,
    });

    return {
      success: true,
      result: { taskId: params.taskId, claimed: true },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to claim task',
    };
  }
}

/**
 * Update task status
 */
async function updateTask(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  params: { taskId: string; status: string; comment?: string }
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const validStatuses = ['pending', 'claimed', 'in_progress', 'completed', 'failed', 'blocked'];
    if (!validStatuses.includes(params.status)) {
      return {
        success: false,
        error: `Invalid status: ${params.status}. Must be one of: ${validStatuses.join(', ')}`,
      };
    }

    const result = await ctx.runMutation(internal.aetheria.tasks.updateTaskStatus, {
      worldId,
      agentId,
      taskId: params.taskId as Id<'jiraTasks'>,
      status: params.status as any,
      comment: params.comment,
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task',
    };
  }
}

/**
 * Send message to another agent
 */
async function sendMessage(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  params: {
    toAgent: string;
    messageType: 'direct' | 'broadcast' | 'delegation' | 'help_request';
    content: string;
    threadId?: string;
    relatedTaskId?: string;
    priority?: 'normal' | 'urgent';
  }
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const result = await ctx.runMutation(internal.aetheria.messaging.sendAgentMessage, {
      worldId,
      fromAgentId: agentId,
      toAgentId: params.toAgent,
      messageType: params.messageType,
      content: params.content,
      threadId: params.threadId,
      relatedTaskId: params.relatedTaskId as Id<'jiraTasks'> | undefined,
      metadata: params.priority ? { priority: params.priority } : undefined,
    });

    return {
      success: true,
      result: { messageId: result.messageId },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

/**
 * Delegate task to another agent
 */
async function delegateTask(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  params: {
    taskId: string;
    toAgent: string;
    reason: string;
    instructions?: string;
  }
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const result = await ctx.runMutation(internal.aetheria.tasks.delegateTask, {
      worldId,
      parentTaskId: params.taskId as Id<'jiraTasks'>,
      fromAgentId: agentId,
      toAgentId: params.toAgent,
      reason: params.reason,
      subtaskDescription: params.instructions,
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delegate task',
    };
  }
}

/**
 * Wait/idle action
 */
async function waitAction(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  params: { duration?: number; reason?: string }
): Promise<{ success: boolean; result?: any; error?: string }> {
  // Agent will wait (do nothing) for specified duration or until next tick
  console.log(`[Action Executor] Agent ${agentId} waiting:`, params.reason);

  return {
    success: true,
    result: { action: 'wait', duration: params.duration || 0 },
  };
}

/**
 * Move to a location
 */
async function moveAction(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  params: { x: number; y: number; reason?: string }
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // TODO: Implement movement
    // This should update agent's target position in the game world
    console.log(`[Action Executor] Move agent ${agentId} to (${params.x}, ${params.y})`);

    return {
      success: true,
      result: { targetPosition: { x: params.x, y: params.y } },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move',
    };
  }
}

/**
 * Start conversation with another agent
 */
async function startConversation(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  params: { withAgent: string; topic?: string }
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // TODO: Implement conversation initiation
    // This should trigger the conversation system
    console.log(`[Action Executor] Start conversation with ${params.withAgent}`);

    return {
      success: true,
      result: { conversationWith: params.withAgent, topic: params.topic },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start conversation',
    };
  }
}

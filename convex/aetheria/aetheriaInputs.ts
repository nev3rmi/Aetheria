/**
 * Aetheria Input Handlers
 *
 * Input handlers for task-oriented agent actions.
 * These extend the AI Town input system with Aetheria-specific behaviors.
 */

import { v } from 'convex/values';
import { inputHandler } from '../aiTown/inputHandler';
import { playerId, parseGameId } from '../aiTown/ids';

/**
 * Notify Agent New Task
 * Triggered when a Jira webhook assigns a task to an agent
 */
export const notifyAgentNewTask = inputHandler({
  args: {
    agentId: playerId,
    taskId: v.id('jiraTasks'),
    taskKey: v.string(),
    taskSummary: v.string(),
    taskLabels: v.array(v.string()),
  },
  handler: (game, now, args) => {
    console.log(`[Aetheria] Notifying agent ${args.agentId} of new task: ${args.taskKey}`);

    // Agent will discover the task in their next decision cycle
    // This input serves as a wake-up signal

    // TODO: If agent has in-progress operation, we could cancel it here
    // to prioritize the new task

    return { success: true };
  },
});

/**
 * Agent Claim Task
 * Agent claims an available task (self-assignment)
 */
export const agentClaimTask = inputHandler({
  args: {
    agentId: playerId,
    taskId: v.id('jiraTasks'),
    reason: v.string(),
  },
  handler: (game, now, args) => {
    console.log(`[Aetheria] Agent ${args.agentId} claiming task ${args.taskId}: ${args.reason}`);

    // Task claiming is handled in mutation layer (updates jiraTasks table)
    // This input confirms the claim in the game state

    return { success: true, taskId: args.taskId };
  },
});

/**
 * Agent Start Task
 * Agent begins working on a claimed task
 */
export const agentStartTask = inputHandler({
  args: {
    agentId: playerId,
    taskId: v.id('jiraTasks'),
  },
  handler: (game, now, args) => {
    console.log(`[Aetheria] Agent ${args.agentId} starting task ${args.taskId}`);

    // Mark agent as "working" state
    // This will be reflected in the visual UI

    return { success: true };
  },
});

/**
 * Agent Complete Task
 * Agent finishes a task successfully
 */
export const agentCompleteTask = inputHandler({
  args: {
    agentId: playerId,
    taskId: v.id('jiraTasks'),
    result: v.string(),
  },
  handler: (game, now, args) => {
    console.log(`[Aetheria] Agent ${args.agentId} completed task ${args.taskId}`);

    // Task completion is handled in mutation layer
    // This input updates agent state back to idle

    return { success: true, result: args.result };
  },
});

/**
 * Agent Use Tool
 * Agent executes a tool (scheduled as operation)
 */
export const agentUseTool = inputHandler({
  args: {
    agentId: playerId,
    operationId: v.string(),
    toolName: v.string(),
    toolInput: v.any(),
  },
  handler: (game, now, args) => {
    console.log(`[Aetheria] Agent ${args.agentId} using tool: ${args.toolName}`);

    // Tool execution happens in operation (action)
    // This input registers the intent

    return { success: true, operationId: args.operationId };
  },
});

/**
 * Agent Finish Tool Execution
 * Callback after tool operation completes
 */
export const agentFinishToolExecution = inputHandler({
  args: {
    agentId: playerId,
    operationId: v.string(),
    toolName: v.string(),
    success: v.boolean(),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: (game, now, args) => {
    const agentId = parseGameId('agents', args.agentId);
    const agent = game.world.agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Clear the in-progress operation
    if (
      agent.inProgressOperation &&
      agent.inProgressOperation.operationId === args.operationId
    ) {
      delete agent.inProgressOperation;
    }

    console.log(`[Aetheria] Agent ${agentId} finished tool execution: ${args.toolName}`, {
      success: args.success,
      error: args.error,
    });

    // Agent will process the result in next brain call
    return { success: true };
  },
});

/**
 * Agent Send Message
 * Agent sends a message to another agent or broadcasts
 */
export const agentSendMessage = inputHandler({
  args: {
    fromAgentId: playerId,
    toAgentId: v.optional(playerId),
    messageType: v.union(
      v.literal('direct'),
      v.literal('broadcast'),
      v.literal('delegation'),
      v.literal('help_request')
    ),
    content: v.string(),
    threadId: v.optional(v.string()),
    relatedTaskId: v.optional(v.id('jiraTasks')),
  },
  handler: (game, now, args) => {
    console.log(`[Aetheria] Agent ${args.fromAgentId} sending ${args.messageType} message`);

    // Message sending is handled in mutation layer (inserts into agentMessages)
    // This input confirms the send action

    return { success: true };
  },
});

/**
 * Agent Delegate Task
 * Agent creates subtask and delegates to another agent
 */
export const agentDelegateTask = inputHandler({
  args: {
    fromAgentId: playerId,
    toAgentId: playerId,
    parentTaskId: v.id('jiraTasks'),
    subtaskSummary: v.string(),
    subtaskDescription: v.string(),
    reason: v.string(),
  },
  handler: (game, now, args) => {
    console.log(`[Aetheria] Agent ${args.fromAgentId} delegating task to ${args.toAgentId}`);

    // Delegation creates subtask in Jira (handled in operation)
    // This input registers the delegation intent

    return { success: true };
  },
});

/**
 * Agent Finish Brain Decision
 * Callback after brain API call completes
 */
export const agentFinishBrainDecision = inputHandler({
  args: {
    agentId: playerId,
    operationId: v.string(),
    thought: v.string(),
    actionType: v.string(),
    actionParams: v.any(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: (game, now, args) => {
    const agentId = parseGameId('agents', args.agentId);
    const agent = game.world.agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Clear the in-progress operation
    if (
      agent.inProgressOperation &&
      agent.inProgressOperation.operationId === args.operationId
    ) {
      delete agent.inProgressOperation;
    }

    console.log(`[Aetheria] Agent ${agentId} brain decision complete`, {
      thought: args.thought.substring(0, 100),
      actionType: args.actionType,
      success: args.success,
    });

    // Agent will execute the action based on brain response
    // This is handled by scheduling appropriate operations

    return { success: true };
  },
});

/**
 * Agent Update Task Status
 * Agent updates Jira task status
 */
export const agentUpdateTaskStatus = inputHandler({
  args: {
    agentId: playerId,
    taskId: v.id('jiraTasks'),
    taskKey: v.string(),
    newStatus: v.string(),
  },
  handler: (game, now, args) => {
    console.log(`[Aetheria] Agent ${args.agentId} updating task ${args.taskKey} to ${args.newStatus}`);

    // Status update is handled in mutation/operation layer (calls Jira API)
    // This input confirms the update action

    return { success: true };
  },
});

/**
 * Agent Block on Task
 * Agent is blocked and cannot proceed
 */
export const agentBlockOnTask = inputHandler({
  args: {
    agentId: playerId,
    taskId: v.id('jiraTasks'),
    reason: v.string(),
  },
  handler: (game, now, args) => {
    console.log(`[Aetheria] Agent ${args.agentId} blocked on task ${args.taskId}: ${args.reason}`);

    // Agent enters "blocked" state
    // May trigger help request to other agents

    return { success: true };
  },
});

/**
 * Export all Aetheria input handlers
 */
export const aetheriaInputs = {
  notifyAgentNewTask,
  agentClaimTask,
  agentStartTask,
  agentCompleteTask,
  agentUseTool,
  agentFinishToolExecution,
  agentSendMessage,
  agentDelegateTask,
  agentFinishBrainDecision,
  agentUpdateTaskStatus,
  agentBlockOnTask,
};

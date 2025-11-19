import { v } from 'convex/values';
import { defineTable } from 'convex/server';
import { playerId } from '../aiTown/ids';

/**
 * Aetheria Schema Extension
 *
 * These tables extend AI Town with task-oriented multi-agent capabilities:
 * - Jira integration for task management
 * - External brain connectors (n8n/Dify)
 * - Tool execution tracking
 * - Agent communication system
 */

export const aetheriaTables = {
  // ============================================================================
  // JIRA INTEGRATION
  // ============================================================================

  /**
   * Stores tasks received from Jira webhooks
   * Agents poll this table to find work assigned to them
   */
  jiraTasks: defineTable({
    worldId: v.id('worlds'),
    issueKey: v.string(), // e.g., "PROJ-123"
    issueSummary: v.string(),
    issueDescription: v.optional(v.string()),
    issueStatus: v.string(), // e.g., "To Do", "In Progress", "Done"
    issueUrl: v.string(),
    labels: v.array(v.string()), // All Jira labels including agent tags
    agentLabels: v.array(v.string()), // Extracted agent labels (e.g., ["agent-alice"])
    assignedAgentId: v.optional(playerId), // Mapped from label to agent ID
    priority: v.optional(v.string()),
    receivedAt: v.number(), // Timestamp when webhook received
    claimedAt: v.optional(v.number()), // When agent claimed task
    completedAt: v.optional(v.number()), // When task marked done
    status: v.union(
      v.literal('pending'), // Received but not claimed
      v.literal('claimed'), // Agent claimed task
      v.literal('in_progress'), // Agent working on task
      v.literal('completed'), // Task finished successfully
      v.literal('failed'), // Task failed
      v.literal('blocked'), // Task blocked, needs help
    ),
    progressLog: v.optional(
      v.array(
        v.object({
          timestamp: v.number(),
          agentId: playerId,
          status: v.string(),
          comment: v.string(),
        }),
      ),
    ),
    lastSyncedAt: v.number(), // Last time we synced with Jira
    metadata: v.optional(
      v.object({
        projectKey: v.optional(v.string()),
        issueType: v.optional(v.string()),
        reporter: v.optional(v.string()),
        parentKey: v.optional(v.string()), // For subtasks
        blockedReason: v.optional(v.string()),
        blockedOn: v.optional(
          v.object({
            type: v.union(
              v.literal('waiting_for_agent'),
              v.literal('waiting_for_task'),
              v.literal('missing_info'),
              v.literal('external_dependency'),
            ),
            details: v.any(),
          }),
        ),
        blockedAt: v.optional(v.number()),
        result: v.optional(v.any()),
        completedBy: v.optional(playerId),
      }),
    ),
  })
    .index('by_agent', ['worldId', 'assignedAgentId', 'status'])
    .index('by_status', ['worldId', 'status', 'receivedAt'])
    .index('by_issue_key', ['issueKey'])
    .index('by_labels', ['worldId', 'labels'])
    .index('by_world', ['worldId', 'receivedAt']),

  /**
   * Tracks Jira webhook deliveries for idempotency
   * Prevents duplicate processing of retried webhooks
   */
  jiraWebhookLog: defineTable({
    webhookId: v.string(), // X-Atlassian-Webhook-Identifier header
    webhookEvent: v.string(), // e.g., "jira:issue_updated"
    issueKey: v.string(),
    receivedAt: v.number(),
    processedAt: v.number(),
    retryCount: v.optional(v.number()), // X-Atlassian-Webhook-Retry header
    payload: v.optional(v.any()), // Store full payload for debugging
  })
    .index('by_webhook_id', ['webhookId'])
    .index('by_issue_key', ['issueKey', 'receivedAt']),

  // ============================================================================
  // AGENT BRAINS (n8n / Dify)
  // ============================================================================

  /**
   * Maps agents to their external "brain" workflows
   * Each agent has a unique webhook URL that controls its behavior
   */
  agentBrains: defineTable({
    worldId: v.id('worlds'),
    agentId: playerId, // Reference to agent player
    agentName: v.string(), // Human-readable name (e.g., "CodeBot")
    brainType: v.union(v.literal('n8n'), v.literal('dify'), v.literal('custom')),
    webhookUrl: v.string(), // External brain endpoint
    apiKey: v.optional(v.string()), // Encrypted API key if needed
    permittedTools: v.array(v.string()), // Tools this agent can use
    configuration: v.optional(
      v.object({
        timeout: v.optional(v.number()), // Brain call timeout (ms)
        maxRetries: v.optional(v.number()), // Retry failed calls
        personality: v.optional(v.string()), // Agent personality description
        specialization: v.optional(v.array(v.string())), // Skills/domains
      }),
    ),
    isActive: v.boolean(), // Enable/disable brain
    createdAt: v.number(),
    lastCalledAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  })
    .index('by_agent', ['worldId', 'agentId'])
    .index('by_name', ['worldId', 'agentName'])
    .index('by_active', ['worldId', 'isActive'])
    .index('by_world', ['worldId', 'createdAt']),

  /**
   * Logs every call to external brains for debugging and analytics
   */
  brainCallLog: defineTable({
    worldId: v.id('worlds'),
    agentId: playerId,
    brainType: v.string(),
    callType: v.union(
      v.literal('decision'), // Agent deciding what to do
      v.literal('tool_result'), // Feeding back tool execution result
      v.literal('task_claim'), // Evaluating if agent can handle task
    ),
    request: v.any(), // Sent to brain
    response: v.optional(v.any()), // Brain's response
    duration: v.number(), // Milliseconds
    success: v.boolean(),
    error: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_agent', ['worldId', 'agentId', 'timestamp'])
    .index('by_type', ['worldId', 'callType', 'timestamp'])
    .index('by_success', ['worldId', 'success', 'timestamp'])
    .index('by_world', ['worldId', 'timestamp']),

  // ============================================================================
  // TOOL EXECUTION
  // ============================================================================

  /**
   * Available tools that agents can invoke
   * Tools are registered in code but tracked here for permissions
   */
  toolRegistry: defineTable({
    toolName: v.string(), // e.g., "web_search", "code_executor"
    displayName: v.string(),
    description: v.string(),
    category: v.union(
      v.literal('search'),
      v.literal('code'),
      v.literal('file'),
      v.literal('communication'),
      v.literal('jira'),
      v.literal('other'),
    ),
    inputSchema: v.any(), // JSON schema for validation
    requiresAuth: v.boolean(), // Needs API keys?
    isEnabled: v.boolean(),
    createdAt: v.number(),
  }).index('by_name', ['toolName']),

  /**
   * Logs every tool execution by agents
   * Provides observability and debugging
   */
  toolExecutions: defineTable({
    worldId: v.id('worlds'),
    agentId: playerId,
    taskId: v.optional(v.id('jiraTasks')), // Associated task if any
    toolName: v.string(),
    input: v.any(), // Parameters passed to tool
    output: v.optional(v.any()), // Tool result
    success: v.boolean(),
    error: v.optional(v.string()),
    duration: v.number(), // Milliseconds
    executedAt: v.number(),
    metadata: v.optional(
      v.object({
        retryCount: v.optional(v.number()),
        triggeredBy: v.optional(v.string()), // 'brain' or 'manual'
      }),
    ),
  })
    .index('by_agent', ['worldId', 'agentId', 'executedAt'])
    .index('by_tool', ['worldId', 'toolName', 'executedAt'])
    .index('by_task', ['taskId', 'executedAt'])
    .index('by_success', ['worldId', 'success', 'executedAt']),

  // ============================================================================
  // AGENT COMMUNICATION
  // ============================================================================

  /**
   * In-app messaging system for agent-to-agent communication
   * Supports direct messages, broadcasts, and threading
   */
  agentMessages: defineTable({
    worldId: v.id('worlds'),
    fromAgentId: playerId, // Sender
    toAgentId: v.optional(playerId), // Recipient (null = broadcast)
    messageType: v.union(
      v.literal('direct'), // One-to-one message
      v.literal('broadcast'), // Announce to all agents
      v.literal('delegation'), // Task delegation request
      v.literal('help_request'), // Request for assistance
      v.literal('status_update'), // Progress update
    ),
    content: v.string(),
    threadId: v.optional(v.string()), // Group related messages
    relatedTaskId: v.optional(v.id('jiraTasks')), // Task context
    metadata: v.optional(
      v.object({
        priority: v.optional(v.union(v.literal('low'), v.literal('normal'), v.literal('high'))),
        requiresResponse: v.optional(v.boolean()),
        expiresAt: v.optional(v.number()),
      }),
    ),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    sentAt: v.number(),
  })
    .index('by_recipient', ['worldId', 'toAgentId', 'sentAt'])
    .index('by_sender', ['worldId', 'fromAgentId', 'sentAt'])
    .index('by_thread', ['worldId', 'threadId', 'sentAt'])
    .index('by_task', ['relatedTaskId', 'sentAt'])
    .index('unread', ['worldId', 'toAgentId', 'isRead', 'sentAt'])
    .index('by_world', ['worldId', 'sentAt']),

  /**
   * Tracks task delegation between agents
   * When one agent asks another for help
   */
  taskDelegations: defineTable({
    worldId: v.id('worlds'),
    parentTaskId: v.id('jiraTasks'), // Original task
    childTaskId: v.optional(v.id('jiraTasks')), // Subtask created for delegate
    fromAgentId: playerId, // Delegator
    toAgentId: playerId, // Delegate
    reason: v.string(), // Why delegated
    status: v.union(
      v.literal('pending'), // Awaiting acceptance
      v.literal('accepted'), // Delegate accepted
      v.literal('rejected'), // Delegate rejected
      v.literal('completed'), // Subtask done
      v.literal('failed'), // Subtask failed
    ),
    messageId: v.optional(v.id('agentMessages')), // Related message
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    rejectedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })
    .index('by_parent_task', ['parentTaskId'])
    .index('by_delegate', ['worldId', 'toAgentId', 'status'])
    .index('by_delegator', ['worldId', 'fromAgentId', 'createdAt'])
    .index('by_world', ['worldId', 'createdAt']),

  // ============================================================================
  // OBSERVABILITY & LOGGING
  // ============================================================================

  /**
   * Structured logs of all agent actions
   * Used for debugging, analytics, and audit trails
   */
  agentActionLog: defineTable({
    worldId: v.id('worlds'),
    agentId: playerId,
    actionType: v.union(
      v.literal('task_claimed'),
      v.literal('task_started'),
      v.literal('task_completed'),
      v.literal('task_failed'),
      v.literal('tool_executed'),
      v.literal('brain_called'),
      v.literal('message_sent'),
      v.literal('delegation_created'),
      v.literal('state_changed'),
    ),
    thought: v.optional(v.string()), // Agent's reasoning from brain
    actionData: v.any(), // Context-specific data
    relatedTaskId: v.optional(v.id('jiraTasks')),
    relatedToolExecutionId: v.optional(v.id('toolExecutions')),
    success: v.boolean(),
    duration: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index('by_agent', ['worldId', 'agentId', 'timestamp'])
    .index('by_action_type', ['worldId', 'actionType', 'timestamp'])
    .index('by_task', ['relatedTaskId', 'timestamp'])
    .searchIndex('search_thoughts', {
      searchField: 'thought',
      filterFields: ['worldId', 'agentId'],
    }),

  /**
   * Agent state snapshots for debugging and replay
   * Captures agent state at key decision points
   */
  agentStateSnapshots: defineTable({
    worldId: v.id('worlds'),
    agentId: playerId,
    snapshotType: v.union(
      v.literal('before_decision'),
      v.literal('after_decision'),
      v.literal('error_state'),
    ),
    state: v.any(), // Full agent state
    currentTaskId: v.optional(v.id('jiraTasks')),
    recentMemories: v.optional(v.array(v.any())),
    availableTools: v.array(v.string()),
    timestamp: v.number(),
  })
    .index('by_agent', ['worldId', 'agentId', 'timestamp'])
    .index('by_task', ['currentTaskId', 'timestamp']),
};

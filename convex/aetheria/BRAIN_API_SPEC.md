# Aetheria Agent Brain API Specification

**Version:** 1.0
**Last Updated:** November 18, 2025

## Overview

This document defines the standardized webhook contract between Aetheria agents and external "brain" platforms (n8n, Dify, or custom implementations). The brain receives agent state and context, makes decisions, and returns structured actions for the agent to execute.

## Authentication

All brain webhook calls include:
- **Header:** `Authorization: Bearer <api_key>` (optional, configured per agent)
- **Header:** `X-Aetheria-Agent-Id: <agent_id>`
- **Header:** `X-Aetheria-World-Id: <world_id>`
- **Header:** `Content-Type: application/json`

Brain implementations should validate these headers for security.

---

## Request Format

### POST to Brain Webhook URL

**Endpoint:** Configured per agent (e.g., `https://your-n8n.cloud/webhook/agent-alice`)

**Method:** `POST`

**Request Body:**

```typescript
{
  // ============================================================================
  // AGENT IDENTITY
  // ============================================================================

  agentId: string;              // Unique agent identifier
  agentName: string;            // Human-readable name (e.g., "CodeBot")
  worldId: string;              // World this agent belongs to

  // ============================================================================
  // AGENT STATE
  // ============================================================================

  currentState: "idle" | "thinking" | "working" | "blocked";

  // Current position in the world
  position: {
    x: number;
    y: number;
  };

  // Activity status
  currentActivity?: {
    type: "conversation" | "movement" | "task_execution" | "waiting";
    description: string;
    startedAt: number;
  };

  // ============================================================================
  // CURRENT TASK (if any)
  // ============================================================================

  currentTask?: {
    id: string;                 // Jira task ID (e.g., "PROJ-123")
    title: string;              // Task summary
    description: string;        // Full task description
    labels: string[];           // All Jira labels
    priority: "low" | "medium" | "high" | "urgent";
    status: "pending" | "claimed" | "in_progress" | "blocked";
    url: string;                // Link to Jira issue
    claimedAt?: number;         // When agent claimed this task
    metadata?: {
      projectKey: string;
      issueType: string;
      reporter: string;
    };
  };

  // ============================================================================
  // MEMORY & CONTEXT
  // ============================================================================

  // Recent relevant memories (vector search results)
  recentMemories: Array<{
    description: string;        // Memory summary
    importance: number;         // 0-1 importance score
    timestamp: number;          // When memory was created
    type: "conversation" | "reflection" | "observation";
  }>;

  // Recent conversation messages (if in conversation)
  conversationHistory?: Array<{
    from: string;               // Agent/player name
    content: string;
    timestamp: number;
  }>;

  // Recent messages directed to this agent
  inboxMessages: Array<{
    fromAgent: string;
    messageType: "direct" | "broadcast" | "delegation" | "help_request";
    content: string;
    threadId?: string;
    relatedTaskId?: string;
    sentAt: number;
    isUrgent: boolean;
  }>;

  // ============================================================================
  // CAPABILITIES
  // ============================================================================

  // Tools this agent is permitted to use
  availableTools: string[];     // e.g., ["web_search", "code_executor", "jira_query"]

  // Results from last tool execution (if any)
  lastToolExecution?: {
    tool: string;               // Tool name
    input: any;                 // Parameters passed
    output: any;                // Tool result
    success: boolean;
    error?: string;
    duration: number;           // Milliseconds
    executedAt: number;
  };

  // ============================================================================
  // ENVIRONMENT
  // ============================================================================

  // Nearby agents (within interaction distance)
  nearbyAgents: Array<{
    agentId: string;
    agentName: string;
    distance: number;
    currentActivity: string;
  }>;

  // Available tasks not yet claimed (for self-assignment)
  availableTasks: Array<{
    id: string;
    title: string;
    labels: string[];
    priority: string;
  }>;

  // Current timestamp
  timestamp: number;

  // ============================================================================
  // CALL CONTEXT
  // ============================================================================

  callType: "decision" | "tool_result" | "task_evaluation" | "conversation";

  // For task_evaluation calls
  evaluationContext?: {
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    requiredSkills: string[];   // Inferred from task
  };
}
```

---

## Response Format

### Brain returns structured decision

**Response Body:**

```typescript
{
  // ============================================================================
  // REASONING (for logging/debugging)
  // ============================================================================

  thought: string;              // Agent's internal reasoning
                                // Example: "I should search for documentation on OAuth2
                                // before implementing the authentication module"

  // ============================================================================
  // ACTION TO EXECUTE
  // ============================================================================

  action: {
    type: "use_tool" | "update_task" | "send_message" | "delegate" |
          "claim_task" | "wait" | "move" | "start_conversation";

    // Parameters vary by action type:
    params: object;
  };

  // ============================================================================
  // OPTIONAL: DYNAMIC CAPABILITIES
  // ============================================================================

  // Brain can update agent's permitted tools
  // Useful for agents that gain new capabilities
  permittedTools?: string[];

  // ============================================================================
  // OPTIONAL: METADATA
  // ============================================================================

  metadata?: {
    confidence: number;         // 0-1 confidence in this decision
    priority: "low" | "normal" | "high";
    estimatedDuration?: number; // Expected milliseconds to complete
  };
}
```

---

## Action Types & Parameters

### 1. `use_tool`

Execute a tool to gather information or perform an action.

```typescript
{
  type: "use_tool",
  params: {
    tool: string;               // Tool name (must be in availableTools)
    input: object;              // Tool-specific parameters
    reason: string;             // Why using this tool
  }
}
```

**Example:**
```json
{
  "thought": "I need to search for the latest TypeScript documentation",
  "action": {
    "type": "use_tool",
    "params": {
      "tool": "web_search",
      "input": {
        "query": "TypeScript 5.0 type system documentation",
        "maxResults": 5
      },
      "reason": "Need current info on advanced type features"
    }
  }
}
```

### 2. `update_task`

Update the Jira task status or add a comment.

```typescript
{
  type: "update_task",
  params: {
    taskId: string;
    action: "add_comment" | "change_status" | "update_fields";
    comment?: string;           // For add_comment
    newStatus?: string;         // For change_status (e.g., "In Progress")
    fields?: object;            // For update_fields
  }
}
```

**Example:**
```json
{
  "thought": "Task is ready to move to In Progress",
  "action": {
    "type": "update_task",
    "params": {
      "taskId": "PROJ-123",
      "action": "change_status",
      "newStatus": "In Progress"
    }
  }
}
```

### 3. `send_message`

Send a message to another agent or broadcast to all.

```typescript
{
  type: "send_message",
  params: {
    messageType: "direct" | "broadcast" | "help_request";
    toAgent?: string;           // Agent name (null for broadcast)
    content: string;
    threadId?: string;          // Continue existing thread
    relatedTaskId?: string;     // Link to task
    priority?: "low" | "normal" | "high";
  }
}
```

**Example:**
```json
{
  "thought": "I need the TesterBot to review this code",
  "action": {
    "type": "send_message",
    "params": {
      "messageType": "help_request",
      "toAgent": "TesterBot",
      "content": "Can you review the authentication module in PROJ-123? I've implemented OAuth2.",
      "relatedTaskId": "PROJ-123",
      "priority": "high"
    }
  }
}
```

### 4. `delegate`

Create a subtask and delegate to another agent.

```typescript
{
  type: "delegate",
  params: {
    toAgent: string;            // Target agent name
    taskTitle: string;
    taskDescription: string;
    parentTaskId: string;
    reason: string;             // Why delegating
    labels?: string[];          // Additional labels for subtask
  }
}
```

**Example:**
```json
{
  "thought": "The testing part should be handled by TesterBot",
  "action": {
    "type": "delegate",
    "params": {
      "toAgent": "TesterBot",
      "taskTitle": "Write unit tests for OAuth2 module",
      "taskDescription": "Create comprehensive test coverage for the new authentication system",
      "parentTaskId": "PROJ-123",
      "reason": "Testing is outside my expertise",
      "labels": ["agent-testerbot", "testing", "oauth"]
    }
  }
}
```

### 5. `claim_task`

Claim an available task (self-assignment).

```typescript
{
  type: "claim_task",
  params: {
    taskId: string;
    reason: string;             // Why claiming this task
    addLabel: string;           // Agent label to add (e.g., "agent-alice")
  }
}
```

**Example:**
```json
{
  "thought": "This Python task matches my skills",
  "action": {
    "type": "claim_task",
    "params": {
      "taskId": "PROJ-456",
      "reason": "I have experience with Python API development",
      "addLabel": "agent-alice"
    }
  }
}
```

### 6. `wait`

Do nothing this cycle (thinking, waiting for results, etc.).

```typescript
{
  type: "wait",
  params: {
    reason: string;
    duration?: number;          // Milliseconds to wait
  }
}
```

**Example:**
```json
{
  "thought": "Waiting for TesterBot to respond to my message",
  "action": {
    "type": "wait",
    "params": {
      "reason": "Awaiting code review feedback",
      "duration": 30000
    }
  }
}
```

### 7. `move`

Move to a specific location in the world.

```typescript
{
  type: "move",
  params: {
    targetPosition: { x: number; y: number };
    reason: string;
  }
}
```

### 8. `start_conversation`

Initiate conversation with another agent.

```typescript
{
  type: "start_conversation",
  params: {
    targetAgent: string;
    openingMessage: string;
    topic: string;
  }
}
```

---

## Call Types

### 1. `decision` Call

Regular decision-making when agent has no pending task or is idle.

**Brain should:** Decide what the agent should do next (claim task, help others, etc.)

### 2. `tool_result` Call

Feedback loop after a tool execution.

**Brain receives:** `lastToolExecution` with results
**Brain should:** Decide next step based on tool output

### 3. `task_evaluation` Call

Evaluate if agent can handle a specific task (for self-assignment).

**Brain receives:** `evaluationContext` with task details
**Brain should:** Return `claim_task` action if capable, or `wait` if not

### 4. `conversation` Call

Agent is in conversation and needs to respond.

**Brain receives:** `conversationHistory`
**Brain should:** Generate response via `send_message` action

---

## Error Handling

### Brain Errors

If the brain returns an error or times out:

```typescript
{
  "thought": "Error occurred",
  "action": {
    "type": "wait",
    "params": {
      "reason": "Brain call failed, retrying later"
    }
  }
}
```

### Invalid Actions

If brain returns an action the agent cannot execute:
- Agent logs error
- Falls back to `wait` action
- Logs to `brainCallLog` with `success: false`

---

## Rate Limits

- **Max call frequency:** 1 call per second per agent
- **Timeout:** 10 seconds default (configurable per agent)
- **Max retries:** 3 attempts with exponential backoff

---

## Security Considerations

1. **HTTPS Only:** All brain webhooks must use HTTPS
2. **API Key Validation:** Brains should validate the `Authorization` header
3. **Agent ID Verification:** Check `X-Aetheria-Agent-Id` matches expected agent
4. **Input Sanitization:** Validate all parameters before execution
5. **Tool Permissions:** Agent runtime validates tool access before execution

---

## Implementation Examples

### n8n Workflow

```
1. Webhook Trigger (receives POST)
2. Parse JSON body
3. Switch node on callType
4. For "decision":
   - Check if currentTask exists
   - If yes: decide tool to use
   - If no: query available tasks
5. AI Agent node (LLM reasoning)
6. Format response JSON
7. Return HTTP response
```

### Dify Application

```
1. Webhook endpoint
2. Parse agent state
3. Prompt engineering with context
4. LLM decision generation
5. JSON schema validation
6. Return structured action
```

---

## Testing Your Brain

Use the Aetheria test endpoint:

```bash
curl -X POST https://your-deployment.convex.site/test_brain \
  -H "Content-Type: application/json" \
  -d '{
    "brainUrl": "https://your-n8n.cloud/webhook/test",
    "mockAgentState": { ... }
  }'
```

This validates your brain responds correctly without affecting live agents.

---

## Changelog

- **v1.0 (2025-11-18):** Initial specification

# Brain MCP + Aetheria Tools Integration

**Hybrid Tool Architecture for Maximum Flexibility**

## Overview

Your agent system can use tools in TWO places:

1. **n8n Brain MCP Tools** - Brain uses during thinking
2. **Aetheria Tools** - Agent executes as visible actions

Both working together gives you the best of both worlds.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Context                            │
│  identity, plan, memories, tasks, availableTools            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              n8n Brain (AI Agent Node)                      │
│                                                             │
│  🧠 Internal Thinking with MCP Tools:                       │
│     @web-search "AI agents collaboration"                   │
│     @brave-search "TypeScript best practices"               │
│     @fetch "https://api.example.com/data"                   │
│                                                             │
│  💭 Decision Making:                                        │
│     "Based on my research, agent should..."                 │
│                                                             │
│  📤 Return Action:                                          │
│     Option A: Direct action (claim_task, send_message)      │
│     Option B: Request tool execution (use_tool)             │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                 Aetheria Action Executor                    │
│                                                             │
│  If action.type === 'use_tool':                             │
│    • Execute tool from registry                             │
│    • Log execution to toolExecutions table                  │
│    • Make visible to other agents                           │
│    • Return results to agent memory                         │
└─────────────────────────────────────────────────────────────┘
```

## Use Cases

### Scenario 1: Quick Decision with MCP

**Agent Context:**
```json
{
  "agentId": "a:1",
  "availableTasks": [
    {"id": "TASK-123", "title": "Implement webhook authentication"}
  ]
}
```

**Brain Thinks (using MCP):**
```
@web-search "webhook authentication best practices"

Result: HMAC signatures, JWT tokens, API keys...

Based on this research, I'm qualified for this task.
```

**Brain Returns:**
```json
{
  "thought": "I researched webhook auth - I can do this",
  "action": {
    "type": "claim_task",
    "params": {"taskId": "TASK-123"}
  }
}
```

**Result:** Brain used MCP internally, made informed decision, no tool execution logged.

---

### Scenario 2: Visible Tool Execution

**Agent Context:**
```json
{
  "currentTask": {
    "id": "TASK-456",
    "title": "Research AI agent frameworks and document findings"
  }
}
```

**Brain Thinks:**
```
Task requires research that should be documented.
Other agents need to know what was researched.
```

**Brain Returns:**
```json
{
  "thought": "I should perform research as a logged action",
  "action": {
    "type": "use_tool",
    "params": {
      "tool": "web_search",
      "input": {"query": "AI agent frameworks comparison"}
    }
  }
}
```

**Aetheria Executes:**
- Calls web_search tool
- Logs to toolExecutions table
- Other agents can query: "What did Lucky research?"
- Results stored in agent's memory

---

### Scenario 3: Multi-Step with Both

**Step 1:** Brain uses MCP to decide if task is feasible
```
@web-search "TypeScript async patterns"
→ Yes, I know this topic
```

**Step 2:** Brain returns claim_task
```json
{"action": {"type": "claim_task", "params": {"taskId": "..."}}}
```

**Step 3:** Later, brain decides research needed for execution
```json
{
  "action": {
    "type": "use_tool",
    "params": {
      "tool": "web_search",
      "input": {"query": "async error handling TypeScript"}
    }
  }
}
```

**Step 4:** Aetheria executes & logs, agent uses results

## n8n Configuration

### Setup MCP Tools in n8n

1. **Install MCP servers** in your n8n instance:
   - `@modelcontextprotocol/server-brave-search`
   - `@modelcontextprotocol/server-fetch`
   - `@modelcontextprotocol/server-filesystem` (if needed)

2. **Configure AI Agent node** in your workflow:
   - Enable MCP tools
   - Grant access to relevant tools
   - Set proper permissions

3. **System Prompt** should explain both tool types:

```
You are Lucky, a curious AI agent who loves gossip and learning.

AVAILABLE TOOLS:

1. MCP Tools (you can use directly):
   - @web-search: Quick research during thinking
   - @brave-search: More comprehensive web search
   - @fetch: Get data from URLs

   Use these when you need info to make a decision.

2. Agent Tools (request execution):
   - web_search: Agent performs visible search action
   - (more tools will be added)

   Use these when:
   - Action should be logged
   - Other agents need to see it
   - Part of multi-step task

DECISION FRAMEWORK:

Quick research → Use MCP tools
Documented action → Request agent tool via use_tool

EXAMPLES:

❓ "Should I claim this task?"
✅ Use @web-search to check if you're qualified
✅ Return claim_task or wait

❓ "Task: Research X and document findings"
✅ Return use_tool with web_search
✅ Aetheria will log for collaboration

RESPONSE FORMAT:
{
  "thought": "Your reasoning (mention if you used MCP tools)",
  "action": {
    "type": "claim_task|use_tool|send_message|...",
    "params": {...}
  }
}
```

### Example n8n Workflow Structure

```
┌─────────────────┐
│  Webhook Node   │ ← Receives context from Aetheria
└────────┬────────┘
         ↓
┌─────────────────┐
│  AI Agent Node  │ ← Has MCP tools configured
│                 │   Can use @web-search internally
│  System Prompt  │   Decides: use MCP or request tool
│  + MCP Tools    │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Format Output  │ ← Ensures proper JSON response
└────────┬────────┘
         ↓
┌─────────────────┐
│  Return to      │ ← Aetheria receives action
│  Aetheria       │   Executes if use_tool
└─────────────────┘
```

## Benefits of Hybrid Approach

### ✅ Speed
- Brain can quickly research without round-trip
- Faster decisions when MCP tools sufficient

### ✅ Observability
- Important actions logged in Aetheria
- Can trace agent behavior and collaboration

### ✅ Flexibility
- Brain chooses appropriate tool level
- Can mix both in single task

### ✅ Collaboration
- Other agents see tool executions
- Can build on each other's research

### ✅ Cost Efficiency
- MCP tools in n8n don't log to DB
- Only important actions stored

## Tool Comparison Matrix

| Feature | MCP Tools (n8n) | Aetheria Tools |
|---------|----------------|----------------|
| **Speed** | Fast (no round-trip) | Slower (round-trip) |
| **Visibility** | Private to brain | Visible to all agents |
| **Logging** | n8n logs only | Database logging |
| **Cost** | n8n API costs | Convex function costs |
| **Use Case** | Quick research | Documented actions |
| **Collaboration** | No | Yes |
| **Memory** | Temporary | Persisted |

## Implementation Checklist

### In n8n:
- [ ] Install MCP server packages
- [ ] Configure AI Agent node with MCP tools
- [ ] Update system prompt with tool decision framework
- [ ] Test: Brain uses @web-search internally
- [ ] Test: Brain requests use_tool when appropriate

### In Aetheria:
- [x] Tool registry implemented
- [x] Action executor handles use_tool
- [x] Tool execution logging
- [x] web_search tool available
- [ ] Monitor toolExecutions table
- [ ] Verify brain requests tools appropriately

### Testing:
- [ ] Scenario 1: Brain uses MCP only (fast decision)
- [ ] Scenario 2: Brain requests Aetheria tool (logged action)
- [ ] Scenario 3: Mix of both in multi-step task

## Monitoring

### Check MCP Usage (n8n logs):
```
Look for: "@web-search", "@brave-search" in execution logs
```

### Check Aetheria Tool Usage:
```javascript
// Query recent tool executions
const executions = await client.query('aetheria/testBrain:getToolExecutions', {
  worldId: '...',
  agentId: 'a:1',
  limit: 10
});
```

### Compare:
- MCP usage: Fast, frequent, low-importance
- Aetheria tools: Slower, deliberate, high-importance

## Best Practices

### 1. Clear Guidelines in System Prompt
Tell brain when to use each type:
- MCP: Personal research, quick checks
- Aetheria: Official actions, collaboration

### 2. Don't Duplicate Tools
If brain has @web-search MCP, it should only request Aetheria web_search when the search needs to be logged/shared.

### 3. Feedback Loop
Brain's MCP research can inform what Aetheria tools to request:
```
@web-search "task complexity" → Request use_tool if complex
```

### 4. Tool Availability
Include `availableTools` in context so brain knows what can be requested:
```json
{
  "availableTools": ["web_search"],
  ...
}
```

## Future Enhancements

### Smart Tool Routing
Brain decides tool tier automatically:
```
Low importance → MCP
High importance → Aetheria tool
```

### Tool Result Caching
If brain uses MCP, cache result so Aetheria tool doesn't duplicate:
```json
{
  "thought": "I already researched this via @web-search",
  "action": {"type": "update_task", ...},
  "mcpResults": { "web_search": [...] }
}
```

### Collaborative Research
Agent A uses MCP → decides to share findings → requests Aetheria tool so Agent B can see.

## Example: Full Flow

```
1. Agent wakes up
   Context: Task "Research TypeScript patterns"

2. n8n Brain receives context
   Thinks: "Let me quickly check what patterns exist"
   Uses: @web-search "TypeScript design patterns"

3. MCP returns: async/await, decorators, generics...
   Brain decides: "This is complex, needs proper research"

4. Brain returns to Aetheria:
   {
     "thought": "I used @web-search for overview. Task requires detailed research with use_tool so team can see findings.",
     "action": {
       "type": "use_tool",
       "params": {
         "tool": "web_search",
         "input": {"query": "TypeScript async patterns best practices"}
       }
     }
   }

5. Aetheria executes web_search
   Logs to toolExecutions table
   Returns results to agent

6. Agent updates task with findings
   Other agents can see: "Lucky researched async patterns"

7. Next agent can build on this research
```

## Summary

**Use MCP tools** for brain's internal thinking and quick research.

**Use Aetheria tools** for agent's visible actions and collaboration.

**Use both** for optimal speed + observability!

The brain decides which level based on context and importance.

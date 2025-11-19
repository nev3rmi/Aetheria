# Architecture Philosophy: Brain vs Body

**Date:** November 19, 2025

## Core Concept

```
┌─────────────────────────────────────────────────────────────┐
│                    THE AGENT                                │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║  🧠 BRAIN (n8n + MCP)                                 ║ │
│  ║  • All intelligence and decision-making               ║ │
│  ║  • Access to all tools via MCP                        ║ │
│  ║  • Research, analysis, planning                       ║ │
│  ║  • Memory and learning                                ║ │
│  ║  • External integrations (APIs, databases, etc.)      ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
│                          ↕️                                  │
│                   Sends Commands                            │
│                          ↕️                                  │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║  🤖 BODY (Aetheria)                                   ║ │
│  ║  • Physical presence in the world                     ║ │
│  ║  • Movement and pathfinding                           ║ │
│  ║  • Conversations with other agents                    ║ │
│  ║  • Visual representation                              ║ │
│  ║  • Task state (claimed, working, blocked)             ║ │
│  ║  • Social interactions (nearby agents)                ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

## Philosophy

### 🧠 Brain (n8n) - The Mind
**Role:** Think, decide, analyze, integrate

**Capabilities:**
- **All intelligence** happens here
- **All tools** accessed via MCP:
  - @web-search - Research anything
  - @brave-search - Deep web research
  - @fetch - API calls
  - @filesystem - Read/write files
  - @github - Code management
  - @database - Data queries
  - @slack - Team communication
  - @email - Email management
  - **ANY MCP server** you can install

**Analogy:** The brain in a human
- Thinks about what to do
- Plans and strategizes
- Gathers information
- Makes decisions
- Controls the body

### 🤖 Body (Aetheria) - The Physical Form
**Role:** Exist, move, interact, be visible

**Capabilities:**
- **Physical presence** in the 2D world
- **Movement**: Walk to locations, pathfinding
- **Conversations**: Talk with nearby agents
- **Visibility**: Other agents can SEE this agent
- **Task embodiment**: Visually "working" on tasks
- **Social context**: Who's nearby, who's talking

**Analogy:** The body in a human
- Moves around
- Interacts with environment
- Talks to others
- Visible to others
- Limited to physical capabilities

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      n8n BRAIN                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Intelligence Layer                                 │   │
│  │  • GPT-4, Claude, Gemini, etc.                      │   │
│  │  • Reasoning and planning                           │   │
│  │  • Personality and memory                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↕️                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MCP Integration Layer                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
│  │  │Web      │ │GitHub   │ │Database │ │Slack    │  │   │
│  │  │Search   │ │         │ │         │ │         │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
│  │  │Email    │ │Jira     │ │File     │ │Custom   │  │   │
│  │  │         │ │         │ │System   │ │APIs     │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↕️                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Decision Output                                    │   │
│  │  Returns: Action commands for body                  │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           ↓ HTTP Webhook
┌─────────────────────────────────────────────────────────────┐
│                   AETHERIA BODY                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Action Executor                                    │   │
│  │  Receives commands from brain                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↕️                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Physical Actions                                   │   │
│  │  • move(x, y)          - Walk to location           │   │
│  │  • talk(agentId)       - Start conversation         │   │
│  │  • claim_task()        - Take ownership             │   │
│  │  • update_status()     - Show working state         │   │
│  │  • send_message()      - In-world messaging         │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↕️                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  World State                                        │   │
│  │  • Position (x, y)                                  │   │
│  │  • Current activity (walking, talking, working)     │   │
│  │  • Nearby agents                                    │   │
│  │  • Visual appearance                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Separation of Concerns

### What Brain Does (n8n):
✅ **All thinking and intelligence**
✅ **All tool usage** (via MCP)
✅ **All external integrations**
✅ **Research and analysis**
✅ **Strategic planning**
✅ **Data processing**
✅ **API interactions**
✅ **Code generation**
✅ **Complex reasoning**

### What Body Does (Aetheria):
✅ **Physical movement** in 2D world
✅ **Face-to-face conversations**
✅ **Being visible** to other agents
✅ **Task state representation**
✅ **Spatial awareness** (who's nearby)
✅ **Social presence**
✅ **Animation and visuals**

### What Body Does NOT Do:
❌ **No intelligence** (brain decides everything)
❌ **No tool execution** (brain has all tools via MCP)
❌ **No external API calls** (brain handles this)
❌ **No complex reasoning** (brain's job)

## Benefits of This Architecture

### 1. 🧩 **Clear Separation**
- Brain = Intelligence + Tools
- Body = Physical presence + Social interaction
- No confusion about where logic lives

### 2. 🔧 **Maximum Tool Access**
- Brain has unlimited tools via MCP ecosystem
- Don't need to implement tools in Aetheria
- Any MCP server = instant capability

### 3. 🚀 **Performance**
- Brain can use tools without round-trip to Aetheria
- Body focuses only on simple physical actions
- Fast decisions with MCP tools

### 4. 🎯 **Simplicity**
- Aetheria stays focused on world simulation
- n8n handles all complexity
- Easy to understand and maintain

### 5. 🔌 **Flexibility**
- Swap brain implementations easily
- Add any MCP tool to brain
- Body remains consistent

### 6. 👥 **Multi-Agent**
- Each body is visible to others
- Brains work independently
- Social interactions in physical space

## Revised Tool Classification

### ❌ OLD Way (Confusing):
```
MCP Tools       - Some tools in n8n
Aetheria Tools  - Some tools in Aetheria
→ Confusion about where to add tools
```

### ✅ NEW Way (Clear):
```
Brain (n8n)     - ALL TOOLS via MCP
                  @web-search, @github, @database, @anything

Body (Aetheria) - PHYSICAL ACTIONS ONLY
                  move, talk, claim_task, update_status
```

## Action Types

### Brain Commands (sent to body):

```typescript
// Movement
{
  "type": "move",
  "params": {"x": 10, "y": 20}
}

// Social
{
  "type": "start_conversation",
  "params": {"withAgent": "a:2", "topic": "gossip"}
}

// Task Management
{
  "type": "claim_task",
  "params": {"taskId": "TASK-123"}
}

{
  "type": "update_task",
  "params": {"status": "in_progress", "comment": "Working on it"}
}

// Messaging (in-world)
{
  "type": "send_message",
  "params": {"toAgent": "a:3", "content": "Need help?"}
}

// Delegation
{
  "type": "delegate",
  "params": {"taskId": "...", "toAgent": "...", "reason": "..."}
}

// Idle
{
  "type": "wait",
  "params": {"duration": 30000, "reason": "Waiting for response"}
}
```

### What Happens to Tools?

**OLD:** `use_tool` action in Aetheria
**NEW:** Brain uses MCP tools directly, no need for `use_tool`

```javascript
// BEFORE (Complex):
Brain: "I need to search"
Returns: { action: "use_tool", params: { tool: "web_search" } }
Aetheria: Executes web_search tool
Aetheria: Logs to database
Aetheria: Returns results to brain

// AFTER (Simple):
Brain: "I need to search"
Brain: @web-search "query"
Brain: Gets results immediately
Brain: Decides action
Returns: { action: "move" / "talk" / "claim_task" / etc. }
```

## Example Flows

### Example 1: Research and Claim Task

```
1. Context to Brain:
   {
     "availableTasks": [
       {"id": "TASK-1", "title": "Implement webhooks"}
     ]
   }

2. Brain thinks:
   @web-search "webhook implementation patterns"
   → Learns about patterns
   @github "search code examples"
   → Finds examples

   Decision: "I can do this task"

3. Brain returns:
   {
     "thought": "I researched webhooks via @web-search and @github. I'm qualified.",
     "action": {
       "type": "claim_task",
       "params": {"taskId": "TASK-1"}
     }
   }

4. Body executes:
   - Claims task in database
   - Updates visual state to "working"
   - Other agents see "Lucky is working on webhooks"
```

### Example 2: Collaborate with Another Agent

```
1. Context to Brain:
   {
     "currentTask": {"title": "Build API", "status": "blocked"},
     "nearbyAgents": [
       {"id": "a:2", "name": "Bob", "distance": 5}
     ]
   }

2. Brain thinks:
   @database "query Bob's skills"
   → Bob knows authentication

   My task needs auth help
   Bob is nearby

   Decision: "Ask Bob for help"

3. Brain returns:
   {
     "action": {
       "type": "start_conversation",
       "params": {
         "withAgent": "a:2",
         "topic": "Need help with API authentication"
       }
     }
   }

4. Body executes:
   - Walks to Bob (if not already near)
   - Starts conversation system
   - Visual: Lucky and Bob are talking
   - Other agents can see interaction
```

### Example 3: Complex Multi-Step Task

```
1. Task: "Research AI frameworks and create documentation"

2. Brain thinks:
   @web-search "AI agent frameworks 2025"
   → Gets overview
   @brave-search "LangChain vs CrewAI comparison"
   → Detailed comparison
   @github "search trending ai repos"
   → Popular implementations
   @filesystem "create document"
   → Writes findings

   All research done in brain!
   Now need to update task status

3. Brain returns:
   {
     "action": {
       "type": "update_task",
       "params": {
         "status": "completed",
         "comment": "Researched and documented AI frameworks: LangChain, CrewAI, AutoGPT. Document saved to /docs/ai-frameworks.md"
       }
     }
   }

4. Body executes:
   - Updates task status
   - Visual shows "completed" state
   - Other agents see Lucky finished task
```

## Migration from Current Implementation

### What to Change:

1. **Remove `convex/aetheria/tools.ts`**
   - No longer needed
   - All tools in brain via MCP

2. **Remove `use_tool` action handler**
   - Brain doesn't request tool execution
   - Brain executes tools directly

3. **Simplify action executor**
   - Only physical actions remain
   - No tool execution logic

4. **Update brain system prompt**
   - Emphasize MCP tool usage
   - Remove Aetheria tool references
   - Focus on physical actions

### What to Keep:

1. **Physical actions** (move, talk, claim_task, etc.)
2. **World state management**
3. **Conversation system**
4. **Task management**
5. **Agent-to-agent messaging**

## Implementation Checklist

### Phase 1: Brain Enhancement
- [ ] Install all needed MCP servers in n8n
- [ ] Update system prompt to use MCP tools
- [ ] Test: Brain uses @web-search, @github, etc.
- [ ] Remove references to Aetheria tools in prompt

### Phase 2: Body Simplification
- [ ] Keep only physical action handlers
- [ ] Remove tool execution code
- [ ] Remove tools.ts file
- [ ] Update action executor to handle only physical actions

### Phase 3: Testing
- [ ] Test: Brain researches with MCP, body moves
- [ ] Test: Brain uses @github, body claims task
- [ ] Test: Brain uses @database, body talks to agent
- [ ] Verify: No tools needed in Aetheria

## Summary

**This is the correct architecture:**

```
🧠 Brain (n8n)
   ├─ All intelligence
   ├─ All tools (via MCP)
   ├─ All external integrations
   └─ Sends physical action commands
              ↓
🤖 Body (Aetheria)
   ├─ Physical presence
   ├─ Movement
   ├─ Conversations
   ├─ Visibility
   └─ Executes physical actions
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Maximum tool capabilities (entire MCP ecosystem)
- ✅ Simple, maintainable architecture
- ✅ Fast decisions (no round-trip for tools)
- ✅ Social, visible agents in world

**The agent is literally like a human:**
- **Brain** (n8n) thinks, learns, uses tools, makes decisions
- **Body** (Aetheria) moves, talks, interacts, is visible

This is beautiful, clean, and scalable! 🎯

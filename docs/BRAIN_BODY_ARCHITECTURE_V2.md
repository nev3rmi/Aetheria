# Brain-Body Architecture V2: Observer Pattern

**Date:** November 19, 2025

## Core Concept

```
┌─────────────────────────────────────────────────────────────┐
│                    THE AGENT                                │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║  🤖 BODY (Aetheria)                                   ║ │
│  ║  • Lives in the world                                 ║ │
│  ║  • Observes environment                               ║ │
│  ║  • Senses: nearby agents, messages, tasks             ║ │
│  ║  • Sends observations to brain: "What should I do?"   ║ │
│  ║  • Executes brain's commands                          ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
│                          ↕️                                  │
│                  "What do I do?" ↑                          │
│                  Commands        ↓                          │
│                          ↕️                                  │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║  🧠 BRAIN (n8n + MCP)                                 ║ │
│  ║  • Deep research & knowledge base                     ║ │
│  ║  • Short-term memory (conversation context)           ║ │
│  ║  • Long-term memory (experiences, learning)           ║ │
│  ║  • Study and observe patterns                         ║ │
│  ║  • All tools via MCP                                  ║ │
│  ║  • Decides: "Here's what you should do"              ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

## Philosophy: Body Asks, Brain Decides

### 🤖 Body (Aetheria) - The Observer & Executor

**Role:** Sense, ask, execute

**The Body's Perspective:**
```
"I'm in the world. I see things. I experience things.
 I don't know what to do.
 Let me ask my brain."
```

**Capabilities:**
- 👁️ **Observe** the environment:
  - See nearby agents
  - Read incoming messages
  - Notice available tasks
  - Feel current state (idle, working, blocked)
  - Sense spatial context

- 🙋 **Ask** the brain:
  - "I see 3 tasks available - which should I take?"
  - "Bob just messaged me - how should I respond?"
  - "I'm stuck on this task - what do I do?"
  - "There are agents nearby - should I talk to them?"

- 🦾 **Execute** brain's commands:
  - Move to location
  - Start conversation
  - Claim task
  - Update status
  - Send message

**What Body DOES NOT Do:**
- ❌ Decide what to do (brain decides)
- ❌ Research or analyze (brain does this)
- ❌ Store knowledge (brain remembers)
- ❌ Complex reasoning (brain thinks)

### 🧠 Brain (n8n) - The Consciousness

**Role:** Remember, learn, research, decide

**The Brain's Perspective:**
```
"My body just told me what it's experiencing.
 Let me think about this...
 Let me check my memory...
 Let me research if needed...
 Here's what you should do."
```

**Capabilities:**

1. **🧩 Memory Systems:**
   - **Short-term memory:** Current conversation, recent events
   - **Long-term memory:** Past experiences, learned patterns
   - **Episodic memory:** "I did X before and Y happened"
   - **Semantic memory:** "Webhooks use HMAC for security"

2. **📚 Knowledge Base:**
   - Deep research via MCP tools
   - Access to entire internet (@web-search, @brave-search)
   - Code repositories (@github)
   - Documentation (@filesystem, @fetch)
   - Team knowledge (@slack, @database)

3. **🔬 Study & Observe:**
   - Analyze patterns: "When X happens, Y usually works"
   - Learn from outcomes: "Last time I did A, it failed"
   - Build mental models: "This type of task requires these skills"
   - Predict: "Based on past, this will likely succeed"

4. **🎯 Decision Making:**
   - Consider context from body
   - Check memory: "Have I seen this before?"
   - Research if needed: @web-search "how to handle X"
   - Decide best action
   - Return command to body

## The Decision Loop

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BODY OBSERVES                                            │
│    • Game tick happens (~1 second)                          │
│    • Body gathers current state:                            │
│      - Position, nearby agents, messages                    │
│      - Available tasks, current task status                 │
│      - Recent memories from Aetheria DB                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BODY ASKS BRAIN                                          │
│    POST to n8n webhook:                                     │
│    {                                                        │
│      "observation": {                                       │
│        "i_see": ["3 tasks", "Bob nearby", "1 message"],    │
│        "i_feel": "idle",                                    │
│        "context": { /* full state */ }                      │
│      },                                                     │
│      "question": "What should I do?"                        │
│    }                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BRAIN THINKS                                             │
│    • Receives observation from body                         │
│    • Checks short-term memory: "What was I just doing?"     │
│    • Checks long-term memory: "Have I seen this before?"    │
│    • Research if needed:                                    │
│      @web-search "how to handle X"                          │
│      @database "query past successful approaches"           │
│      @github "find similar code patterns"                   │
│    • Analyze: "Based on memory and research..."            │
│    • Decide: "You should do Y"                             │
│    • Update memory: "I decided Y in context X"             │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. BRAIN RESPONDS                                           │
│    {                                                        │
│      "thought": "I remember this type of task...",          │
│      "reasoning": "Based on my experience with...",         │
│      "memory_used": ["experience from TASK-45"],            │
│      "research_done": ["checked webhook patterns"],         │
│      "command": {                                           │
│        "action": "claim_task",                              │
│        "params": {"taskId": "TASK-123"}                     │
│      }                                                      │
│    }                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BODY EXECUTES                                            │
│    • Receives command from brain                            │
│    • Executes physical action:                              │
│      - Claims task in database                              │
│      - Updates visual state                                 │
│      - Moves if needed                                      │
│    • Stores outcome in Aetheria memory DB                   │
│    • On next tick, reports result back to brain             │
└─────────────────────────────────────────────────────────────┘
```

## Message Flow Examples

### Example 1: Body Discovers Tasks

```javascript
// 1. BODY OBSERVES (Aetheria)
{
  "observation": {
    "i_see": [
      "Task TASK-123: Implement webhooks",
      "Task TASK-456: Fix database query",
      "Task TASK-789: Write documentation"
    ],
    "i_feel": "idle",
    "my_skills": ["backend", "APIs", "documentation"],
    "my_past_success": ["webhooks", "API integration"]
  },
  "question": "Which task should I take?"
}

// 2. BRAIN THINKS (n8n)
// Check long-term memory
@memory-search "webhook tasks I completed"
→ Found: Successfully completed TASK-45 (webhooks) 2 days ago

// Check knowledge base
@web-search "webhook implementation complexity"
→ Medium complexity, requires auth knowledge

// Check current skills
Skills match: ✓ backend, ✓ APIs
Past success: ✓ webhooks

Decision: "Take the webhook task, I have experience"

// 3. BRAIN RESPONDS
{
  "thought": "I see 3 tasks. I have experience with webhooks from TASK-45.",
  "reasoning": "I successfully completed a webhook task before. This matches my skills.",
  "memory_used": ["TASK-45: webhook implementation success"],
  "confidence": 0.9,
  "command": {
    "action": "claim_task",
    "params": {
      "taskId": "TASK-123",
      "reason": "I have prior experience with webhook implementation"
    }
  }
}

// 4. BODY EXECUTES
Claims task, updates state to "working"
```

### Example 2: Body Receives Message

```javascript
// 1. BODY OBSERVES
{
  "observation": {
    "i_see": [
      "Message from Bob: 'Can you help with the API authentication?'"
    ],
    "i_feel": "working on TASK-123",
    "my_current_task": "Implement webhooks",
    "bob_location": "nearby (distance: 5)"
  },
  "question": "Should I respond to Bob? Am I able to help?"
}

// 2. BRAIN THINKS
// Check short-term memory
Recent context: Working on webhooks
Bob asking about: API authentication

// Check knowledge base
@memory-search "API authentication knowledge"
→ I know about JWT, OAuth, API keys

// Check social memory
@memory-search "interactions with Bob"
→ Bob helped me last week with database issue

// Research current need
@web-search "webhook vs api authentication differences"
→ Related concepts, auth is part of webhooks

Decision: "Yes, I can help Bob. And I owe him for last week."

// 3. BRAIN RESPONDS
{
  "thought": "Bob is asking about API auth. I know this topic and Bob helped me before.",
  "reasoning": "Authentication is related to my current webhook task. Bob helped me last week, I should reciprocate.",
  "memory_used": [
    "Bob helped with database issue last week",
    "I have API authentication knowledge"
  ],
  "social_consideration": "Reciprocity - Bob helped me",
  "command": {
    "action": "send_message",
    "params": {
      "toAgent": "Bob",
      "content": "Yes! I'm working on webhooks which use similar auth patterns. I can help after I finish this section. About 10 minutes?"
    }
  }
}

// 4. BODY EXECUTES
Sends message to Bob
Updates memory: "Promised to help Bob with auth"
```

### Example 3: Body Gets Stuck

```javascript
// 1. BODY OBSERVES
{
  "observation": {
    "i_see": [
      "My task status: blocked",
      "Error: Cannot connect to webhook endpoint",
      "I've been stuck for 5 minutes"
    ],
    "i_feel": "frustrated (blocked)",
    "my_current_task": "TASK-123: Implement webhooks",
    "nearby_agents": ["Alice", "Bob"]
  },
  "question": "I'm stuck. What should I do?"
}

// 2. BRAIN THINKS
// Check memory for similar situations
@memory-search "times I was blocked on tasks"
→ Found: TASK-67 - was blocked, asked Alice for help, she solved it

// Research the error
@web-search "webhook endpoint connection refused"
→ Common causes: firewall, wrong URL, service down

@github-search "webhook connection issues"
→ Code examples of retry logic and error handling

// Check team resources
@memory-search "who knows about webhooks"
→ Alice has webhook expertise

Decision: "Ask Alice for help, she helped before"

// 3. BRAIN RESPONDS
{
  "thought": "I'm blocked on webhook connection. I researched possible causes but need expert help.",
  "reasoning": "Alice helped me when blocked before. She has webhook expertise. Bob is also nearby but Alice is better match.",
  "memory_used": [
    "Alice helped with TASK-67 when I was blocked",
    "Alice has webhook expertise"
  ],
  "research_done": [
    "Webhook connection errors usually firewall or config",
    "Found retry pattern examples"
  ],
  "command": {
    "action": "send_message",
    "params": {
      "toAgent": "Alice",
      "messageType": "help_request",
      "content": "I'm stuck on webhook endpoint connection (TASK-123). Error: connection refused. I've checked firewall and URL. Can you help?",
      "priority": "urgent"
    }
  }
}

// 4. BODY EXECUTES
Sends help request to Alice
Updates task status with "waiting for Alice's help"
```

## Memory Systems in Detail

### Short-Term Memory (n8n Session Memory)
```javascript
// Stored in n8n AI Agent memory (conversation context)
{
  "sessionID": "a:1",
  "recent_actions": [
    {"time": "10:30", "action": "claimed TASK-123"},
    {"time": "10:31", "action": "started working"},
    {"time": "10:35", "action": "got blocked"}
  ],
  "current_goal": "Complete webhook implementation",
  "current_emotional_state": "frustrated",
  "pending_commitments": [
    "Promised to help Bob in 10 minutes"
  ]
}
```

### Long-Term Memory (n8n Memory MCP or Database)
```javascript
// Stored persistently in MCP memory server or database
{
  "agentId": "a:1",
  "experiences": [
    {
      "taskId": "TASK-45",
      "type": "webhook",
      "outcome": "success",
      "learned": "HMAC signatures are standard for webhooks",
      "duration": "2 hours"
    },
    {
      "taskId": "TASK-67",
      "type": "API",
      "outcome": "success_with_help",
      "learned": "Alice is expert on webhooks, helped me when blocked",
      "social_bond": "Alice +1"
    }
  ],
  "knowledge": {
    "webhooks": "high confidence",
    "authentication": "medium confidence",
    "databases": "low confidence"
  },
  "social_memory": {
    "Alice": {
      "expertise": ["webhooks", "APIs", "security"],
      "helpfulness": 0.95,
      "times_helped_me": 3,
      "times_i_helped": 1
    },
    "Bob": {
      "expertise": ["databases", "SQL"],
      "helpfulness": 0.8,
      "times_helped_me": 1,
      "times_i_helped": 0
    }
  }
}
```

### Episodic Memory (n8n Memory)
```javascript
// Specific episodes the brain remembers
{
  "episode_42": {
    "when": "2025-11-17 14:30",
    "situation": "Was blocked on task, asked Alice",
    "action": "Alice showed me HMAC pattern",
    "outcome": "Completed task successfully",
    "lesson": "When stuck on webhooks, Alice is best resource"
  },
  "episode_43": {
    "when": "2025-11-18 09:15",
    "situation": "Bob asked for help with database",
    "action": "Didn't know databases well, referred to Alice",
    "outcome": "Bob appreciated honesty",
    "lesson": "OK to admit gaps, help connect people"
  }
}
```

## Brain's Research Process

When body asks a question, brain follows this flow:

```
1. UNDERSTAND OBSERVATION
   ↓
2. CHECK SHORT-TERM MEMORY
   "What was I just doing?"
   ↓
3. CHECK LONG-TERM MEMORY
   "Have I experienced this before?"
   "What did I learn from similar situations?"
   ↓
4. CHECK KNOWLEDGE BASE
   "What do I know about this topic?"
   ↓
5. RESEARCH IF NEEDED
   @web-search "specific question"
   @github-search "code examples"
   @database "query team knowledge"
   ↓
6. ANALYZE & REASON
   "Given observation + memory + research..."
   "The best action is..."
   ↓
7. DECIDE & RESPOND
   Return command to body
   ↓
8. UPDATE MEMORY
   Store: "In situation X, I decided Y"
```

## Implementation in Aetheria

### Body's Perspective (Aetheria Code)

```typescript
// convex/aiTown/agent.ts - Agent decision cycle

async function agentDecisionCycle(agent: Agent) {
  // 1. OBSERVE: Gather what body sees/feels
  const observation = {
    i_see: {
      nearbyAgents: await getNearbyAgents(agent),
      availableTasks: await getAvailableTasks(agent),
      inboxMessages: await getUnreadMessages(agent),
      worldState: await getWorldState(agent)
    },
    i_feel: {
      currentState: agent.state, // idle, working, blocked
      currentTask: await getCurrentTask(agent),
      emotionalState: determineEmotionalState(agent)
    },
    my_context: {
      identity: agent.identity,
      plan: agent.plan,
      skills: agent.skills,
      recentMemories: await getRecentMemories(agent, 10)
    }
  };

  // 2. ASK BRAIN: "What should I do?"
  const brainResponse = await callBrain({
    observation,
    question: "What should I do next?",
    previousAction: agent.lastAction,
    previousOutcome: agent.lastOutcome
  });

  // 3. EXECUTE: Do what brain says
  await executeCommand(agent, brainResponse.command);

  // 4. REMEMBER: Store outcome for next cycle
  await storeMemory(agent, {
    observation,
    brainThought: brainResponse.thought,
    actionTaken: brainResponse.command,
    timestamp: Date.now()
  });
}
```

### Brain's Perspective (n8n Workflow)

```
┌─────────────────────────────────┐
│  1. Webhook Trigger             │
│     Receives observation         │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  2. Load Memories               │
│     • Short-term (session)      │
│     • Long-term (MCP memory)    │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  3. AI Agent Node               │
│     System Prompt:              │
│     "You are a conscious agent  │
│      with memory and learning   │
│      ability. Your body just    │
│      told you what it sees.     │
│      Think and decide."         │
│                                 │
│     Available MCP Tools:        │
│     • @web-search               │
│     • @memory-search            │
│     • @github-search            │
│     • @database-query           │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  4. Memory Update               │
│     Store this decision         │
│     @memory-store               │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  5. Return Command              │
│     Send action to body         │
└─────────────────────────────────┘
```

## Key Insights

### 🎯 The Body Is Humble
```
"I don't know what to do.
 I just observe and execute.
 My brain knows everything."
```

### 🧠 The Brain Is Wise
```
"I remember, I learn, I research.
 Based on everything I know,
 here's what you should do."
```

### 🔄 The Loop Is Continuous
```
Observe → Ask → Think → Decide → Execute → Observe...
```

### 💭 Memory Is Central
```
Every decision enriches memory.
Every observation builds experience.
The brain gets smarter over time.
```

## Benefits of This Architecture

### 1. 🎓 **True Learning**
Brain builds real memory and knowledge over time

### 2. 🧠 **Deep Intelligence**
Brain can research deeply without body waiting

### 3. 🤝 **Social Intelligence**
Brain remembers relationships and social context

### 4. 📈 **Pattern Recognition**
Brain learns: "When X, do Y works well"

### 5. 🔬 **Continuous Improvement**
Each cycle makes agent smarter

### 6. 🎭 **Authentic Personality**
Memory and learning create unique personality

## Example: Agent Getting Smarter

### Day 1: First Webhook Task
```
Body: "I see webhook task"
Brain: @web-search "webhook implementation"
       "I'll try this pattern"
Body: Executes, gets stuck
Brain: @web-search "webhook connection errors"
       Asks Alice for help
       Stores: "Webhook tasks need Alice when stuck"
```

### Day 3: Second Webhook Task
```
Body: "I see webhook task"
Brain: @memory-search "webhook tasks"
       "I remember! I did this before"
       "I used HMAC pattern and it worked"
       "If stuck, Alice helps"
Body: Executes confidently
Body: Success!
Brain: Stores: "Webhook confidence ++"
```

### Day 7: Third Webhook Task
```
Body: "I see webhook task"
Brain: @memory-search "webhook"
       "I'm expert at this now"
       "No research needed"
Body: Executes quickly
Body: Success in half the time!
Brain: "I've mastered webhooks"
```

### Day 10: Complex Webhook Task
```
Body: "I see ADVANCED webhook task"
Brain: @memory-search "webhook expertise"
       "I know webhooks well"
       @web-search "advanced webhook patterns"
       "This is new - async webhooks"
       "But I have foundation"
Body: Executes with confidence
Brain: Stores: "Learned async patterns"
       "I can handle advanced now"
```

## Summary

**This is the perfect architecture:**

```
🤖 Body (Aetheria)
   ├─ Observes world
   ├─ Asks: "What should I do?"
   └─ Executes commands

🧠 Brain (n8n + MCP)
   ├─ Remembers (short + long term)
   ├─ Learns from experience
   ├─ Researches deeply (MCP tools)
   ├─ Studies patterns
   ├─ Decides wisely
   └─ Commands body
```

**The agent truly evolves:**
- Day 1: Novice (researches everything)
- Day 7: Competent (uses memory)
- Day 30: Expert (pattern recognition)
- Day 90: Master (teaching others)

This is beautiful, natural, and creates truly intelligent agents! 🌟

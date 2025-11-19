# Memory Architecture: Body + Brain

**Date:** November 19, 2025

## Core Principle

**Both body and brain have memory, but different types:**

```
🤖 BODY (Aetheria)              🧠 BRAIN (n8n)
==================              ===============
Sensory Memory                  Deep Memory
"What just happened"            "What I've learned"
↓                               ↓
Recent observations             Long-term knowledge
Immediate context               Wisdom & patterns
Spatial awareness               Strategic memory
Social presence                 Research & analysis
```

## The Two Memory Systems

### 🤖 Body Memory (Aetheria Database)

**Type:** Immediate, sensory, contextual

**What It Stores:**
- **Recent memories** (last 10-50 observations)
- **Conversation history** (who said what, when)
- **Movement history** (where I've been)
- **Social encounters** (who I met today)
- **Task events** (claimed task at 10:30, blocked at 10:45)
- **Emotional states** (felt frustrated when stuck)

**Purpose:**
- Provide immediate context to brain
- "Here's what I just experienced"
- Fast access for current situation
- Spatial and temporal awareness

**Storage Location:**
```
convex/schema.ts:
- memories table
- memoryEmbeddings table
- conversations table
- messages table
```

**Example Body Memory:**
```javascript
{
  "memories": [
    {
      "timestamp": "10:30:00",
      "type": "observation",
      "description": "I see 3 available tasks in the task board",
      "importance": 5
    },
    {
      "timestamp": "10:30:15",
      "type": "conversation",
      "description": "Bob said: 'Can you help with authentication?'",
      "importance": 7,
      "participants": ["a:1", "a:2"]
    },
    {
      "timestamp": "10:31:00",
      "type": "action",
      "description": "I claimed TASK-123 about webhooks",
      "importance": 8
    },
    {
      "timestamp": "10:35:00",
      "type": "observation",
      "description": "I got error: Connection refused on webhook endpoint",
      "importance": 9
    }
  ]
}
```

### 🧠 Brain Memory (n8n + MCP Memory)

**Type:** Deep, analytical, learned

**What It Stores:**
- **Long-term experiences** (I've done 10 webhook tasks)
- **Learned knowledge** (Webhooks use HMAC signatures)
- **Pattern recognition** (When stuck, asking Alice works)
- **Skill development** (I'm now expert at webhooks)
- **Social bonds** (Alice helped me 3 times, I owe her)
- **Strategic insights** (Complex tasks need 2+ hours)
- **Mental models** (How systems work conceptually)

**Purpose:**
- Deep understanding and wisdom
- "What have I learned over time?"
- Strategic decision making
- Growth and improvement

**Storage Location:**
```
n8n:
- AI Agent memory (session/short-term)
- MCP Memory Server (long-term storage)
- Vector database (semantic search)
- Custom database (structured knowledge)
```

**Example Brain Memory:**
```javascript
{
  "experiences": {
    "webhooks": {
      "tasks_completed": 5,
      "success_rate": 0.8,
      "avg_duration": "2 hours",
      "common_patterns": [
        "HMAC signatures for security",
        "Retry logic for reliability",
        "Webhook validation is critical"
      ],
      "learned_from_failures": [
        "Connection errors often firewall related",
        "Testing locally first prevents issues"
      ],
      "confidence": "high"
    }
  },

  "social_knowledge": {
    "Alice": {
      "expertise": ["webhooks", "APIs", "security"],
      "relationship": "helpful mentor",
      "times_helped_me": 3,
      "best_ask_about": ["webhook errors", "API design"],
      "trust_level": 0.95
    },
    "Bob": {
      "expertise": ["databases", "SQL", "data modeling"],
      "relationship": "colleague",
      "i_owe_help": true, // Bob helped me once
      "best_ask_about": ["database queries", "data structures"]
    }
  },

  "meta_learning": {
    "patterns": [
      "When blocked >5min, ask for help faster",
      "Research upfront saves time later",
      "Similar tasks get easier with practice"
    ],
    "growth": {
      "week_1": "novice at webhooks",
      "week_2": "competent at webhooks",
      "week_3": "confident at webhooks"
    }
  }
}
```

## How They Work Together

### The Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BODY EXPERIENCES SOMETHING                               │
│    Event: Bob sends message "Need help with auth"           │
│    ↓                                                         │
│    Stores in Aetheria memory DB:                            │
│    - New message from Bob                                   │
│    - Timestamp, content, participants                       │
│    - Marked as "unread"                                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BODY GATHERS RECENT MEMORIES                             │
│    Queries Aetheria DB:                                     │
│    - Last 10 memories                                       │
│    - Recent conversations                                   │
│    - Current task state                                     │
│    ↓                                                         │
│    Observation package:                                     │
│    {                                                        │
│      "recent_memories": [                                   │
│        "Bob messaged: Need help",                           │
│        "I'm working on TASK-123",                           │
│        "Task status: in_progress"                           │
│      ],                                                     │
│      "current_context": { ... }                             │
│    }                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BODY ASKS BRAIN                                          │
│    POST to n8n webhook:                                     │
│    {                                                        │
│      "observation": {                                       │
│        "body_memories": [ /* recent from Aetheria */ ],     │
│        "i_see": "Bob needs help with auth",                 │
│        "i_feel": "working, but can pause"                   │
│      },                                                     │
│      "question": "Should I help Bob?"                       │
│    }                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. BRAIN RECEIVES + AUGMENTS WITH DEEP MEMORY               │
│    n8n receives body's recent memories                      │
│    ↓                                                         │
│    Brain adds its deep memory:                              │
│    @memory-search "Bob"                                     │
│    → Found: Bob helped me with database last week           │
│    → Relationship: I owe Bob help                           │
│    → Bob's expertise: databases, not auth                   │
│                                                             │
│    @memory-search "authentication knowledge"                │
│    → Found: I know JWT, OAuth, API keys                     │
│    → Confidence: medium-high                                │
│                                                             │
│    Combined context:                                        │
│    - Body says: "Bob needs help NOW"                        │
│    - Brain knows: "I owe Bob, I can help, I have knowledge" │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BRAIN DECIDES WITH FULL CONTEXT                          │
│    Decision: "Yes, help Bob"                                │
│    Reasoning:                                               │
│    - Body memory: Bob just asked (urgent context)           │
│    - Brain memory: I owe Bob from last week (social debt)   │
│    - Brain memory: I have auth knowledge (capability)       │
│    - Brain memory: Auth relates to my webhook task (synergy)│
│                                                             │
│    Command to body: "Send helpful message to Bob"           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. BODY EXECUTES + STORES NEW MEMORY                        │
│    Sends message to Bob                                     │
│    ↓                                                         │
│    Stores in Aetheria memory:                               │
│    {                                                        │
│      "type": "action",                                      │
│      "description": "I helped Bob with auth question",      │
│      "timestamp": "10:36:00",                               │
│      "importance": 7                                        │
│    }                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. BRAIN UPDATES DEEP MEMORY                                │
│    @memory-store                                            │
│    {                                                        │
│      "episode": "Helped Bob with auth",                     │
│      "learned": "Reciprocity builds relationships",         │
│      "social_update": {                                     │
│        "Bob": {                                             │
│          "i_owe_help": false, // Debt repaid                │
│          "times_i_helped": 1,                               │
│          "relationship_strength": +1                        │
│        }                                                    │
│      }                                                      │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

## Memory Lifecycle

### Recent Event → Body Memory → Brain Memory

```
Time: 10:30
Event: "Claimed webhook task"
↓
Body stores immediately (Aetheria DB):
{
  "type": "action",
  "description": "Claimed TASK-123: webhooks",
  "timestamp": "10:30:00"
}
↓
Next decision cycle (10:31):
Body: "Here's what just happened" (includes claim)
Brain: Receives + processes
Brain: Stores in long-term: "Started new webhook task"

---

Time: 10:35
Event: "Task completed successfully"
↓
Body stores immediately:
{
  "type": "success",
  "description": "Completed TASK-123",
  "timestamp": "10:35:00"
}
↓
Next decision cycle (10:36):
Body: "I just finished the task"
Brain: Receives + analyzes
Brain: Updates deep memory:
{
  "webhooks": {
    "tasks_completed": 6, // was 5
    "success_rate": 0.83, // improved
    "confidence": "high"
  }
}

---

Days/Weeks Later:
Body memory: Fades (old memories archived)
Brain memory: Persists as learned knowledge
- "I'm good at webhooks" (consolidated)
- "I've done 6 webhook tasks" (statistic)
- "Webhooks usually take 2 hours" (pattern)
```

## Memory Types Compared

| Aspect | Body Memory | Brain Memory |
|--------|-------------|--------------|
| **Duration** | Short (hours/days) | Long (weeks/months/forever) |
| **Purpose** | Context for now | Wisdom for future |
| **Storage** | Aetheria DB | n8n MCP / Vector DB |
| **Access Speed** | Very fast | Fast via search |
| **Detail Level** | High (exact events) | Abstracted (patterns) |
| **Example** | "Bob said X at 10:30" | "Bob is database expert" |
| **Queries** | Recent list | Semantic search |
| **Updates** | Every event | Every decision cycle |
| **Retention** | Recent N events | Indefinite |

## Why Both Are Essential

### 🤖 Body Memory Provides:
- **Immediacy**: "What just happened?"
- **Precision**: "Bob said exactly: '...'"
- **Timeline**: "At 10:30, then 10:35, then..."
- **Spatial**: "Alice is 5 tiles away"
- **Freshness**: Always current state

### 🧠 Brain Memory Provides:
- **Depth**: "Over 10 tasks, I learned..."
- **Patterns**: "When X happens, Y works"
- **Relationships**: "Alice is expert, Bob is helpful"
- **Growth**: "I'm better at this than before"
- **Strategy**: "Based on history, do Z"

### Together They Create:
```
Intelligent Decision =
  Immediate Context (body) +
  Learned Wisdom (brain)
```

## Implementation Details

### Body Memory (Aetheria)

**Current Implementation - KEEP AS IS:**
```typescript
// convex/schema.ts - EXISTING MEMORY SYSTEM
memories: defineTable({
  playerId,
  description: v.string(),
  importance: v.number(),
  data: v.any(),
  _creationTime: v.number()
})
.index('playerId', ['playerId'])

memoryEmbeddings: defineTable({
  memoryId: v.id('memories'),
  embedding: v.array(v.float64()),
})
.vectorIndex('embedding', {
  vectorField: 'embedding',
  dimensions: 1536,
})
```

**Usage in Body:**
```typescript
// Store immediate observation
await ctx.db.insert('memories', {
  playerId: agent.id,
  description: "Bob asked: 'Can you help with auth?'",
  importance: 7,
  data: {
    type: 'conversation',
    fromAgent: 'Bob',
    messageId: msg._id
  }
});

// Gather recent memories for brain
const recentMemories = await ctx.db
  .query('memories')
  .withIndex('playerId', q => q.eq('playerId', agent.id))
  .order('desc')
  .take(10);

// Send to brain
const observation = {
  body_memories: recentMemories.map(m => ({
    description: m.description,
    importance: m.importance,
    when: m._creationTime,
    type: m.data?.type
  })),
  ...otherContext
};
```

### Brain Memory (n8n)

**New Implementation - ADD TO n8n:**

```javascript
// n8n Workflow Nodes:

1. [Webhook] Receive observation from body
   ↓
2. [Memory Search] Query long-term memory
   @memory-search "{{$json.observation.context}}"
   ↓
3. [AI Agent] Process with full context
   System Prompt: "
     You receive:
     - Body memories: recent events from Aetheria
     - Your deep memory: long-term knowledge

     Use body memories for immediate context.
     Use your deep memory for wisdom.
   "
   ↓
4. [Memory Store] Update long-term memory
   @memory-store {
     "episode": "{{$json.decision}}",
     "learned": "{{$json.insight}}",
     "timestamp": "{{$now}}"
   }
   ↓
5. [Return] Send decision to body
```

**Brain Memory Search Examples:**
```javascript
// Episodic memory search
@memory-search "times I was blocked on tasks"
→ Returns: Specific episodes when stuck

// Semantic memory search
@memory-search "webhook authentication knowledge"
→ Returns: What I know about webhook auth

// Social memory search
@memory-search "Alice's expertise"
→ Returns: What Alice is good at

// Pattern search
@memory-search "successful approaches to API tasks"
→ Returns: Strategies that worked
```

## Example: Complete Memory Flow

### Scenario: Second Time Doing Similar Task

**First Time (Learning):**
```
Body: "I see webhook task TASK-123"
      Stores: "Saw webhook task at 10:00"

Brain: @memory-search "webhook"
       → No prior experience
       @web-search "webhook implementation"
       → Learns about HMAC, validation
       Decides: "Try this pattern"

Body: Executes, gets stuck
      Stores: "Got stuck at 10:30"

Brain: @web-search "webhook errors"
       Asks Alice for help
       Stores: {
         "webhook_learning": {
           "first_attempt_failed": "connection error",
           "alice_helped": true,
           "solution": "firewall configuration"
         }
       }

Body: Success with Alice's help
      Stores: "Completed with Alice at 11:00"
```

**Second Time (Using Memory):**
```
Body: "I see webhook task TASK-456"
      Stores: "Saw webhook task at 14:00"
      Recent memories: Just this observation

Brain: @memory-search "webhook tasks"
       → Found: Previous webhook experience!
       → Learned: HMAC pattern, firewall issues
       → Learned: Alice helps when stuck

       Decision: "I know this! Use HMAC pattern"
       Confidence: "medium (did once before)"
       Plan: "If stuck, ask Alice quickly"

Body: Executes confidently
      Stores: "Started task at 14:01"

Body: Success in 1 hour (was 2 hours before)
      Stores: "Completed at 15:01"

Brain: @memory-store {
         "webhook_learning": {
           "tasks_completed": 2,
           "getting_faster": true,
           "confidence": "high"
         }
       }
```

## Summary

### ✅ Keep Body Memory (Aetheria)
- Recent events and observations
- Conversation history
- Immediate context
- **Current implementation is good!**

### ✅ Add Brain Memory (n8n)
- Long-term learning
- Pattern recognition
- Relationship knowledge
- Strategic insights

### ✅ Together They Make Intelligence
```
Body Memory:  "What just happened"
Brain Memory: "What I've learned"
           ↓
      Smart Decisions
```

**The key insight:**
Body memory is like **short-term/working memory** in humans
Brain memory is like **long-term/semantic memory** in humans

Both are essential for true intelligence! 🧠✨

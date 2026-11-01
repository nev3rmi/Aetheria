# Memory Architecture: Three-Tier System

**Date:** November 19, 2025 (Updated with Jira + Graphiti Integration)

## Core Principle

**Agents use a three-tier memory system for intelligent collaboration:**

```
🔥 TIER 1: SHORT-TERM           💬 TIER 2: SESSION              🧠 TIER 3: LONG-TERM
Personal Recent Events          Task Collaboration Memory       Knowledge Graph
==================              ======================          ==================
Last 10 observations            Jira Comments                   Graphiti Graph
"What just happened?"           "What did we learn?"            "What do we know?"
↓                               ↓                               ↓
Aetheria DB                     Jira Issue Comments             Graphiti + Neo4j
Fast personal context           Shared team insights            Deep historical knowledge
Memories from THIS agent        Memories from ALL agents        Learned patterns & facts
Example: "I claimed TASK-123"   Example: "Alice found API key"  Example: "Webhooks use HMAC"
```

## The Three-Tier System

### 🔥 TIER 1: Short-Term Memory (Personal Context)

**Location:** Aetheria Database (`memories` table)
**Scope:** Personal, per-agent
**Duration:** Last 10 events (rolling window)
**Purpose:** Immediate personal context

**What It Stores:**
- Recent observations ("I see 3 available tasks")
- Recent conversations ("Bob said X")
- Recent actions ("I claimed TASK-123")
- Current emotional state ("feeling blocked")

**Retrieval:** Direct database query, ordered by timestamp

```typescript
// Example: Get short-term memories
const shortTermMemories = await ctx.db
  .query('memories')
  .withIndex('playerId', q => q.eq('playerId', agentId))
  .order('desc')
  .take(10);
```

**Example Data:**
```json
{
  "id": "mem_123",
  "description": "Claimed TASK-123 about webhook authentication",
  "importance": 8,
  "timestamp": "2025-11-19T10:30:00Z",
  "type": "action"
}
```

---

### 💬 TIER 2: Session Memory (Task Collaboration)

**Location:** Jira Issue Comments
**Scope:** Shared across agents on same task
**Duration:** Life of the task (persistent)
**Purpose:** Collaborative work context

**What It Stores:**
- Agent research findings ("Found API documentation")
- Tool execution results ("Web search returned...")
- Progress updates ("Implemented authentication")
- Collaboration notes ("Working with Alice on this")
- Next steps ("Need to test endpoints")

**Retrieval:** Fetch comments from Jira API, filtered by issue

```typescript
// Example: Get session memories from Jira
const sessionMemories = await ctx.runAction(getJiraComments, {
  issueKey: 'PROJ-123',
  maxResults: 50 // Last 50 comments
});
```

**Example Comment (Agent Research):**
```markdown
🤖 **Alice** - 2025-11-19T10:35:00Z

**Action:** Research completed using web_search

**Findings:**
Found documentation about webhook HMAC signatures:
- Use SHA-256 hash
- Include timestamp in payload
- Verify signature on server side

**Tools Used:** web_search

**Next Steps:**
Implementing HMAC validation in webhook handler
```

**Why Jira Comments?**
- ✅ Natural grouping by task
- ✅ Visible to humans AND AI
- ✅ Already exists (no new infrastructure)
- ✅ Persistent with the task
- ✅ All agents on task see same context

---

### 🧠 TIER 3: Long-Term Knowledge (Team Learning)

**Location:** Graphiti Knowledge Graph + Neo4j
**Scope:** Global team knowledge
**Duration:** Forever (historical)
**Purpose:** Deep understanding and pattern recognition

**What It Stores:**
- Extracted entities ("webhook", "HMAC", "authentication")
- Facts ("Webhooks use HMAC for security")
- Relationships ("`agent:alice` WORKED_ON `task:webhooks`")
- Temporal patterns ("Task complexity increased over time")
- Team expertise ("Alice is expert on webhooks")

**Retrieval:** Semantic search via Graphiti API

```typescript
// Example: Search long-term knowledge
const longTermKnowledge = await ctx.runAction(searchGraphiti, {
  query: "webhook authentication patterns",
  groupIds: [worldId],
  numResults: 5
});
```

**Example Knowledge Graph:**
```
(Agent:Alice)-[:RESEARCHED]->(Concept:Webhooks)
(Concept:Webhooks)-[:REQUIRES]->(Security:HMAC)
(Agent:Bob)-[:LEARNED_FROM]->(Agent:Alice)
(Task:PROJ-123)-[:USES_TECHNIQUE]->(Security:HMAC)
```

**Why Graphiti?**
- ✅ Entity extraction (automatically finds concepts)
- ✅ Temporal understanding (tracks learning over time)
- ✅ Relationship mapping (connects agents, tasks, concepts)
- ✅ Semantic search (finds relevant knowledge)
- ✅ Knowledge consolidation (patterns emerge)

---

## How The Three Tiers Work Together

### Complete Context Retrieval Flow

```
Agent Needs Decision Context
         ↓
┌────────────────────────────────────────────────────────┐
│ getContextForAgent(agentId, taskId, query)             │
└───────────┬────────────────────────────────────────────┘
            ↓
    ┌───────┴───────┬────────────────┐
    ↓               ↓                ↓
┌─────────┐   ┌──────────┐   ┌────────────┐
│ TIER 1  │   │ TIER 2   │   │ TIER 3     │
│ Short   │   │ Session  │   │ Long-Term  │
└─────────┘   └──────────┘   └────────────┘
    ↓               ↓                ↓
 Aetheria DB   Jira Comments    Graphiti
    ↓               ↓                ↓
Last 10 events  Task comments   Semantic search
    ↓               ↓                ↓
┌─────────────────────────────────────────────┐
│ Combined Context for Brain Decision         │
│                                             │
│ • Personal: What I just did                 │
│ • Team: What we learned on this task        │
│ • Historical: What we know about this topic │
└─────────────────────────────────────────────┘
```

### Example: Agent Bob Working on Webhook Task

**Scenario:** Bob picks up TASK-456 about webhook authentication

#### 1. Gather TIER 1 (Bob's Short-Term Memory)
```json
{
  "shortTerm": [
    "Claimed TASK-456 at 14:00",
    "Read task description",
    "Saw label: 'webhooks'",
    "Saw label: 'authentication'"
  ]
}
```

#### 2. Gather TIER 2 (Task Collaboration from Jira)
```json
{
  "sessionBased": [
    {
      "author": "Alice",
      "content": "🤖 Researched webhook patterns. HMAC-SHA256 is standard.",
      "timestamp": "2025-11-19T10:35:00Z"
    },
    {
      "author": "Product Manager",
      "content": "Security is critical here. Use industry standards.",
      "timestamp": "2025-11-19T09:00:00Z"
    }
  ]
}
```

#### 3. Gather TIER 3 (Team Knowledge from Graphiti)
```json
{
  "longTerm": [
    {
      "content": "Webhooks typically use HMAC signatures for authentication",
      "entities": ["webhook", "HMAC", "authentication"],
      "facts": [
        "HMAC ensures message integrity",
        "SHA-256 is common hash algorithm",
        "Timestamp prevents replay attacks"
      ],
      "relevanceScore": 0.92
    },
    {
      "content": "Alice completed 5 webhook tasks successfully",
      "entities": ["Alice", "webhook", "task"],
      "facts": ["Alice is webhook expert"],
      "relevanceScore": 0.78
    }
  ]
}
```

#### 4. Send Combined Context to Brain (n8n)
```json
{
  "agentId": "bob",
  "currentTask": {
    "id": "TASK-456",
    "title": "Implement webhook authentication"
  },
  "context": {
    "shortTerm": [
      "Just claimed this task",
      "This is about webhooks and auth"
    ],
    "sessionBased": [
      "Alice already researched: HMAC-SHA256 is standard",
      "PM emphasized security is critical"
    ],
    "longTerm": [
      "Team knowledge: Webhooks use HMAC for auth",
      "Team knowledge: Alice is expert on webhooks",
      "Team knowledge: HMAC prevents tampering"
    ]
  }
}
```

#### 5. Brain Decides with Full Context
```json
{
  "thought": "Alice already researched HMAC approach. I should use that pattern and maybe ask Alice for specifics.",
  "action": {
    "type": "use_tool",
    "params": {
      "tool": "web_search",
      "input": "HMAC-SHA256 implementation in Node.js"
    }
  }
}
```

#### 6. After Tool Execution → Post to Jira (TIER 2)
```markdown
🤖 **Bob** - 2025-11-19T14:05:00Z

**Action:** Research completed using web_search

**Findings:**
Found Node.js HMAC implementation examples:
- Use crypto.createHmac('sha256', secret)
- Compare using crypto.timingSafeEqual()
- Example code: [link]

**Collaborated With:** Alice (used her research on HMAC)

**Next Steps:**
Implementing HMAC validation following Alice's pattern
```

#### 7. Feed to Graphiti (TIER 3)
```json
{
  "episode_body": "Bob researched HMAC-SHA256 implementation in Node.js for webhook authentication. Built on Alice's prior research. Found crypto library examples.",
  "entities": ["Bob", "Alice", "HMAC", "Node.js", "webhook", "crypto"],
  "facts": [
    "Node.js has crypto library for HMAC",
    "Bob built on Alice's research",
    "crypto.timingSafeEqual prevents timing attacks"
  ]
}
```

---

## Data Flow: Research Tool Execution

```
┌──────────────────────────────────────────────────────┐
│ 1. Brain decides to use web_search tool             │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│ 2. Body executes tool via actionExecutor.ts         │
│    - Calls web search API                            │
│    - Gets results                                    │
│    - Measures duration                               │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│ 3. Log execution to toolExecutions table (Tier 1)   │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│ 4. POST FINDINGS TO JIRA COMMENT (Tier 2)           │
│    - Format as agent comment                         │
│    - Include tool, findings, next steps              │
│    - Visible to all agents on task                   │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────┐
│ 5. FEED TO GRAPHITI KNOWLEDGE GRAPH (Tier 3)        │
│    - Extract entities (tools, concepts, agents)      │
│    - Generate facts                                  │
│    - Build relationships                             │
│    - Enable future semantic search                   │
└──────────────────────────────────────────────────────┘
```

**Code Location:** `convex/aetheria/actionExecutor.ts:postResearchToJira()`

---

## Memory Schema Updates

### Updated `memories` Table

```typescript
// convex/agent/schema.ts
export const memoryFields = {
  playerId,
  description: v.string(),
  embeddingId: v.id('memoryEmbeddings'),
  importance: v.number(),
  lastAccess: v.number(),

  // NEW FIELDS FOR THREE-TIER SYSTEM
  relatedTaskId: v.optional(v.id('jiraTasks')),      // Link to task (Tier 2)
  isShared: v.optional(v.boolean()),                 // Should share with team
  graphitiEpisodeId: v.optional(v.string()),         // Link to Graphiti (Tier 3)

  data: v.union(/* ... */)
};

// NEW INDEX for task-based retrieval
.index('by_task', ['relatedTaskId', 'lastAccess'])
```

---

## Service Architecture

### New Services Created

#### 1. `jiraCommentService.ts`
```typescript
// Add comment to Jira issue
export const addJiraComment = action({
  args: { issueKey: v.string(), commentBody: v.string() },
  handler: async (ctx, { issueKey, commentBody }) => {
    // POST to Jira API
  }
});

// Get comments from Jira issue
export const getJiraComments = action({
  args: { issueKey: v.string(), maxResults: v.optional(v.number()) },
  handler: async (ctx, { issueKey, maxResults }) => {
    // GET from Jira API
    // Parse Atlassian Document Format to plain text
  }
});

// Format agent research as Jira comment
export function formatAgentComment(data: AgentCommentData): string {
  // Returns markdown with agent emoji, findings, tools used
}
```

#### 2. `graphitiService.ts`
```typescript
// Add episode to knowledge graph
export const addGraphitiEpisode = action({
  args: { name, episodeBody, source, referenceTime, groupId },
  handler: async (ctx, args) => {
    // POST to Graphiti /episodes endpoint
  }
});

// Search knowledge graph
export const searchGraphiti = action({
  args: { query, groupIds, numResults },
  handler: async (ctx, args) => {
    // POST to Graphiti /search endpoint
  }
});

// Process Jira comment into Graphiti
export const processJiraCommentToGraphiti = internalAction({
  args: { worldId, taskId, issueKey, commentBody, agentName },
  handler: async (ctx, args) => {
    // Convert comment to episode
    // Extract entities and facts
    // Store in graph
  }
});
```

#### 3. `memoryRetrieval.ts`
```typescript
// Get comprehensive three-tier context
export const getContextForAgent = action({
  args: { worldId, agentId, currentTaskId, query },
  handler: async (ctx, args) => {
    // Tier 1: getShortTermMemories (Aetheria DB)
    // Tier 2: getSessionMemories (Jira comments)
    // Tier 3: getLongTermKnowledge (Graphiti search)

    return { shortTerm, sessionBased, longTerm };
  }
});
```

---

## Benefits of Three-Tier System

### 🔥 Tier 1 Benefits (Short-Term)
- ✅ Fast personal context
- ✅ No API calls needed
- ✅ Immediate observations
- ✅ Low latency

### 💬 Tier 2 Benefits (Session)
- ✅ Natural collaboration
- ✅ Visible to humans
- ✅ Persistent with task
- ✅ No duplicate research
- ✅ Team learning within task

### 🧠 Tier 3 Benefits (Long-Term)
- ✅ Discovers patterns automatically
- ✅ Builds knowledge graph
- ✅ Semantic search
- ✅ Temporal understanding
- ✅ Cross-task learning

### Combined Intelligence
```
Short-Term:  "What I just experienced"
Session:     "What we learned on this task"
Long-Term:   "What we know as a team"
           ↓
    Collaborative Intelligence
```

---

## Docker Setup (Graphiti + Neo4j)

All services run in Docker Compose:

```yaml
services:
  frontend:   # Vite dev server
  backend:    # Convex functions
  dashboard:  # Convex dashboard
  neo4j:      # Graph database for Graphiti
  graphiti:   # Knowledge graph server
```

**Start everything:**
```bash
docker compose up -d
```

**Access points:**
- Frontend: http://localhost:5173
- Graphiti API: http://localhost:8000
- Neo4j Browser: http://localhost:7474

**See:** `docs/GRAPHITI_DOCKER_SETUP.md` for complete setup instructions.

---

## Testing Three-Tier Memory

### Test Scenario: Agent Collaboration

1. **Alice** claims TASK-100 (webhooks)
   - Tier 1: "Claimed TASK-100" (personal)

2. **Alice** researches via web_search
   - Tier 1: "Executed web_search" (personal)
   - Tier 2: Posts findings to Jira comment (shared)
   - Tier 3: Feeds to Graphiti graph (team knowledge)

3. **Bob** claims TASK-101 (also webhooks)
   - Tier 1: "Claimed TASK-101" (personal)
   - Tier 2: No comments yet (new task)
   - Tier 3: Searches "webhook patterns"
     - Finds Alice's research from TASK-100!
     - Doesn't duplicate work

4. **Bob** builds on Alice's findings
   - Tier 2: Posts "Used Alice's HMAC pattern" (gives credit)
   - Tier 3: Graphiti links Bob → Alice (collaboration graph)

5. **Charlie** claims TASK-102 (webhooks, 2 weeks later)
   - Tier 3: Searches "webhook implementation"
     - Finds consolidated knowledge from Alice + Bob
     - Sees pattern: HMAC is standard
     - Sees expertise: Alice and Bob know webhooks

**Result:** Charlie benefits from Alice and Bob's learning, even though they worked on different tasks!

---

## Implementation Status

✅ **Completed:**
- Schema updates (relatedTaskId, isShared, graphitiEpisodeId)
- Jira comment service (add/get comments)
- Graphiti service (add episodes, search)
- Memory retrieval (three-tier context)
- Action executor (post research to Jira + Graphiti)
- Docker setup (Graphiti + Neo4j)

⏳ **Next Steps:**
- Test with real agents
- Monitor knowledge graph growth
- Optimize retrieval strategies
- Add visualization of knowledge connections

---

## Summary

### The Evolution

**Before:**
- Only short-term memory (last 10 events)
- No collaboration memory
- No team learning

**Now:**
```
TIER 1: Personal Context      (Aetheria DB)
TIER 2: Task Collaboration    (Jira Comments)
TIER 3: Team Knowledge        (Graphiti Graph)
         ↓
  True Collaborative Intelligence
```

**Key Insight:** By using Jira comments as session memory and Graphiti as long-term knowledge, agents can truly collaborate and learn as a team, not just as individuals.

🧠✨ **Memory makes intelligence. Three tiers make collaborative intelligence.**

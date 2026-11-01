# Implementation Plan: Three-Tier Memory System

**Date:** November 19, 2025
**Goal:** Implement collaborative memory system with Jira comments + Graphiti knowledge graph

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Agent Decision Cycle                                        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
         ┌───────────────────────┐
         │  Get Context          │
         └───────────────────────┘
                     ↓
    ┌────────────────┴────────────────┐
    ↓                ↓                 ↓
┌─────────┐   ┌──────────┐   ┌──────────────┐
│ Tier 1  │   │ Tier 2   │   │ Tier 3       │
│ SHORT   │   │ SESSION  │   │ LONG-TERM    │
│         │   │          │   │              │
│ Last 10 │   │ Jira     │   │ Graphiti     │
│ events  │   │ Comments │   │ Knowledge    │
│         │   │          │   │ Graph        │
│ Aetheria│   │ on this  │   │              │
│ DB      │   │ ticket   │   │ Team facts   │
│         │   │          │   │ Relationships│
└─────────┘   └──────────┘   └──────────────┘
    fast          medium           deep
  personal        shared        historical
```

## Phase 1: Schema Updates

### 1.1 Update Aetheria Memory Schema

**File:** `convex/schema.ts`

**Current:**
```typescript
memories: defineTable({
  playerId,
  description: v.string(),
  importance: v.number(),
  data: v.any(),
  _creationTime: v.number()
})
.index('playerId', ['playerId'])
```

**Add:**
```typescript
memories: defineTable({
  playerId,
  description: v.string(),
  importance: v.number(),

  // NEW FIELDS
  relatedTaskId: v.optional(v.id('jiraTasks')),  // Link to Jira task
  isShared: v.optional(v.boolean()),              // Should be in knowledge graph
  graphitiEpisodeId: v.optional(v.string()),      // Link to Graphiti episode

  data: v.any(),
  _creationTime: v.number()
})
.index('playerId', ['playerId'])
.index('by_task', ['relatedTaskId', '_creationTime'])  // NEW: Query by task
.index('by_shared', ['isShared', '_creationTime'])     // NEW: Find shareable memories
```

### 1.2 Keep web_search Tool in Body

**File:** `convex/aetheria/tools.ts`

Keep the existing web_search implementation with DuckDuckGo API. This is used when:
- Task explicitly requires research
- Results posted to Jira for team visibility
- Not for brain's private thinking

---

## Phase 2: Jira Comment Integration (Tier 2 - Session Memory)

### 2.1 Create Jira Comment Service

**File:** `convex/aetheria/jiraCommentService.ts` (NEW)

```typescript
/**
 * Jira Comment Service
 *
 * Handles posting and reading comments for session-based memory
 */

import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { Id } from '../_generated/dataModel';

/**
 * Post agent comment to Jira ticket
 */
export const addAgentComment = internalMutation({
  args: {
    taskId: v.id('jiraTasks'),
    agentId: v.string(),
    agentName: v.string(),
    commentType: v.union(
      v.literal('research'),
      v.literal('progress'),
      v.literal('question'),
      v.literal('collaboration'),
      v.literal('completion')
    ),
    content: v.string(),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    // Get task
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error('Task not found');

    // Format comment for human readability
    const formattedComment = formatAgentComment(
      args.agentName,
      args.commentType,
      args.content,
      args.metadata
    );

    // Post to Jira via API
    const jiraConfig = await getJiraConfig(ctx);
    const response = await fetch(
      `https://${jiraConfig.domain}/rest/api/3/issue/${task.issueKey}/comment`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${jiraConfig.email}:${jiraConfig.apiToken}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: formattedComment }]
              }
            ]
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to post comment: ${response.status}`);
    }

    const result = await response.json();

    // Store reference in agent memory
    await ctx.db.insert('memories', {
      playerId: args.agentId as any,
      description: `Posted ${args.commentType} comment to ${task.issueKey}`,
      importance: 7,
      relatedTaskId: args.taskId,
      isShared: true,
      data: {
        type: 'jira_comment',
        commentId: result.id,
        issueKey: task.issueKey
      }
    });

    return {
      success: true,
      commentId: result.id,
      issueKey: task.issueKey
    };
  }
});

/**
 * Get all comments for a task (session memory)
 */
export const getTaskComments = internalQuery({
  args: {
    taskId: v.id('jiraTasks')
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return [];

    // Fetch from Jira
    const jiraConfig = await getJiraConfig(ctx);
    const response = await fetch(
      `https://${jiraConfig.domain}/rest/api/3/issue/${task.issueKey}/comment`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${jiraConfig.email}:${jiraConfig.apiToken}`)}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch comments:', response.status);
      return [];
    }

    const data = await response.json();

    return data.comments.map((comment: any) => ({
      id: comment.id,
      author: comment.author.displayName,
      content: extractTextFromJiraContent(comment.body),
      created: new Date(comment.created).getTime(),
      updated: comment.updated ? new Date(comment.updated).getTime() : undefined
    }));
  }
});

/**
 * Format agent comment for Jira (human-readable)
 */
function formatAgentComment(
  agentName: string,
  type: string,
  content: string,
  metadata?: any
): string {
  const icons = {
    research: '🔍',
    progress: '✅',
    question: '❓',
    collaboration: '🤝',
    completion: '🎉'
  };

  const icon = icons[type as keyof typeof icons] || '💬';
  const timestamp = new Date().toLocaleString();

  let formatted = `${icon} **${agentName} (AI Agent)** - ${type.toUpperCase()}\n`;
  formatted += `_${timestamp}_\n\n`;
  formatted += content;

  if (metadata) {
    formatted += `\n\n---\n`;
    formatted += `_Metadata: ${JSON.stringify(metadata, null, 2)}_`;
  }

  return formatted;
}

/**
 * Extract plain text from Jira's ADF (Atlassian Document Format)
 */
function extractTextFromJiraContent(body: any): string {
  if (!body || !body.content) return '';

  let text = '';
  for (const node of body.content) {
    if (node.type === 'paragraph' && node.content) {
      for (const item of node.content) {
        if (item.type === 'text') {
          text += item.text;
        }
      }
      text += '\n';
    }
  }
  return text.trim();
}

/**
 * Helper to get Jira configuration
 */
async function getJiraConfig(ctx: any) {
  return {
    domain: process.env.JIRA_DOMAIN!,
    email: process.env.JIRA_EMAIL!,
    apiToken: process.env.JIRA_API_TOKEN!
  };
}
```

### 2.2 Update Action Executor

**File:** `convex/aetheria/actionExecutor.ts`

**Update `executeTool` function to post results to Jira:**

```typescript
async function executeTool(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: string,
  params: { tool: string; input: any }
): Promise<{ success: boolean; result?: any; error?: string }> {
  const startTime = Date.now();

  try {
    console.log(`[Action Executor] Executing tool: ${params.tool}`, params.input);

    // Execute the tool
    const toolResult = await executeToolImpl(params.tool, params.input);
    const duration = Date.now() - startTime;

    // If this is research and agent has a current task, post to Jira
    if (params.tool === 'web_search' && toolResult.success) {
      const currentTask = await getCurrentTaskForAgent(ctx, worldId, agentId);

      if (currentTask) {
        // Format research findings
        const findings = formatResearchFindings(
          params.input.query,
          toolResult.result
        );

        // Post to Jira comment
        await ctx.runMutation(internal.aetheria.jiraCommentService.addAgentComment, {
          taskId: currentTask._id,
          agentId,
          agentName: await getAgentName(ctx, agentId),
          commentType: 'research',
          content: findings,
          metadata: {
            query: params.input.query,
            resultCount: toolResult.result.count,
            source: toolResult.result.source
          }
        });
      }
    }

    // Log tool execution
    await ctx.runMutation(internal.aetheria.tasks.logToolExecution, {
      worldId,
      agentId,
      taskId: currentTask?._id,
      toolName: params.tool,
      input: params.input,
      output: toolResult.result,
      success: toolResult.success,
      error: toolResult.error,
      duration
    });

    return toolResult;
  } catch (error) {
    // ... error handling
  }
}

function formatResearchFindings(query: string, result: any): string {
  let findings = `Research Query: "${query}"\n\n`;
  findings += `Found ${result.count} results:\n\n`;

  result.results.forEach((item: any, i: number) => {
    findings += `${i + 1}. **${item.title}**\n`;
    findings += `   ${item.snippet}\n`;
    findings += `   🔗 ${item.url}\n\n`;
  });

  return findings;
}
```

---

## Phase 3: Context Builder Update (Integrate Session Memory)

### 3.1 Update Context Builder

**File:** `convex/aetheria/contextBuilder.ts`

**Add session context from Jira:**

```typescript
async function buildAgentBrainRequestInternal(
  ctx: QueryCtx,
  args: { ... }
): Promise<AgentBrainRequest> {
  // Gather all context in parallel
  const [
    recentMemories,      // Tier 1: Short-term
    inboxMessages,
    currentTask,
    availableTasks,
    nearbyAgents,
    agentBrain,
    agentDescription,
    sessionContext,      // Tier 2: Jira comments (NEW)
  ] = await Promise.all([
    getRecentMemories(ctx, args.worldId, args.agentId),
    getInboxMessages(ctx, args.worldId, args.agentId),
    getCurrentTask(ctx, args.worldId, args.agentId),
    getAvailableTasks(ctx, args.worldId),
    getNearbyAgents(ctx, args.worldId, args.agentId),
    getAgentBrain(ctx, args.worldId, args.agentId),
    getAgentDescription(ctx, args.worldId, args.agentId),
    getSessionContext(ctx, args.worldId, args.agentId),  // NEW
  ]);

  // Build request
  const request: AgentBrainRequest = {
    agentId: args.agentId,
    agentName: args.agentName,
    worldId: args.worldId,
    identity: agentDescription?.identity,
    plan: agentDescription?.plan,
    currentState: determineAgentState(currentTask),

    // Tier 1: Personal short-term
    recentMemories,

    // Tier 2: Session context (NEW)
    sessionContext,

    inboxMessages,
    availableTools: agentBrain?.permittedTools || [],
    nearbyAgents,
    availableTasks,
    timestamp: Date.now(),
    callType: args.callType,
  };

  // Add optional fields...

  return request;
}

/**
 * Get session context from Jira comments (Tier 2)
 */
async function getSessionContext(
  ctx: QueryCtx,
  worldId: Id<'worlds'>,
  agentId: string
): Promise<AgentBrainRequest['sessionContext']> {
  try {
    // Get agent's current task
    const currentTask = await getCurrentTask(ctx, worldId, agentId);

    if (!currentTask) {
      return {
        hasActiveTask: false,
        taskHistory: []
      };
    }

    // Fetch Jira comments for this task
    const comments = await ctx.runQuery(
      internal.aetheria.jiraCommentService.getTaskComments,
      { taskId: currentTask.id }
    );

    return {
      hasActiveTask: true,
      currentTaskKey: currentTask.issueKey,
      taskHistory: comments.map(c => ({
        author: c.author,
        content: c.content,
        timestamp: c.created,
        isAIAgent: c.author.includes('AI Agent')
      })),
      collaborators: [...new Set(comments.map(c => c.author))],
      lastUpdate: comments.length > 0 ? comments[0].created : undefined
    };
  } catch (error) {
    console.error('[Context Builder] Error fetching session context:', error);
    return {
      hasActiveTask: false,
      taskHistory: []
    };
  }
}
```

### 3.2 Update Brain Request Interface

**File:** `convex/aetheria/brainConnector.ts`

**Add sessionContext to request:**

```typescript
export interface AgentBrainRequest {
  // Agent Identity
  agentId: string;
  agentName: string;
  worldId: string;
  identity?: string;
  plan?: string;

  // Agent State
  currentState: 'idle' | 'thinking' | 'working' | 'blocked';

  // Tier 1: Short-term memory (recent events)
  recentMemories: Array<{
    description: string;
    importance: number;
    timestamp: number;
    type: 'conversation' | 'reflection' | 'observation';
  }>;

  // Tier 2: Session context (Jira comments) - NEW
  sessionContext?: {
    hasActiveTask: boolean;
    currentTaskKey?: string;
    taskHistory: Array<{
      author: string;
      content: string;
      timestamp: number;
      isAIAgent: boolean;
    }>;
    collaborators: string[];
    lastUpdate?: number;
  };

  // Current Task
  currentTask?: { ... };

  // Rest of fields...
}
```

---

## Phase 4: Graphiti Integration (Tier 3 - Long-Term Knowledge)

### 4.1 Install Graphiti

**Package:** Add to project dependencies

```bash
npm install graphiti-core
# Or the appropriate Graphiti client package
```

### 4.2 Create Graphiti Service

**File:** `convex/aetheria/graphitiService.ts` (NEW)

```typescript
/**
 * Graphiti Knowledge Graph Service
 *
 * Manages long-term team knowledge as a temporal knowledge graph
 */

import { v } from 'convex/values';
import { internalAction, internalMutation } from '../_generated/server';
import { Id } from '../_generated/dataModel';

/**
 * Add episode to Graphiti knowledge graph
 * Called when agent posts important research/learnings
 */
export const addEpisodeToGraph = internalAction({
  args: {
    agentId: v.string(),
    agentName: v.string(),
    taskId: v.id('jiraTasks'),
    issueKey: v.string(),
    content: v.string(),
    episodeType: v.union(
      v.literal('research'),
      v.literal('collaboration'),
      v.literal('learning'),
      v.literal('problem_solving')
    )
  },
  handler: async (ctx, args) => {
    try {
      const graphitiClient = getGraphitiClient();

      // Create episode
      const episode = await graphitiClient.addEpisode({
        name: `${args.agentName}_${args.episodeType}_${args.issueKey}`,
        episode_body: args.content,
        source: 'jira_comment',
        source_description: `Agent ${args.agentName} working on ${args.issueKey}`,
        reference_time: new Date().toISOString(),
        group_id: await getTeamGroupId(ctx)  // Team-specific knowledge
      });

      // Store episode reference
      await ctx.runMutation(internal.aetheria.graphitiService.storeEpisodeReference, {
        agentId: args.agentId,
        taskId: args.taskId,
        episodeId: episode.uuid,
        episodeName: episode.name
      });

      console.log(`[Graphiti] Added episode: ${episode.name}`);

      return {
        success: true,
        episodeId: episode.uuid
      };
    } catch (error) {
      console.error('[Graphiti] Failed to add episode:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});

/**
 * Search knowledge graph for relevant facts/entities
 */
export const searchKnowledgeGraph = internalAction({
  args: {
    query: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    try {
      const graphitiClient = getGraphitiClient();

      const results = await graphitiClient.search(args.query, {
        num_results: args.limit || 5,
        group_ids: [await getTeamGroupId(ctx)]
      });

      // Transform results for brain context
      return {
        success: true,
        facts: results.facts.map((fact: any) => ({
          content: fact.fact,
          confidence: fact.valid_at ? 1.0 : 0.8,
          source: fact.episodes?.[0]?.name || 'unknown',
          timestamp: fact.created_at
        })),
        entities: results.entities.map((entity: any) => ({
          name: entity.name,
          type: entity.entity_type,
          summary: entity.summary
        })),
        relationships: results.edges?.map((edge: any) => ({
          from: edge.source_node_name,
          to: edge.target_node_name,
          type: edge.fact
        })) || []
      };
    } catch (error) {
      console.error('[Graphiti] Search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }
});

/**
 * Store episode reference in Aetheria DB
 */
export const storeEpisodeReference = internalMutation({
  args: {
    agentId: v.string(),
    taskId: v.id('jiraTasks'),
    episodeId: v.string(),
    episodeName: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('memories', {
      playerId: args.agentId as any,
      description: `Added knowledge to team graph: ${args.episodeName}`,
      importance: 9,
      relatedTaskId: args.taskId,
      isShared: true,
      graphitiEpisodeId: args.episodeId,
      data: {
        type: 'graphiti_episode',
        episodeName: args.episodeName
      }
    });
  }
});

/**
 * Get Graphiti client instance
 */
function getGraphitiClient() {
  // Initialize Graphiti client
  // This depends on your Graphiti setup (cloud, self-hosted, etc.)
  const apiKey = process.env.GRAPHITI_API_KEY;
  const endpoint = process.env.GRAPHITI_ENDPOINT || 'http://localhost:8000';

  return new GraphitiClient({
    apiKey,
    endpoint
  });
}

/**
 * Get team's group ID in Graphiti
 */
async function getTeamGroupId(ctx: any): Promise<string> {
  // Could be worldId or a team identifier
  return 'aetheria_team_1';  // Or dynamic based on world
}
```

### 4.3 Update Context Builder for Graphiti

**File:** `convex/aetheria/contextBuilder.ts`

**Add long-term knowledge search:**

```typescript
async function buildAgentBrainRequestInternal(
  ctx: QueryCtx,
  args: { ... }
): Promise<AgentBrainRequest> {
  // Gather context...

  // Tier 3: Long-term knowledge (only if needed)
  let knowledgeGraph = undefined;
  if (args.callType === 'task_evaluation' || shouldSearchKnowledge(currentTask)) {
    knowledgeGraph = await ctx.runAction(
      internal.aetheria.graphitiService.searchKnowledgeGraph,
      {
        query: buildKnowledgeQuery(currentTask, args.evaluationContext),
        limit: 5
      }
    );
  }

  const request: AgentBrainRequest = {
    // ... existing fields

    // Tier 3: Knowledge graph
    knowledgeGraph: knowledgeGraph?.success ? knowledgeGraph : undefined
  };

  return request;
}

function shouldSearchKnowledge(task: any): boolean {
  // Search knowledge graph when:
  // - Task is complex
  // - Similar tasks existed before
  // - Agent is blocked
  return task?.priority === 'high' || task?.status === 'blocked';
}

function buildKnowledgeQuery(task: any, context: any): string {
  if (context?.taskDescription) {
    return context.taskDescription;
  }
  return task?.issueSummary || 'relevant team knowledge';
}
```

### 4.4 Trigger Graphiti Ingestion

**File:** `convex/aetheria/jiraCommentService.ts`

**After posting Jira comment, add to Graphiti:**

```typescript
export const addAgentComment = internalMutation({
  args: { ... },
  handler: async (ctx, args) => {
    // ... post to Jira

    // If this is important knowledge, add to Graphiti
    if (args.commentType === 'research' || args.commentType === 'collaboration') {
      await ctx.scheduler.runAfter(0, internal.aetheria.graphitiService.addEpisodeToGraph, {
        agentId: args.agentId,
        agentName: args.agentName,
        taskId: args.taskId,
        issueKey: task.issueKey,
        content: formattedComment,
        episodeType: args.commentType === 'research' ? 'research' : 'collaboration'
      });
    }

    return { success: true, ... };
  }
});
```

---

## Phase 5: Environment Configuration

### 5.1 Convex Environment Variables

```bash
# Jira (already configured)
npx convex env set JIRA_DOMAIN "your-domain.atlassian.net"
npx convex env set JIRA_EMAIL "your-email"
npx convex env set JIRA_API_TOKEN "your-token"

# Graphiti (new)
npx convex env set GRAPHITI_API_KEY "your-graphiti-key"
npx convex env set GRAPHITI_ENDPOINT "http://localhost:8000"  # or cloud endpoint
```

### 5.2 Graphiti Setup

**Option A: Self-Hosted**
```bash
# Run Graphiti locally
docker run -p 8000:8000 graphiti/server
```

**Option B: Cloud/Managed**
- Use managed Graphiti service
- Configure endpoint and API key

---

## Phase 6: Testing & Validation

### 6.1 Test Scenarios

**Scenario 1: Single Agent Research**
```
1. Agent Alice claims TASK-123 "Implement webhooks"
2. Alice executes web_search("webhook patterns")
3. Verify: Jira comment posted with research findings
4. Verify: Graphiti episode created
5. Verify: Alice's short-term memory updated
```

**Scenario 2: Multi-Agent Collaboration**
```
1. Agent Bob claims TASK-123 (Alice's task)
2. Bob's brain requests context
3. Verify: Bob receives:
   - Short-term: Bob's recent 10 events
   - Session: Alice's Jira comments on TASK-123
   - Knowledge: Graphiti facts about webhooks
4. Bob uses Alice's research, doesn't duplicate
5. Bob posts progress comment
6. Verify: Graphiti links Bob's work to Alice's research
```

**Scenario 3: Historical Knowledge Search**
```
1. Week later: Agent Charlie gets TASK-456 "API authentication"
2. Charlie's brain searches Graphiti
3. Verify: Finds related webhook/auth knowledge from Alice & Bob
4. Charlie applies learned patterns
5. Verify: Knowledge graph shows progression:
   Alice (webhooks) → Bob (APIs) → Charlie (auth patterns)
```

### 6.2 Validation Queries

```typescript
// Check short-term memory
const recent = await ctx.db
  .query('memories')
  .withIndex('playerId', q => q.eq('playerId', agentId))
  .order('desc')
  .take(10);

// Check session memory (Jira)
const session = await jiraClient.getComments(task.issueKey);

// Check long-term memory (Graphiti)
const knowledge = await graphiti.search("webhook authentication");
```

---

## Phase 7: Documentation Updates

### 7.1 Update MEMORY_ARCHITECTURE.md

Add sections:
- Three-tier system details
- Jira integration guide
- Graphiti knowledge graph
- Retrieval strategies
- Example flows

### 7.2 Update BRAIN_BODY_ARCHITECTURE_V2.md

Add session memory explanation:
- How Jira comments work as session memory
- When to post comments
- How brain reads comments

---

## Success Criteria

✅ **Tier 1 (Short-term):** Agent can access last 10 personal events
✅ **Tier 2 (Session):** Agent can read all Jira comments on current task
✅ **Tier 3 (Long-term):** Agent can search historical knowledge via Graphiti
✅ **Collaboration:** Multiple agents working on same task share knowledge
✅ **No Duplication:** Agents don't repeat research done by teammates
✅ **Knowledge Growth:** Team's collective knowledge grows over time

---

## Timeline Estimate

- **Phase 1 (Schema):** 1 hour
- **Phase 2 (Jira Integration):** 3-4 hours
- **Phase 3 (Context Builder):** 2 hours
- **Phase 4 (Graphiti):** 4-5 hours
- **Phase 5 (Config):** 30 minutes
- **Phase 6 (Testing):** 2-3 hours
- **Phase 7 (Docs):** 1 hour

**Total:** ~14-17 hours

---

## Dependencies

1. Jira API access (already configured)
2. Graphiti instance (need to set up)
3. web_search tool (already exists)
4. Current memory system (will be extended)

---

## Risks & Mitigation

**Risk 1:** Graphiti API latency
- **Mitigation:** Make Tier 3 search optional, cache results

**Risk 2:** Jira API rate limits
- **Mitigation:** Batch comment posts, cache reads

**Risk 3:** Memory size growth
- **Mitigation:** Implement cleanup for old short-term memories

---

## Next Steps After Implementation

1. Monitor Graphiti knowledge graph growth
2. Tune which memories become episodes
3. Optimize retrieval strategies
4. Add visualization of knowledge connections
5. Enable humans to query the knowledge graph

---

**This implementation creates TRUE team intelligence where agents learn together and build on each other's work!** 🧠🤝🌐

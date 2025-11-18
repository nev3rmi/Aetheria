# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aetheria** is a task-oriented multi-agent AI platform built on top of AI Town. It transforms the social simulation framework into a productive workspace where AI agents autonomously fetch tasks from Jira, execute them using external "brains" (n8n/Dify workflows), and collaborate through delegation and messaging.

This is an **active fork/evolution** of AI Town that maintains the simulation engine while replacing social behaviors with goal-oriented task execution.

## Core Architecture

### Three-Layer System

```
┌────────────────────────────────────────────────────────────┐
│ LAYER 1: Game Engine (/convex/engine/)                    │
│ - AbstractGame: Single-threaded simulation loop           │
│ - Input queue with sequential processing                   │
│ - Tick-based state advancement (16ms per tick)            │
│ - Generation numbers prevent race conditions              │
└────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────┐
│ LAYER 2: AI Town Simulation (/convex/aiTown/)             │
│ - Game: Manages world state (players, agents, convos)     │
│ - Player: Movement, pathfinding, activities               │
│ - Agent: Decision-making, operations scheduling           │
│ - Inputs: Player/agent actions fed into engine            │
└────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────┐
│ LAYER 3: Aetheria Extensions (/convex/aetheria/) **NEW**  │
│ - Jira webhook handler: Real-time task notifications      │
│ - Brain connector: Calls n8n/Dify for agent decisions     │
│ - Tool registry: web_search, code_executor, etc.          │
│ - Communication: Agent-to-agent messaging & delegation    │
└────────────────────────────────────────────────────────────┘
```

### Key Concepts

1. **Game Engine Loop** (`/convex/aiTown/main.ts:runStep`)
   - Runs every ~1 second (configurable)
   - Processes queued inputs sequentially
   - Advances simulation by multiple ticks (16ms each)
   - Saves state diff to database
   - Single-threaded per world (no race conditions)

2. **Input System** (`/convex/aiTown/inputs.ts`)
   - All state changes go through inputs
   - Inputs queued in `inputs` table with sequential numbers
   - Engine processes inputs in order on each step
   - Input handlers return success/failure

3. **Agent Operations** (`/convex/aiTown/agent.ts`)
   - Agents schedule long-running async operations (LLM calls, tool execution)
   - Operations run as Convex actions (can call external APIs)
   - Results fed back to agent via inputs
   - Agents track in-progress operations with timeout detection

4. **Aetheria Task Flow**
   ```
   Jira Issue Created/Updated (label: agent-alice)
         ↓ (webhook)
   /jira_webhook endpoint validates HMAC
         ↓
   processJiraTask mutation stores in jiraTasks table
         ↓
   Agent discovers task on next decision cycle
         ↓
   Agent calls external brain (n8n/Dify webhook)
         ↓
   Brain returns action (use_tool, update_task, delegate, etc.)
         ↓
   Agent executes action via tool registry or Jira API
         ↓
   Agent updates task status in Jira
   ```

## Development Commands

### Essential Commands

```bash
# Start development (backend + frontend in parallel)
npm run dev

# OR run separately for better logs:
npm run dev:backend    # Convex functions with hot reload
npm run dev:frontend   # Vite dev server on localhost:5173

# First-time setup: Initialize world and agents
npm run predev         # Runs convex dev --run init --until-success

# Manual initialization after schema changes
npx convex run init
```

### Backend Management

```bash
# Stop the simulation engine (debugging)
npx convex run testing:stop

# Restart the engine
npx convex run testing:resume

# Kick engine if stuck
npx convex run testing:kick

# Archive current world and start fresh
npx convex run testing:archive
npx convex run init

# Wipe ALL data (use with caution!)
npx convex run testing:wipeAllTables
npx convex run init    # Reinitialize after wipe
```

### Testing

```bash
# Run Jest tests
npm test

# Run specific test file
npm test -- path/to/test.ts
```

### Production Deployment

```bash
# Deploy Convex functions to production
npx convex deploy

# Initialize production world
npx convex run init --prod

# Deploy frontend to Vercel
vercel --prod

# Export/import data between environments
npx convex export        # Export from dev
npx convex import --prod # Import to prod
```

### Environment Configuration

```bash
# Set environment variables (backend)
npx convex env set VARIABLE_NAME value

# View current config
npx convex dashboard     # Opens web dashboard
```

## Aetheria-Specific Setup

### Jira Integration

```bash
# Configure Jira credentials
npx convex env set JIRA_DOMAIN "your-company.atlassian.net"
npx convex env set JIRA_EMAIL "your-email@company.com"
npx convex env set JIRA_API_TOKEN "your-jira-api-token"
npx convex env set JIRA_WEBHOOK_SECRET "your-webhook-secret"

# Get webhook URL after deployment
# https://your-deployment.convex.site/jira_webhook
```

### Agent Brain Configuration

Create agent brains in the database that map agents to n8n/Dify webhooks:

```bash
# Via Convex dashboard or custom initialization script
# Each agent needs:
# - agentId: Reference to player entity
# - brainType: "n8n" | "dify" | "custom"
# - webhookUrl: External brain endpoint
# - permittedTools: Array of tool names
```

### LLM Provider Setup (for memory embeddings)

```bash
# Default: Ollama (local)
ollama pull llama3
ollama serve

# OR OpenAI
npx convex env set OPENAI_API_KEY "sk-..."

# OR Together.ai
npx convex env set TOGETHER_API_KEY "..."

# See README.md for full LLM configuration options
```

## Important File Locations

### Aetheria Core (New Code)

- `/convex/aetheria/schema.ts` - 14 new database tables
- `/convex/aetheria/jiraWebhook.ts` - Webhook handler with HMAC validation
- `/convex/aetheria/jiraClient.ts` - Jira REST API wrapper
- `/convex/aetheria/BRAIN_API_SPEC.md` - Agent brain webhook contract
- `/convex/http.ts` - HTTP route registration (includes `/jira_webhook`)

### AI Town Foundation (Existing)

- `/convex/engine/abstractGame.ts` - Core simulation loop
- `/convex/aiTown/main.ts` - Engine lifecycle (create, start, stop, runStep)
- `/convex/aiTown/game.ts` - World state serialization
- `/convex/aiTown/agent.ts` - Agent behavior and operations
- `/convex/aiTown/inputs.ts` - Input handlers registry
- `/convex/schema.ts` - Root database schema
- `/convex/constants.ts` - Game timing and behavior tuning

### Frontend

- `/src/App.tsx` - Main UI entry point
- `/src/components/Game.tsx` - Game state orchestration
- `/src/components/PixiGame.tsx` - PixiJS rendering engine
- `/data/characters.ts` - Agent definitions and personalities

## Database Schema Understanding

### AI Town Core Tables

- `worlds` - Single document containing all players, agents, conversations (mutable state)
- `worldStatus` - Engine metadata (running/stopped status, lastViewed)
- `maps` - Tilemap data (separate for size efficiency)
- `playerDescriptions`, `agentDescriptions` - Human-readable text
- `archivedPlayers`, `archivedConversations`, `archivedAgents` - Historical data
- `memories`, `memoryEmbeddings` - Agent memory with vector search

### Aetheria Tables (New)

- `jiraTasks` - Tasks from Jira webhooks, indexed by agent/status/labels
- `agentBrains` - Maps agents to n8n/Dify webhooks
- `toolExecutions` - Logs every tool use
- `agentMessages` - In-app communication (direct, broadcast, delegation)
- `taskDelegations` - Tracks agent-to-agent task handoffs
- `jiraWebhookLog` - Idempotency tracking for webhook deliveries
- `brainCallLog` - Every external brain API call
- `agentActionLog` - High-level agent actions (task_claimed, tool_executed, etc.)
- `agentStateSnapshots` - Debug snapshots at decision points

## Working with the Simulation Engine

### How to Add New Agent Inputs

1. Define input handler in `/convex/aiTown/inputs.ts` or new file:

```typescript
import { inputHandler } from './inputHandler';
import { v } from 'convex/values';

export const myNewInput = inputHandler({
  args: {
    agentId: v.id('agents'),
    myParam: v.string(),
  },
  handler: (game, now, args) => {
    const agentId = parseGameId('agents', args.agentId);
    const agent = game.world.agents.get(agentId);

    // Modify game state
    // Return { success: true } or throw error

    return { success: true };
  },
});
```

2. Register in input registry:

```typescript
export const inputs = {
  ...existingInputs,
  myNewInput,
};
```

3. Call from client or action:

```typescript
await insertInput(ctx, worldId, 'myNewInput', { agentId, myParam: 'value' });
```

### How to Add Agent Operations

Operations are for async work (LLM calls, external APIs):

1. Define operation in `/convex/aiTown/agentOperations.ts` or `/convex/aetheria/operations.ts`:

```typescript
export const myOperation = operation({
  args: {
    operationId: v.id('operations'),
    agentId: v.id('agents'),
    // ... your args
  },
  handler: async (ctx, args) => {
    // Can call external APIs
    const result = await fetch('https://api.example.com');

    // Feed result back to agent via input
    await insertInput(ctx, worldId, 'myOperationComplete', {
      operationId: args.operationId,
      result,
    });
  },
});
```

2. Schedule from agent logic:

```typescript
agent.startOperation(game, now, 'myOperation', { agentId: agent.id });
```

### Schema Changes

When modifying `/convex/schema.ts` or `/convex/aetheria/schema.ts`:

1. Schema changes auto-deploy during `npm run dev:backend`
2. **MUST wipe and reinit if changing vector dimensions or table structure:**
   ```bash
   npx convex run testing:wipeAllTables
   npx convex run init
   ```
3. For production, carefully plan migrations or backup data first

## Debugging

### View Logs

```bash
# Live logs during development
npm run dev:backend

# Dashboard for historical logs
npm run dashboard
```

### Common Issues

**Engine not running:**
```bash
npx convex run testing:kick
```

**Agents not responding:**
- Check `worldStatus` table: status should be "running"
- Check `engines` table: running should be true
- Verify LLM/brain connectivity with curl tests

**Jira webhook not received:**
- Check Convex logs in dashboard
- Verify HMAC secret matches Jira configuration
- Test with Jira webhook debugger or Postman

**Brain API timeouts:**
- Check n8n/Dify workflow is active
- Verify webhook URL is accessible from Convex cloud
- Check `brainCallLog` table for error details

## Code Style & Patterns

### Convex Patterns

- **Queries**: Read-only, reactive, cached (`query()`)
- **Mutations**: Transactional writes (`mutation()`)
- **Actions**: External API calls, non-deterministic (`action()`)
- **Internal functions**: Only callable from backend (`internalMutation`, `internalAction`)

### Type Safety

- Use `v` validators for all function arguments
- Game IDs are typed: `GameId<'players'>`, `GameId<'agents'>`
- Serialized classes have `serialize()` method and constructor from serialized data

### Async Patterns

- Always use `await` for database operations
- Actions can `await ctx.runMutation()` or `await ctx.runQuery()`
- Never call actions from queries/mutations (use operation scheduling)

## Docker Development

```bash
# Start full stack with Docker Compose
docker compose up --build -d

# View logs
docker compose logs -f backend

# Generate admin key for dashboard
docker compose exec backend ./generate_admin_key.sh

# Configure Ollama connection from Docker
npx convex env set OLLAMA_HOST http://host.docker.internal:11434
```

## Character & World Customization

### Adding New Agents

Edit `/data/characters.ts`:

```typescript
export const characters = [
  {
    name: 'MyAgent',
    character: 'a1', // Spritesheet reference
    identity: 'You are a helpful coding assistant...',
    plan: 'You want to help developers write better code.',
  },
];
```

Then wipe and reinit:
```bash
npx convex run testing:wipeAllTables
npx convex run init
```

### Changing the Map

1. Edit in [Tiled](https://www.mapeditor.org/) (2 layers: bgtiles, objmap)
2. Export as JSON
3. Convert: `node data/convertMap.js <json> <assetPath> <tileW> <tileH>`
4. Replace `/data/gentle.js` with output
5. Update `convex/init.ts` to load new map

## Important Constants

Edit `/convex/constants.ts` for behavior tuning:

- `TICK_DURATION`: Simulation tick interval (default 16ms)
- `STEP_INTERVAL`: Engine step frequency (default 1000ms)
- `MAX_STEP`: Max ticks per step (default 60)
- `ACTION_TIMEOUT`: Agent operation timeout (default 120s)
- `CONVERSATION_DISTANCE`: Agent interaction range (default 1.3 tiles)
- `NUM_MEMORIES_TO_SEARCH`: Memory retrieval count (affects LLM prompt size)

## Key Differences from Stock AI Town

Aetheria adds:
1. **Jira integration** - Real-time task notifications via webhooks
2. **External brains** - n8n/Dify control agent behavior instead of in-line LLM prompts
3. **Tool system** - Extensible tool registry for agent capabilities
4. **Task lifecycle** - Agents claim, work on, and complete Jira issues
5. **Delegation** - Agents can create subtasks and assign to other agents
6. **Structured observability** - Comprehensive logging of all agent actions

The engine and frontend remain largely unchanged, allowing smooth upgrades from AI Town.

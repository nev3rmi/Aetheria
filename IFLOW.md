# AI Town Project Interaction Guide

## Project Overview

AI Town is a virtual town simulation built on Convex where AI characters live, chat, and socialize. This project is inspired by the research paper "Generative Agents: Interactive Simulacra of Human Behavior." Aetheria is a task-oriented multi-agent AI platform built on top of AI Town, transforming the social simulation framework into a productive workspace.

### Core Tech Stack

- **Game engine, database, and vector search**: [Convex](https://convex.dev/) - Provides real-time database, transactions, and simulation engine
- **Frontend framework**: React 18.2.0 + TypeScript 5.1.3
- **Build tool**: Vite 4.4.9 - Fast development and hot reload
- **Game rendering**: [PixiJS](https://pixijs.com/) + @pixi/react - 2D game graphics rendering
- **UI styling**: Tailwind CSS 3.3.3 - Modern CSS framework
- **LLM integration**: Supports Ollama, OpenAI, Together.ai and other LLM providers
- **Authentication**: Clerk (optional) - User authentication system
- **Background music**: Replicate + MusicGen - AI music generation

### Architecture Layers

```
┌────────────────────────────────────────────────────────────┐
│ Layer 1: Game Engine (/convex/engine/)                    │
│ - AbstractGame: Single-threaded simulation loop           │
│ - Input queue with sequential processing                   │
│ - Tick-based state advancement (16ms per tick)            │
│ - Generation numbers prevent race conditions              │
└────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────┐
│ Layer 2: AI Town Simulation (/convex/aiTown/)             │
│ - Game: Manages world state (players, agents, convos)     │
│ - Player: Movement, pathfinding, activities               │
│ - Agent: Decision-making, operations scheduling           │
│ - Inputs: Player/agent actions fed into engine            │
└────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────┐
│ Layer 3: Aetheria Extensions (/convex/aetheria/) **NEW**  │
│ - Jira webhook: Real-time task notifications              │
│ - Brain connector: Calls n8n/Dify for agent decisions     │
│ - Tool registry: web_search, code_executor, etc.          │
│ - Communication: Agent-to-agent messaging & delegation    │
└────────────────────────────────────────────────────────────┘
```

## Building and Running

### Development Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/a16z-infra/ai-town.git
   cd ai-town
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **First-time setup**
   ```bash
   npm run predev  # runs convex dev --run init --until-success
   ```

### Start Commands

#### Standard start (frontend + backend in parallel)
```bash
npm run dev
```

#### Separate starts (better log output)
```bash
npm run dev:backend    # Convex functions with hot reload
npm run dev:frontend   # Vite dev server on localhost:5173
```

#### Other common commands
```bash
npm run build          # TypeScript compilation + Vite build
npm run lint           # ESLint code checking
npm test               # Jest testing
npm run dashboard      # Convex dashboard
```

### Docker Deployment

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

### LLM Provider Configuration

#### Default: Ollama (local inference)
```bash
# Download and install Ollama
ollama serve
ollama pull llama3
```

#### OpenAI
```bash
npx convex env set OPENAI_API_KEY 'your-api-key'
```

#### Together.ai
```bash
npx convex env set TOGETHER_API_KEY 'your-api-key'
```

### Production Deployment

```bash
# Deploy Convex functions to production
npx convex deploy
npx convex run init --prod

# Deploy frontend to Vercel
vercel --prod

# Export/import data
npx convex export        # Export from dev
npx convex import --prod # Import to prod
```

## Development Conventions

### Code Style and Structure

#### TypeScript Configuration
- **Target version**: ES2015
- **Module system**: ESNext
- **Strict mode**: Strict type checking enabled
- **Path mapping**: `@/*` maps to `./src/*`

#### Directory Structure
```
/home/nev3r/projects/ai-town/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   └── App.tsx            # Application entry point
├── convex/                # Convex backend
│   ├── aiTown/            # AI Town simulation logic
│   ├── engine/            # Game engine core
│   ├── agent/             # Agent logic
│   ├── aetheria/          # Aetheria extensions
│   └── schema.ts          # Database schema
├── data/                  # Static data
│   ├── characters.ts      # Character definitions
│   └── spritesheets/      # Sprite data
└── assets/                # Static resources
```

### Convex Development Patterns

#### Database Operations
- **Queries**: Read-only, reactive, cached (`query()`)
- **Mutations**: Transactional writes (`mutation()`)
- **Actions**: External API calls, non-deterministic (`action()`)
- **Internal functions**: Only backend callable (`internalMutation`, `internalAction`)

#### Game Engine Architecture
- **Input System**: All state changes processed through input queue
- **Single-threaded guarantee**: Only one engine instance runs per world
- **State serialization**: Game state serialized to database between steps
- **Historical tracking**: Continuous quantities like position recorded at each tick

#### Agent Operation Patterns
```typescript
// 1. Define input handler
export const myInput = inputHandler({
  args: { agentId: v.id('agents'), param: v.string() },
  handler: (game, now, args) => {
    // Modify game state
    return { success: true };
  }
});

// 2. Schedule long-running operation
agent.startOperation(game, now, 'myOperation', { agentId: agent.id });

// 3. Feed results back when operation completes
await insertInput(ctx, worldId, 'operationComplete', { result });
```

### Testing Conventions

```bash
# Run Jest tests
npm test

# Run specific test file
npm test -- path/to/test.ts
```

### Debugging and Maintenance

#### Engine Management
```bash
# Stop simulation engine (debugging)
npx convex run testing:stop

# Restart engine
npx convex run testing:resume

# Force restart engine
npx convex run testing:kick

# Archive current world and start fresh
npx convex run testing:archive
npx convex run init

# Clear all data (use with caution!)
npx convex run testing:wipeAllTables
npx convex run init
```

#### View Logs
```bash
# Real-time logs during development
npm run dev:backend

# Historical logs dashboard
npm run dashboard
```

### Common Issues and Solutions

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

### Schema Changes

When modifying `/convex/schema.ts` or `/convex/aetheria/schema.ts`:

1. Schema changes auto-deploy during `npm run dev:backend`
2. **MUST wipe and reinit if changing vector dimensions or table structure:**
   ```bash
   npx convex run testing:wipeAllTables
   npx convex run init
   ```
3. For production, carefully plan migrations or backup data first

### Character and World Customization

#### Adding New Agents
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

#### Changing the Map
1. Edit in [Tiled](https://www.mapeditor.org/) (2 layers: bgtiles, objmap)
2. Export as JSON
3. Convert: `node data/convertMap.js <json> <assetPath> <tileW> <tileH>`
4. Replace `/data/gentle.js` with output
5. Update `convex/init.ts` to load new map

### Important Constants

Edit `/convex/constants.ts` for behavior tuning:

- `TICK_DURATION`: Simulation tick interval (default 16ms)
- `STEP_INTERVAL`: Engine step frequency (default 1000ms)
- `MAX_STEP`: Max ticks per step (default 60)
- `ACTION_TIMEOUT`: Agent operation timeout (default 120s)
- `CONVERSATION_DISTANCE`: Agent interaction range (default 1.3 tiles)
- `NUM_MEMORIES_TO_SEARCH`: Memory retrieval count (affects LLM prompt size)

### Key Differences from Stock AI Town

Aetheria adds:
1. **Jira integration** - Real-time task notifications via webhooks
2. **External brains** - n8n/Dify control agent behavior instead of in-line LLM prompts
3. **Tool system** - Extensible tool registry for agent capabilities
4. **Task lifecycle** - Agents claim, work on, and complete Jira issues
5. **Delegation** - Agents can create subtasks and assign to other agents
6. **Structured observability** - Comprehensive logging of all agent actions

The engine and frontend remain largely unchanged, allowing smooth upgrades from AI Town.

### Project Highlights

This project is unique for:

1. **Complete multi-layer architecture**: From low-level game engine to high-level AI functionality
2. **Real-time simulation**: Tick-based smooth animation and interactions
3. **Extensible agent system**: Support for external "brains" (n8n/Dify workflows)
4. **Enterprise integration**: Native Jira integration for task management
5. **Comprehensive observability**: Detailed logging of all agent operations
6. **Production-ready**: Docker deployment and cloud hosting support

AI Town/Aetheria provides a solid foundation for building complex AI-driven applications, suitable for both rapid prototyping and production deployment.
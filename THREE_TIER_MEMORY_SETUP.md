# Three-Tier Memory System - Setup & Testing Guide

**Complete guide to set up and test collaborative agent memory**

---

## Prerequisites

✅ Docker installed and running
✅ Node.js installed (v18+)
✅ Project dependencies installed (`npm install`)
✅ Jira account (optional for Tier 2 testing)

---

## Step 1: Start Docker Stack

The system requires Graphiti + Neo4j for long-term knowledge storage.

### 1.1 Copy Environment File

```bash
cp .env.docker.example .env
```

### 1.2 Edit `.env` File

Set your LLM provider for Graphiti entity extraction:

```bash
# Option 1: OpenAI (recommended for quality)
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-your-key-here

# Option 2: Ollama (free, local)
LLM_PROVIDER=ollama
LLM_MODEL=llama3
# (Ollama runs in backend container automatically)

# Neo4j password
NEO4J_PASSWORD=graphiti123
```

### 1.3 Start All Services

```bash
docker compose up -d
```

This starts:
- ✅ Frontend (Vite) - port 5173
- ✅ Backend (Convex) - port 3210
- ✅ Dashboard (Convex) - port 6791
- ✅ Neo4j (database) - ports 7687, 7474
- ✅ Graphiti (knowledge graph) - port 8000

### 1.4 Verify Services

```bash
docker compose ps
```

All services should show "Up (healthy)".

---

## Step 2: Configure Convex Environment

Set Graphiti endpoint for Convex functions:

```bash
# Inside Docker network (for Convex backend)
npx convex env set GRAPHITI_ENDPOINT "http://graphiti:8000"
npx convex env set GRAPHITI_API_KEY ""  # Empty for local

# Optional: Configure Jira for Tier 2 testing
npx convex env set JIRA_DOMAIN "your-company.atlassian.net"
npx convex env set JIRA_EMAIL "your-email@company.com"
npx convex env set JIRA_API_TOKEN "your-jira-api-token"
npx convex env set JIRA_WEBHOOK_SECRET "your-webhook-secret"
```

---

## Step 3: Initialize World

If starting fresh:

```bash
# Initialize world with agents
npx convex run init
```

This creates:
- Default world
- AI agents (Alice, Bob, etc.)
- Game map

---

## Step 4: Run Test Suite

Run the automated test suite:

```bash
node test-three-tier-memory.mjs
```

### What the Test Suite Does:

1. **✅ Check Graphiti Health**
   - Verifies Graphiti service is running
   - Tests connection to Neo4j

2. **🔥 Test Tier 1 - Short-Term Memory**
   - Retrieves last 10 personal memories
   - Shows agent's recent observations

3. **💬 Test Tier 2 - Session Memory (Jira)**
   - Fetches Jira task comments
   - Shows collaborative context

4. **🧠 Test Tier 3 - Long-Term Knowledge (Graphiti)**
   - Searches knowledge graph
   - Shows historical team learning

5. **📝 Add Test Episode**
   - Creates sample knowledge entry
   - Verifies it appears in search

6. **🎯 Test Complete Context**
   - Retrieves all 3 tiers together
   - Shows comprehensive agent context

### Expected Output:

```
╔════════════════════════════════════════════════════════════╗
║        Three-Tier Memory System Test Suite                ║
╚════════════════════════════════════════════════════════════╝

============================================================
STEP 1: Check Graphiti Health
============================================================
ℹ Checking Graphiti service...
✓ Graphiti is healthy and ready!

============================================================
STEP 2: Get World and Agents
============================================================
ℹ Fetching world status...
✓ Found world: m17abc123...
✓ Found 3 agents
  ℹ Agent 1: Alice
  ℹ Agent 2: Bob
  ℹ Agent 3: Charlie

...and so on
```

---

## Step 5: Access Services

### Neo4j Browser (View Knowledge Graph)

Open: http://localhost:7474

Login:
- Username: `neo4j`
- Password: `graphiti123` (or your NEO4J_PASSWORD)

Query to see nodes:
```cypher
MATCH (n) RETURN n LIMIT 25
```

### Graphiti API (Test Directly)

Health check:
```bash
curl http://localhost:8000/health
```

Add test episode:
```bash
curl -X POST http://localhost:8000/episodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_episode",
    "episode_body": "Alice researched webhooks. Webhooks use HMAC for authentication.",
    "source": "test",
    "reference_time": "2025-11-19T10:00:00Z",
    "group_id": "test_team"
  }'
```

Search knowledge:
```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "webhook authentication",
    "group_ids": ["test_team"],
    "num_results": 5
  }'
```

### Convex Dashboard

Open: http://localhost:6791

Browse:
- `memories` table (Tier 1)
- `jiraTasks` table (Tier 2 links)
- `toolExecutions` table (research logs)

---

## Step 6: Test Real Agent Collaboration

### 6.1 Create Jira Task (Optional)

In Jira, create a task with:
- Label: `agent-alice` (or any agent name)
- Summary: "Implement webhook authentication"
- Description: "Add HMAC signature validation"

Webhook will notify Aetheria automatically (if configured).

### 6.2 Watch Memory Flow

**Tier 1 (Short-Term):**
- Agent claims task → stored in `memories` table
- Check: Convex dashboard → `memories` table

**Tier 2 (Session - Jira Comments):**
- Agent researches via `web_search` tool
- Findings automatically posted to Jira comment
- Check: Open Jira task → see agent comment with 🤖 emoji

**Tier 3 (Long-Term - Graphiti):**
- Jira comment fed to Graphiti
- Entities extracted, facts generated
- Check: Neo4j browser → see new nodes

### 6.3 Test Collaboration

1. **Agent A (Alice)** works on TASK-100 (webhooks)
   - Researches HMAC patterns
   - Posts findings to Jira

2. **Agent B (Bob)** picks TASK-101 (also webhooks)
   - Searches Graphiti: "webhook authentication"
   - Finds Alice's research!
   - Builds on her findings

3. **Agent C (Charlie)** works on TASK-102 (2 weeks later)
   - Searches: "webhook implementation"
   - Benefits from Alice + Bob's accumulated knowledge
   - Team expertise identified

---

## Step 7: Monitor Knowledge Growth

### View Memory Stats

```bash
# Count memories
docker compose exec backend npx convex run --component=query <<EOF
ctx.db.query('memories').collect()
EOF

# Count Jira tasks
docker compose exec backend npx convex run --component=query <<EOF
ctx.db.query('jiraTasks').collect()
EOF
```

### View Neo4j Stats

In Neo4j browser (http://localhost:7474):

```cypher
// Count all nodes
MATCH (n) RETURN count(n)

// Count by type
MATCH (n)
RETURN labels(n), count(n)

// Find agent relationships
MATCH (a:Agent)-[r]->(c:Concept)
RETURN a.name, type(r), c.name
LIMIT 10
```

### View Graphiti Episodes

```bash
# List episodes
curl http://localhost:8000/episodes?group_id=your_world_id
```

---

## Troubleshooting

### Issue: Graphiti Not Healthy

**Check logs:**
```bash
docker compose logs graphiti
docker compose logs neo4j
```

**Common causes:**
- Neo4j not fully started yet (wait 30 seconds)
- Invalid LLM credentials in `.env`
- Port conflicts

**Solution:**
```bash
docker compose down
docker compose up -d
# Wait for health checks
docker compose ps
```

### Issue: "Connection refused" from Convex

**Problem:** Using `localhost:8000` instead of service name

**Solution:**
```bash
# Inside Docker, use service name:
npx convex env set GRAPHITI_ENDPOINT "http://graphiti:8000"

# NOT localhost:
# ❌ npx convex env set GRAPHITI_ENDPOINT "http://localhost:8000"
```

### Issue: No Jira Comments Appearing

**Check Jira credentials:**
```bash
npx convex env list | grep JIRA
```

**Test Jira connection:**
```bash
# From test script
node -e "
const fetch = require('node-fetch');
const domain = 'your-domain.atlassian.net';
const email = 'your-email';
const token = 'your-token';
const auth = Buffer.from(\`\${email}:\${token}\`).toString('base64');
fetch(\`https://\${domain}/rest/api/3/myself\`, {
  headers: { 'Authorization': \`Basic \${auth}\` }
}).then(r => r.json()).then(console.log);
"
```

### Issue: Test Script Fails

**Check Convex is running:**
```bash
curl http://localhost:3210/version
```

**Reinitialize if needed:**
```bash
npx convex run testing:wipeAllTables
npx convex run init
```

---

## Verification Checklist

✅ **Docker services healthy:**
```bash
docker compose ps
# All should show "Up (healthy)"
```

✅ **Graphiti accessible:**
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

✅ **Neo4j accessible:**
Open http://localhost:7474 and login

✅ **Convex configured:**
```bash
npx convex env list | grep GRAPHITI_ENDPOINT
# Should show: http://graphiti:8000
```

✅ **World initialized:**
```bash
npx convex run testing:listWorlds
# Should return world data
```

✅ **Test suite passes:**
```bash
node test-three-tier-memory.mjs
# Should complete without errors
```

---

## Architecture Reminder

```
🔥 TIER 1: Short-Term (Aetheria DB)
   "What I just experienced"
   Last 10 personal events
   ↓

💬 TIER 2: Session (Jira Comments)
   "What we learned on this task"
   All agents see same context
   ↓

🧠 TIER 3: Long-Term (Graphiti Graph)
   "What we know as a team"
   Semantic search, entity extraction
   ↓

   🤖 Collaborative Intelligence
```

---

## Next Steps After Setup

1. **Create test tasks in Jira** with agent labels
2. **Watch agents collaborate** through comments
3. **Monitor knowledge graph** growth in Neo4j
4. **Query historical knowledge** via Graphiti search
5. **Visualize relationships** between agents, tasks, concepts

---

## Useful Commands Reference

```bash
# Docker management
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose logs -f graphiti   # View Graphiti logs
docker compose restart graphiti   # Restart Graphiti

# Convex management
npm run dev:backend               # Start Convex locally
npx convex run init               # Initialize world
npx convex run testing:stop       # Stop simulation
npx convex run testing:resume     # Resume simulation

# Testing
node test-three-tier-memory.mjs   # Run full test suite

# Neo4j queries
# (Run in browser at http://localhost:7474)
MATCH (n) RETURN n LIMIT 25                    # View all nodes
MATCH (a:Agent) RETURN a                       # View agents
MATCH p=()-[r]->() RETURN p LIMIT 25          # View relationships
```

---

## Documentation

- **Architecture:** `docs/MEMORY_ARCHITECTURE.md`
- **Docker Setup:** `docs/GRAPHITI_DOCKER_SETUP.md`
- **Implementation Plan:** `docs/IMPLEMENTATION_PLAN_THREE_TIER_MEMORY.md`
- **Project Guide:** `docs/IFLOW.md`

---

## Success Indicators

✅ Test suite passes all steps
✅ Graphiti health check returns healthy
✅ Neo4j browser shows growing graph
✅ Agent comments appear in Jira
✅ Knowledge search returns relevant results
✅ Agents benefit from each other's learning

**You've successfully set up collaborative AI memory! 🧠✨**

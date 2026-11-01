# Graphiti + Neo4j Docker Setup

**Date:** November 19, 2025

## Overview

Graphiti knowledge graph is now integrated into the Docker Compose stack, running alongside Convex, Neo4j database, and the frontend.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Docker Compose Stack                                    │
│                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │  Frontend   │   │  Backend    │   │  Dashboard  │  │
│  │  (Vite)     │   │  (Convex)   │   │             │  │
│  │  :5173      │   │  :3210      │   │  :6791      │  │
│  └─────────────┘   └─────────────┘   └─────────────┘  │
│                                                         │
│  ┌─────────────┐   ┌─────────────────────────────────┐ │
│  │  Neo4j      │←──│  Graphiti Server                │ │
│  │  Database   │   │  Knowledge Graph API            │ │
│  │  :7687      │   │  :8000                          │ │
│  │  :7474      │   │                                 │ │
│  └─────────────┘   └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Services

### 1. Neo4j Database
- **Image:** `neo4j:5.15-community`
- **Ports:**
  - `7687` - Bolt protocol (Graphiti connection)
  - `7474` - HTTP/Browser interface
- **Volumes:**
  - `neo4j_data` - Persistent graph data
  - `neo4j_logs` - Database logs
- **Purpose:** Stores the knowledge graph (nodes, edges, facts)

### 2. Graphiti Server
- **Image:** `graphiti/server:latest`
- **Port:** `8000` - REST API
- **Purpose:**
  - Entity extraction from text
  - Fact generation
  - Temporal knowledge graph management
  - Semantic search

## Setup Instructions

### Step 1: Configure Environment

Copy the example environment file:
```bash
cp .env.docker.example .env
```

Edit `.env` and set:
```bash
# Neo4j password (can be anything)
NEO4J_PASSWORD=graphiti123

# LLM for entity extraction (choose one)

# Option 1: OpenAI (recommended for best quality)
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-your-key-here

# Option 2: Ollama (free, local, good quality)
LLM_PROVIDER=ollama
LLM_MODEL=llama3
# Ollama runs inside backend container

# Option 3: Anthropic
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-haiku-20240307
ANTHROPIC_API_KEY=sk-ant-your-key
```

### Step 2: Start Services

Start the entire stack:
```bash
docker compose up -d
```

This will start:
1. Frontend (Vite dev server)
2. Backend (Convex)
3. Dashboard (Convex dashboard)
4. Neo4j (graph database)
5. Graphiti (knowledge graph server)

### Step 3: Verify Services

Check all services are running:
```bash
docker compose ps
```

Expected output:
```
NAME                    STATUS              PORTS
ai-town-frontend-1      Up                  0.0.0.0:5173->5173/tcp
ai-town-backend-1       Up (healthy)        0.0.0.0:3210->3210/tcp, ...
ai-town-dashboard-1     Up                  0.0.0.0:6791->6791/tcp
ai-town-neo4j-1         Up (healthy)        0.0.0.0:7687->7687/tcp, 0.0.0.0:7474->7474/tcp
ai-town-graphiti-1      Up (healthy)        0.0.0.0:8000->8000/tcp
```

### Step 4: Access Services

**Frontend:** http://localhost:5173
**Convex Dashboard:** http://localhost:6791
**Neo4j Browser:** http://localhost:7474
  - Username: `neo4j`
  - Password: (from NEO4J_PASSWORD in .env)

**Graphiti API:** http://localhost:8000
  - Health check: http://localhost:8000/health
  - Docs: http://localhost:8000/docs

### Step 5: Configure Convex Environment

Set Graphiti endpoint for Convex functions:
```bash
npx convex env set GRAPHITI_ENDPOINT "http://graphiti:8000"
npx convex env set GRAPHITI_API_KEY ""  # Empty for local Docker
```

Note: Use service name `graphiti` (not `localhost`) because Convex backend runs inside Docker network.

## Testing Graphiti

### Test 1: Health Check

```bash
curl http://localhost:8000/health
```

Expected:
```json
{"status": "healthy"}
```

### Test 2: Add Episode

```bash
curl -X POST http://localhost:8000/episodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_episode",
    "episode_body": "Alice researched webhooks. Webhooks use HMAC signatures for authentication.",
    "source": "test",
    "reference_time": "2025-11-19T10:00:00Z",
    "group_id": "test_team"
  }'
```

### Test 3: Search Knowledge

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "webhook authentication",
    "group_ids": ["test_team"],
    "num_results": 5
  }'
```

### Test 4: View in Neo4j Browser

1. Open http://localhost:7474
2. Login with `neo4j` / your password
3. Run query to see nodes:
```cypher
MATCH (n) RETURN n LIMIT 25
```

## Usage from Aetheria

### Environment Variables (Convex)

```bash
# Inside Docker network (service name)
npx convex env set GRAPHITI_ENDPOINT "http://graphiti:8000"

# From host machine (for testing)
# Use localhost:8000
```

### Code Example

```typescript
// convex/aetheria/graphitiService.ts

function getGraphitiClient() {
  const endpoint = process.env.GRAPHITI_ENDPOINT || 'http://localhost:8000';

  return {
    async addEpisode(data: any) {
      const response = await fetch(`${endpoint}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },

    async search(query: string, options: any) {
      const response = await fetch(`${endpoint}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...options })
      });
      return response.json();
    }
  };
}
```

## Data Persistence

All data is persisted in Docker volumes:
- `neo4j_data` - Graph database
- `neo4j_logs` - Neo4j logs
- `graphiti_data` - Graphiti application data

Data survives container restarts:
```bash
docker compose down  # Stops containers, keeps data
docker compose up    # Data is still there
```

To completely wipe data:
```bash
docker compose down -v  # Removes volumes too
```

## Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f graphiti
docker compose logs -f neo4j
```

### Check Resource Usage

```bash
docker stats
```

### Neo4j Monitoring

1. Open http://localhost:7474
2. Click on database icon (top left)
3. See node counts, relationships, storage

### Graphiti Metrics

```bash
curl http://localhost:8000/metrics
```

## Troubleshooting

### Issue: Graphiti won't start

**Check Neo4j is healthy:**
```bash
docker compose ps neo4j
```

Should show "Up (healthy)". If not:
```bash
docker compose logs neo4j
```

**Solution:** Wait for Neo4j to be fully ready (takes ~30 seconds on first start)

### Issue: "Connection refused" from Convex

**Problem:** Using `localhost:8000` instead of service name

**Solution:** Inside Docker, use service names:
```bash
npx convex env set GRAPHITI_ENDPOINT "http://graphiti:8000"
```

### Issue: LLM errors in Graphiti

**Check LLM configuration:**
```bash
docker compose logs graphiti | grep -i error
```

**Common causes:**
- Missing OpenAI API key
- Invalid API key
- Ollama not available

**Solution:** Set correct LLM provider in `.env`

### Issue: Neo4j authentication failed

**Reset password:**
```bash
docker compose down
docker volume rm ai-town_neo4j_data
docker compose up -d
```

## Backup & Restore

### Backup Neo4j Database

```bash
docker compose exec neo4j neo4j-admin database dump neo4j \
  --to-path=/data/backups
```

### Backup Docker Volumes

```bash
docker run --rm \
  -v ai-town_neo4j_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/neo4j_backup.tar.gz /data
```

### Restore

```bash
docker compose down
docker volume rm ai-town_neo4j_data
docker compose up -d neo4j
# Wait for Neo4j to start
docker compose exec neo4j neo4j-admin database load neo4j \
  --from-path=/data/backups
```

## Performance Tuning

### Neo4j Memory (for large graphs)

Edit `docker-compose.yml`:
```yaml
neo4j:
  environment:
    - NEO4J_dbms_memory_heap_initial__size=512m
    - NEO4J_dbms_memory_heap_max__size=2G
    - NEO4J_dbms_memory_pagecache_size=1G
```

### Graphiti Workers

For high load, scale Graphiti:
```bash
docker compose up -d --scale graphiti=3
```

## Upgrading

### Update Images

```bash
docker compose pull
docker compose up -d
```

### Check Versions

```bash
docker compose exec neo4j neo4j --version
docker compose exec graphiti python --version
```

## Development Tips

### Access Neo4j Shell

```bash
docker compose exec neo4j cypher-shell -u neo4j -p graphiti123
```

### View Graphiti Logs Live

```bash
docker compose logs -f graphiti
```

### Reset Everything

```bash
docker compose down -v
rm .env
cp .env.docker.example .env
# Edit .env
docker compose up -d
```

## Production Considerations

For production deployment:

1. **Change Neo4j password:**
   - Use strong password in production
   - Store in secrets management

2. **External Neo4j:**
   - Use managed Neo4j (Neo4j Aura)
   - Remove neo4j service from compose
   - Point Graphiti to external instance

3. **Graphiti scaling:**
   - Use multiple Graphiti instances behind load balancer
   - Separate service for heavy processing

4. **Backups:**
   - Automated daily backups
   - Offsite backup storage

5. **Monitoring:**
   - Add Prometheus/Grafana
   - Alert on service health
   - Track graph growth

## Summary

✅ **Neo4j:** Graph database (ports 7687, 7474)
✅ **Graphiti:** Knowledge graph server (port 8000)
✅ **Docker volumes:** Persistent storage
✅ **Health checks:** Automatic recovery
✅ **All-in-one:** Single `docker compose up` command

Your knowledge graph is now running alongside your AI agents! 🧠🌐

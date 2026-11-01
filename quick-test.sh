#!/bin/bash
# Quick Test Script for Three-Tier Memory System

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Three-Tier Memory System - Quick Test                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check Docker
echo -e "${BLUE}[1/6] Checking Docker...${NC}"
if ! docker compose ps >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Docker Compose not running. Starting services...${NC}"
    docker compose up -d
    echo -e "${GREEN}✓ Docker services started${NC}"
else
    echo -e "${GREEN}✓ Docker is running${NC}"
fi

# Wait for services to be healthy
echo -e "${BLUE}Waiting for services to be healthy...${NC}"
sleep 5

# Step 2: Check Graphiti
echo ""
echo -e "${BLUE}[2/6] Checking Graphiti...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        echo -e "${GREEN}✓ Graphiti is healthy${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}✗ Graphiti is not responding after 10 attempts${NC}"
        echo "Check logs: docker compose logs graphiti"
        exit 1
    fi
    echo "  Waiting for Graphiti... attempt $i/10"
    sleep 3
done

# Step 3: Check Neo4j
echo ""
echo -e "${BLUE}[3/6] Checking Neo4j...${NC}"
if docker compose exec -T neo4j cypher-shell -u neo4j -p graphiti123 "RETURN 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Neo4j is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Neo4j may still be starting...${NC}"
fi

# Step 4: Check Convex
echo ""
echo -e "${BLUE}[4/6] Checking Convex...${NC}"
if curl -s http://localhost:3210/version >/dev/null; then
    echo -e "${GREEN}✓ Convex backend is running${NC}"
else
    echo -e "${RED}✗ Convex backend is not responding${NC}"
    echo "Make sure backend is running: npm run dev:backend"
    exit 1
fi

# Step 5: Check Convex config
echo ""
echo -e "${BLUE}[5/6] Checking Convex configuration...${NC}"
if npx convex env list 2>/dev/null | grep -q "GRAPHITI_ENDPOINT"; then
    echo -e "${GREEN}✓ Graphiti endpoint configured${NC}"
else
    echo -e "${YELLOW}⚠ Configuring Graphiti endpoint...${NC}"
    npx convex env set GRAPHITI_ENDPOINT "http://graphiti:8000"
    echo -e "${GREEN}✓ Configuration added${NC}"
fi

# Step 6: Run test suite
echo ""
echo -e "${BLUE}[6/6] Running test suite...${NC}"
echo ""
node test-three-tier-memory.mjs

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All tests completed successfully! 🎉${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "🔗 Quick Links:"
echo "  • Neo4j Browser:  http://localhost:7474 (neo4j / graphiti123)"
echo "  • Graphiti API:   http://localhost:8000/docs"
echo "  • Convex Dashboard: http://localhost:6791"
echo "  • Frontend:       http://localhost:5173"
echo ""
echo "📚 Documentation:"
echo "  • Setup Guide: THREE_TIER_MEMORY_SETUP.md"
echo "  • Architecture: docs/MEMORY_ARCHITECTURE.md"
echo ""
echo "🧠 Three-tier memory system is ready!"

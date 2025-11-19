# Archived Documentation

This directory contains documentation that is no longer relevant to the current architecture but preserved for historical reference.

## Why These Docs Are Archived

**Final Architecture Decision (November 19, 2025):**
- **Brain-Body Observer Pattern**: Body observes → asks brain → brain decides → body executes
- **Memory Split**: Body has short-term memory (Aetheria DB), Brain has long-term memory (n8n MCP)
- **Tool Location**: ALL tools via MCP in n8n brain (no tools in Aetheria body)
- **Body Actions**: Only physical actions (move, talk, claim_task, send_message, etc.)

## Archived Files

### HYBRID_TOOLS_QUICKSTART.md
**Date:** November 19, 2025
**Status:** Outdated - Hybrid tool approach replaced

**Why Archived:**
- Described using BOTH MCP tools (n8n) AND Aetheria tools
- Final architecture: ALL tools in brain via MCP only
- Body no longer executes tools, only physical actions

**Historical Context:**
- Explored idea of tools in two places
- Brain uses MCP for quick research
- Body uses Aetheria tools for logged actions
- Replaced by simpler "all tools in brain" model

---

### WEB_SEARCH_IMPLEMENTATION.md
**Date:** November 19, 2025
**Status:** Outdated - Tool moved to brain

**Why Archived:**
- Implemented web_search tool in Aetheria body
- Final architecture: web_search in brain via MCP only
- DuckDuckGo API integration no longer used in body

**Historical Context:**
- Working implementation with DuckDuckGo API
- Tool registry and executor in Aetheria
- Good reference for tool patterns
- Replaced by MCP tools in n8n brain

---

### BRAIN_MCP_INTEGRATION.md
**Date:** November 19, 2025
**Status:** Outdated - Architecture changed

**Why Archived:**
- Deep dive on hybrid MCP + Aetheria tools
- Final architecture: MCP tools only (no Aetheria tools)
- "use_tool" action type no longer needed

**Historical Context:**
- Detailed comparison of tool types
- When to use each approach
- n8n configuration for both
- Replaced by simpler brain-only tools

---

### ARCHITECTURE_PHILOSOPHY.md
**Date:** November 19, 2025
**Status:** Outdated - Philosophy evolved

**Why Archived:**
- Described brain as having "all tools"
- Body as having "physical actions + some tools"
- Mixed messaging about tool location

**Historical Context:**
- Early attempt at brain-body separation
- Good insights about separation of concerns
- Tool classification was confusing
- Replaced by BRAIN_BODY_ARCHITECTURE_V2.md with clear observer pattern

---

### n8n-system-prompt-template.md
**Date:** November 19, 2025
**Status:** Outdated - Hybrid approach

**Why Archived:**
- System prompt for BOTH MCP and Aetheria tools
- Taught brain when to use each type
- "use_tool" action included

**Historical Context:**
- Complete n8n prompt template
- Good examples of decision-making
- Personality integration
- Needs update for MCP-only approach

---

### BRAIN_CONFIG_NOTES.md
**Date:** November 19, 2025
**Status:** Resolved - Debug session complete

**Why Archived:**
- Debugging notes from brain configuration
- TypeScript errors documented
- Issues were fixed

**Historical Context:**
- Schema mismatches identified
- Circular type references resolved
- Good reference for troubleshooting
- No longer blocking - archived as resolved

---

## Current Documentation Structure

See `/docs/README.md` for current documentation.

**Core Docs:**
- `ARCHITECTURE.md` - AI Town technical architecture
- `IFLOW.md` - Project overview and development guide
- `BRAIN_BODY_ARCHITECTURE_V2.md` - Final observer pattern architecture
- `MEMORY_ARCHITECTURE.md` - Body + brain memory systems

**Focus:**
- Clear brain-body separation
- Observer pattern (body asks, brain decides)
- All tools in brain via MCP
- Physical actions only in body
- Memory split between short-term (body) and long-term (brain)

---

## If You Need to Reference

These archived docs contain useful information:

**For tool implementation patterns:** See `WEB_SEARCH_IMPLEMENTATION.md`
**For n8n setup basics:** See `n8n-system-prompt-template.md`
**For debugging Convex issues:** See `BRAIN_CONFIG_NOTES.md`
**For historical architecture decisions:** See all files

**But remember:** The final architecture is different. Use current docs for implementation.

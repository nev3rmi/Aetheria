# Documentation

Project documentation for Aetheria (AI Town fork).

## Current Documentation

### Core Architecture Docs

#### ARCHITECTURE.md
**AI Town Technical Architecture**

Detailed technical architecture covering:
- Three-layer system (Engine → AI Town → Aetheria)
- Game engine loop and input system
- Agent operations and decision-making
- Aetheria task flow and Jira integration
- Database schema overview

**Audience:** Developers working on core systems
**Status:** Current - AI Town foundation (unchanged)

---

#### IFLOW.md
**Project Interaction Guide**

Comprehensive project guide covering:
- Project overview and tech stack
- Architecture layers
- Development setup and commands
- Common workflows
- Debugging and maintenance

**Audience:** New developers, AI assistants working on the project
**Status:** Current - Essential reference

---

### Brain-Body Architecture (Final Design)

#### BRAIN_BODY_ARCHITECTURE_V2.md
**Observer Pattern Architecture**

**THE DEFINITIVE ARCHITECTURE** - Read this first!

- Brain-body observer pattern
- Body observes → asks brain → brain decides → body executes
- Message flow examples
- Complete decision loop
- Brain thinks/researches/decides
- Body executes physical actions only

**Key Concepts:**
- Body: Observer & executor (humble, asks for guidance)
- Brain: Consciousness (remembers, learns, decides)
- All tools via MCP in n8n brain
- Physical actions only in Aetheria body

**Audience:** Everyone - this is the core vision
**Status:** ✅ FINAL ARCHITECTURE - November 19, 2025

---

#### MEMORY_ARCHITECTURE.md
**Body + Brain Memory Systems**

Detailed memory architecture:
- Body memory (Aetheria DB): Short-term, sensory, contextual
- Brain memory (n8n MCP): Long-term, learned, strategic
- How they work together
- Memory lifecycle
- Implementation details

**Key Insights:**
- Body: "What just happened" (recent observations)
- Brain: "What I've learned" (wisdom, patterns)
- Both essential for intelligence

**Audience:** Developers implementing memory systems
**Status:** ✅ FINAL DESIGN - November 19, 2025

---

## Final Architecture Summary

**Date:** November 19, 2025

```
┌─────────────────────────────────────────┐
│  🤖 BODY (Aetheria)                     │
│  • Observes world                       │
│  • Asks: "What should I do?"            │
│  • Executes physical commands           │
│  • Short-term memory (recent events)    │
└─────────────┬───────────────────────────┘
              ↕
              "What do I do?" ↑
              Commands        ↓
              ↕
┌─────────────────────────────────────────┐
│  🧠 BRAIN (n8n + MCP)                   │
│  • All intelligence & tools             │
│  • Remembers & learns                   │
│  • Research via MCP tools               │
│  • Decides actions                      │
│  • Long-term memory (wisdom)            │
└─────────────────────────────────────────┘
```

**Core Principles:**
1. **Observer Pattern**: Body asks, brain decides
2. **Memory Split**: Short-term (body) + long-term (brain)
3. **Tool Location**: ALL tools in brain via MCP
4. **Body Actions**: ONLY physical (move, talk, claim_task, send_message)

---

## Archived Documentation

**Location:** `/docs/archive/`

Older documentation preserved for historical reference but no longer reflects current architecture:

- `HYBRID_TOOLS_QUICKSTART.md` - Outdated hybrid tool approach
- `WEB_SEARCH_IMPLEMENTATION.md` - Outdated Aetheria tool implementation
- `BRAIN_MCP_INTEGRATION.md` - Outdated hybrid architecture
- `ARCHITECTURE_PHILOSOPHY.md` - Outdated philosophy (evolved)
- `n8n-system-prompt-template.md` - Outdated hybrid prompt
- `BRAIN_CONFIG_NOTES.md` - Resolved debug session

See `/docs/archive/README.md` for details on why each was archived.

---

## Quick Navigation

**New to the project?**
→ Start with `IFLOW.md`

**Understanding the architecture?**
→ Read `BRAIN_BODY_ARCHITECTURE_V2.md` (THE definitive guide)

**Implementing memory?**
→ Read `MEMORY_ARCHITECTURE.md`

**Core technical details?**
→ Read `ARCHITECTURE.md`

**Setting up agent brain?**
→ Read `BRAIN_BODY_ARCHITECTURE_V2.md` for concepts
→ Then implement based on observer pattern

**Need archived info?**
→ Check `/docs/archive/` for historical reference

---

## See Also

- `/README.md` - Main project readme
- `/CLAUDE.md` - Instructions for Claude Code
- `/scripts/tests/README.md` - Test scripts documentation
- `/convex/aetheria/BRAIN_API_SPEC.md` - Brain webhook API specification

---

## Documentation Status

✅ **Current (November 19, 2025):**
- ARCHITECTURE.md - AI Town foundation
- IFLOW.md - Project guide
- BRAIN_BODY_ARCHITECTURE_V2.md - Final architecture
- MEMORY_ARCHITECTURE.md - Memory design

📦 **Archived:**
- All hybrid tool documentation
- Resolved debug notes
- Outdated architecture docs

**Focus:** Clean, focused documentation matching final brain-body observer architecture with MCP tools in brain only.

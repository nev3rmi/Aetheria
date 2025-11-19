# Hybrid Tools Quick Start

## TL;DR

**Yes, you can use both!** And you should!

```
n8n MCP Tools     →  Fast, private research during thinking
Aetheria Tools    →  Logged, visible actions in the world
Both Together     →  🚀 Maximum power!
```

## Visual Flow

```
┌─────────────────────────────────────────────────────────┐
│  Agent: "I need to decide what to do"                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
         ┌───────────────────────┐
         │   n8n Brain Thinking  │
         └───────────────────────┘
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
   🔍 MCP Tools            🧠 Decision
   (Internal)             (What to do?)
   @web-search                   │
   @brave-search          ┌──────┴──────┐
   @fetch                 ↓             ↓
   Fast, private    Simple Action  Complex Action
                    (claim_task)   (use_tool)
                         │              │
                         ↓              ↓
                   ┌─────────────────────────┐
                   │  Aetheria Execution     │
                   │  🛠️ Agent Tools         │
                   │  web_search             │
                   │  Logged, visible        │
                   └─────────────────────────┘
```

## Quick Examples

### Example 1: Fast Decision (MCP Only)

```
Situation: Should I claim this task?

Brain thinks:
@web-search "webhook authentication"
→ Learns about HMAC, JWT
→ Decides: "Yes, I know this"

Returns:
{"action": {"type": "claim_task", ...}}

Result: ✅ Fast decision, no round-trip
```

### Example 2: Logged Action (Aetheria Tool)

```
Situation: Task says "Research AI frameworks"

Brain thinks:
"Team needs to see this research"

Returns:
{"action": {"type": "use_tool", "params": {"tool": "web_search", ...}}}

Result: ✅ Search logged, visible to team
```

### Example 3: Both Together

```
Situation: Complex task requiring research

Brain thinks:
@web-search "task complexity"
→ Learns it's complex
→ Decides team needs detailed research

Returns:
{"action": {"type": "use_tool", ...}}

Aetheria executes:
→ web_search runs
→ Logged to database
→ Team can see findings

Result: ✅ Fast check + documented action
```

## Setup Checklist

### In n8n:
- [ ] Install MCP servers (Brave Search, Fetch, etc.)
- [ ] Configure AI Agent node with MCP tools
- [ ] Use system prompt template from `n8n-system-prompt-template.md`
- [ ] Test: brain uses `@web-search` during thinking

### In Aetheria:
- [x] Tool registry created (✅ Done!)
- [x] web_search implemented (✅ Done!)
- [x] Action executor integrated (✅ Done!)
- [x] Logging to database (✅ Done!)

### Testing:
- [ ] Send test request with task requiring decision
- [ ] Verify: Brain uses MCP for quick research
- [ ] Verify: Brain requests Aetheria tool when needed
- [ ] Check: toolExecutions table has logged actions

## When to Use What

| Situation | Use This | Why |
|-----------|----------|-----|
| "Should I do this task?" | MCP `@web-search` | Fast personal check |
| "Research X and document" | Aetheria `use_tool` | Team needs results |
| "What does this error mean?" | MCP `@web-search` | Quick background |
| "Find best library for X" | Aetheria `use_tool` | Decision affects team |
| "Quick fact check" | MCP tools | Speed |
| "Official research task" | Aetheria tools | Visibility |

## Benefits

### 🚀 Speed
MCP tools = no round-trip = instant research

### 👁️ Observability
Aetheria tools = logged = team knows what happened

### 🤝 Collaboration
Other agents can see tool executions and build on them

### 💰 Cost Efficiency
Only important actions logged to database

### 🧠 Smart Decisions
Brain researches before deciding what to do

## Implementation Files

1. **`BRAIN_MCP_INTEGRATION.md`** - Full architecture guide
2. **`n8n-system-prompt-template.md`** - Complete system prompt
3. **`WEB_SEARCH_IMPLEMENTATION.md`** - Tool implementation details

## Next Steps

1. **Copy system prompt** from `n8n-system-prompt-template.md`
2. **Update your n8n workflow** AI Agent node
3. **Test with simple query** to verify MCP works
4. **Watch logs** to see both tool types in action

## Need Help?

Check the full docs:
- Architecture: `BRAIN_MCP_INTEGRATION.md`
- n8n Setup: `n8n-system-prompt-template.md`
- Tool Details: `WEB_SEARCH_IMPLEMENTATION.md`

---

**Remember:** MCP = thinking, Aetheria = acting! 🧠 → 🛠️

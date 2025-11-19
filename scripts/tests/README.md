# Test Scripts

Collection of test scripts for Aetheria Phase 1 development.

## Scripts

### `test-phase1-collaboration.mjs`
Tests Phase 1 collaboration features:
- Messaging system (send/receive agent messages)
- Task management (claim/update/delegate tasks)
- Nearby agents discovery
- Full integration test

**Usage:**
```bash
node scripts/tests/test-phase1-collaboration.mjs
```

**Status:** ⚠️ Requires TypeScript errors to be fixed in aetheria files

---

### `configure-brain.mjs`
Configures n8n brain webhook for an agent.

**Usage:**
```bash
node scripts/tests/configure-brain.mjs
```

**Status:** ⚠️ Blocked by TypeScript compilation errors

---

### `test-brain.mjs`
Tests brain webhook integration directly.

**Usage:**
```bash
node scripts/tests/test-brain.mjs
```

---

### `debug-world-state.mjs`
Debugging utility to inspect world state, agents, and game engine.

**Usage:**
```bash
node scripts/tests/debug-world-state.mjs
```

---

### `test-n8n-direct.sh`
Direct test of n8n webhook using curl (bypasses Convex).

**Usage:**
```bash
bash scripts/tests/test-n8n-direct.sh
```

---

### `insert-brain-direct.mjs`
Attempts to insert brain configuration directly into database.

**Usage:**
```bash
node scripts/tests/insert-brain-direct.mjs
```

**Status:** ⚠️ Blocked - requires TypeScript fixes

---

## Common Issues

All scripts that interact with aetheria functions are currently blocked by TypeScript compilation errors in:
- `/convex/aetheria/contextBuilder.ts`
- `/convex/aetheria/aetheriaOperations.ts`

See `/BRAIN_CONFIG_NOTES.md` for details.

## Requirements

- Convex dev server running: `npm run dev`
- Node.js v16+
- ConvexHttpClient from `convex/browser`

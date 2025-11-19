# Brain Configuration Issue - Nov 19, 2025

## What We're Trying to Do

Configure an n8n brain (webhook) for agent "Alice" (a:1) so the agent uses your n8n workflow for decision-making instead of the default LLM.

**N8N Webhook:** `https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3`

**Goal:** Insert this configuration into the `agentBrains` table in Convex database:

```json
{
  "worldId": "n974ya4g7k3f4j24zp9hedn4h17vn49x",
  "agentId": "a:1",
  "agentName": "Alice",
  "brainType": "n8n",
  "webhookUrl": "https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3",
  "permittedTools": ["read_code", "edit_code", "run_tests", "git_commit", "search_web", "read_docs"],
  "configuration": {
    "timeout": 30000,
    "maxRetries": 2,
    "personality": "Helpful AI assistant",
    "specialization": ["software engineering", "debugging", "collaboration"]
  },
  "isActive": true,
  "createdAt": 1763518236496
}
```

---

## What Went Wrong

### Problem 1: Functions Not Accessible
**Attempted:** Call `aetheria/testBrain:configureBrainForAgent`
**Error:** `Could not find public function`
**Root Cause:** TypeScript compilation errors preventing ALL Convex functions from loading

### Problem 2: TypeScript Compilation Blocking Everything
When we run `npx tsc --noEmit`, we get 20+ TypeScript errors:

#### Key Errors in `/convex/aetheria/contextBuilder.ts`:
```
Line 169: Argument of type '"isRead"' is not assignable to parameter of type '"sentAt"'
Line 174: Type mismatch - 'status_update' not in allowed message types
Line 181: Property 'priority' does not exist on agentMessages type
Line 216: Property 'title' does not exist on jiraTasks type
Line 217: Property 'description' does not exist on jiraTasks type
Line 220: Type '"failed"' not assignable - missing from status enum
Line 221: Property 'url' does not exist on jiraTasks type
Line 281: 'worldId' not valid for withIndex() - no index exists
Line 289: Property 'agents' does not exist on engines type
Line 320: Property 'status' does not exist - should be 'currentActivity'
```

#### Key Errors in `/convex/aetheria/aetheriaOperations.ts`:
```
Line 198: Property 'name' does not exist on type 'string'
Line 199: Property 'description' does not exist on type 'string'
```

#### Key Errors in `/convex/_generated/api.d.ts`:
```
Line 80: 'fullApi' is referenced circularly in its own type annotation
Line 141: 'internal' is referenced circularly
Line 142: Type of property 'publicTestBrain' circularly references itself
```

---

## Root Causes

### 1. Schema Mismatches
The TypeScript types expect certain fields that don't match the actual Convex schema:

**Expected in code:**
- `jiraTasks.title` (doesn't exist - should use `issueKey` or `issueDescription`)
- `jiraTasks.description` (doesn't exist - use `issueDescription`)
- `jiraTasks.url` (doesn't exist)
- `agentMessages.priority` (nested in `metadata.priority`)
- `engines.agents` (doesn't exist in engines table)

**Status mismatches:**
- Code uses `'failed'` and `'completed'` statuses
- Schema only allows: `'pending'`, `'claimed'`, `'in_progress'`, `'blocked'`

**Message type mismatches:**
- Code uses `'status_update'` message type
- Schema only allows: `'direct'`, `'broadcast'`, `'delegation'`, `'help_request'`

### 2. Database Index Missing
Line 281 tries to query engines with `.withIndex('worldId')` but this index doesn't exist in the schema.

Should use:
```typescript
.query('engines')
.filter((q) => q.eq(q.field('worldId'), worldId))
```

### 3. Circular Type Reference
Created `/convex/aetheria/publicTestBrain.ts` which imports from `internal` API, causing circular dependency in type generation.

**Fix:** Deleted this file (moved to `.backup`)

---

## Why Convex Won't Load Functions

Convex runs TypeScript type checking before deploying functions. With 20+ type errors:
- ❌ **No functions load** (even unrelated ones like `testing:configureBrain`)
- ❌ **Can't call ANY mutation/query/action** via CLI or HTTP client
- ❌ **Dashboard doesn't work** (self-hosted deployment)

---

## Attempted Solutions (All Failed)

1. ✗ Call `aetheria/testBrain:configureBrainForAgent` → Function not found
2. ✗ Call `aetheria/publicTestBrain:configure` → Function not found (circular type issue)
3. ✗ Create `testing:configureBrain` public mutation → Blocked by TypeScript errors
4. ✗ Use ConvexHttpClient from Node.js → Same error
5. ✗ Use `npx convex run` CLI → Same error
6. ✗ Open `npx convex dashboard` → Self-hosted deployment not supported

---

## How to Fix

### Option 1: Fix TypeScript Errors (RECOMMENDED)
Fix all type mismatches in these files:
1. `/convex/aetheria/contextBuilder.ts` (10+ errors)
2. `/convex/aetheria/aetheriaOperations.ts` (2 errors)
3. Update schema or code to match field names

**After fixes:** All Convex functions will load, then can run:
```bash
npx convex run testing:configureBrain '{...}'
```

### Option 2: Direct Database Access
Use a database admin tool to insert directly into `agentBrains` table (if available for self-hosted Convex)

### Option 3: Disable Type Checking (TEMPORARY HACK)
Add to `convex/tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

Then restart `npm run dev` - functions may load with runtime type safety issues.

---

## Files Modified in This Session

### Created:
- `/home/nev3r/projects/ai-town/configure-brain.mjs` - Brain configuration script
- `/home/nev3r/projects/ai-town/insert-brain-direct.mjs` - Direct insertion attempt
- `/convex/aetheria/publicTestBrain.ts.backup` - Moved due to circular types
- `/convex/testing.ts` - Added `configureBrain` mutation (lines 205-262)

### Modified:
- `/convex/testing.ts` - Added `playerId` import and `configureBrain` function

### Files With TypeScript Errors:
- `/convex/aetheria/contextBuilder.ts` - 14 errors
- `/convex/aetheria/aetheriaOperations.ts` - 2 errors
- `/convex/aetheria/jiraClient.ts` - 1 error

---

## Current State

- ✅ Game is running (`npm run dev`)
- ✅ World ID: `n974ya4g7k3f4j24zp9hedn4h17vn49x`
- ✅ Agent a:1 (Alice) exists
- ✅ n8n webhook ready: `https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3`
- ❌ **BLOCKED: Cannot configure brain due to TypeScript compilation errors**
- ❌ No Convex functions accessible via CLI/API

---

## Next Steps

**Priority 1:** Fix TypeScript errors in aetheria files
**Priority 2:** Once functions load, run brain configuration
**Priority 3:** Test agent behavior with n8n brain active

---

## Commands to Verify After Fixes

```bash
# Check TypeScript compilation
cd convex && npx tsc --noEmit 2>&1 | grep error | wc -l
# Should output: 0

# Configure brain
npx convex run testing:configureBrain '{
  "worldId":"n974ya4g7k3f4j24zp9hedn4h17vn49x",
  "agentId":"a:1",
  "agentName":"Alice",
  "webhookUrl":"https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3"
}'

# Verify brain configured
npx convex run world:worldState '{
  "worldId":"n974ya4g7k3f4j24zp9hedn4h17vn49x"
}' | grep agentBrains
```

---

## Contact Info
- Project: `/home/nev3r/projects/ai-town`
- Convex URL: `http://127.0.0.1:3210`
- Date: November 19, 2025

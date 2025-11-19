#!/usr/bin/env node

/**
 * Directly insert brain configuration into Convex database
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || "http://127.0.0.1:3210";
const client = new ConvexHttpClient(CONVEX_URL);

const brainConfig = {
  worldId: "n974ya4g7k3f4j24zp9hedn4h17vn49x",
  agentId: "a:1",
  agentName: "Alice",
  brainType: "n8n",
  webhookUrl: "https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3",
  permittedTools: ["read_code", "edit_code", "run_tests", "git_commit", "search_web", "read_docs"],
  configuration: {
    timeout: 30000,
    maxRetries: 2,
    personality: "Helpful AI assistant",
    specialization: ["software engineering", "debugging", "collaboration"]
  },
  isActive: true,
  createdAt: Date.now()
};

console.log("🧠 Inserting brain configuration...\n");
console.log(JSON.stringify(brainConfig, null, 2));
console.log("\n");

try {
  // Try using the testing:configureBrain function
  const result = await client.mutation("testing:configureBrain", brainConfig);
  console.log("✅ Brain configured successfully!");
  console.log(result);
} catch (error) {
  console.log("❌ Error:", error.message);
  console.log("\n📋 Manual insertion required:");
  console.log("Since TypeScript compilation errors are preventing Convex functions from loading,");
  console.log("you'll need to insert this configuration manually using a database admin tool or");
  console.log("by fixing the TypeScript errors in the aetheria files first.\n");
}

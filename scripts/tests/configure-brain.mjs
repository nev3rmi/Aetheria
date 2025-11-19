#!/usr/bin/env node

/**
 * Configure Brain for Agent
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || "http://127.0.0.1:3210";
const N8N_WEBHOOK = "https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3";

const client = new ConvexHttpClient(CONVEX_URL);

console.log("🧠 Configure Brain for Agent\n");
console.log(`Convex URL: ${CONVEX_URL}`);
console.log(`N8N Webhook: ${N8N_WEBHOOK}\n`);

async function main() {
  try {
    // Step 1: Get the world and agents
    console.log("1️⃣  Getting world and agents...");
    const worldStatus = await client.query("world:defaultWorldStatus");

    if (!worldStatus) {
      console.error("❌ No world found!");
      process.exit(1);
    }

    const world = { _id: worldStatus.worldId };

    // Get agent descriptions
    const gameDesc = await client.query("world:gameDescriptions", {
      worldId: world._id,
    });

    const agents = gameDesc.agentDescriptions || [];

    if (agents.length === 0) {
      console.error("❌ No agents found!");
      process.exit(1);
    }

    // Extract name from identity
    const getName = (identity) => {
      if (!identity || typeof identity !== 'string') return "Agent";
      const match = identity.match(/You are (\w+)/);
      return match ? match[1] : "Agent";
    };

    console.log(`✅ Found ${agents.length} agents:`);
    agents.forEach((a, i) => {
      console.log(`   ${i + 1}. ${getName(a.identity)} (${a.agentId})`);
    });
    console.log();

    // Use first agent
    const agent = agents[0];
    const agentName = getName(agent.identity);

    console.log(`2️⃣  Configuring brain for ${agentName} (${agent.agentId})...`);

    const configResult = await client.mutation("aetheria/testBrain:configureBrainForAgent", {
      worldId: world._id,
      agentId: agent.agentId,
      agentName: agentName,
      webhookUrl: N8N_WEBHOOK,
    });

    if (configResult.created) {
      console.log(`✅ Brain configured! ID: ${configResult.brainId}`);
      console.log(`   Status: NEW`);
    } else if (configResult.updated) {
      console.log(`✅ Brain updated! ID: ${configResult.brainId}`);
      console.log(`   Status: UPDATED`);
    }
    console.log();

    console.log("3️⃣  Testing brain call...");
    console.log("   Calling n8n webhook with test context...\n");

    const testResult = await client.action("aetheria/testBrain:testBrainCall", {
      worldId: world._id,
      agentId: agent.agentId,
      agentName: agentName,
    });

    if (testResult.success) {
      console.log("✅ Brain call successful!\n");
      console.log("📥 Response from n8n:");
      console.log(JSON.stringify(testResult.response, null, 2));
      console.log();
    } else {
      console.log("❌ Brain call failed!");
      console.log(`Error: ${testResult.error}`);
      console.log();
    }

    console.log("4️⃣  Current brain configurations:");
    const brains = await client.query("aetheria/testBrain:listBrains", {
      worldId: world._id,
    });

    brains.forEach((brain, i) => {
      console.log(`   ${i + 1}. ${brain.agentName} (${brain.agentId})`);
      console.log(`      Type: ${brain.brainType}`);
      console.log(`      URL: ${brain.webhookUrl}`);
      console.log(`      Active: ${brain.isActive ? '✅' : '❌'}`);
      console.log(`      Tools: ${brain.permittedTools.join(', ')}`);
      if (brain.lastError) {
        console.log(`      Last Error: ${brain.lastError}`);
      }
      console.log();
    });

    console.log("🎉 Configuration complete!\n");
    console.log("💡 What happens next:");
    console.log(`   • ${agentName} will now use n8n for decision-making`);
    console.log("   • When the agent needs to do something, it will:");
    console.log("     1. Send context to your n8n webhook");
    console.log("     2. Receive decision from n8n AI Agent");
    console.log("     3. Execute the action (claim task, send message, etc.)");
    console.log();
    console.log("📊 Monitor the agent:");
    console.log("   • Open the game: http://localhost:5174/ai-town");
    console.log(`   • Watch ${agentName} in action`);
    console.log("   • Check n8n logs to see incoming requests");
    console.log();

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("Details:", error.data);
    }
    process.exit(1);
  }
}

main();

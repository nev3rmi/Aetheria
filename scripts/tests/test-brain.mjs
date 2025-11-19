#!/usr/bin/env node

/**
 * Test Brain Integration
 *
 * This script:
 * 1. Configures a brain for an agent
 * 2. Tests the brain webhook
 * 3. Shows the response
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || "http://127.0.0.1:3210";
const N8N_WEBHOOK = "https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3";

const client = new ConvexHttpClient(CONVEX_URL);

console.log("🧠 Brain Integration Test\n");
console.log(`Convex URL: ${CONVEX_URL}`);
console.log(`N8N Webhook: ${N8N_WEBHOOK}\n`);

async function main() {
  try {
    // Step 1: Get the world
    console.log("1️⃣  Getting world...");
    const engine = await client.query("engine:getDefaultWorld");

    if (!engine) {
      console.error("❌ No engine found! Please start the game first.");
      process.exit(1);
    }

    const world = { _id: engine.worldId };
    console.log(`✅ Found world: ${world._id}\n`);

    // Step 2: Get agents
    console.log("2️⃣  Getting agents...");

    if (!engine) {
      console.error("❌ No engine found!");
      process.exit(1);
    }

    const agents = engine.agents || [];
    if (agents.length === 0) {
      console.error("❌ No agents found! Please wait for agents to spawn.");
      process.exit(1);
    }

    const agent = agents[0]; // Use first agent
    console.log(`✅ Found agent: ${agent.name} (${agent.id})\n`);

    // Step 3: Configure brain
    console.log("3️⃣  Configuring brain for agent...");
    const configResult = await client.mutation("aetheria/testBrain:configureBrainForAgent", {
      worldId: world._id,
      agentId: agent.playerId,
      agentName: agent.name,
      webhookUrl: N8N_WEBHOOK,
    });

    if (configResult.created) {
      console.log(`✅ Brain configured! ID: ${configResult.brainId}\n`);
    } else if (configResult.updated) {
      console.log(`✅ Brain updated! ID: ${configResult.brainId}\n`);
    }

    // Step 4: Test brain call
    console.log("4️⃣  Testing brain call...");
    console.log("   Calling n8n webhook with test context...\n");

    const testResult = await client.action("aetheria/testBrain:testBrainCall", {
      worldId: world._id,
      agentId: agent.playerId,
      agentName: agent.name,
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

    // Step 5: List all brains
    console.log("5️⃣  Current brain configurations:");
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

    console.log("\n🎉 Test complete!");
    console.log("\n💡 Next steps:");
    console.log("   1. Check your n8n logs to see the incoming request");
    console.log("   2. Make sure n8n returns this format:");
    console.log("      {");
    console.log('        "thought": "Your agent\'s reasoning",');
    console.log('        "action": {');
    console.log('          "type": "wait",');
    console.log('          "params": { "reason": "Testing" }');
    console.log("        }");
    console.log("      }");
    console.log("   3. The agent will now use the brain for decisions!");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("Details:", error.data);
    }
    process.exit(1);
  } finally {
    client.close();
  }
}

main();

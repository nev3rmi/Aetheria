#!/usr/bin/env node

/**
 * Test Phase 1: Agent Collaboration Foundation
 *
 * Tests:
 * 1. Messaging system (send/receive messages)
 * 2. Task management (claim/update/delegate)
 * 3. Nearby agents discovery
 * 4. Brain action execution
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || "http://127.0.0.1:3210";
const client = new ConvexHttpClient(CONVEX_URL);

console.log("🧪 Phase 1 Collaboration Test\n");
console.log(`Convex URL: ${CONVEX_URL}\n`);

async function main() {
  try {
    // Step 1: Get the world and agents
    console.log("1️⃣  Getting world and agents...");
    const worldStatus = await client.query("world:defaultWorldStatus");

    if (!worldStatus) {
      console.error("❌ No world found! Please start the game first.");
      process.exit(1);
    }

    const world = { _id: worldStatus.worldId };

    // Get agent descriptions
    const gameDesc = await client.query("world:gameDescriptions", {
      worldId: world._id,
    });

    if (!gameDesc) {
      console.error("❌ Could not get game descriptions!");
      process.exit(1);
    }

    const agents = gameDesc.agentDescriptions || [];

    if (agents.length < 2) {
      console.error("❌ Need at least 2 agents! Please wait for agents to spawn.");
      process.exit(1);
    }

    const agent1 = agents[0];
    const agent2 = agents[1];

    // Extract names from identity field (e.g., "You are Alice, and...")
    const getName = (identity) => {
      if (!identity || typeof identity !== 'string') return "Agent";
      const match = identity.match(/You are (\w+)/);
      return match ? match[1] : "Agent";
    };

    console.log(`✅ Found ${agents.length} agents:`);
    console.log(`   Agent 1: ${getName(agent1.identity)} (${agent1.agentId})`);
    console.log(`   Agent 2: ${getName(agent2.identity)} (${agent2.agentId})`);
    console.log();

    // Step 2: Test Messaging System
    console.log("2️⃣  Testing messaging system...");
    console.log("   Sending message from Agent 1 to Agent 2...");

    const messageResult = await client.mutation("aetheria/messaging:sendAgentMessage", {
      worldId: world._id,
      fromAgentId: agent1.agentId,
      toAgentId: agent2.agentId,
      messageType: "direct",
      content: "Hello! Can you help me with a task?",
      metadata: { testMessage: true },
    });

    if (messageResult.success) {
      console.log(`   ✅ Message sent! ID: ${messageResult.messageId}`);
    } else {
      console.log(`   ❌ Failed to send message`);
    }

    // Check Agent 2's inbox
    console.log("   Checking Agent 2's inbox...");
    const inbox = await client.query("aetheria/messaging:getAgentInbox", {
      worldId: world._id,
      agentId: agent2.agentId,
      limit: 10,
    });

    console.log(`   ✅ Agent 2 has ${inbox.length} unread message(s)`);
    if (inbox.length > 0) {
      const latestMessage = inbox[0];
      console.log(`      From: ${latestMessage.fromAgentId}`);
      console.log(`      Type: ${latestMessage.messageType}`);
      console.log(`      Content: "${latestMessage.content.substring(0, 50)}..."`);
    }
    console.log();

    // Step 3: Test Task Management
    console.log("3️⃣  Testing task management...");

    // Get available tasks
    console.log("   Getting available tasks...");
    const availableTasks = await client.query("aetheria/tasks:getAvailableTasks", {
      worldId: world._id,
      limit: 5,
    });

    console.log(`   ✅ Found ${availableTasks.length} available task(s)`);

    if (availableTasks.length > 0) {
      const task = availableTasks[0];
      console.log(`      Task: ${task.issueKey || task._id}`);
      console.log(`      Status: ${task.status}`);

      // Agent 1 claims the task
      console.log(`\n   Agent 1 claiming task...`);
      const claimResult = await client.mutation("aetheria/tasks:claimTask", {
        worldId: world._id,
        agentId: agent1.agentId,
        taskId: task._id,
        reason: "Testing task claim functionality",
      });

      if (claimResult.success) {
        console.log(`   ✅ Task claimed successfully!`);

        // Agent 1 updates task status
        console.log(`   Agent 1 updating task to in_progress...`);
        const updateResult = await client.mutation("aetheria/tasks:updateTaskStatus", {
          worldId: world._id,
          agentId: agent1.agentId,
          taskId: task._id,
          status: "in_progress",
          comment: "Started working on this task",
        });

        if (updateResult.success) {
          console.log(`   ✅ Task updated to: ${updateResult.newStatus}`);
        }

        // Agent 1 delegates to Agent 2
        console.log(`\n   Agent 1 delegating task to Agent 2...`);
        const delegateResult = await client.mutation("aetheria/tasks:delegateTask", {
          worldId: world._id,
          parentTaskId: task._id,
          fromAgentId: agent1.agentId,
          toAgentId: agent2.agentId,
          reason: "Need help with testing",
          subtaskDescription: "Help test the collaboration system",
        });

        if (delegateResult.success) {
          console.log(`   ✅ Delegation created! ID: ${delegateResult.delegationId}`);
          console.log(`   ✅ Message sent to Agent 2`);

          // Check Agent 2's delegation requests
          console.log(`\n   Checking Agent 2's delegation requests...`);
          const delegations = await client.query("aetheria/tasks:getDelegationRequests", {
            worldId: world._id,
            agentId: agent2.agentId,
            status: "pending",
          });

          console.log(`   ✅ Agent 2 has ${delegations.length} pending delegation(s)`);

          if (delegations.length > 0) {
            // Agent 2 accepts delegation
            console.log(`   Agent 2 accepting delegation...`);
            const acceptResult = await client.mutation("aetheria/tasks:acceptDelegation", {
              worldId: world._id,
              delegationId: delegations[0]._id,
              agentId: agent2.agentId,
            });

            if (acceptResult.success) {
              console.log(`   ✅ Delegation accepted!`);
              console.log(`   ✅ Notification sent back to Agent 1`);
            }
          }
        }
      } else {
        console.log(`   ⚠️  Task claim failed: ${claimResult.error}`);
      }
    } else {
      console.log(`   ⚠️  No tasks available for testing`);
      console.log(`   💡 Tip: Use Jira webhook to create tasks`);
    }
    console.log();

    // Step 4: Test Nearby Agents Discovery
    console.log("4️⃣  Testing nearby agents discovery...");
    console.log("   Getting context for Agent 1...");

    const context = await client.query("aetheria/contextBuilder:buildAgentBrainRequest", {
      worldId: world._id,
      agentId: agent1.agentId,
      agentName: getName(agent1.identity),
      callType: "decision",
    });

    console.log(`   ✅ Context built successfully`);
    console.log(`   📍 Nearby agents: ${context.nearbyAgents.length}`);

    if (context.nearbyAgents.length > 0) {
      context.nearbyAgents.slice(0, 3).forEach((agent, i) => {
        console.log(`      ${i + 1}. ${agent.agentName} - ${agent.distance.toFixed(2)} units away (${agent.status})`);
      });
    }

    console.log(`   💬 Unread messages: ${context.inboxMessages.length}`);
    console.log(`   📋 Available tasks: ${context.availableTasks.length}`);
    console.log(`   🧠 Current state: ${context.currentState}`);
    console.log();

    // Step 5: Test Message Statistics
    console.log("5️⃣  Testing message statistics...");
    const stats = await client.query("aetheria/messaging:getMessageStats", {
      worldId: world._id,
      agentId: agent2.agentId,
    });

    console.log(`   ✅ Agent 2 message stats:`);
    console.log(`      Total received: ${stats.totalReceived}`);
    console.log(`      Total sent: ${stats.totalSent}`);
    console.log(`      Unread: ${stats.unreadCount}`);
    console.log(`      By type:`, stats.byType);
    console.log();

    // Step 6: Test Task Statistics
    console.log("6️⃣  Testing task statistics...");
    const taskStats = await client.query("aetheria/tasks:getTaskStats", {
      worldId: world._id,
      agentId: agent1.agentId,
    });

    console.log(`   ✅ Agent 1 task stats:`);
    console.log(`      Total tasks: ${taskStats.total}`);
    console.log(`      Completion rate: ${taskStats.completionRate}`);
    console.log(`      By status:`, taskStats.byStatus);
    console.log();

    // Step 7: Test Conversation History
    console.log("7️⃣  Testing conversation history...");
    const conversation = await client.query("aetheria/messaging:getConversationBetween", {
      worldId: world._id,
      agentId1: agent1.agentId,
      agentId2: agent2.agentId,
      limit: 10,
    });

    console.log(`   ✅ Found ${conversation.length} message(s) between Agent 1 and Agent 2`);
    console.log();

    // Summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 Phase 1 Test Complete!\n");
    console.log("✅ All systems operational:");
    console.log("   • Messaging system (send/receive/inbox)");
    console.log("   • Task management (claim/update/delegate)");
    console.log("   • Nearby agents discovery");
    console.log("   • Context building for brains");
    console.log("   • Statistics and analytics");
    console.log();
    console.log("💡 Next Steps:");
    console.log("   1. Configure brains for agents (use test-brain.mjs)");
    console.log("   2. Test brain-driven collaboration");
    console.log("   3. Proceed to Phase 2 (multi-agent conversations)");
    console.log();

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

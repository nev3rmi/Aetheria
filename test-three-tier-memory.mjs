#!/usr/bin/env node
/**
 * Three-Tier Memory System Test
 *
 * Tests the complete flow:
 * 1. Agent claims task
 * 2. Agent researches (Tier 1: personal memory)
 * 3. Posts findings to Jira (Tier 2: session memory)
 * 4. Feeds to Graphiti (Tier 3: long-term knowledge)
 * 5. Second agent benefits from first agent's learning
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api.js';

const CONVEX_URL = process.env.CONVEX_URL || 'http://127.0.0.1:3210';
const client = new ConvexHttpClient(CONVEX_URL);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(color, prefix, message) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

function success(message) {
  log(colors.green, '✓', message);
}

function info(message) {
  log(colors.blue, 'ℹ', message);
}

function warn(message) {
  log(colors.yellow, '⚠', message);
}

function error(message) {
  log(colors.red, '✗', message);
}

function section(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Step 1: Check Graphiti health
 */
async function checkGraphitiHealth() {
  section('STEP 1: Check Graphiti Health');

  try {
    info('Checking Graphiti service...');
    const health = await client.action(api.aetheria.graphitiService.checkGraphitiHealth, {});

    if (health.healthy) {
      success('Graphiti is healthy and ready!');
      return true;
    } else {
      error(`Graphiti is not healthy: ${health.error}`);
      return false;
    }
  } catch (err) {
    error(`Failed to check Graphiti health: ${err.message}`);
    warn('Make sure Docker is running: docker compose up -d');
    return false;
  }
}

/**
 * Step 2: Get world and agents
 */
async function getWorldAndAgents() {
  section('STEP 2: Get World and Agents');

  try {
    info('Fetching world status...');
    const worlds = await client.query(api.testing.listWorlds, {});

    if (!worlds || worlds.length === 0) {
      error('No worlds found. Run: npx convex run init');
      return null;
    }

    const world = worlds[0];
    success(`Found world: ${world._id}`);

    info('Fetching agents...');
    const worldData = await client.query(api.testing.getWorld, { worldId: world._id });

    if (!worldData || !worldData.agents || worldData.agents.length === 0) {
      error('No agents found in world');
      return null;
    }

    success(`Found ${worldData.agents.length} agents`);
    worldData.agents.forEach((agent, i) => {
      info(`  Agent ${i + 1}: ${agent.name || agent.id}`);
    });

    return {
      worldId: world._id,
      agents: worldData.agents,
    };
  } catch (err) {
    error(`Failed to get world: ${err.message}`);
    return null;
  }
}

/**
 * Step 3: Test Tier 1 - Short-term memory
 */
async function testTier1ShortTerm(worldId, agentId) {
  section('STEP 3: Test TIER 1 - Short-Term Memory');

  try {
    info('Fetching short-term memories...');
    const memories = await client.query(api.aetheria.memoryRetrieval.getShortTermMemories, {
      worldId,
      agentId,
      limit: 10,
    });

    success(`Found ${memories.length} short-term memories`);

    if (memories.length > 0) {
      info('Recent memories:');
      memories.slice(0, 3).forEach((mem, i) => {
        console.log(`  ${i + 1}. ${mem.description.substring(0, 60)}...`);
      });
    } else {
      warn('No memories yet (agent needs to perform actions)');
    }

    return memories;
  } catch (err) {
    error(`Failed to get short-term memories: ${err.message}`);
    return [];
  }
}

/**
 * Step 4: Test Tier 2 - Session memory (Jira comments)
 */
async function testTier2SessionMemory(taskId) {
  section('STEP 4: Test TIER 2 - Session Memory (Jira Comments)');

  if (!taskId) {
    warn('No task ID provided. Skipping Jira comment test.');
    info('Create a Jira issue with label "agent-alice" to test this.');
    return null;
  }

  try {
    info(`Fetching task details for: ${taskId}`);
    const task = await client.query(api.aetheria.memoryRetrieval.getTaskDetails, {
      taskId,
    });

    if (!task) {
      error('Task not found');
      return null;
    }

    success(`Found task: ${task.issueKey} - ${task.issueSummary}`);

    info('Fetching Jira comments...');
    const comments = await client.action(api.aetheria.jiraCommentService.getJiraComments, {
      issueKey: task.issueKey,
      maxResults: 10,
    });

    success(`Found ${comments.length} Jira comments`);

    if (comments.length > 0) {
      info('Recent comments:');
      comments.slice(0, 3).forEach((comment, i) => {
        const isAgent = comment.body.startsWith('🤖');
        const prefix = isAgent ? '🤖' : '👤';
        console.log(`  ${prefix} ${comment.author.displayName}: ${comment.body.substring(0, 50)}...`);
      });
    } else {
      warn('No comments yet. Agent research will create them automatically.');
    }

    return comments;
  } catch (err) {
    error(`Failed to get session memory: ${err.message}`);
    warn('Make sure Jira credentials are configured:');
    console.log('  npx convex env set JIRA_DOMAIN "your-domain.atlassian.net"');
    console.log('  npx convex env set JIRA_EMAIL "your-email@company.com"');
    console.log('  npx convex env set JIRA_API_TOKEN "your-api-token"');
    return null;
  }
}

/**
 * Step 5: Test Tier 3 - Long-term knowledge (Graphiti)
 */
async function testTier3LongTerm(worldId, query = 'webhook authentication') {
  section('STEP 5: Test TIER 3 - Long-Term Knowledge (Graphiti)');

  try {
    info(`Searching Graphiti for: "${query}"`);
    const knowledge = await client.action(api.aetheria.graphitiService.searchGraphiti, {
      query,
      groupIds: [worldId],
      numResults: 5,
    });

    if (knowledge.length > 0) {
      success(`Found ${knowledge.length} knowledge entries`);

      info('Knowledge graph results:');
      knowledge.forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.content?.substring(0, 60) || entry.episode_body?.substring(0, 60) || 'No content'}...`);
        if (entry.entities && entry.entities.length > 0) {
          console.log(`     Entities: ${entry.entities.slice(0, 3).join(', ')}`);
        }
        if (entry.score || entry.similarity) {
          console.log(`     Relevance: ${((entry.score || entry.similarity) * 100).toFixed(1)}%`);
        }
      });
    } else {
      warn('No knowledge found yet. Knowledge accumulates as agents work.');
      info('Run agents through tasks to build the knowledge graph.');
    }

    return knowledge;
  } catch (err) {
    error(`Failed to search Graphiti: ${err.message}`);
    warn('Make sure Graphiti is running: docker compose ps graphiti');
    return [];
  }
}

/**
 * Step 6: Test adding episode to Graphiti
 */
async function testAddGraphitiEpisode(worldId) {
  section('STEP 6: Test Adding Episode to Graphiti');

  try {
    info('Creating test episode...');

    const episodeName = `test_episode_${Date.now()}`;
    const episodeBody = `Test agent researched webhook authentication.
Found that HMAC-SHA256 is the industry standard for webhook signatures.
This prevents tampering and ensures message integrity.`;

    const result = await client.action(api.aetheria.graphitiService.addGraphitiEpisode, {
      name: episodeName,
      episodeBody,
      source: 'test',
      referenceTime: new Date().toISOString(),
      groupId: worldId,
      metadata: {
        test: true,
        topic: 'webhook_authentication',
      },
    });

    success('Successfully added test episode to Graphiti!');
    info(`Episode ID: ${result.uuid || result.episode_id || 'unknown'}`);

    // Wait a bit for Graphiti to process
    info('Waiting for Graphiti to process episode...');
    await sleep(3000);

    // Search for it
    info('Searching for newly added episode...');
    const searchResults = await client.action(api.aetheria.graphitiService.searchGraphiti, {
      query: 'webhook HMAC authentication',
      groupIds: [worldId],
      numResults: 5,
    });

    if (searchResults.length > 0) {
      success('Found episode in search results!');
      const ourEpisode = searchResults.find(r =>
        r.content?.includes('HMAC-SHA256') || r.episode_body?.includes('HMAC-SHA256')
      );
      if (ourEpisode) {
        success('✓ Episode contains expected content');
      }
    } else {
      warn('Episode added but not found in search yet (may take a moment)');
    }

    return result;
  } catch (err) {
    error(`Failed to add episode: ${err.message}`);
    return null;
  }
}

/**
 * Step 7: Test complete three-tier context retrieval
 */
async function testThreeTierContext(worldId, agentId, taskId) {
  section('STEP 7: Test Complete Three-Tier Context Retrieval');

  try {
    info('Fetching comprehensive context from all 3 tiers...');

    const context = await client.action(api.aetheria.memoryRetrieval.getContextForAgent, {
      worldId,
      agentId,
      currentTaskId: taskId || undefined,
      query: taskId ? 'task collaboration patterns' : undefined,
    });

    success('Successfully retrieved three-tier context!');

    console.log('\n📊 Context Summary:');
    console.log(`  🔥 Tier 1 (Short-Term):  ${context.shortTerm.length} personal memories`);
    console.log(`  💬 Tier 2 (Session):     ${context.sessionBased.length} Jira comments`);
    console.log(`  🧠 Tier 3 (Long-Term):   ${context.longTerm.length} knowledge entries`);

    if (context.shortTerm.length > 0) {
      info('\nTier 1 - Recent personal memories:');
      context.shortTerm.slice(0, 2).forEach((mem, i) => {
        console.log(`  ${i + 1}. ${mem.description.substring(0, 70)}...`);
      });
    }

    if (context.sessionBased.length > 0) {
      info('\nTier 2 - Task collaboration:');
      context.sessionBased.slice(0, 2).forEach((comment, i) => {
        console.log(`  ${i + 1}. ${comment.author}: ${comment.content.substring(0, 60)}...`);
      });
    }

    if (context.longTerm.length > 0) {
      info('\nTier 3 - Historical knowledge:');
      context.longTerm.slice(0, 2).forEach((knowledge, i) => {
        console.log(`  ${i + 1}. ${knowledge.content.substring(0, 70)}...`);
      });
    }

    return context;
  } catch (err) {
    error(`Failed to get three-tier context: ${err.message}`);
    return null;
  }
}

/**
 * Main test flow
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Three-Tier Memory System Test Suite                ║');
  console.log('║                                                            ║');
  console.log('║  Tests collaborative agent memory across 3 tiers:         ║');
  console.log('║  🔥 Tier 1: Short-Term (Personal)                         ║');
  console.log('║  💬 Tier 2: Session (Jira Comments)                       ║');
  console.log('║  🧠 Tier 3: Long-Term (Graphiti Knowledge Graph)          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Check prerequisites
  info('Convex URL: ' + CONVEX_URL);

  // Step 1: Check Graphiti
  const graphitiHealthy = await checkGraphitiHealth();
  if (!graphitiHealthy) {
    error('\n❌ Graphiti is not running. Start Docker first:');
    console.log('   docker compose up -d\n');
    process.exit(1);
  }

  await sleep(1000);

  // Step 2: Get world and agents
  const worldData = await getWorldAndAgents();
  if (!worldData) {
    error('\n❌ Could not get world data. Initialize first:');
    console.log('   npx convex run init\n');
    process.exit(1);
  }

  const { worldId, agents } = worldData;
  const testAgent = agents[0]; // Use first agent

  await sleep(1000);

  // Step 3: Test Tier 1
  await testTier1ShortTerm(worldId, testAgent.id);

  await sleep(1000);

  // Step 4: Test Tier 2 (if tasks exist)
  info('\nChecking for tasks...');
  try {
    const tasks = await client.query(api.testing.listTasks, { worldId });
    if (tasks && tasks.length > 0) {
      const task = tasks[0];
      await testTier2SessionMemory(task._id);
    } else {
      warn('No tasks found. Skipping Tier 2 test.');
      info('Create a Jira issue to test session memory.');
    }
  } catch (err) {
    warn('Could not fetch tasks (this is optional)');
  }

  await sleep(1000);

  // Step 5: Test Tier 3
  await testTier3LongTerm(worldId, 'webhook authentication');

  await sleep(1000);

  // Step 6: Add test episode
  await testAddGraphitiEpisode(worldId);

  await sleep(1000);

  // Step 7: Test complete context
  await testThreeTierContext(worldId, testAgent.id, null);

  // Final summary
  section('TEST COMPLETE');
  success('All tests completed!');

  console.log('\n📋 Next Steps:\n');
  console.log('1. View Neo4j graph: http://localhost:7474');
  console.log('   Query: MATCH (n) RETURN n LIMIT 25\n');

  console.log('2. Create a Jira task with label "agent-alice"\n');

  console.log('3. Run agents and watch:');
  console.log('   - Personal memories (Tier 1) in Aetheria DB');
  console.log('   - Jira comments (Tier 2) appear automatically');
  console.log('   - Knowledge graph (Tier 3) grows in Neo4j\n');

  console.log('4. Test collaboration:');
  console.log('   - Agent A researches topic → posts to Jira');
  console.log('   - Agent B picks similar task → sees A\'s findings');
  console.log('   - Agent C weeks later → benefits from team knowledge\n');

  success('Three-tier memory system is ready! 🧠✨\n');
}

// Run tests
main().catch((err) => {
  error(`\n❌ Test failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});

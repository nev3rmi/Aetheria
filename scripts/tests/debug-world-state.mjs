#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.VITE_CONVEX_URL || "http://127.0.0.1:3210";
const client = new ConvexHttpClient(CONVEX_URL);

console.log("🔍 Debug World State\n");

async function main() {
  try {
    const worldStatus = await client.query("world:defaultWorldStatus");
    console.log("World Status:");
    console.log(JSON.stringify(worldStatus, null, 2));
    console.log("\n");

    if (worldStatus) {
      const worldState = await client.query("world:worldState", {
        worldId: worldStatus.worldId,
      });

      console.log("World State Keys:", Object.keys(worldState || {}));
      console.log("\n");

      if (worldState?.engine) {
        console.log("Engine Keys:", Object.keys(worldState.engine));
        console.log("\n");

        if (worldState.engine.agents) {
          console.log("Agents:", worldState.engine.agents.length);
          console.log(JSON.stringify(worldState.engine.agents.slice(0, 2), null, 2));
        }
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    client.close();
  }
}

main();

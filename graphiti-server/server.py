#!/usr/bin/env python3
"""
Simple Graphiti REST API Server

Provides HTTP endpoints for Graphiti knowledge graph operations.
"""

import os
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(title="Graphiti Server", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Graphiti (lazy load to handle connection issues gracefully)
graphiti_client = None


def get_graphiti():
    """Get or create Graphiti client"""
    global graphiti_client

    if graphiti_client is None:
        try:
            from graphiti_core import Graphiti

            neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            neo4j_user = os.getenv("NEO4J_USER", "neo4j")
            neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

            logger.info(f"Connecting to Neo4j at {neo4j_uri}")

            graphiti_client = Graphiti(
                uri=neo4j_uri,
                user=neo4j_user,
                password=neo4j_password
            )

            logger.info("Graphiti client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Graphiti: {e}")
            raise HTTPException(status_code=500, detail=f"Graphiti initialization failed: {str(e)}")

    return graphiti_client


# Request/Response Models
class EpisodeRequest(BaseModel):
    name: str
    episode_body: str
    source: str
    reference_time: str
    group_id: str
    metadata: Optional[Dict[str, Any]] = None


class SearchRequest(BaseModel):
    query: str
    group_ids: List[str]
    num_results: Optional[int] = 5


class HealthResponse(BaseModel):
    status: str
    neo4j_connected: bool = False
    graphiti_ready: bool = False


# Health endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        client = get_graphiti()
        # Try a simple operation to verify connection
        return HealthResponse(
            status="healthy",
            neo4j_connected=True,
            graphiti_ready=True
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            neo4j_connected=False,
            graphiti_ready=False
        )


# Add episode
@app.post("/episodes")
async def add_episode(episode: EpisodeRequest):
    """Add an episode to the knowledge graph"""
    try:
        client = get_graphiti()

        logger.info(f"Adding episode: {episode.name}")

        # Parse timestamp
        try:
            ref_time = datetime.fromisoformat(episode.reference_time.replace('Z', '+00:00'))
        except:
            ref_time = datetime.now()

        # Add episode to Graphiti
        result = await client.add_episode(
            name=episode.name,
            episode_body=episode.episode_body,
            source=EpisodeType.message,
            source_description=episode.source,
            reference_time=ref_time,
            group_id=episode.group_id
        )

        logger.info(f"Episode added successfully: {episode.name}")

        return {
            "success": True,
            "episode_id": str(result.uuid) if hasattr(result, 'uuid') else episode.name,
            "name": episode.name
        }

    except Exception as e:
        logger.error(f"Failed to add episode: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Search
@app.post("/search")
async def search(search_req: SearchRequest):
    """Search the knowledge graph"""
    try:
        client = get_graphiti()

        logger.info(f"Searching for: {search_req.query}")

        # Search Graphiti
        results = await client.search(
            query=search_req.query,
            group_ids=search_req.group_ids,
            num_results=search_req.num_results or 5
        )

        logger.info(f"Found {len(results)} results")

        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "episode_id": str(result.uuid) if hasattr(result, 'uuid') else "unknown",
                "content": result.content if hasattr(result, 'content') else result.episode_body if hasattr(result, 'episode_body') else "",
                "entities": getattr(result, 'entities', []),
                "facts": getattr(result, 'facts', []),
                "score": getattr(result, 'score', 0.0),
                "created_at": str(result.created_at) if hasattr(result, 'created_at') else ""
            })

        return formatted_results

    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Graphiti Knowledge Graph Server",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "add_episode": "POST /episodes",
            "search": "POST /search"
        }
    }


# Run server
if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

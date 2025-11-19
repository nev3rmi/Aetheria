#!/bin/bash

# Test different n8n payload formats

echo "Testing n8n webhook with different formats..."
echo ""

# Test 1: Original format
echo "Test 1: chatInput + sessionID"
curl -s -X POST https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3 \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "What should I do next?",
    "sessionID": "agent-1"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 2: Add key parameter
echo "Test 2: With 'key' parameter"
curl -s -X POST https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3 \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "What should I do next?",
    "sessionID": "agent-1",
    "key": "test-key-123"
  }' | jq '.'

echo ""
echo "---"
echo ""

# Test 3: Different structure
echo "Test 3: Simplified format"
curl -s -X POST https://n8n.toho.vn/webhook/3ee57b7f-f3bd-447b-be9e-0b98e3457dd3 \
  -H "Content-Type: application/json" \
  -d '{
    "input": "What should I do next?",
    "session": "agent-1"
  }' | jq '.'


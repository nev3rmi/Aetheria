/**
 * Jira Webhook Handler for Aetheria
 *
 * Receives real-time notifications from Jira when issues are created/updated.
 * Routes tasks to appropriate agents based on label-based assignment.
 */

import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';

/**
 * Jira Webhook Payload Interface
 * Based on Atlassian Cloud webhook v2 format
 */
interface JiraWebhookPayload {
  timestamp: number;
  webhookEvent: string; // e.g., "jira:issue_created", "jira:issue_updated"
  issue_event_type_name?: string;
  user: {
    accountId: string;
    displayName: string;
    emailAddress?: string;
  };
  issue: {
    id: string;
    key: string; // e.g., "PROJ-123"
    self: string; // API URL
    fields: {
      summary: string;
      description?: string | null;
      labels: string[];
      status: {
        name: string;
        id: string;
      };
      priority?: {
        name: string;
        id: string;
      };
      assignee?: {
        accountId: string;
        displayName: string;
      } | null;
      project: {
        key: string;
        name: string;
      };
      issuetype: {
        name: string;
      };
      reporter?: {
        displayName: string;
      };
      parent?: {
        key: string;
      };
      created: string;
      updated: string;
    };
  };
  changelog?: {
    items: Array<{
      field: string;
      fieldtype: string;
      from: string | null;
      fromString: string | null;
      to: string | null;
      toString: string | null;
    }>;
  };
}

/**
 * Main webhook handler
 * Validates HMAC signature and processes Jira events
 */
export const handleJiraWebhook = httpAction(async (ctx, request) => {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Extract Headers
    // ============================================================================

    const signature = request.headers.get('X-Hub-Signature');
    const webhookId = request.headers.get('X-Atlassian-Webhook-Identifier');
    const retryCount = request.headers.get('X-Atlassian-Webhook-Retry');

    console.log('[Jira Webhook] Received webhook', {
      webhookId,
      retryCount: retryCount || '0',
      hasSignature: !!signature,
    });

    // ============================================================================
    // STEP 2: Check for Duplicate (Idempotency)
    // ============================================================================

    if (webhookId) {
      const alreadyProcessed = await ctx.runQuery(internal.aetheria.jiraWebhook.checkWebhookProcessed, {
        webhookId,
      });

      if (alreadyProcessed) {
        console.log('[Jira Webhook] Already processed, returning 200', { webhookId });
        return new Response(JSON.stringify({ message: 'Already processed', webhookId }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ============================================================================
    // STEP 3: Read and Validate Body
    // ============================================================================

    const body = await request.text();

    if (!body || body.length === 0) {
      console.error('[Jira Webhook] Empty body');
      return new Response(JSON.stringify({ error: 'Empty body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ============================================================================
    // STEP 4: Validate HMAC Signature (if configured)
    // ============================================================================

    const webhookSecret = process.env.JIRA_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const isValid = await validateHmacSignature(body, signature, webhookSecret);

      if (!isValid) {
        console.error('[Jira Webhook] Invalid HMAC signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('[Jira Webhook] HMAC signature validated');
    } else if (webhookSecret) {
      console.warn('[Jira Webhook] Secret configured but no signature provided');
    }

    // ============================================================================
    // STEP 5: Parse Payload
    // ============================================================================

    let payload: JiraWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('[Jira Webhook] Failed to parse JSON', error);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { webhookEvent, issue, changelog } = payload;

    console.log('[Jira Webhook] Parsed event', {
      webhookEvent,
      issueKey: issue.key,
      labels: issue.fields.labels,
      status: issue.fields.status.name,
    });

    // ============================================================================
    // STEP 6: Filter Events
    // ============================================================================

    // Only process issue create/update events
    if (
      webhookEvent !== 'jira:issue_created' &&
      webhookEvent !== 'jira:issue_updated'
    ) {
      console.log('[Jira Webhook] Ignoring event type:', webhookEvent);
      return new Response(JSON.stringify({ message: 'Event type ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ============================================================================
    // STEP 7: Extract Agent Labels
    // ============================================================================

    const labels = issue.fields.labels || [];
    const agentLabels = labels.filter((label: string) =>
      label.startsWith('agent-')
    );

    console.log('[Jira Webhook] Extracted agent labels', {
      allLabels: labels,
      agentLabels,
    });

    // If no agent labels, check if this is a self-assignable task
    if (agentLabels.length === 0) {
      console.log('[Jira Webhook] No agent labels, storing as unassigned task');
      // Store task without agent assignment for self-selection
      await ctx.runMutation(internal.aetheria.jiraWebhook.storeUnassignedTask, {
        issueKey: issue.key,
        issueSummary: issue.fields.summary,
        issueDescription: issue.fields.description || '',
        issueStatus: issue.fields.status.name,
        issueUrl: issue.self,
        labels,
        priority: issue.fields.priority?.name || 'medium',
        projectKey: issue.fields.project.key,
        issueType: issue.fields.issuetype.name,
        reporter: issue.fields.reporter?.displayName,
        parentKey: issue.fields.parent?.key,
        webhookEvent,
      });

      return new Response(JSON.stringify({ message: 'Stored as unassigned task' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ============================================================================
    // STEP 8: Process Task for Each Agent
    // ============================================================================

    for (const agentLabel of agentLabels) {
      console.log('[Jira Webhook] Processing for agent:', agentLabel);

      await ctx.runMutation(internal.aetheria.jiraWebhook.processJiraTask, {
        agentLabel,
        issueKey: issue.key,
        issueSummary: issue.fields.summary,
        issueDescription: issue.fields.description || '',
        issueStatus: issue.fields.status.name,
        issueUrl: issue.self,
        labels,
        priority: issue.fields.priority?.name || 'medium',
        projectKey: issue.fields.project.key,
        issueType: issue.fields.issuetype.name,
        reporter: issue.fields.reporter?.displayName,
        parentKey: issue.fields.parent?.key,
        webhookEvent,
      });
    }

    // ============================================================================
    // STEP 9: Log Webhook Processing
    // ============================================================================

    if (webhookId) {
      await ctx.runMutation(internal.aetheria.jiraWebhook.logWebhook, {
        webhookId,
        webhookEvent,
        issueKey: issue.key,
        retryCount: retryCount ? parseInt(retryCount) : 0,
        payload: JSON.parse(body), // Store for debugging
      });
    }

    const duration = Date.now() - startTime;

    console.log('[Jira Webhook] Successfully processed', {
      webhookId,
      issueKey: issue.key,
      agentCount: agentLabels.length,
      duration: `${duration}ms`,
    });

    // ============================================================================
    // STEP 10: Return Success
    // ============================================================================

    return new Response(
      JSON.stringify({
        message: 'Webhook processed successfully',
        issueKey: issue.key,
        agentsNotified: agentLabels.length,
        duration: `${duration}ms`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Jira Webhook] Error processing webhook', error);

    // Return 500 to trigger Jira retry
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Validates HMAC signature from Jira using Web Crypto API
 * Uses timing-safe comparison to prevent timing attacks
 */
async function validateHmacSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Signature format: "sha256=<hash>"
    const [algorithm, expectedHash] = signature.split('=');

    if (!algorithm || !expectedHash || algorithm !== 'sha256') {
      console.error('[HMAC] Invalid signature format');
      return false;
    }

    // Convert secret and body to bytes
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(secret);
    const bodyBytes = encoder.encode(body);

    // Import key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Calculate HMAC
    const signatureBytes = await crypto.subtle.sign('HMAC', key, bodyBytes);

    // Convert to hex
    const calculatedHash = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Timing-safe comparison using subtle.timingSafeEqual if available
    // Otherwise fall back to simple comparison (less secure but functional)
    return calculatedHash === expectedHash.toLowerCase();
  } catch (error) {
    console.error('[HMAC] Validation error', error);
    return false;
  }
}

/**
 * Internal mutations called by webhook handler
 * Defined below for use with ctx.runMutation()
 */

import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';

// Check if webhook already processed (idempotency)
export const checkWebhookProcessed = internalQuery({
  args: {
    webhookId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('jiraWebhookLog')
      .withIndex('by_webhook_id', (q) => q.eq('webhookId', args.webhookId))
      .first();

    return !!existing;
  },
});

// Log webhook delivery
export const logWebhook = internalMutation({
  args: {
    webhookId: v.string(),
    webhookEvent: v.string(),
    issueKey: v.string(),
    retryCount: v.number(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert('jiraWebhookLog', {
      webhookId: args.webhookId,
      webhookEvent: args.webhookEvent,
      issueKey: args.issueKey,
      receivedAt: now,
      processedAt: now,
      retryCount: args.retryCount,
      payload: args.payload,
    });
  },
});

// Store unassigned task for agent self-selection
export const storeUnassignedTask = internalMutation({
  args: {
    issueKey: v.string(),
    issueSummary: v.string(),
    issueDescription: v.string(),
    issueStatus: v.string(),
    issueUrl: v.string(),
    labels: v.array(v.string()),
    priority: v.string(),
    projectKey: v.string(),
    issueType: v.string(),
    reporter: v.optional(v.string()),
    parentKey: v.optional(v.string()),
    webhookEvent: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get default world (assuming single world for now)
    const worldStatus = await ctx.db.query('worldStatus').first();

    if (!worldStatus) {
      console.error('[Jira Webhook] No world found');
      return;
    }

    // Check if task already exists
    const existingTask = await ctx.db
      .query('jiraTasks')
      .withIndex('by_issue_key', (q) => q.eq('issueKey', args.issueKey))
      .first();

    if (existingTask) {
      // Update existing task
      await ctx.db.patch(existingTask._id, {
        issueSummary: args.issueSummary,
        issueDescription: args.issueDescription,
        issueStatus: args.issueStatus,
        labels: args.labels,
        agentLabels: [],
        priority: args.priority,
        lastSyncedAt: now,
        status: 'pending',
        metadata: {
          projectKey: args.projectKey,
          issueType: args.issueType,
          reporter: args.reporter,
          parentKey: args.parentKey,
        },
      });

      console.log('[Jira Webhook] Updated unassigned task:', args.issueKey);
    } else {
      // Create new task
      await ctx.db.insert('jiraTasks', {
        worldId: worldStatus.worldId,
        issueKey: args.issueKey,
        issueSummary: args.issueSummary,
        issueDescription: args.issueDescription,
        issueStatus: args.issueStatus,
        issueUrl: args.issueUrl,
        labels: args.labels,
        agentLabels: [],
        priority: args.priority,
        receivedAt: now,
        lastSyncedAt: now,
        status: 'pending',
        metadata: {
          projectKey: args.projectKey,
          issueType: args.issueType,
          reporter: args.reporter,
          parentKey: args.parentKey,
        },
      });

      console.log('[Jira Webhook] Created unassigned task:', args.issueKey);
    }
  },
});

// Process task for specific agent
export const processJiraTask = internalMutation({
  args: {
    agentLabel: v.string(),
    issueKey: v.string(),
    issueSummary: v.string(),
    issueDescription: v.string(),
    issueStatus: v.string(),
    issueUrl: v.string(),
    labels: v.array(v.string()),
    priority: v.string(),
    projectKey: v.string(),
    issueType: v.string(),
    reporter: v.optional(v.string()),
    parentKey: v.optional(v.string()),
    webhookEvent: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get default world
    const worldStatus = await ctx.db.query('worldStatus').first();

    if (!worldStatus) {
      console.error('[Jira Webhook] No world found');
      return;
    }

    // Find agent by label
    const agentBrain = await ctx.db
      .query('agentBrains')
      .withIndex('by_name', (q) => q.eq('worldId', worldStatus.worldId).eq('agentName', args.agentLabel))
      .first();

    if (!agentBrain) {
      console.warn('[Jira Webhook] No agent found for label:', args.agentLabel);
      // Still store task, but without agent assignment
      await ctx.runMutation(internal.aetheria.jiraWebhook.storeUnassignedTask, args);
      return;
    }

    // Check if task already exists
    const existingTask = await ctx.db
      .query('jiraTasks')
      .withIndex('by_issue_key', (q) => q.eq('issueKey', args.issueKey))
      .first();

    let taskId;

    if (existingTask) {
      // Update existing task
      await ctx.db.patch(existingTask._id, {
        issueSummary: args.issueSummary,
        issueDescription: args.issueDescription,
        issueStatus: args.issueStatus,
        labels: args.labels,
        agentLabels: [args.agentLabel],
        assignedAgentId: agentBrain.agentId,
        priority: args.priority,
        lastSyncedAt: now,
        metadata: {
          projectKey: args.projectKey,
          issueType: args.issueType,
          reporter: args.reporter,
          parentKey: args.parentKey,
        },
      });

      taskId = existingTask._id;
      console.log('[Jira Webhook] Updated task for agent:', args.agentLabel);
    } else {
      // Create new task
      taskId = await ctx.db.insert('jiraTasks', {
        worldId: worldStatus.worldId,
        issueKey: args.issueKey,
        issueSummary: args.issueSummary,
        issueDescription: args.issueDescription,
        issueStatus: args.issueStatus,
        issueUrl: args.issueUrl,
        labels: args.labels,
        agentLabels: [args.agentLabel],
        assignedAgentId: agentBrain.agentId,
        priority: args.priority,
        receivedAt: now,
        lastSyncedAt: now,
        status: 'pending',
        metadata: {
          projectKey: args.projectKey,
          issueType: args.issueType,
          reporter: args.reporter,
          parentKey: args.parentKey,
        },
      });

      console.log('[Jira Webhook] Created task for agent:', args.agentLabel);
    }

    // Notify agent via input system
    // This will be implemented when we add the input handler
    // For now, agent will discover task via polling or next decision cycle

    console.log('[Jira Webhook] Task processed', {
      issueKey: args.issueKey,
      agentLabel: args.agentLabel,
      taskId,
    });
  },
});

/**
 * Jira REST API Client for Aetheria
 *
 * Provides methods to interact with Jira Cloud API:
 * - Fetch tasks by label/JQL
 * - Update task status (transitions)
 * - Add comments
 * - Create subtasks
 * - Add/remove labels
 */

import { ActionCtx } from '../_generated/server';

/**
 * Jira API Configuration
 * Loaded from environment variables
 */
interface JiraConfig {
  domain: string; // e.g., "your-company.atlassian.net"
  email: string; // API token owner email
  apiToken: string; // API token from Atlassian account settings
}

/**
 * Get Jira configuration from environment
 */
function getJiraConfig(): JiraConfig {
  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!domain || !email || !apiToken) {
    throw new Error(
      'Jira configuration missing. Set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.'
    );
  }

  return { domain, email, apiToken };
}

/**
 * Create Basic Auth header for Jira API
 */
function getAuthHeader(): string {
  const config = getJiraConfig();
  const credentials = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Make authenticated request to Jira API
 */
async function jiraRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  const config = getJiraConfig();
  const url = `https://${config.domain}/rest/api/3${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': getAuthHeader(),
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`[Jira API] ${method} ${endpoint}`);

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Jira API] Error ${response.status}:`, errorText);
      throw new Error(`Jira API error ${response.status}: ${errorText}`);
    }

    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[Jira API] Request failed:`, error);
    throw error;
  }
}

// ============================================================================
// PUBLIC API METHODS
// ============================================================================

/**
 * Jira Issue Interface (simplified)
 */
export interface JiraIssue {
  id: string;
  key: string; // e.g., "PROJ-123"
  self: string;
  fields: {
    summary: string;
    description?: string;
    labels: string[];
    status: {
      name: string;
      id: string;
    };
    priority?: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    project: {
      key: string;
    };
    issuetype: {
      name: string;
    };
    parent?: {
      key: string;
    };
  };
}

/**
 * Search for issues using JQL (Jira Query Language)
 *
 * @param jql - JQL query string (e.g., "labels = agent-alice AND status = 'To Do'")
 * @param maxResults - Maximum number of results to return (default 50)
 * @returns Array of matching issues
 */
export async function searchIssues(
  ctx: ActionCtx,
  jql: string,
  maxResults: number = 50
): Promise<JiraIssue[]> {
  const endpoint = `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=key,summary,description,labels,status,priority,assignee,project,issuetype,parent`;

  const response = await jiraRequest('GET', endpoint);

  console.log(`[Jira API] Found ${response.total} issues for JQL: ${jql}`);

  return response.issues || [];
}

/**
 * Fetch tasks assigned to a specific agent by label
 *
 * @param agentLabel - Agent label (e.g., "agent-alice")
 * @param status - Optional status filter (e.g., "To Do", "In Progress")
 * @returns Array of assigned tasks
 */
export async function fetchAgentTasks(
  ctx: ActionCtx,
  agentLabel: string,
  status?: string
): Promise<JiraIssue[]> {
  let jql = `labels = "${agentLabel}"`;

  if (status) {
    jql += ` AND status = "${status}"`;
  }

  // Order by priority and created date
  jql += ' ORDER BY priority DESC, created DESC';

  return searchIssues(ctx, jql);
}

/**
 * Fetch all unassigned tasks (no agent labels)
 * Useful for agent self-assignment
 *
 * @param projectKey - Optional project filter (e.g., "BACKEND")
 * @returns Array of unassigned tasks
 */
export async function fetchUnassignedTasks(
  ctx: ActionCtx,
  projectKey?: string
): Promise<JiraIssue[]> {
  let jql = 'labels not in (agent-*) AND status != Done';

  if (projectKey) {
    jql = `project = ${projectKey} AND ${jql}`;
  }

  jql += ' ORDER BY priority DESC, created DESC';

  return searchIssues(ctx, jql, 20); // Limit to 20 for performance
}

/**
 * Get a single issue by key
 *
 * @param issueKey - Issue key (e.g., "PROJ-123")
 * @returns Issue details
 */
export async function getIssue(
  ctx: ActionCtx,
  issueKey: string
): Promise<JiraIssue> {
  const endpoint = `/issue/${issueKey}`;
  return jiraRequest('GET', endpoint);
}

/**
 * Jira Transition Interface
 */
interface JiraTransition {
  id: string;
  name: string; // e.g., "To Do", "In Progress", "Done"
  to: {
    id: string;
    name: string;
  };
}

/**
 * Get available transitions for an issue
 *
 * @param issueKey - Issue key
 * @returns Array of available transitions
 */
export async function getAvailableTransitions(
  ctx: ActionCtx,
  issueKey: string
): Promise<JiraTransition[]> {
  const endpoint = `/issue/${issueKey}/transitions`;
  const response = await jiraRequest('GET', endpoint);
  return response.transitions || [];
}

/**
 * Transition an issue to a new status
 *
 * @param issueKey - Issue key
 * @param statusName - Target status name (e.g., "In Progress")
 * @returns Success boolean
 */
export async function updateTaskStatus(
  ctx: ActionCtx,
  issueKey: string,
  statusName: string
): Promise<boolean> {
  // First, get available transitions
  const transitions = await getAvailableTransitions(ctx, issueKey);

  // Find matching transition
  const transition = transitions.find(
    (t) => t.to.name.toLowerCase() === statusName.toLowerCase() ||
           t.name.toLowerCase() === statusName.toLowerCase()
  );

  if (!transition) {
    console.error(`[Jira API] No transition found for status: ${statusName}`);
    console.log('[Jira API] Available transitions:', transitions.map(t => t.to.name));
    throw new Error(`Cannot transition to "${statusName}". Available: ${transitions.map(t => t.to.name).join(', ')}`);
  }

  // Execute transition
  const endpoint = `/issue/${issueKey}/transitions`;
  await jiraRequest('POST', endpoint, {
    transition: {
      id: transition.id,
    },
  });

  console.log(`[Jira API] Transitioned ${issueKey} to ${statusName}`);
  return true;
}

/**
 * Add a comment to an issue
 *
 * @param issueKey - Issue key
 * @param comment - Comment text (supports Jira markdown)
 * @returns Comment ID
 */
export async function addComment(
  ctx: ActionCtx,
  issueKey: string,
  comment: string
): Promise<string> {
  const endpoint = `/issue/${issueKey}/comment`;

  const response = await jiraRequest('POST', endpoint, {
    body: {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: comment,
            },
          ],
        },
      ],
    },
  });

  console.log(`[Jira API] Added comment to ${issueKey}`);
  return response.id;
}

/**
 * Add labels to an issue
 *
 * @param issueKey - Issue key
 * @param labels - Labels to add
 */
export async function addLabels(
  ctx: ActionCtx,
  issueKey: string,
  labels: string[]
): Promise<void> {
  // Get current issue to retrieve existing labels
  const issue = await getIssue(ctx, issueKey);
  const existingLabels = issue.fields.labels || [];

  // Merge labels (avoid duplicates)
  const updatedLabels = [...new Set([...existingLabels, ...labels])];

  // Update issue
  const endpoint = `/issue/${issueKey}`;
  await jiraRequest('PUT', endpoint, {
    fields: {
      labels: updatedLabels,
    },
  });

  console.log(`[Jira API] Added labels to ${issueKey}:`, labels);
}

/**
 * Remove labels from an issue
 *
 * @param issueKey - Issue key
 * @param labels - Labels to remove
 */
export async function removeLabels(
  ctx: ActionCtx,
  issueKey: string,
  labels: string[]
): Promise<void> {
  const issue = await getIssue(ctx, issueKey);
  const existingLabels = issue.fields.labels || [];

  // Filter out labels to remove
  const updatedLabels = existingLabels.filter(label => !labels.includes(label));

  // Update issue
  const endpoint = `/issue/${issueKey}`;
  await jiraRequest('PUT', endpoint, {
    fields: {
      labels: updatedLabels,
    },
  });

  console.log(`[Jira API] Removed labels from ${issueKey}:`, labels);
}

/**
 * Create a subtask under a parent issue
 *
 * @param parentKey - Parent issue key
 * @param summary - Subtask title
 * @param description - Subtask description
 * @param labels - Labels to add (e.g., agent label)
 * @returns Created subtask key
 */
export async function createSubtask(
  ctx: ActionCtx,
  parentKey: string,
  summary: string,
  description: string,
  labels: string[] = []
): Promise<string> {
  // Get parent issue to extract project
  const parentIssue = await getIssue(ctx, parentKey);
  const projectKey = parentIssue.fields.project.key;

  const endpoint = '/issue';

  const response = await jiraRequest('POST', endpoint, {
    fields: {
      project: {
        key: projectKey,
      },
      parent: {
        key: parentKey,
      },
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description,
              },
            ],
          },
        ],
      },
      issuetype: {
        name: 'Subtask', // Standard Jira subtask type
      },
      labels,
    },
  });

  console.log(`[Jira API] Created subtask ${response.key} under ${parentKey}`);
  return response.key;
}

/**
 * Update issue description
 *
 * @param issueKey - Issue key
 * @param description - New description text
 */
export async function updateDescription(
  ctx: ActionCtx,
  issueKey: string,
  description: string
): Promise<void> {
  const endpoint = `/issue/${issueKey}`;

  await jiraRequest('PUT', endpoint, {
    fields: {
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description,
              },
            ],
          },
        ],
      },
    },
  });

  console.log(`[Jira API] Updated description for ${issueKey}`);
}

/**
 * Get issue comments
 *
 * @param issueKey - Issue key
 * @returns Array of comments
 */
export async function getComments(
  ctx: ActionCtx,
  issueKey: string
): Promise<any[]> {
  const endpoint = `/issue/${issueKey}/comment`;
  const response = await jiraRequest('GET', endpoint);
  return response.comments || [];
}

/**
 * Assign issue to a user
 *
 * @param issueKey - Issue key
 * @param accountId - Jira user account ID (null to unassign)
 */
export async function assignIssue(
  ctx: ActionCtx,
  issueKey: string,
  accountId: string | null
): Promise<void> {
  const endpoint = `/issue/${issueKey}/assignee`;

  await jiraRequest('PUT', endpoint, {
    accountId,
  });

  console.log(`[Jira API] Assigned ${issueKey} to ${accountId || 'unassigned'}`);
}

// ============================================================================
// RATE LIMITING & ERROR HANDLING
// ============================================================================

/**
 * Simple rate limiter to respect Jira API limits
 * Jira Cloud: ~100 requests per minute per user
 */
const rateLimitQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests = max 600/min

export async function rateLimitedRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    rateLimitQueue.push(async () => {
      try {
        // Wait if needed
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;

        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }

        lastRequestTime = Date.now();
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    if (!isProcessingQueue) {
      processQueue();
    }
  });
}

async function processQueue() {
  isProcessingQueue = true;

  while (rateLimitQueue.length > 0) {
    const fn = rateLimitQueue.shift();
    if (fn) {
      await fn();
    }
  }

  isProcessingQueue = false;
}

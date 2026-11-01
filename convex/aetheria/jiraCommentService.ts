/**
 * Jira Comment Service
 *
 * Provides methods to add and retrieve comments from Jira issues.
 * Comments serve as session-based memory for agents working on the same task.
 */

import { v } from 'convex/values';
import { action } from '../_generated/server';

/**
 * Comment format for Jira
 */
export interface JiraComment {
  id: string;
  author: {
    displayName: string;
    emailAddress?: string;
  };
  body: string;
  created: string; // ISO timestamp
  updated: string; // ISO timestamp
}

/**
 * Agent comment data
 */
export interface AgentCommentData {
  agentName: string;
  action: string;
  findings?: string;
  nextSteps?: string;
  toolsUsed?: string[];
  relatedAgents?: string[];
  timestamp: number;
}

/**
 * Format an agent's research findings as a readable Jira comment
 */
export function formatAgentComment(data: AgentCommentData): string {
  const { agentName, action, findings, nextSteps, toolsUsed, relatedAgents, timestamp } = data;

  const date = new Date(timestamp).toISOString();

  let comment = `🤖 *${agentName}* - ${date}\n\n`;
  comment += `*Action:* ${action}\n\n`;

  if (findings) {
    comment += `*Findings:*\n${findings}\n\n`;
  }

  if (toolsUsed && toolsUsed.length > 0) {
    comment += `*Tools Used:* ${toolsUsed.join(', ')}\n\n`;
  }

  if (relatedAgents && relatedAgents.length > 0) {
    comment += `*Collaborated With:* ${relatedAgents.join(', ')}\n\n`;
  }

  if (nextSteps) {
    comment += `*Next Steps:*\n${nextSteps}\n`;
  }

  return comment;
}

/**
 * Add a comment to a Jira issue
 */
export const addJiraComment = action({
  args: {
    issueKey: v.string(),
    commentBody: v.string(),
  },
  handler: async (ctx, { issueKey, commentBody }) => {
    const domain = process.env.JIRA_DOMAIN;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!domain || !email || !apiToken) {
      throw new Error('Jira credentials not configured');
    }

    const url = `https://${domain}/rest/api/3/issue/${issueKey}/comment`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: commentBody,
                },
              ],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add Jira comment: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result;
  },
});

/**
 * Get comments from a Jira issue
 */
export const getJiraComments = action({
  args: {
    issueKey: v.string(),
    maxResults: v.optional(v.number()), // Limit number of comments (default: all)
  },
  handler: async (ctx, { issueKey, maxResults }) => {
    const domain = process.env.JIRA_DOMAIN;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!domain || !email || !apiToken) {
      throw new Error('Jira credentials not configured');
    }

    let url = `https://${domain}/rest/api/3/issue/${issueKey}/comment`;

    // Add query parameters if needed
    const params = new URLSearchParams();
    if (maxResults) {
      params.append('maxResults', maxResults.toString());
    }
    params.append('orderBy', '-created'); // Most recent first

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Jira comments: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Convert Jira Atlassian Document Format to plain text
    const comments: JiraComment[] = result.comments.map((comment: any) => {
      // Extract plain text from Atlassian Document Format
      let bodyText = '';
      if (comment.body?.content) {
        bodyText = extractTextFromADF(comment.body.content);
      }

      return {
        id: comment.id,
        author: {
          displayName: comment.author?.displayName || 'Unknown',
          emailAddress: comment.author?.emailAddress,
        },
        body: bodyText,
        created: comment.created,
        updated: comment.updated,
      };
    });

    return comments;
  },
});

/**
 * Extract plain text from Atlassian Document Format (ADF)
 */
function extractTextFromADF(content: any[]): string {
  let text = '';

  for (const node of content) {
    if (node.type === 'paragraph' || node.type === 'heading') {
      if (node.content) {
        for (const item of node.content) {
          if (item.type === 'text') {
            text += item.text;
          } else if (item.type === 'mention') {
            text += `@${item.attrs?.text || 'user'}`;
          }
        }
      }
      text += '\n';
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      if (node.content) {
        for (const listItem of node.content) {
          text += '- ';
          if (listItem.content) {
            for (const para of listItem.content) {
              if (para.content) {
                for (const item of para.content) {
                  if (item.type === 'text') {
                    text += item.text;
                  }
                }
              }
            }
          }
          text += '\n';
        }
      }
    } else if (node.type === 'codeBlock') {
      if (node.content) {
        for (const item of node.content) {
          if (item.type === 'text') {
            text += '```\n' + item.text + '\n```\n';
          }
        }
      }
    }
  }

  return text.trim();
}

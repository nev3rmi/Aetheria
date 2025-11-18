import { httpRouter } from 'convex/server';
import { handleReplicateWebhook } from './music';
import { handleJiraWebhook } from './aetheria/jiraWebhook';

const http = httpRouter();

// Existing webhook for music generation
http.route({
  path: '/replicate_webhook',
  method: 'POST',
  handler: handleReplicateWebhook,
});

// Aetheria: Jira webhook for task notifications
http.route({
  path: '/jira_webhook',
  method: 'POST',
  handler: handleJiraWebhook,
});

export default http;

/**
 * Agent Messaging System
 *
 * Handles agent-to-agent communication:
 * - Direct messages (agent to agent)
 * - Broadcast messages (agent to all)
 * - Delegation requests
 * - Help requests
 * - Threading support
 */

import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { playerId } from '../aiTown/ids';
import { Id } from '../_generated/dataModel';

/**
 * Send a message from one agent to another (or broadcast)
 */
export const sendAgentMessage = internalMutation({
  args: {
    worldId: v.id('worlds'),
    fromAgentId: playerId,
    toAgentId: v.optional(playerId), // null = broadcast
    messageType: v.union(
      v.literal('direct'),
      v.literal('broadcast'),
      v.literal('delegation'),
      v.literal('help_request')
    ),
    content: v.string(),
    threadId: v.optional(v.string()),
    relatedTaskId: v.optional(v.id('jiraTasks')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert('agentMessages', {
      worldId: args.worldId,
      fromAgentId: args.fromAgentId,
      toAgentId: args.toAgentId,
      messageType: args.messageType,
      content: args.content,
      threadId: args.threadId,
      relatedTaskId: args.relatedTaskId,
      metadata: args.metadata || {},
      isRead: false,
      sentAt: Date.now(),
    });

    console.log(
      `[Messaging] Agent ${args.fromAgentId} sent ${args.messageType} message to ${args.toAgentId || 'all'}`
    );

    return { messageId, success: true };
  },
});

/**
 * Mark a message as read
 */
export const markMessageAsRead = internalMutation({
  args: {
    messageId: v.id('agentMessages'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isRead: true,
    });

    return { success: true };
  },
});

/**
 * Mark multiple messages as read
 */
export const markMessagesAsRead = internalMutation({
  args: {
    messageIds: v.array(v.id('agentMessages')),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.messageIds.map((messageId) =>
        ctx.db.patch(messageId, {
          isRead: true,
        })
      )
    );

    return { success: true, count: args.messageIds.length };
  },
});

/**
 * Get agent's inbox (unread messages)
 */
export const getAgentInbox = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
    limit: v.optional(v.number()),
    includeRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const includeRead = args.includeRead || false;

    // Query messages where:
    // - toAgentId matches (direct message)
    // - OR toAgentId is null (broadcast)
    let query = ctx.db
      .query('agentMessages')
      .withIndex('by_recipient', (q) =>
        q.eq('worldId', args.worldId).eq('toAgentId', args.agentId)
      )
      .order('desc');

    const directMessages = await query.take(limit * 2); // Overfetch

    // Also get broadcast messages
    let broadcastQuery = ctx.db
      .query('agentMessages')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId))
      .filter((q) => q.eq(q.field('toAgentId'), undefined))
      .order('desc');

    const broadcastMessages = await broadcastQuery.take(limit);

    // Combine and sort
    const allMessages = [...directMessages, ...broadcastMessages].sort(
      (a, b) => b.sentAt - a.sentAt
    );

    // Filter by read status if needed
    const filteredMessages = includeRead
      ? allMessages
      : allMessages.filter((m) => !m.isRead);

    // Take only what we need
    return filteredMessages.slice(0, limit);
  },
});

/**
 * Get all messages in a thread
 */
export const getThreadMessages = internalQuery({
  args: {
    worldId: v.id('worlds'),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('agentMessages')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId))
      .filter((q) => q.eq(q.field('threadId'), args.threadId))
      .order('asc') // Chronological order for threads
      .collect();

    return messages;
  },
});

/**
 * Get conversation between two agents
 */
export const getConversationBetween = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId1: playerId,
    agentId2: playerId,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get all messages in world
    const allMessages = await ctx.db
      .query('agentMessages')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId))
      .order('desc')
      .take(limit * 3); // Overfetch

    // Filter for messages between these two agents
    const conversationMessages = allMessages.filter(
      (m) =>
        (m.fromAgentId === args.agentId1 && m.toAgentId === args.agentId2) ||
        (m.fromAgentId === args.agentId2 && m.toAgentId === args.agentId1)
    );

    return conversationMessages.slice(0, limit);
  },
});

/**
 * Delete old read messages (cleanup)
 */
export const deleteOldMessages = internalMutation({
  args: {
    worldId: v.id('worlds'),
    olderThanMs: v.number(), // Delete messages older than this
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanMs;

    const oldMessages = await ctx.db
      .query('agentMessages')
      .withIndex('by_world', (q) => q.eq('worldId', args.worldId))
      .filter((q) =>
        q.and(q.eq(q.field('isRead'), true), q.lt(q.field('sentAt'), cutoffTime))
      )
      .collect();

    await Promise.all(oldMessages.map((m) => ctx.db.delete(m._id)));

    console.log(`[Messaging] Deleted ${oldMessages.length} old messages`);

    return { deleted: oldMessages.length };
  },
});

/**
 * Get message statistics for an agent
 */
export const getMessageStats = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId: playerId,
  },
  handler: async (ctx, args) => {
    // Get all messages for this agent
    const directMessages = await ctx.db
      .query('agentMessages')
      .withIndex('by_recipient', (q) =>
        q.eq('worldId', args.worldId).eq('toAgentId', args.agentId)
      )
      .collect();

    const sentMessages = await ctx.db
      .query('agentMessages')
      .withIndex('by_sender', (q) =>
        q.eq('worldId', args.worldId).eq('fromAgentId', args.agentId)
      )
      .collect();

    const unreadCount = directMessages.filter((m) => !m.isRead).length;
    const totalReceived = directMessages.length;
    const totalSent = sentMessages.length;

    // Count by type
    const byType = {
      direct: directMessages.filter((m) => m.messageType === 'direct').length,
      broadcast: directMessages.filter((m) => m.messageType === 'broadcast').length,
      delegation: directMessages.filter((m) => m.messageType === 'delegation').length,
      help_request: directMessages.filter((m) => m.messageType === 'help_request').length,
    };

    return {
      unreadCount,
      totalReceived,
      totalSent,
      byType,
    };
  },
});

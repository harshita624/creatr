import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export const getMyNotifications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .order("desc")
      .take(args.limit || 30);

    return Promise.all(
      notifications.map(async (n) => {
        const actor = n.actorId ? await ctx.db.get(n.actorId) : null;
        const post  = n.postId  ? await ctx.db.get(n.postId)  : null;
        return {
          ...n,
          actor: actor
            ? { _id: actor._id, name: actor.name, username: actor.username, imageUrl: actor.imageUrl }
            : null,
          post: post
            ? { _id: post._id, title: post.title, contentType: post.contentType }
            : null,
        };
      })
    );
  },
});

export const getUnreadCount = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_read", (q) =>
        q.eq("recipientId", user._id).eq("read", false)
      )
      .collect();
    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const n = await ctx.db.get(args.notificationId);
    if (!n || n.recipientId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_read", (q) =>
        q.eq("recipientId", user._id).eq("read", false)
      )
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
    return unread.length;
  },
});

// Called internally by likes/comments/follows mutations
export const createNotification = mutation({
  args: {
    recipientId: v.id("users"),
    actorId: v.optional(v.id("users")),
    type: v.union(
      v.literal("like"),
      v.literal("comment"),
      v.literal("follow"),
      v.literal("mention"),
      v.literal("story_view")
    ),
    postId:    v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    // Don't notify yourself
    if (args.actorId && args.actorId === args.recipientId) return null;

    return ctx.db.insert("notifications", {
      recipientId: args.recipientId,
      actorId:     args.actorId,
      type:        args.type,
      postId:      args.postId,
      commentId:   args.commentId,
      read:        false,
      createdAt:   Date.now(),
    });
  },
});
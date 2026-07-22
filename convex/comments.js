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

export const addComment = mutation({
  args: {
    postId:  v.id("posts"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be logged in to comment");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const post = await ctx.db.get(args.postId);
    if (!post || post.status !== "published") throw new Error("Post not found or not published");

    if (!args.content.trim() || args.content.length > 1000)
      throw new Error("Comment must be between 1 and 1000 characters");

    const commentId = await ctx.db.insert("comments", {
      postId:      args.postId,
      authorId:    user._id,
      authorName:  user.name,
      authorEmail: user.email,
      content:     args.content.trim(),
      status:      "approved",
      createdAt:   Date.now(),
    });

    // Update comment count
    await ctx.db.patch(args.postId, {
      commentCount: (post.commentCount || 0) + 1,
    });

    // Notify post author (not yourself)
    if (post.authorId !== user._id) {
      await ctx.db.insert("notifications", {
        recipientId: post.authorId,
        actorId:     user._id,
        type:        "comment",
        postId:      args.postId,
        commentId,
        read:        false,
        createdAt:   Date.now(),
      });
    }

    return commentId;
  },
});

export const getPostComments = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .filter((q) =>
        q.and(
          q.eq(q.field("postId"),  args.postId),
          q.eq(q.field("status"),  "approved")
        )
      )
      .order("asc")
      .collect();

    const withUsers = await Promise.all(
      comments.map(async (c) => {
        const u = await ctx.db.get(c.authorId);
        return {
          ...c,
          author: u
            ? { _id: u._id, name: u.name, username: u.username, imageUrl: u.imageUrl }
            : null,
        };
      })
    );
    return withUsers.filter((c) => c.author !== null);
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const post = await ctx.db.get(comment.postId);
    if (!post) throw new Error("Post not found");

    const canDelete =
      comment.authorId === user._id || post.authorId === user._id;
    if (!canDelete) throw new Error("Not authorized");

    await ctx.db.delete(args.commentId);

    // Decrement count
    await ctx.db.patch(comment.postId, {
      commentCount: Math.max(0, (post.commentCount || 0) - 1),
    });

    return { success: true };
  },
});
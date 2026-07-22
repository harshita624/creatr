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

export const toggleBookmark = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Must be logged in to save posts");

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", user._id).eq("postId", args.postId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }

    await ctx.db.insert("bookmarks", {
      userId: user._id,
      postId: args.postId,
      createdAt: Date.now(),
    });
    return { saved: true };
  },
});

export const isBookmarked = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", user._id).eq("postId", args.postId)
      )
      .unique();

    return !!existing;
  },
});

export const getMyBookmarks = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const saves = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const posts = await Promise.all(
      saves.map(async (save) => {
        const post = await ctx.db.get(save.postId);
        if (!post || post.status !== "published") return null;
        const author = await ctx.db.get(post.authorId);
        return {
          ...post,
          savedAt: save.createdAt,
          author: author
            ? { _id: author._id, name: author.name, username: author.username, imageUrl: author.imageUrl }
            : null,
        };
      })
    );

    return posts.filter(Boolean);
  },
});
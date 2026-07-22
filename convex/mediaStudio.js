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

async function assertPostAccess(ctx, postId) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");

  const post = await ctx.db.get(postId);
  if (!post || post.authorId !== user._id) throw new Error("Post not found");

  return { user, post };
}

export const getForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const post = await ctx.db.get(args.postId);
    if (!post || post.authorId !== user._id) return null;

    return ctx.db
      .query("mediaStudio")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    postId: v.id("posts"),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
    chapters: v.optional(
      v.array(v.object({ time: v.number(), label: v.string() }))
    ),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await assertPostAccess(ctx, args.postId);

    const existing = await ctx.db
      .query("mediaStudio")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .unique();

    const now = Date.now();
    const patch = { updatedAt: now };
    if (args.trimStart !== undefined) patch.trimStart = args.trimStart;
    if (args.trimEnd !== undefined) patch.trimEnd = args.trimEnd;
    if (args.chapters !== undefined) patch.chapters = args.chapters;
    if (args.thumbnailUrl !== undefined) patch.thumbnailUrl = args.thumbnailUrl;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return ctx.db.insert("mediaStudio", {
      ownerId: user._id,
      postId: args.postId,
      trimStart: args.trimStart,
      trimEnd: args.trimEnd,
      chapters: args.chapters || [],
      thumbnailUrl: args.thumbnailUrl,
      createdAt: now,
      updatedAt: now,
    });
  },
});
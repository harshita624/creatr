import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export const createStory = mutation({
  args: {
    mediaUrl: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const now = Date.now();
    return ctx.db.insert("stories", {
      ownerId: user._id,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType,
      caption: args.caption,
      viewerIds: [],
      expiresAt: now + STORY_TTL_MS,
      createdAt: now,
    });
  },
});

export const listActiveStories = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const now = Date.now();

    const allStories = await ctx.db
      .query("stories")
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .order("desc")
      .collect();

    const byOwner = {};
    for (const story of allStories) {
      if (!byOwner[story.ownerId]) byOwner[story.ownerId] = [];
      byOwner[story.ownerId].push(story);
    }

    let currentUserId = null;
    if (identity) {
      const me = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      currentUserId = me?._id;
    }

    const groups = await Promise.all(
      Object.entries(byOwner).map(async ([ownerId, stories]) => {
        const owner = await ctx.db.get(ownerId);
        const hasUnseen = currentUserId
          ? stories.some((s) => !s.viewerIds.includes(currentUserId))
          : true;
        return {
          ownerId,
          owner: owner
            ? { name: owner.name, username: owner.username, imageUrl: owner.imageUrl }
            : null,
          stories: stories.map((s) => ({
            _id: s._id,
            mediaUrl: s.mediaUrl,
            mediaType: s.mediaType,
            caption: s.caption,
            viewerCount: s.viewerIds.length,
            createdAt: s.createdAt,
          })),
          hasUnseen,
          count: stories.length,
        };
      })
    );

    return groups
      .filter((g) => g.owner !== null)
      .sort((a, b) => {
        if (a.ownerId === currentUserId) return -1;
        if (b.ownerId === currentUserId) return 1;
        if (a.hasUnseen && !b.hasUnseen) return -1;
        if (!a.hasUnseen && b.hasUnseen) return 1;
        return 0;
      });
  },
});

export const viewStory = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    const story = await ctx.db.get(args.storyId);
    if (!story || story.viewerIds.includes(user._id)) return;
    await ctx.db.patch(args.storyId, {
      viewerIds: [...story.viewerIds, user._id],
    });
  },
});

export const deleteStory = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const story = await ctx.db.get(args.storyId);
    if (!story || story.ownerId !== user._id) throw new Error("Story not found");
    await ctx.db.delete(args.storyId);
    return { success: true };
  },
});
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

async function assertPostOwner(ctx, postId) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");

  const post = await ctx.db.get(postId);
  if (!post || post.authorId !== user._id) throw new Error("Post not found");
  if ((post.contentType || "article") !== "livestream") {
    throw new Error("This isn't a livestream post");
  }

  return { user, post };
}

// Owner-only — used by the broadcaster studio.
export const getSessionForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const post = await ctx.db.get(args.postId);
    if (!post || post.authorId !== user._id) return null;

    const sessions = await ctx.db
      .query("livestreamSessions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(1);

    return sessions[0] || null;
  },
});

// Public — lets any viewer page check live status without owning the post.
export const getPublicSessionForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("livestreamSessions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(1);

    const session = sessions[0];
    if (!session) return null;

    return {
      status: session.status,
      roomName: session.roomName,
      startedAt: session.startedAt,
    };
  },
});

export const goLive = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const { user } = await assertPostOwner(ctx, args.postId);
    const now = Date.now();

    const existing = await ctx.db
      .query("livestreamSessions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(1);

    const roomName = existing[0]?.roomName || `live-${args.postId}`;

    if (existing[0] && existing[0].status !== "ended") {
      await ctx.db.patch(existing[0]._id, {
        status: "live",
        startedAt: existing[0].startedAt || now,
        updatedAt: now,
      });
      return { sessionId: existing[0]._id, roomName };
    }

    const sessionId = await ctx.db.insert("livestreamSessions", {
      ownerId: user._id,
      postId: args.postId,
      roomName,
      status: "live",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { sessionId, roomName };
  },
});

export const endStream = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await assertPostOwner(ctx, args.postId);

    const sessions = await ctx.db
      .query("livestreamSessions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(1);

    const session = sessions[0];
    if (!session) return { success: false };

    await ctx.db.patch(session._id, {
      status: "ended",
      endedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const recordPeakViewers = mutation({
  args: { postId: v.id("posts"), viewerCount: v.number() },
  handler: async (ctx, args) => {
    await assertPostOwner(ctx, args.postId);

    const sessions = await ctx.db
      .query("livestreamSessions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(1);

    const session = sessions[0];
    if (!session) return;

    if (args.viewerCount > (session.peakViewers || 0)) {
      await ctx.db.patch(session._id, {
        peakViewers: args.viewerCount,
        updatedAt: Date.now(),
      });
    }
  },
});

// Public — ready to power a "Live now" rail on the feed once you build it.
export const listActiveLivestreams = query({
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("livestreamSessions")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .order("desc")
      .take(20);

    return Promise.all(
      sessions.map(async (session) => {
        const post = await ctx.db.get(session.postId);
        const author = post ? await ctx.db.get(post.authorId) : null;

        return {
          postId: session.postId,
          title: post?.title,
          startedAt: session.startedAt,
          author: author
            ? { username: author.username, name: author.name, imageUrl: author.imageUrl }
            : null,
        };
      })
    );
  },
});
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Toggle like on a post
export const toggleLike = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.optional(v.id("users")), // Optional for anonymous likes
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);

    if (!post || post.status !== "published") {
      throw new Error("Post not found or not published");
    }

    let userId = args.userId;

    // If no userId provided, try to get from auth
    if (!userId) {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        const user = await ctx.db
          .query("users")
          .filter((q) =>
            q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier)
          )
          .unique();
        userId = user?._id;
      }
    }

    // Must be authenticated to like
    if (!userId) {
      throw new Error("Must be logged in to like posts");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .filter((q) =>
        q.and(
          q.eq(q.field("postId"), args.postId),
          q.eq(q.field("userId"), userId)
        )
      )
      .unique();

    if (existingLike) {
      // Unlike - remove the like
      await ctx.db.delete(existingLike._id);

      // Decrement like count
      await ctx.db.patch(args.postId, {
        likeCount: Math.max(0, post.likeCount - 1),
      });

      return { liked: false, likeCount: Math.max(0, post.likeCount - 1) };
    } else {
      // Like - add the like
      await ctx.db.insert("likes", {
        postId: args.postId,
        userId: userId,
        createdAt: Date.now(),
      });

      // Increment like count
      await ctx.db.patch(args.postId, {
        likeCount: post.likeCount + 1,
      });

      return { liked: true, likeCount: post.likeCount + 1 };
    }
  },
});

// Check if user has liked a post
export const hasUserLiked = query({
  args: {
    postId: v.id("posts"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let userId = args.userId;

    // If no userId provided, try to get from auth
    if (!userId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return false;
      }

      const user = await ctx.db
        .query("users")
        .filter((q) =>
          q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier)
        )
        .unique();

      if (!user) {
        return false;
      }

      userId = user._id;
    }

    const like = await ctx.db
      .query("likes")
      .filter((q) =>
        q.and(
          q.eq(q.field("postId"), args.postId),
          q.eq(q.field("userId"), userId)
        )
      )
      .unique();

    return !!like;
  },
});

// Get all likes for a post
export const getPostLikes = query({
  args: {
    postId: v.id("posts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const likes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("postId"), args.postId))
      .order("desc")
      .take(limit);

    // Get user details for each like
    const likesWithUsers = await Promise.all(
      likes.map(async (like) => {
        const user = await ctx.db.get(like.userId);
        return {
          _id: like._id,
          createdAt: like.createdAt,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                username: user.username,
                imageUrl: user.imageUrl,
              }
            : null,
        };
      })
    );

    return likesWithUsers.filter((like) => like.user !== null);
  },
});

// Get all posts liked by a user
export const getUserLikedPosts = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let userId = args.userId;

    // If no userId provided, try to get from auth
    if (!userId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return [];
      }

      const user = await ctx.db
        .query("users")
        .filter((q) =>
          q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier)
        )
        .unique();

      if (!user) {
        return [];
      }

      userId = user._id;
    }

    const limit = args.limit || 20;

    const likes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(limit);

    // Get post details for each like
    const likedPosts = await Promise.all(
      likes.map(async (like) => {
        const post = await ctx.db.get(like.postId);
        if (!post || post.status !== "published") {
          return null;
        }

        // Get author details
        const author = await ctx.db.get(post.authorId);

        return {
          ...post,
          likedAt: like.createdAt,
          author: author
            ? {
                _id: author._id,
                name: author.name,
                username: author.username,
                imageUrl: author.imageUrl,
              }
            : null,
        };
      })
    );

    return likedPosts.filter((post) => post !== null);
  },
});


async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}





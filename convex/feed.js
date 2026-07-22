import { v } from "convex/values";
import { query } from "./_generated/server";

// Enhanced feed with personalized content
export const getFeed = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const cursor = args.cursor || 0;
    const identity = await ctx.auth.getUserIdentity();

    let currentUser = null;
    let followedUserIds = [];

    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .filter((q) =>
          q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier)
        )
        .unique();

      if (currentUser) {
        const follows = await ctx.db
          .query("follows")
          .filter((q) => q.eq(q.field("followerId"), currentUser._id))
          .collect();
        followedUserIds = follows.map((follow) => follow.followingId);
      }
    }

    // Get posts from followed users first, then others
    let allPosts = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("status"), "published"))
      .order("desc")
      .collect();

    // Separate followed and non-followed posts
    const followedPosts = allPosts.filter((post) =>
      followedUserIds.includes(post.authorId)
    );
    const otherPosts = allPosts.filter(
      (post) => !followedUserIds.includes(post.authorId)
    );

    // Interleave posts (2 followed, 1 other) for better experience
    const interleavedPosts = [];
    let followedIdx = 0;
    let otherIdx = 0;

    while (
      followedIdx < followedPosts.length ||
      otherIdx < otherPosts.length
    ) {
      // Add 2 followed posts
      for (let i = 0; i < 2 && followedIdx < followedPosts.length; i++) {
        interleavedPosts.push(followedPosts[followedIdx++]);
      }
      // Add 1 other post
      if (otherIdx < otherPosts.length) {
        interleavedPosts.push(otherPosts[otherIdx++]);
      }
    }

    // Apply pagination
    const paginatedPosts = interleavedPosts.slice(cursor, cursor + limit + 1);
    const hasMore = paginatedPosts.length > limit;
    const feedPosts = hasMore ? paginatedPosts.slice(0, limit) : paginatedPosts;

    // Get author info and user interactions
    const postsWithAuthors = await Promise.all(
      feedPosts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        
        // Check if current user liked this post
        let isLiked = false;
        if (currentUser) {
          const like = await ctx.db
            .query("likes")
            .filter((q) =>
              q.and(
                q.eq(q.field("postId"), post._id),
                q.eq(q.field("userId"), currentUser._id)
              )
            )
            .unique();
          isLiked = !!like;
        }

        // Check if user follows the author
        const isFollowing = followedUserIds.includes(post.authorId);

        return {
          ...post,
          author: author
            ? {
                _id: author._id,
                name: author.name,
                username: author.username,
                imageUrl: author.imageUrl,
              }
            : null,
          isLiked,
          isFollowing,
        };
      })
    );

    return {
      posts: postsWithAuthors.filter((post) => post.author !== null),
      hasMore,
      nextCursor: hasMore ? cursor + limit : null,
    };
  },
});

// Enhanced suggested users with better ranking
export const getSuggestedUsers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const limit = args.limit || 10;

    let currentUser = null;
    let followedUserIds = [];

    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .filter((q) =>
          q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier)
        )
        .unique();

      if (currentUser) {
        const follows = await ctx.db
          .query("follows")
          .filter((q) => q.eq(q.field("followerId"), currentUser._id))
          .collect();
        followedUserIds = follows.map((follow) => follow.followingId);
      }
    }

    const allUsers = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("_id"), currentUser?._id || ""))
      .collect();

    const suggestions = await Promise.all(
      allUsers
        .filter((user) => !followedUserIds.includes(user._id) && user.username)
        .map(async (user) => {
          // Get recent posts (last 30 days)
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const posts = await ctx.db
            .query("posts")
            .filter((q) =>
              q.and(
                q.eq(q.field("authorId"), user._id),
                q.eq(q.field("status"), "published"),
                q.gte(q.field("publishedAt"), thirtyDaysAgo)
              )
            )
            .order("desc")
            .take(10);

          // Get follower stats
          const followers = await ctx.db
            .query("follows")
            .filter((q) => q.eq(q.field("followingId"), user._id))
            .collect();

          // Calculate metrics
          const totalViews = posts.reduce((sum, p) => sum + p.viewCount, 0);
          const totalLikes = posts.reduce((sum, p) => sum + p.likeCount, 0);
          const avgEngagement = posts.length > 0 
            ? (totalViews + totalLikes * 3) / posts.length 
            : 0;

          // Engagement score with recency boost
          const daysSinceLastPost = posts.length > 0
            ? (Date.now() - posts[0].publishedAt) / (24 * 60 * 60 * 1000)
            : 999;
          const recencyMultiplier = Math.max(1, 8 - daysSinceLastPost);
          
          const engagementScore = 
            avgEngagement * recencyMultiplier + 
            followers.length * 15 + 
            posts.length * 5;

          return {
            _id: user._id,
            name: user.name,
            username: user.username,
            imageUrl: user.imageUrl,
            bio: user.bio || "",
            followerCount: followers.length,
            postCount: posts.length,
            engagementScore,
            lastPostAt: posts.length > 0 ? posts[0].publishedAt : null,
            recentPosts: posts.slice(0, 2).map((post) => ({
              _id: post._id,
              title: post.title,
              viewCount: post.viewCount,
              likeCount: post.likeCount,
              publishedAt: post.publishedAt,
            })),
          };
        })
    );

    // Enhanced ranking algorithm
    const rankedSuggestions = suggestions
      .filter((user) => user.postCount > 0) // Only active users
      .sort((a, b) => {
        // Boost users who posted in last 3 days
        const aVeryRecent = a.lastPostAt > Date.now() - 3 * 24 * 60 * 60 * 1000;
        const bVeryRecent = b.lastPostAt > Date.now() - 3 * 24 * 60 * 60 * 1000;
        
        if (aVeryRecent && !bVeryRecent) return -1;
        if (!aVeryRecent && bVeryRecent) return 1;

        return b.engagementScore - a.engagementScore;
      })
      .slice(0, limit);

    return rankedSuggestions;
  },
});

// Enhanced trending with categories
export const getTrendingPosts = query({
  args: { 
    limit: v.optional(v.number()),
    timeframe: v.optional(v.string()), // "day", "week", "month", "all"
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const timeframe = args.timeframe || "week";
    
    // Calculate time cutoff
    const timeCutoffs = {
      day: Date.now() - 24 * 60 * 60 * 1000,
      week: Date.now() - 7 * 24 * 60 * 60 * 1000,
      month: Date.now() - 30 * 24 * 60 * 60 * 1000,
      all: 0,
    };
    const cutoff = timeCutoffs[timeframe] || timeCutoffs.week;

    // Get posts
    let recentPosts = await ctx.db
      .query("posts")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "published"),
          q.gte(q.field("publishedAt"), cutoff)
        )
      )
      .collect();

    // Filter by category if provided
    if (args.category) {
      recentPosts = recentPosts.filter((post) => post.category === args.category);
    }

    // Calculate trending score with time decay
    const trendingPosts = recentPosts
      .map((post) => {
        const ageInDays = (Date.now() - post.publishedAt) / (24 * 60 * 60 * 1000);
        const timeDecay = Math.exp(-ageInDays / 3); // Decay factor
        
        const engagementScore = 
          post.viewCount + 
          post.likeCount * 5;
        
        const trendingScore = engagementScore * timeDecay;

        return {
          ...post,
          trendingScore,
          engagementRate: post.viewCount > 0 
            ? (post.likeCount / post.viewCount) * 100 
            : 0,
        };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    // Add author information
    const postsWithAuthors = await Promise.all(
      trendingPosts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return {
          ...post,
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

    return postsWithAuthors.filter((post) => post.author !== null);
  },
});

// Get trending topics/tags
export const getTrendingTopics = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Get recent published posts
    const recentPosts = await ctx.db
      .query("posts")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "published"),
          q.gte(q.field("publishedAt"), weekAgo)
        )
      )
      .collect();

    // Count tag occurrences with engagement
    const tagStats = {};
    
    recentPosts.forEach((post) => {
      if (post.tags && post.tags.length > 0) {
        post.tags.forEach((tag) => {
          if (!tagStats[tag]) {
            tagStats[tag] = {
              tag,
              count: 0,
              totalViews: 0,
              totalLikes: 0,
              posts: [],
            };
          }
          tagStats[tag].count++;
          tagStats[tag].totalViews += post.viewCount;
          tagStats[tag].totalLikes += post.likeCount;
          tagStats[tag].posts.push({
            _id: post._id,
            title: post.title,
            viewCount: post.viewCount,
          });
        });
      }
    });

    // Calculate trending score and sort
    const trendingTopics = Object.values(tagStats)
      .map((stat) => ({
        ...stat,
        trendingScore: stat.count * 10 + stat.totalViews + stat.totalLikes * 3,
        posts: stat.posts.slice(0, 3), // Top 3 posts per tag
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    return trendingTopics;
  },
});

// Get personalized recommendations based on user activity
export const getRecommendations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      // Return popular posts for non-authenticated users
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .filter((q) =>
        q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier)
      )
      .unique();

    if (!currentUser) return [];

    // Get user's liked posts to understand preferences
    const userLikes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("userId"), currentUser._id))
      .collect();

    const likedPostIds = userLikes.map((like) => like.postId);
    const likedPosts = await Promise.all(
      likedPostIds.map((id) => ctx.db.get(id))
    );

    // Extract categories and tags from liked posts
    const preferredCategories = new Set();
    const preferredTags = new Set();

    likedPosts.forEach((post) => {
      if (post?.category) preferredCategories.add(post.category);
      if (post?.tags) post.tags.forEach((tag) => preferredTags.add(tag));
    });

    // Get posts matching user preferences
    const allPosts = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("status"), "published"))
      .order("desc")
      .take(100);

    // Score posts based on preference match
    const scoredPosts = allPosts
      .filter((post) => !likedPostIds.includes(post._id)) // Exclude already liked
      .map((post) => {
        let score = 0;
        
        // Category match
        if (preferredCategories.has(post.category)) score += 50;
        
        // Tag matches
        if (post.tags) {
          const matchingTags = post.tags.filter((tag) =>
            preferredTags.has(tag)
          ).length;
          score += matchingTags * 20;
        }
        
        // Engagement score
        score += post.viewCount * 0.1 + post.likeCount * 2;
        
        // Recency bonus
        const daysOld = (Date.now() - post.publishedAt) / (24 * 60 * 60 * 1000);
        if (daysOld < 3) score += 30;
        else if (daysOld < 7) score += 15;

        return { ...post, recommendationScore: score };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    // Add author info
    const postsWithAuthors = await Promise.all(
      scoredPosts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return {
          ...post,
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

    return postsWithAuthors.filter((post) => post.author !== null);
  },
});
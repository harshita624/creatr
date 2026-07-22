// convex/trends.js
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

// Query to get trending data
export const getTrends = query({
  args: {},
  handler: async (ctx) => {
    const trends = await ctx.db
      .query("trends")
      .order("desc")
      .first();
    
    return trends || null;
  },
});

// Query to get trend history
export const getTrendHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const trends = await ctx.db
      .query("trends")
      .order("desc")
      .take(limit);
    
    return trends;
  },
});

// Mutation to store trend analysis results
export const storeTrends = mutation({
  args: {
    trending_hashtags: v.array(v.any()),
    trending_keywords: v.array(v.any()),
    topics: v.array(v.any()),
    total_posts_analyzed: v.number(),
  },
  handler: async (ctx, args) => {
    const trendId = await ctx.db.insert("trends", {
      ...args,
      analyzedAt: Date.now(),
    });
    
    return trendId;
  },
});

// Action to analyze trends (calls ML backend)
export const analyzeTrends = action({
  args: {
    timeframe: v.optional(v.string()), // "day", "week", "month"
  },
  handler: async (ctx, args) => {
    const timeframe = args.timeframe || "week";
    
    // Calculate time window
    const now = Date.now();
    const timeWindows = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    const startTime = now - timeWindows[timeframe];
    
    // Get recent posts from Convex
    const posts = await ctx.runQuery(api.posts.getRecentPosts, {
      startTime,
      limit: 1000,
    });
    
    if (!posts || posts.length < 3) {
      return { error: "Not enough posts to analyze" };
    }
    
    // Call ML backend through Next.js API
    const ML_API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${ML_API_URL}/api/ml/analyze-trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ posts }),
      });
      
      if (!response.ok) {
        throw new Error('ML analysis failed');
      }
      
      const trendData = await response.json();
      
      // Store results in Convex
      await ctx.runMutation(api.trends.storeTrends, trendData);
      
      return trendData;
    } catch (error) {
      console.error('Trend analysis error:', error);
      return { error: error.message };
    }
  },
});

// Additional query needed for analyzeTrends action
// convex/posts.js (add this to your existing posts.js file)
export const getRecentPosts = query({
  args: {
    startTime: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    
    const posts = await ctx.db
      .query("posts")
      .filter((q) => q.gte(q.field("_creationTime"), args.startTime))
      .order("desc")
      .take(limit);
    
    // Format posts for ML analysis
    return posts.map(post => ({
      content: post.content || "",
      title: post.title || "",
      likes: post.likes || 0,
      comments: post.commentCount || 0,
      shares: post.shares || 0,
      views: post.views || 0,
      createdAt: new Date(post._creationTime).toISOString(),
    }));
  },
});

// convex/schema.js (add this to your existing schema)
// Add this to your schema definition:
/*
trends: defineTable({
  trending_hashtags: v.array(v.object({
    tag: v.string(),
    count: v.number(),
    engagement: v.number(),
    trend_score: v.number(),
  })),
  trending_keywords: v.array(v.object({
    keyword: v.string(),
    count: v.number(),
    engagement: v.number(),
    trend_score: v.number(),
  })),
  topics: v.array(v.object({
    topic_id: v.number(),
    keywords: v.array(v.string()),
    post_count: v.number(),
  })),
  total_posts_analyzed: v.number(),
  analyzedAt: v.number(),
}),
*/
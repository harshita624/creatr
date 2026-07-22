import { v } from "convex/values";
import { query } from "./_generated/server";

/* ── Safe auth helper — never throws, just returns null ─────────── */
async function getCurrentUser(ctx) {
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  } catch {
    return null;
  }
}

/* ── Analytics ───────────────────────────────────────────────────── */
export const getAnalytics = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return {
      totalViews:     0,
      totalLikes:     0,
      totalFollowers: 0,
      totalPosts:     0,
      viewsGrowth:    0,
      likesGrowth:    0,
      commentsGrowth: 0,
      followersGrowth:0,
    };

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();

    const publishedPosts = posts.filter((p) => p.status === "published");
    const totalViews     = posts.reduce((s, p) => s + (p.viewCount  || 0), 0);
    const totalLikes     = posts.reduce((s, p) => s + (p.likeCount  || 0), 0);

    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", user._id))
      .collect();

    // Simple growth placeholders — replace with real time-window math if needed
    return {
      totalViews,
      totalLikes,
      totalFollowers: followers.length,
      totalPosts:     publishedPosts.length,
      viewsGrowth:    totalViews     > 0 ? 12 : 0,
      likesGrowth:    totalLikes     > 0 ? 8  : 0,
      commentsGrowth: 15,
      followersGrowth:12,
    };
  },
});

/* ── Posts with analytics ────────────────────────────────────────── */
export const getPostsWithAnalytics = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .order("desc")
      .collect();

    return posts
      .filter((p) => p.status === "published")
      .slice(0, 10)
      .map((p) => ({
        _id:         p._id,
        title:       p.title,
        contentType: p.contentType || "article",
        viewCount:   p.viewCount   || 0,
        likeCount:   p.likeCount   || 0,
        commentCount:p.commentCount|| 0,
        publishedAt: p.publishedAt,
        status:      p.status,
        featuredImage:p.featuredImage,
      }));
  },
});

/* ── Daily views (30 days) ───────────────────────────────────────── */
export const getDailyViews = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    // Always return a 30-day skeleton so the chart never crashes
    const days = 30;
    const today = new Date();
    const skeleton = Array.from({ length: days }, (_, i) => {
      const d   = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { day, views: 0 };
    });

    if (!user) return skeleton;

    // Fetch all posts by this user to get their IDs
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();

    if (posts.length === 0) return skeleton;

    const postIds = new Set(posts.map((p) => p._id));

    // Fetch daily stats for those posts
    const allStats = await ctx.db.query("dailyStats").collect();
    const userStats= allStats.filter((s) => postIds.has(s.postId));

    // Build a map of date → total views
    const viewMap = {};
    for (const stat of userStats) {
      viewMap[stat.date] = (viewMap[stat.date] || 0) + (stat.views || 0);
    }

    // Fill the skeleton with real data
    return skeleton.map((slot) => {
      // slot.day is like "Jul 13"; convert back to YYYY-MM-DD key
      const d   = new Date(today);
      const idx = skeleton.indexOf(slot);
      d.setDate(today.getDate() - (days - 1 - idx));
      const y   = d.getFullYear();
      const m   = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;
      return { day: slot.day, views: viewMap[key] || 0 };
    });
  },
});

/* ── Recent activity ─────────────────────────────────────────────── */
export const getRecentActivity = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const activity = [];

    // Recent comments on user's posts
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();

    const postIds = posts.map((p) => p._id);

    for (const postId of postIds.slice(0, 5)) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_post", (q) => q.eq("postId", postId))
        .order("desc")
        .take(2);

      for (const c of comments) {
        const post = posts.find((p) => p._id === postId);
        activity.push({
          _id:         c._id,
          type:        "comment",
          message:     `New comment on "${post?.title || "your post"}"`,
          description: `"${c.content.slice(0, 60)}${c.content.length > 60 ? "…" : ""}"`,
          timeAgo:     timeAgo(c.createdAt),
          createdAt:   c.createdAt,
        });
      }
    }

    // Recent followers
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", user._id))
      .order("desc")
      .take(5);

    for (const f of follows) {
      const follower = await ctx.db.get(f.followerId);
      if (follower) {
        activity.push({
          _id:       f._id,
          type:      "follow",
          message:   `${follower.username || follower.name} started following you`,
          timeAgo:   timeAgo(f.createdAt),
          createdAt: f.createdAt,
        });
      }
    }

    // Recent post publishes
    const recentPublished = posts
      .filter((p) => p.status === "published" && p.publishedAt)
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
      .slice(0, 3);

    for (const p of recentPublished) {
      activity.push({
        _id:       p._id,
        type:      "publish",
        message:   `You published "${p.title || "Untitled"}"`,
        timeAgo:   timeAgo(p.publishedAt),
        createdAt: p.publishedAt || 0,
      });
    }

    // Sort by most recent and return top 10
    return activity
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  },
});

/* ── Helper ──────────────────────────────────────────────────────── */
function timeAgo(ts) {
  if (!ts) return "Recently";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs  = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
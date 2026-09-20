import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";

const SUPPORTED_TYPES = ["reel", "video", "podcast"];

async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

function buildCacheKey(post) {
  return [
    "media",
    post._id,
    post.contentType || "article",
    post.updatedAt || post.createdAt || 0,
    post.mediaUrl || "",
    post.title || "",
  ].join(":");
}

export const getLatestForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const post = await ctx.db.get(args.postId);
    if (!post || post.authorId !== user._id) return null;

    const results = await ctx.db
      .query("mediaIntelligence")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(1);

    return results[0] || null;
  },
});

export const getLatestJobForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const jobs = await ctx.db
      .query("aiJobs")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(1);

    const job = jobs[0];
    if (!job || job.ownerId !== user._id || job.kind !== "media_intelligence") {
      return null;
    }

    return job;
  },
});

export const enqueue = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post || post.authorId !== user._id) {
      throw new Error("Post not found");
    }

    const contentType = post.contentType || "article";
    if (!SUPPORTED_TYPES.includes(contentType)) {
      throw new Error("Media intelligence supports reels, videos, and podcasts");
    }

    const cacheKey = buildCacheKey(post);
    const cached = await ctx.db
      .query("mediaIntelligence")
      .withIndex("by_cache", (q) => q.eq("cacheKey", cacheKey))
      .first();

    if (cached) {
      return { jobId: cached.jobId, cached: true };
    }

    const activeJobs = await ctx.db
      .query("aiJobs")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(5);
    const existing = activeJobs.find(
      (job) =>
        job.kind === "media_intelligence" &&
        job.cacheKey === cacheKey &&
        ["queued", "processing"].includes(job.status)
    );

    if (existing) {
      return { jobId: existing._id, cached: false };
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("aiJobs", {
      ownerId: user._id,
      postId: args.postId,
      kind: "media_intelligence",
      status: "queued",
      progress: 5,
      cacheKey,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.mediaIntelligence.processJob, {
      jobId,
    });

    return { jobId, cached: false };
  },
});

export const updateSubtitles = mutation({
  args: {
    resultId: v.id("mediaIntelligence"),
    subtitles: v.array(v.object({
      start: v.number(),
      end: v.number(),
      text: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const result = await ctx.db.get(args.resultId);
    if (!result || result.ownerId !== user._id) {
      throw new Error("Media intelligence result not found");
    }

    await ctx.db.patch(args.resultId, {
      subtitles: args.subtitles,
      updatedAt: Date.now(),
    });

    return args.resultId;
  },
});

export const getJobPayload = internalQuery({
  args: { jobId: v.id("aiJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || !job.postId) return null;

    const post = await ctx.db.get(job.postId);
    if (!post) return null;

    return { job, post };
  },
});

export const setJobStatus = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update = {
      status: args.status,
      progress: args.progress,
      updatedAt: Date.now(),
      error: args.error,
    };

    if (args.status === "completed") {
      update.completedAt = Date.now();
    }

    await ctx.db.patch(args.jobId, update);
  },
});

export const storeResult = internalMutation({
  args: {
    jobId: v.id("aiJobs"),
    result: v.object({
      transcript: v.string(),
      subtitles: v.array(v.object({
        start: v.number(),
        end: v.number(),
        text: v.string(),
      })),
      highlights: v.array(v.object({
        title: v.string(),
        start: v.number(),
        end: v.number(),
        reason: v.string(),
      })),
      clips: v.array(v.object({
        title: v.string(),
        hook: v.string(),
        start: v.number(),
        end: v.number(),
        caption: v.string(),
      })),
      chapters: v.array(v.object({
        title: v.string(),
        start: v.number(),
        summary: v.string(),
      })),
      titleSuggestions: v.array(v.string()),
      thumbnailIdeas: v.array(v.object({
        title: v.string(),
        prompt: v.string(),
        overlayText: v.string(),
      })),
      summary: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || !job.postId) throw new Error("Job not found");

    const post = await ctx.db.get(job.postId);
    if (!post) throw new Error("Post not found");

    const now = Date.now();
    const existing = await ctx.db
      .query("mediaIntelligence")
      .withIndex("by_cache", (q) => q.eq("cacheKey", job.cacheKey))
      .first();

    const payload = {
      ownerId: job.ownerId,
      postId: job.postId,
      jobId: args.jobId,
      contentType: post.contentType,
      cacheKey: job.cacheKey,
      ...args.result,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("mediaIntelligence", {
      ...payload,
      createdAt: now,
    });
  },
});

export const processJob = action({
  args: { jobId: v.id("aiJobs") },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.mediaIntelligence.setJobStatus, {
      jobId: args.jobId,
      status: "processing",
      progress: 20,
    });

    try {
      const payload = await ctx.runQuery(internal.mediaIntelligence.getJobPayload, {
        jobId: args.jobId,
      });
      if (!payload) throw new Error("Job payload missing");

      // FIX: this action runs on Convex's own infrastructure, not your
      // Next.js server -- "localhost" here can never reach your app.
      // CREATEK_APP_URL must be set in THIS Convex deployment's own
      // environment variables (separate system from Vercel/.env -- set via
      // `npx convex env set CREATEK_APP_URL https://your-app-domain.com`
      // or the Convex dashboard) to your app's real public URL. Failing
      // loudly here, instead of silently trying an unreachable localhost,
      // puts the real cause directly in the job's error field.
      const appUrl = process.env.CREATEK_APP_URL;
      if (!appUrl) {
        throw new Error(
          "CREATEK_APP_URL is not set in this Convex deployment's environment variables. " +
          "Set it to your app's public URL (npx convex env set CREATEK_APP_URL https://your-app.vercel.app), then retry."
        );
      }

      const response = await fetch(`${appUrl}/api/ai/media-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: payload.post,
          cacheKey: payload.job.cacheKey,
        }),
      });

      await ctx.runMutation(internal.mediaIntelligence.setJobStatus, {
        jobId: args.jobId,
        status: "processing",
        progress: 70,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw new Error(`Media intelligence failed: ${response.status} ${bodyText.slice(0, 200)}`);
      }

      const data = await response.json();
      await ctx.runMutation(internal.mediaIntelligence.storeResult, {
        jobId: args.jobId,
        result: data.result,
      });

      await ctx.runMutation(internal.mediaIntelligence.setJobStatus, {
        jobId: args.jobId,
        status: "completed",
        progress: 100,
      });
    } catch (error) {
      await ctx.runMutation(internal.mediaIntelligence.setJobStatus, {
        jobId: args.jobId,
        status: "failed",
        progress: 100,
        error: error.message || "Media intelligence failed",
      });
    }
  },
});
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    featuredImage: v.optional(v.string()),
    contentType: v.optional(v.union(
      v.literal("article"),
      v.literal("reel"),
      v.literal("video"),
      v.literal("livestream"),
      v.literal("podcast"),
      v.literal("carousel")
    )),
    mediaUrl: v.optional(v.string()),
    monetization: v.optional(v.union(
      v.literal("free"),
      v.literal("members"),
      v.literal("paid")
    )),
    priceCents: v.optional(v.number()),
    allowComments: v.optional(v.boolean()),
    postMeta: v.optional(v.object({
      seoKeywords: v.optional(v.string()),
      visibility: v.optional(v.string()),
      caption: v.optional(v.string()),
      location: v.optional(v.string()),
      music: v.optional(v.string()),
      chapters: v.optional(v.string()),
      playlist: v.optional(v.string()),
      episodeNumber: v.optional(v.string()),
      showNotes: v.optional(v.string()),
      ctaSlide: v.optional(v.string()),
      collaborators: v.optional(v.string()),
      readinessNotes: v.optional(v.string()),
    })),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const draftContentType = args.contentType || "article";
    const existingDrafts = await ctx.db
      .query("posts")
      .withIndex("by_author_status", (q) =>
        q.eq("authorId", user._id).eq("status", "draft")
      )
      .collect();
    const existingDraft = existingDrafts.find(
      (post) => (post.contentType || "article") === draftContentType
    );

    const now = Date.now();

    if (args.status === "published" && existingDraft) {
      await ctx.db.patch(existingDraft._id, {
        title: args.title,
        content: args.content,
        status: "published",
        tags: args.tags || [],
        category: args.category || undefined,
        featuredImage: args.featuredImage || undefined,
        contentType: draftContentType,
        mediaUrl: args.mediaUrl || undefined,
        monetization: args.monetization || "free",
        priceCents: args.monetization === "paid" ? args.priceCents : undefined,
        allowComments: args.allowComments ?? true,
        postMeta: args.postMeta || undefined,
        updatedAt: now,
        publishedAt: now,
        scheduledFor: args.scheduledFor || undefined,
      });
      return existingDraft._id;
    }

    if (args.status === "draft" && existingDraft) {
      await ctx.db.patch(existingDraft._id, {
        title: args.title,
        content: args.content,
        tags: args.tags || [],
        category: args.category || undefined,
        featuredImage: args.featuredImage || undefined,
        contentType: draftContentType,
        mediaUrl: args.mediaUrl || undefined,
        monetization: args.monetization || "free",
        priceCents: args.monetization === "paid" ? args.priceCents : undefined,
        allowComments: args.allowComments ?? true,
        postMeta: args.postMeta || undefined,
        updatedAt: now,
        scheduledFor: args.scheduledFor || undefined,
      });
      return existingDraft._id;
    }

    const postId = await ctx.db.insert("posts", {
      title: args.title,
      content: args.content,
      status: args.status,
      authorId: user._id,
      tags: args.tags || [],
      category: args.category,
      featuredImage: args.featuredImage,
      contentType: draftContentType,
      mediaUrl: args.mediaUrl,
      monetization: args.monetization || "free",
      priceCents: args.monetization === "paid" ? args.priceCents : undefined,
      allowComments: args.allowComments ?? true,
      postMeta: args.postMeta,
      createdAt: now,
      updatedAt: now,
      publishedAt: args.status === "published" ? now : undefined,
      scheduledFor: args.scheduledFor,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
    });

    return postId;
  },
});

export const update = mutation({
  args: {
    id: v.id("posts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    featuredImage: v.optional(v.string()),
    contentType: v.optional(v.union(
      v.literal("article"),
      v.literal("reel"),
      v.literal("video"),
      v.literal("livestream"),
      v.literal("podcast"),
      v.literal("carousel")
    )),
    mediaUrl: v.optional(v.string()),
    monetization: v.optional(v.union(
      v.literal("free"),
      v.literal("members"),
      v.literal("paid")
    )),
    priceCents: v.optional(v.number()),
    allowComments: v.optional(v.boolean()),
    postMeta: v.optional(v.object({
      seoKeywords: v.optional(v.string()),
      visibility: v.optional(v.string()),
      caption: v.optional(v.string()),
      location: v.optional(v.string()),
      music: v.optional(v.string()),
      chapters: v.optional(v.string()),
      playlist: v.optional(v.string()),
      episodeNumber: v.optional(v.string()),
      showNotes: v.optional(v.string()),
      ctaSlide: v.optional(v.string()),
      collaborators: v.optional(v.string()),
      readinessNotes: v.optional(v.string()),
    })),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.authorId !== user._id) {
      throw new Error("Not authorized to update this post");
    }

    const now = Date.now();
    const updateData = {
      updatedAt: now,
    };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.content !== undefined) updateData.content = args.content;
    if (args.tags !== undefined) updateData.tags = args.tags;
    if (args.category !== undefined) updateData.category = args.category;
    if (args.featuredImage !== undefined) updateData.featuredImage = args.featuredImage;
    if (args.contentType !== undefined) updateData.contentType = args.contentType;
    if (args.mediaUrl !== undefined) updateData.mediaUrl = args.mediaUrl;
    if (args.monetization !== undefined) updateData.monetization = args.monetization;
    if (args.priceCents !== undefined) updateData.priceCents = args.priceCents;
    if (args.allowComments !== undefined) updateData.allowComments = args.allowComments;
    if (args.postMeta !== undefined) updateData.postMeta = args.postMeta;
    if (args.scheduledFor !== undefined) updateData.scheduledFor = args.scheduledFor;

    if (args.status !== undefined) {
      updateData.status = args.status;
      if (args.status === "published" && post.status === "draft") {
        updateData.publishedAt = now;
      }
    }

    await ctx.db.patch(args.id, updateData);
    return args.id;
  },
});

export const incrementViewCount = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    await ctx.db.patch(args.postId, {
      viewCount: (post.viewCount || 0) + 1,
    });

    return post.viewCount + 1;
  },
});

export const getUserDraft = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return null;
    }

    const drafts = await ctx.db
      .query("posts")
      .withIndex("by_author_status", (q) =>
        q.eq("authorId", user._id).eq("status", "draft")
      )
      .order("desc")
      .collect();

    return drafts[0] || null;
  },
});

export const getUserPosts = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    let postsQuery;

    if (args.status) {
      postsQuery = await ctx.db
        .query("posts")
        .withIndex("by_author_status", (q) =>
          q.eq("authorId", user._id).eq("status", args.status)
        )
        .order("desc")
        .collect();
    } else {
      postsQuery = await ctx.db
        .query("posts")
        .withIndex("by_author", (q) => q.eq("authorId", user._id))
        .order("desc")
        .collect();
    }

    return postsQuery.map((post) => ({
      ...post,
      username: user.username,
      commentCount: post.commentCount || 0,
    }));
  },
});

export const getById = query({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) return null;

    return {
      ...post,
      commentCount: post.commentCount || 0,
    };
  },
});

export const deletePost = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.authorId !== user._id) {
      throw new Error("Not authorized to delete this post");
    }

    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("postId"), args.id))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const likes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("postId"), args.id))
      .collect();

    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const STATUS = {
  inbox: v.literal("inbox"),
  planned: v.literal("planned"),
  in_progress: v.literal("in_progress"),
  ready: v.literal("ready"),
  archived: v.literal("archived"),
};

const statusValidator = v.union(
  STATUS.inbox,
  STATUS.planned,
  STATUS.in_progress,
  STATUS.ready,
  STATUS.archived
);

const contentTypeValidator = v.union(
  v.literal("article"),
  v.literal("reel"),
  v.literal("video"),
  v.literal("livestream"),
  v.literal("podcast"),
  v.literal("carousel")
);

async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

async function assertIdeaOwner(ctx, id) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");

  const idea = await ctx.db.get(id);
  if (!idea || idea.ownerId !== user._id) throw new Error("Idea not found");

  return { user, idea };
}

export const listIdeas = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return ctx.db
      .query("contentIdeas")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});

export const createIdea = mutation({
  args: {
    title: v.string(),
    notes: v.optional(v.string()),
    contentType: v.optional(contentTypeValidator),
    tags: v.optional(v.array(v.string())),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const title = args.title.trim();
    if (!title) throw new Error("Give the idea a title first");

    const existingInbox = await ctx.db
      .query("contentIdeas")
      .withIndex("by_owner_status", (q) => q.eq("ownerId", user._id).eq("status", "inbox"))
      .collect();

    const now = Date.now();
    return ctx.db.insert("contentIdeas", {
      ownerId: user._id,
      title,
      notes: args.notes || "",
      status: "inbox",
      contentType: args.contentType,
      tags: args.tags || [],
      targetDate: args.targetDate,
      order: existingInbox.length,
      linkedPostId: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateIdea = mutation({
  args: {
    id: v.id("contentIdeas"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(statusValidator),
    contentType: v.optional(contentTypeValidator),
    tags: v.optional(v.array(v.string())),
    targetDate: v.optional(v.number()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertIdeaOwner(ctx, args.id);

    const update = { updatedAt: Date.now() };
    for (const field of ["title", "notes", "status", "contentType", "tags", "targetDate", "order"]) {
      if (args[field] !== undefined) update[field] = args[field];
    }

    await ctx.db.patch(args.id, update);
    return args.id;
  },
});

// Drag-and-drop between/within columns. Appends to the end of the target
// column rather than doing fractional reordering — simple and correct,
// fine-grained manual reordering inside a column can come later.
export const moveIdea = mutation({
  args: {
    id: v.id("contentIdeas"),
    status: statusValidator,
    order: v.number(),
  },
  handler: async (ctx, args) => {
    await assertIdeaOwner(ctx, args.id);

    await ctx.db.patch(args.id, {
      status: args.status,
      order: args.order,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const deleteIdea = mutation({
  args: { id: v.id("contentIdeas") },
  handler: async (ctx, args) => {
    await assertIdeaOwner(ctx, args.id);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Turns an idea into a real draft post in the right editor, then links the
// idea back to that post so it isn't converted twice.
export const convertToDraft = mutation({
  args: { id: v.id("contentIdeas") },
  handler: async (ctx, args) => {
    const { user, idea } = await assertIdeaOwner(ctx, args.id);

    if (idea.linkedPostId) return idea.linkedPostId;

    const now = Date.now();
    const contentType = idea.contentType || "article";

    const postId = await ctx.db.insert("posts", {
      title: idea.title,
      content: idea.notes ? `<p>${idea.notes}</p>` : "<p><br></p>",
      status: "draft",
      authorId: user._id,
      tags: idea.tags || [],
      category: undefined,
      featuredImage: undefined,
      contentType,
      mediaUrl: undefined,
      monetization: "free",
      allowComments: true,
      postMeta: undefined,
      createdAt: now,
      updatedAt: now,
      publishedAt: undefined,
      scheduledFor: idea.targetDate,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
    });

    await ctx.db.patch(args.id, {
      linkedPostId: postId,
      status: "in_progress",
      updatedAt: now,
    });

    return postId;
  },
});
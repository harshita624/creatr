import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────────────
// Validator — mirrors schema exactly (includes v.null() for colour resets)
// ─────────────────────────────────────────────────────────────────────────────
const slideValidator = {
  title:        v.optional(v.string()),
  caption:      v.optional(v.string()),
  imageUrl:     v.optional(v.string()),
  layout: v.optional(
    v.union(
      v.literal("cover"),
      v.literal("split"),
      v.literal("quote"),
      v.literal("stat"),
      v.literal("cta")
    )
  ),
  template:     v.optional(v.string()),
  // null = "reset to template default" (DesignPanel sends null on template change)
  bgColor:      v.optional(v.union(v.string(), v.null())),
  textColor:    v.optional(v.union(v.string(), v.null())),
  accentColor:  v.optional(v.union(v.string(), v.null())),
  fontSize:     v.optional(v.string()),
  textAlign:    v.optional(v.string()),
  imageOpacity: v.optional(v.number()),
};

const SLIDE_FIELDS = [
  "title", "caption", "imageUrl", "layout", "template",
  "bgColor", "textColor", "accentColor",
  "fontSize", "textAlign", "imageOpacity",
];

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────
async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
}

async function assertPostOwner(ctx, postId) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");

  const post = await ctx.db.get(postId);
  if (!post || post.authorId !== user._id) throw new Error("Post not found");

  if ((post.contentType || "article") !== "carousel")
    throw new Error("Slides can only be added to carousel posts");

  return { user, post };
}

async function getSlides(ctx, postId) {
  return ctx.db
    .query("carouselSlides")
    .withIndex("by_post_order", (q) => q.eq("postId", postId))
    .collect();
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────
export const listSlides = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await assertPostOwner(ctx, args.postId);
    return getSlides(ctx, args.postId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────
export const createSlide = mutation({
  args: { postId: v.id("posts"), ...slideValidator },
  handler: async (ctx, args) => {
    const { user } = await assertPostOwner(ctx, args.postId);
    const slides = await getSlides(ctx, args.postId);
    const now = Date.now();

    return ctx.db.insert("carouselSlides", {
      ownerId:  user._id,
      postId:   args.postId,
      order:    slides.length,
      title:    args.title   ?? `Slide ${slides.length + 1}`,
      caption:  args.caption ?? "",
      imageUrl: args.imageUrl || undefined,
      layout:   args.layout   ?? (slides.length === 0 ? "cover" : "split"),
      template: args.template ?? "clean",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createManySlides = mutation({
  args: {
    postId: v.id("posts"),
    slides: v.array(
      v.object({
        title:    v.string(),
        caption:  v.string(),
        imageUrl: v.optional(v.string()),
        layout: v.union(
          v.literal("cover"),
          v.literal("split"),
          v.literal("quote"),
          v.literal("stat"),
          v.literal("cta")
        ),
        template: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await assertPostOwner(ctx, args.postId);
    const existing = await getSlides(ctx, args.postId);
    const now = Date.now();
    const ids = [];

    for (const [i, slide] of args.slides.entries()) {
      ids.push(
        await ctx.db.insert("carouselSlides", {
          ownerId:  user._id,
          postId:   args.postId,
          order:    existing.length + i,
          title:    slide.title,
          caption:  slide.caption,
          imageUrl: slide.imageUrl || undefined,
          layout:   slide.layout,
          template: slide.template ?? "clean",
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    return ids;
  },
});

export const updateSlide = mutation({
  args: { id: v.id("carouselSlides"), ...slideValidator },
  handler: async (ctx, args) => {
    const slide = await ctx.db.get(args.id);
    if (!slide) throw new Error("Slide not found");
    await assertPostOwner(ctx, slide.postId);

    const update = { updatedAt: Date.now() };

    for (const field of SLIDE_FIELDS) {
      if (args[field] === undefined) continue;

      // FIX: Convex documents cannot store null in optional string/number fields.
      // Map null → undefined so ctx.db.patch() deletes the key entirely,
      // which lets resolveSlideStyle() fall back to the template default.
      update[field] = args[field] === null ? undefined : args[field];
    }

    await ctx.db.patch(args.id, update);
    return args.id;
  },
});

export const duplicateSlide = mutation({
  args: { id: v.id("carouselSlides") },
  handler: async (ctx, args) => {
    const slide = await ctx.db.get(args.id);
    if (!slide) throw new Error("Slide not found");
    const { user } = await assertPostOwner(ctx, slide.postId);
    const slides = await getSlides(ctx, slide.postId);
    const now = Date.now();

    for (const item of slides.filter((s) => s.order > slide.order)) {
      await ctx.db.patch(item._id, { order: item.order + 1, updatedAt: now });
    }

    return ctx.db.insert("carouselSlides", {
      ownerId:      user._id,
      postId:       slide.postId,
      order:        slide.order + 1,
      title:        `${slide.title} copy`,
      caption:      slide.caption,
      imageUrl:     slide.imageUrl,
      layout:       slide.layout,
      template:     slide.template,
      bgColor:      slide.bgColor,
      textColor:    slide.textColor,
      accentColor:  slide.accentColor,
      fontSize:     slide.fontSize,
      textAlign:    slide.textAlign,
      imageOpacity: slide.imageOpacity,
      createdAt:    now,
      updatedAt:    now,
    });
  },
});

export const deleteSlide = mutation({
  args: { id: v.id("carouselSlides") },
  handler: async (ctx, args) => {
    const slide = await ctx.db.get(args.id);
    if (!slide) throw new Error("Slide not found");
    await assertPostOwner(ctx, slide.postId);

    await ctx.db.delete(args.id);

    const remaining = await getSlides(ctx, slide.postId);
    for (const [i, item] of remaining.entries()) {
      if (item.order !== i) {
        await ctx.db.patch(item._id, { order: i, updatedAt: Date.now() });
      }
    }

    return { success: true };
  },
});

export const reorderSlides = mutation({
  args: {
    postId:     v.id("posts"),
    orderedIds: v.array(v.id("carouselSlides")),
  },
  handler: async (ctx, args) => {
    await assertPostOwner(ctx, args.postId);
    const slides = await getSlides(ctx, args.postId);
    const ownedIds = new Set(slides.map((s) => s._id));

    if (
      args.orderedIds.length !== slides.length ||
      args.orderedIds.some((id) => !ownedIds.has(id))
    ) {
      throw new Error("Invalid slide order");
    }

    const now = Date.now();
    for (const [i, id] of args.orderedIds.entries()) {
      await ctx.db.patch(id, { order: i, updatedAt: now });
    }

    return { success: true };
  },
});
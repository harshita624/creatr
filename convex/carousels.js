import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────────────
// Validator — mirrors schema exactly (includes v.null() for colour resets)
// ─────────────────────────────────────────────────────────────────────────────
const slideValidator = {
  title:        v.optional(v.string()),
  caption:      v.optional(v.string()),
  imageUrl:     v.optional(v.union(v.string(), v.null())),
  imageFilter:  v.optional(v.union(v.string(), v.null())),
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
  imageOpacity: v.optional(v.union(v.number(), v.null())),
  imagePositionX: v.optional(v.union(v.number(), v.null())),
  imagePositionY: v.optional(v.union(v.number(), v.null())),
  imageWidth: v.optional(v.union(v.number(), v.null())),
  imageHeight: v.optional(v.union(v.number(), v.null())),
};

const SLIDE_FIELDS = [
  "title", "caption", "imageUrl", "imageFilter", "layout", "template",
  "bgColor", "textColor", "accentColor",
  "fontSize", "textAlign", "imageOpacity",
  "imagePositionX", "imagePositionY", "imageWidth", "imageHeight",
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

export const getMyUploads = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const [assets, slides, posts] = await Promise.all([
      ctx.db.query("mediaAssets").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).order("desc").take(200),
      ctx.db.query("carouselSlides").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).order("desc").take(200),
      ctx.db.query("posts").withIndex("by_author", (q) => q.eq("authorId", user._id)).order("desc").take(200),
    ]);

    const photos = [];
    for (const asset of assets) {
      photos.push({ url: asset.url, filter: asset.imageFilter || "original", label: asset.label || "Uploaded image", createdAt: asset.updatedAt });
    }
    for (const slide of slides) {
      if (slide.imageUrl) photos.push({ url: slide.imageUrl, filter: slide.imageFilter || "original", label: `${slide.title || "Carousel slide"} · slide`, createdAt: slide.updatedAt });
    }
    for (const post of posts) {
      for (const [index, photo] of (post.photoItems || []).entries()) {
        if (photo.url) photos.push({ url: photo.url, filter: photo.filter || "original", label: `${post.title || "Photo post"} · ${index + 1}`, createdAt: post.updatedAt || post.createdAt });
      }
      if (post.featuredImage) photos.push({ url: post.featuredImage, filter: "original", label: `${post.title || "Post"} · cover`, createdAt: post.updatedAt || post.createdAt });
    }

    return [...new Map(photos.map((photo) => [photo.url, photo])).values()]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
});

export const saveImageAsset = mutation({
  args: { url: v.string(), label: v.string(), imageFilter: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    let parsedUrl;
    try { parsedUrl = new URL(args.url); } catch { throw new Error("Invalid image URL"); }
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "ik.imagekit.io") {
      throw new Error("Only uploaded ImageKit images can be saved to My uploads");
    }

    const existing = await ctx.db
      .query("mediaAssets")
      .withIndex("by_owner_url", (q) => q.eq("ownerId", user._id).eq("url", args.url))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { label: args.label, imageFilter: args.imageFilter, updatedAt: now });
      return existing._id;
    }

    return ctx.db.insert("mediaAssets", {
      ownerId: user._id,
      url: args.url,
      label: args.label,
      imageFilter: args.imageFilter,
      createdAt: now,
      updatedAt: now,
    });
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
      imageFilter: args.imageFilter || undefined,
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
        imageFilter: v.optional(v.string()),
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
          imageFilter: slide.imageFilter || undefined,
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
      imageFilter:  slide.imageFilter,
      layout:       slide.layout,
      template:     slide.template,
      bgColor:      slide.bgColor,
      textColor:    slide.textColor,
      accentColor:  slide.accentColor,
      fontSize:     slide.fontSize,
      textAlign:    slide.textAlign,
      imageOpacity: slide.imageOpacity,
      imagePositionX: slide.imagePositionX,
      imagePositionY: slide.imagePositionY,
      imageWidth: slide.imageWidth,
      imageHeight: slide.imageHeight,
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
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
    imageUrl: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    gender: v.optional(v.string()),
    phone: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    createdAt: v.number(),
    lastActiveAt: v.optional(v.number()),
    lastActivatedAt: v.optional(v.number()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .searchIndex("search_name", { searchField: "name" })
    .searchIndex("search_email", { searchField: "email" }),

  posts: defineTable({
    title: v.string(),
    content: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    authorId: v.id("users"),
    tags: v.array(v.string()),
    category: v.optional(v.string()),
    featuredImage: v.optional(v.string()),
    contentType: v.optional(
      v.union(
        v.literal("article"),
        v.literal("reel"),
        v.literal("video"),
        v.literal("livestream"),
        v.literal("podcast"),
        v.literal("carousel")
      )
    ),
    mediaUrl: v.optional(v.string()),
    monetization: v.optional(
      v.union(v.literal("free"), v.literal("members"), v.literal("paid"))
    ),
    priceCents: v.optional(v.number()),
    allowComments: v.optional(v.boolean()),
    postMeta: v.optional(
      v.object({
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
        paidPartnership: v.optional(v.string()),
        sensitive: v.optional(v.string()),
        allowRemix: v.optional(v.string()),
        showLikes: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
    viewCount: v.number(),
    likeCount: v.number(),
    commentCount: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_published", ["status", "publishedAt"])
    .index("by_author_status", ["authorId", "status"])
    .searchIndex("search_content", { searchField: "title" }),

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.optional(v.id("users")),
    authorName: v.string(),
    authorEmail: v.optional(v.string()),
    content: v.string(),
    status: v.union(
      v.literal("approved"),
      v.literal("pending"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_post_status", ["postId", "status"])
    .index("by_author", ["authorId"]),

  likes: defineTable({
    postId: v.id("posts"),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_user", ["userId"])
    .index("by_post_user", ["postId", "userId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_relationship", ["followerId", "followingId"]),

  dailyStats: defineTable({
    postId: v.id("posts"),
    date: v.string(),
    views: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_date", ["date"])
    .index("by_post_date", ["postId", "date"]),

  aiJobs: defineTable({
    ownerId: v.id("users"),
    postId: v.optional(v.id("posts")),
    kind: v.union(
      v.literal("media_intelligence"),
      v.literal("analytics_summary"),
      v.literal("carousel_generation")
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.number(),
    cacheKey: v.string(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_post", ["postId"])
    .index("by_status", ["status"])
    .index("by_cache", ["cacheKey"]),

  mediaIntelligence: defineTable({
    ownerId: v.id("users"),
    postId: v.id("posts"),
    jobId: v.id("aiJobs"),
    contentType: v.union(
      v.literal("reel"),
      v.literal("video"),
      v.literal("podcast")
    ),
    cacheKey: v.string(),
    transcript: v.string(),
    subtitles: v.array(
      v.object({ start: v.number(), end: v.number(), text: v.string() })
    ),
    highlights: v.array(
      v.object({ title: v.string(), start: v.number(), end: v.number(), reason: v.string() })
    ),
    clips: v.array(
      v.object({ title: v.string(), hook: v.string(), start: v.number(), end: v.number(), caption: v.string() })
    ),
    chapters: v.array(
      v.object({ title: v.string(), start: v.number(), summary: v.string() })
    ),
    titleSuggestions: v.array(v.string()),
    thumbnailIdeas: v.array(
      v.object({ title: v.string(), prompt: v.string(), overlayText: v.string() })
    ),
    summary: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_post", ["postId"])
    .index("by_job", ["jobId"])
    .index("by_cache", ["cacheKey"]),

  carouselSlides: defineTable({
    ownerId: v.id("users"),
    postId: v.id("posts"),
    order: v.number(),
    title: v.string(),
    caption: v.string(),
    imageUrl: v.optional(v.string()),
    layout: v.union(
      v.literal("cover"), v.literal("split"),
      v.literal("quote"), v.literal("stat"), v.literal("cta")
    ),
    template: v.optional(v.string()),
    bgColor: v.optional(v.union(v.string(), v.null())),
    textColor: v.optional(v.union(v.string(), v.null())),
    accentColor: v.optional(v.union(v.string(), v.null())),
    fontSize: v.optional(v.string()),
    textAlign: v.optional(v.string()),
    imageOpacity: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_post", ["postId"])
    .index("by_post_order", ["postId", "order"]),

  trends: defineTable({
    trending_hashtags: v.array(v.object({ tag: v.string(), count: v.number(), engagement: v.number(), trend_score: v.number() })),
    trending_keywords: v.array(v.object({ keyword: v.string(), count: v.number(), engagement: v.number(), trend_score: v.number() })),
    topics: v.array(v.object({ topic_id: v.number(), keywords: v.array(v.string()), post_count: v.number() })),
    total_posts_analyzed: v.number(),
    analyzedAt: v.number(),
  }),

  contentIdeas: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("inbox"), v.literal("planned"),
      v.literal("in_progress"), v.literal("ready"), v.literal("archived")
    ),
    contentType: v.optional(
      v.union(
        v.literal("article"), v.literal("reel"), v.literal("video"),
        v.literal("livestream"), v.literal("podcast"), v.literal("carousel")
      )
    ),
    tags: v.optional(v.array(v.string())),
    targetDate: v.optional(v.number()),
    order: v.number(),
    linkedPostId: v.optional(v.id("posts")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_status", ["ownerId", "status"]),

  mediaStudio: defineTable({
    ownerId: v.id("users"),
    postId: v.id("posts"),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
    chapters: v.array(v.object({ time: v.number(), label: v.string() })),
    thumbnailUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_post", ["postId"]),

  livestreamSessions: defineTable({
    ownerId: v.id("users"),
    postId: v.id("posts"),
    roomName: v.string(),
    status: v.union(v.literal("scheduled"), v.literal("live"), v.literal("ended")),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    peakViewers: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_post", ["postId"])
    .index("by_status", ["status"]),

  connectedAccounts: defineTable({
    ownerId: v.id("users"),
    stripeAccountId: v.string(),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("restricted")),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_stripe_account", ["stripeAccountId"]),

  purchases: defineTable({
    postId: v.id("posts"),
    buyerUserId: v.optional(v.id("users")),
    buyerEmail: v.optional(v.string()),
    sellerId: v.id("users"),
    amountCents: v.number(),
    currency: v.string(),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("refunded")),
    createdAt: v.number(),
  })
    .index("by_session", ["stripeSessionId"])
    .index("by_post_buyer", ["postId", "buyerUserId"])
    .index("by_buyer", ["buyerUserId"])
    .index("by_seller", ["sellerId"]),

  stories: defineTable({
    ownerId: v.id("users"),
    mediaUrl: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    caption: v.optional(v.string()),
    viewerIds: v.array(v.id("users")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_expires", ["expiresAt"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_post", ["postId"])
    .index("by_user_post", ["userId", "postId"]),

  notifications: defineTable({
    recipientId: v.id("users"),
    actorId: v.optional(v.id("users")),
    type: v.union(
      v.literal("like"), v.literal("comment"),
      v.literal("follow"), v.literal("mention"), v.literal("story_view")
    ),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_recipient_read", ["recipientId", "read"]),
});
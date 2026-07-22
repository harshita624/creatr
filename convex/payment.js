import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export const getConnectedAccount = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    return ctx.db
      .query("connectedAccounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .unique();
  },
});

// Public — looked up by seller's userId, used by the checkout route to find
// where the money should go. No auth check: any buyer needs to be able to
// resolve the seller's payout account.
export const getConnectedAccountForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("connectedAccounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .unique();
  },
});

export const setConnectedAccount = mutation({
  args: {
    stripeAccountId: v.string(),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("restricted")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stripeAccountId: args.stripeAccountId,
        status: args.status,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("connectedAccounts", {
      ownerId: user._id,
      stripeAccountId: args.stripeAccountId,
      status: args.status,
      chargesEnabled: false,
      payoutsEnabled: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Called only from the Stripe webhook route and the status-check route —
// both trusted server contexts with no Convex auth identity available,
// so this looks accounts up by Stripe account id rather than by caller.
export const syncAccountStatusByStripeId = mutation({
  args: {
    stripeAccountId: v.string(),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_stripe_account", (q) => q.eq("stripeAccountId", args.stripeAccountId))
      .unique();
    if (!account) return null;

    await ctx.db.patch(account._id, {
      chargesEnabled: args.chargesEnabled,
      payoutsEnabled: args.payoutsEnabled,
      status: args.chargesEnabled && args.payoutsEnabled ? "active" : "pending",
      updatedAt: Date.now(),
    });

    return account._id;
  },
});

// Public — the checkout route needs the price and seller before the buyer
// is necessarily known, so this doesn't require auth.
export const getPostForCheckout = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.status !== "published") return null;

    return {
      _id: post._id,
      title: post.title,
      authorId: post.authorId,
      monetization: post.monetization,
      priceCents: post.priceCents,
    };
  },
});

export const recordPurchase = mutation({
  args: {
    postId: v.id("posts"),
    sellerId: v.id("users"),
    buyerUserId: v.optional(v.id("users")),
    buyerEmail: v.optional(v.string()),
    amountCents: v.number(),
    currency: v.string(),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("purchases")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .unique();
    if (existing) return existing._id; // idempotent if Stripe retries the webhook

    return ctx.db.insert("purchases", {
      ...args,
      status: "completed",
      createdAt: Date.now(),
    });
  },
});

export const hasPurchased = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;

    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_post_buyer", (q) => q.eq("postId", args.postId).eq("buyerUserId", user._id))
      .unique();

    return !!purchase;
  },
});

export const getMyPurchases = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_buyer", (q) => q.eq("buyerUserId", user._id))
      .order("desc")
      .collect();

    return Promise.all(
      purchases.map(async (purchase) => ({
        ...purchase,
        post: await ctx.db.get(purchase.postId),
      }))
    );
  },
});
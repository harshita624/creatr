import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addReview = mutation({
  args: {
    name: v.string(),
    message: v.string(),
    rating: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("reviews", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getReviews = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reviews").order("desc").collect();
  },
});

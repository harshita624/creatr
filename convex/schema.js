import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email:v.string(),
    tokenIdentifier: v.string(),
    imageUrl:v.optional(v.string()),
    username:v.optional(v.string()),

    createdAt:v.number(),
    lastActivatedAt:v.number(),
  }).index("by_token", ["tokenIdentifier"])
  .index("by_email", ["email"])
  .index("by_username", ["username"])
  .searchIndex("search_name",{searchField:"name"})
  .searchIndex("search_email",{searchField:"email"}),

});

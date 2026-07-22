import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Called storeUser without authentication present");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (user !== null) {
      if (user.name !== identity.name) {
        await ctx.db.patch(user._id, { name: identity.name, lastActiveAt: Date.now() });
      }
      return user._id;
    }

    const baseUsername = identity.email
      ? identity.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "")
      : identity.name?.toLowerCase().replace(/[^a-z0-9_-]/g, "") || "user";

    let username = baseUsername;
    let counter = 1;
    while (true) {
      const existing = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("username"), username))
        .unique();
      if (!existing) break;
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      username,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
      imageUrl: identity.pictureUrl,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });
  },
});

export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

export const updateUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(args.username))
      throw new Error("Username can only contain letters, numbers, underscores, hyphens and periods");
    if (args.username.length < 3 || args.username.length > 30)
      throw new Error("Username must be between 3 and 30 characters");

    if (args.username !== user.username) {
      const existing = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("username"), args.username))
        .unique();
      if (existing) throw new Error("Username is already taken");
    }

    await ctx.db.patch(user._id, { username: args.username, lastActiveAt: Date.now() });
    return user._id;
  },
});

// Full profile update — name, bio, website, gender, phone, isPrivate, imageUrl
export const updateProfile = mutation({
  args: {
    name:      v.optional(v.string()),
    bio:       v.optional(v.string()),
    website:   v.optional(v.string()),
    gender:    v.optional(v.string()),
    phone:     v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    imageUrl:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const update = { lastActiveAt: Date.now() };

    if (args.name !== undefined) {
      if (args.name.trim().length < 1 || args.name.length > 60)
        throw new Error("Name must be between 1 and 60 characters");
      update.name = args.name.trim();
    }
    if (args.bio !== undefined) {
      if (args.bio.length > 150)
        throw new Error("Bio must be 150 characters or less");
      update.bio = args.bio;
    }
    if (args.website !== undefined) {
      if (args.website && args.website.length > 200)
        throw new Error("Website URL is too long");
      update.website = args.website;
    }
    if (args.gender    !== undefined) update.gender    = args.gender;
    if (args.phone     !== undefined) update.phone     = args.phone;
    if (args.isPrivate !== undefined) update.isPrivate = args.isPrivate;
    if (args.imageUrl  !== undefined) update.imageUrl  = args.imageUrl;

    await ctx.db.patch(user._id, update);
    return user._id;
  },
});

export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    if (!args.username || args.username.length < 3) return null;
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .unique();
    return !existing; // true = available
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    if (!args.username) return null;
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .unique();
    if (!user) return null;
    return {
      _id: user._id, name: user.name, username: user.username,
      imageUrl: user.imageUrl, bio: user.bio, website: user.website,
      isPrivate: user.isPrivate, createdAt: user.createdAt,
    };
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      _id: user._id, name: user.name, username: user.username,
      imageUrl: user.imageUrl, createdAt: user.createdAt,
    };
  },
});

export const searchUsers = query({
  args: { searchTerm: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const lower = args.searchTerm.toLowerCase();
    const all   = await ctx.db.query("users").collect();
    return all
      .filter((u) =>
        u.username?.toLowerCase().includes(lower) ||
        u.name?.toLowerCase().includes(lower)
      )
      .slice(0, limit)
      .map((u) => ({ _id: u._id, name: u.name, username: u.username, imageUrl: u.imageUrl }));
  },
});
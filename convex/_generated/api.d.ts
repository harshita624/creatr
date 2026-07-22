/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bookmarks from "../bookmarks.js";
import type * as carousels from "../carousels.js";
import type * as comments from "../comments.js";
import type * as dashboard from "../dashboard.js";
import type * as feed from "../feed.js";
import type * as follows from "../follows.js";
import type * as ideas from "../ideas.js";
import type * as likes from "../likes.js";
import type * as livestreams from "../livestreams.js";
import type * as mediaIntelligence from "../mediaIntelligence.js";
import type * as mediaStudio from "../mediaStudio.js";
import type * as notifications from "../notifications.js";
import type * as payment from "../payment.js";
import type * as payments from "../payments.js";
import type * as posts from "../posts.js";
import type * as public_ from "../public.js";
import type * as reviews from "../reviews.js";
import type * as stories from "../stories.js";
import type * as trends from "../trends.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bookmarks: typeof bookmarks;
  carousels: typeof carousels;
  comments: typeof comments;
  dashboard: typeof dashboard;
  feed: typeof feed;
  follows: typeof follows;
  ideas: typeof ideas;
  likes: typeof likes;
  livestreams: typeof livestreams;
  mediaIntelligence: typeof mediaIntelligence;
  mediaStudio: typeof mediaStudio;
  notifications: typeof notifications;
  payment: typeof payment;
  payments: typeof payments;
  posts: typeof posts;
  public: typeof public_;
  reviews: typeof reviews;
  stories: typeof stories;
  trends: typeof trends;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

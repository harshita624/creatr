"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Authenticated } from "convex/react";
import { Compass, Loader2, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import StoriesBar      from "@/components/stories-bar";
import FeedPostCard    from "@/components/feed-post-card";
import FeedNav         from "@/components/feed-nav";
import MobileBottomNav from "@/components/mobile-bottom-nav";

/* Inject a "suggested creators" block every N posts in the feed column */
const SUGGEST_EVERY = 4;

export default function FeedPage() {
  const [limit,  setLimit]  = useState(8);
  const [tab,    setTab]    = useState("for_you"); // "for_you" | "following"
  const sentinelRef = useRef(null);

  const feed            = useQuery(api.feed.getFeed,            { limit, cursor: 0 });
  const suggested       = useQuery(api.feed.getSuggestedUsers,  { limit: 6 });
  const trendingTopics  = useQuery(api.feed.getTrendingTopics,  { limit: 10 });
  const recommendations = useQuery(api.feed.getRecommendations, { limit: 3 });
  const trendingPosts   = useQuery(api.feed.getTrendingPosts,   { limit: 3 });
  const me              = useQuery(api.users.getCurrentUser);
  const toggleFollow    = useMutation(api.follows.toggleFollow);

  const [followingIds,  setFollowingIds]  = useState(new Set());
  const [followingPosts, setFollowingPosts] = useState([]); // local filter for "following" tab

  /* seed follow state from feed data */
  useEffect(() => {
    const ids = (feed?.posts ?? [])
      .filter((p) => p.isFollowing).map((p) => p.author?._id).filter(Boolean);
    setFollowingIds(new Set(ids));
  }, [feed?.posts]);

  /* filter posts for "following" tab */
  useEffect(() => {
    if (!feed?.posts) return;
    setFollowingPosts(feed.posts.filter((p) => followingIds.has(p.author?._id)));
  }, [feed?.posts, followingIds]);

  /* infinite scroll */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && feed?.hasMore) setLimit((l) => l + 8); },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [feed?.hasMore]);

  const allPosts = feed?.posts ?? [];
  const posts    = tab === "following" ? followingPosts : allPosts;
  const isLoading = feed === undefined;

  const handleFollow = async (userId) => {
    const will = !followingIds.has(userId);
    setFollowingIds((prev) => {
      const n = new Set(prev);
      will ? n.add(userId) : n.delete(userId);
      return n;
    });
    try { await toggleFollow({ followingId: userId }); }
    catch (err) {
      setFollowingIds((prev) => {
        const n = new Set(prev);
        will ? n.delete(userId) : n.add(userId);
        return n;
      });
      toast.error(err.message || "Failed");
    }
  };

  /*
    AI picks: real personalised if the user has any likes,
    falls back to trending posts. Never dummy data.
  */
  const aiPicks = (recommendations ?? []).length > 0
    ? recommendations
    : (trendingPosts ?? []);
  const aiLabel = (recommendations ?? []).length > 0 ? "AI picks for you" : "Trending now";

  /*
    Build the feed column items: posts with suggested-creator blocks
    interspersed every SUGGEST_EVERY posts.
  */
  const feedItems = useMemo(() => {
    const items = [];
    const suggestList = suggested ?? [];
    let suggestBatchIdx = 0;

    posts.forEach((post, i) => {
      items.push({ type: "post", post });
      const isLast = i === posts.length - 1;

      // Insert a suggested block after every SUGGEST_EVERY posts
      if (!isLast && (i + 1) % SUGGEST_EVERY === 0 && suggestList.length > 0) {
        const batchSize  = 3;
        const startIdx   = (suggestBatchIdx * batchSize) % suggestList.length;
        const batch      = [
          ...suggestList.slice(startIdx, startIdx + batchSize),
          ...suggestList.slice(0, Math.max(0, startIdx + batchSize - suggestList.length)),
        ].slice(0, batchSize);
        items.push({ type: "suggestions", users: batch, key: `suggest-${i}` });
        suggestBatchIdx++;
      }
    });
    return items;
  }, [posts, suggested]);

  return (
    <>
      <FeedNav />
      <MobileBottomNav />

      <div className="min-h-screen bg-white lg:bg-[#fafafa] pt-[56px]">
        <div className="mx-auto max-w-[935px] px-0 lg:px-5">
          <div className="flex items-start lg:gap-7 lg:pt-6">

            {/* ── Feed column ───────────────────────────────────────── */}
            <main className="w-full min-w-0 pb-24 lg:flex-1 lg:pb-10">

              {/* Stories */}
              <Authenticated>
                <div className="border-b border-[#dbdbdb] bg-white lg:mb-4 lg:rounded-sm lg:border lg:overflow-hidden">
                  <StoriesBar />
                </div>
              </Authenticated>

              {/* ── Tab bar ──────────────────────────────────────────── */}
              <div className="sticky top-[56px] z-30 flex border-b border-[#dbdbdb] bg-white">
                {[
                  { id: "for_you",   icon: Sparkles, label: "For You"   },
                  { id: "following", icon: Users,     label: "Following" },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-[13px] font-semibold transition-colors border-b-2 ${
                      tab === id
                        ? "border-[#262626] text-[#262626]"
                        : "border-transparent text-[#8e8e8e] hover:text-[#262626]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Posts + interspersed suggestions ─────────────────── */}
              {isLoading ? (
                <div className="flex justify-center py-24">
                  <Loader2 className="h-6 w-6 animate-spin text-[#c7c7c7]" />
                </div>

              ) : posts.length === 0 ? (
                tab === "following" ? (
                  <FollowingEmpty />
                ) : (
                  <EmptyFeed />
                )

              ) : (
                <>
                  <div className="lg:space-y-6">
                    {feedItems.map((item, idx) =>
                      item.type === "post" ? (
                        <FeedPostCard key={item.post._id} post={item.post} />
                      ) : (
                        <SuggestedBlock
                          key={item.key}
                          users={item.users}
                          followingIds={followingIds}
                          onFollow={handleFollow}
                        />
                      )
                    )}
                  </div>

                  <div ref={sentinelRef} className="h-4" />

                  {feed?.hasMore ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-[#c7c7c7]" />
                    </div>
                  ) : (
                    <AllCaughtUp />
                  )}
                </>
              )}
            </main>

            {/* ── Sidebar ───────────────────────────────────────────── */}
            <aside className="hidden w-[293px] shrink-0 lg:block">
              <Authenticated>
                <div className="sticky top-[72px] space-y-6 pt-1">

                  {/* My profile */}
                  {me && (
                    <div className="flex items-center gap-3">
                      {me.imageUrl ? (
                        <Image src={me.imageUrl} alt={me.name} width={56} height={56}
                          className="h-14 w-14 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-xl font-bold text-white">
                          {me.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#262626]">
                          {me.username || me.name}
                        </p>
                        <p className="truncate text-sm text-[#8e8e8e]">{me.name}</p>
                      </div>
                      <Link
                        href={me.username ? `/${me.username}` : "/dashboard/settings"}
                        className="shrink-0 text-xs font-semibold text-[#0095f6] hover:text-[#00376b]"
                      >
                        Profile
                      </Link>
                    </div>
                  )}

                  {/* Suggested for you */}
                  {(suggested ?? []).length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-[#8e8e8e]">
                          Suggested for you
                        </p>
                        <Link href="#" className="text-xs font-semibold text-[#262626] hover:text-[#8e8e8e]">
                          See all
                        </Link>
                      </div>
                      <div className="space-y-3">
                        {(suggested ?? []).slice(0, 5).map((user) => {
                          const following = followingIds.has(user._id);
                          return (
                            <div key={user._id} className="flex items-center gap-3">
                              <Link href={user.username ? `/${user.username}` : "#"} className="shrink-0">
                                {user.imageUrl ? (
                                  <Image src={user.imageUrl} alt={user.name} width={32} height={32}
                                    className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-xs font-bold text-white">
                                    {user.name?.charAt(0)?.toUpperCase()}
                                  </div>
                                )}
                              </Link>
                              <div className="min-w-0 flex-1">
                                <Link href={user.username ? `/${user.username}` : "#"}>
                                  <p className="truncate text-[13px] font-semibold text-[#262626]">
                                    {user.username || user.name}
                                  </p>
                                </Link>
                                <p className="truncate text-[12px] text-[#8e8e8e]">
                                  {user.postCount > 0 ? `${user.postCount} posts` : "New creator"}
                                </p>
                              </div>
                              <button onClick={() => handleFollow(user._id)}
                                className={`shrink-0 text-xs font-semibold transition-colors ${
                                  following ? "text-[#8e8e8e] hover:text-[#262626]" : "text-[#0095f6] hover:text-[#00376b]"
                                }`}>
                                {following ? "Following" : "Follow"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AI picks / Trending posts */}
                  {aiPicks.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-orange-400" />
                        <p className="text-[13px] font-semibold text-[#8e8e8e]">{aiLabel}</p>
                      </div>
                      <div className="space-y-2">
                        {aiPicks.map((post) => (
                          <Link key={post._id}
                            href={post.author?.username ? `/${post.author.username}/${post._id}` : "#"}
                            className="-mx-1 flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-white">
                            {post.featuredImage ? (
                              <Image src={post.featuredImage} alt={post.title || ""} width={44} height={44}
                                className="h-11 w-11 shrink-0 rounded-sm object-cover" />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br from-orange-100 to-violet-100">
                                <Sparkles className="h-5 w-5 text-orange-300" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-[12px] font-semibold text-[#262626]">
                                {post.title || "Untitled"}
                              </p>
                              <p className="text-[11px] text-[#8e8e8e]">
                                @{post.author?.username || "Creator"}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending hashtags */}
                  {(trendingTopics ?? []).length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-[#8e8e8e]" />
                        <p className="text-[13px] font-semibold text-[#8e8e8e]">Trending</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(trendingTopics ?? []).map((topic) => (
                          <span key={topic.tag}
                            className="cursor-pointer rounded-full bg-[#efefef] px-3 py-1 text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#dbdbdb]">
                            #{topic.tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Go to Studio CTA */}
                  <Link href="/dashboard"
                    className="block overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-violet-50 p-4 ring-1 ring-orange-100 hover:ring-orange-200 transition-all">
                    <p className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
                      <Compass className="h-4 w-4 text-orange-500" />
                      Open Creator Studio
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Publish posts, track analytics, manage your content.
                    </p>
                  </Link>

                  {/* Footer */}
                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-[#c7c7c7]">
                    {["About", "Help", "Terms", "Privacy", "CreateK © 2025"].map((t) => (
                      <span key={t} className="cursor-pointer hover:underline">{t}</span>
                    ))}
                  </div>
                </div>
              </Authenticated>
            </aside>

          </div>
        </div>
      </div>
    </>
  );
}

/* ── Interspersed suggested creators block (in feed column) ─────────── */
function SuggestedBlock({ users, followingIds, onFollow }) {
  return (
    <div className="overflow-hidden bg-white border-b border-[#dbdbdb] px-4 py-4 lg:border lg:border-[#dbdbdb] lg:rounded-md">
      <p className="mb-3 text-[13px] font-semibold text-[#262626]">
        Suggested for you
      </p>
      <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {users.map((user) => {
          const following = followingIds.has(user._id);
          return (
            <div key={user._id}
              className="flex shrink-0 w-[140px] flex-col items-center rounded-2xl border border-[#dbdbdb] bg-white p-4 text-center">
              {user.imageUrl ? (
                <Image src={user.imageUrl} alt={user.name} width={54} height={54}
                  className="h-[54px] w-[54px] rounded-full object-cover ring-2 ring-[#dbdbdb]" />
              ) : (
                <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-xl font-bold text-white">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <Link href={user.username ? `/${user.username}` : "#"} className="mt-2 w-full">
                <p className="truncate text-[12px] font-semibold text-[#262626]">
                  {user.username || user.name}
                </p>
              </Link>
              <p className="mt-0.5 w-full truncate text-[11px] text-[#8e8e8e]">
                {user.postCount > 0 ? `${user.postCount} posts` : "New creator"}
              </p>
              <button
                onClick={() => onFollow(user._id)}
                className={`mt-2.5 w-full rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  following
                    ? "border border-[#dbdbdb] bg-white text-[#262626] hover:bg-[#fafafa]"
                    : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Empty states ────────────────────────────────────────────────────── */
function EmptyFeed() {
  return (
    <div className="px-6 py-24 text-center">
      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fdf2f8 50%, #f5f3ff 100%)" }}>
        <Sparkles className="h-12 w-12 text-orange-400" />
      </div>
      <h2 className="mb-1 text-xl font-semibold text-[#262626]">Your feed is empty</h2>
      <p className="text-sm text-[#8e8e8e]">
        Follow creators to see their posts, reels, and stories.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href="/dashboard"
          className="rounded-lg bg-[#0095f6] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1877f2] transition-colors">
          Go to Studio
        </Link>
        <Link href="/reels"
          className="rounded-lg border border-[#dbdbdb] px-6 py-2 text-sm font-semibold text-[#262626] hover:bg-[#fafafa] transition-colors">
          Explore Reels
        </Link>
      </div>
    </div>
  );
}

function FollowingEmpty() {
  return (
    <div className="px-6 py-24 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#dbdbdb]">
        <Users className="h-10 w-10 text-[#8e8e8e]" />
      </div>
      <h2 className="mb-1 text-xl font-light text-[#262626]">
        You're not following anyone yet
      </h2>
      <p className="text-sm text-[#8e8e8e]">Follow creators to see their posts here.</p>
    </div>
  );
}

function AllCaughtUp() {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f5f3ff 100%)" }}>
        <Sparkles className="h-8 w-8 text-orange-300" />
      </div>
      <p className="text-sm font-semibold text-[#262626]">You're all caught up</p>
      <p className="mt-1 text-[12px] text-[#8e8e8e]">
        You've seen all the new posts from people you follow.
      </p>
    </div>
  );
}
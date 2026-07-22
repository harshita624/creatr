"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { toast } from "sonner";
import {
  CheckCircle2, Loader2, MessageCircle,
  Shield, Sparkles, TrendingUp,
  UserMinus, UserPlus, Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* Platform channels — no AI emojis, plain icon colors */
const CHANNELS = [
  {
    id:   "creator-hub",
    name: "Creator Hub",
    desc: "Connect with fellow creators, share tips, and grow together.",
    tag:  "General",
    grad: "from-orange-400 to-rose-500",
    iconBg: "#fff7ed",
    iconColor: "#f97316",
  },
  {
    id:   "ai-tools",
    name: "AI & Tools",
    desc: "Discuss the latest AI tools for content creation and productivity.",
    tag:  "Technology",
    grad: "from-violet-400 to-purple-500",
    iconBg: "#f5f3ff",
    iconColor: "#8b5cf6",
  },
  {
    id:   "growth-lab",
    name: "Growth Lab",
    desc: "Data-driven strategies to grow your audience faster.",
    tag:  "Growth",
    grad: "from-emerald-400 to-teal-500",
    iconBg: "#ecfdf5",
    iconColor: "#10b981",
  },
];

const FEATURES = [
  { icon: Users,         title: "Creator groups",    desc: "Join niche communities and collaborate with creators in your space.",    grad: "from-orange-100 to-rose-100",   color: "text-orange-600" },
  { icon: TrendingUp,    title: "Weekly challenges", desc: "Participate in community challenges to boost your reach and visibility.", grad: "from-violet-100 to-purple-100", color: "text-violet-600" },
  { icon: MessageCircle, title: "Live Q&As",         desc: "Host and join live question-and-answer sessions with your audience.",     grad: "from-blue-100 to-sky-100",      color: "text-blue-600"   },
  { icon: Zap,           title: "Collab finder",     desc: "Find creators in your niche for collaborations and cross-promotion.",    grad: "from-emerald-100 to-teal-100",  color: "text-emerald-600"},
];

export default function CommunityPage() {
  const { data: myFollowers, isLoading: loadFollowers } = useConvexQuery(api.follows.getMyFollowers, { limit: 50 });
  const { data: myFollowing, isLoading: loadFollowing } = useConvexQuery(api.follows.getMyFollowing, { limit: 50 });
  const { data: suggested,   isLoading: loadSuggested } = useConvexQuery(api.feed.getSuggestedUsers,  { limit: 8  });
  const { data: activity                               } = useConvexQuery(api.dashboard.getRecentActivity);
  const toggleFollow = useMutation(api.follows.toggleFollow);

  const [tab,          setTab]         = useState("suggested");
  const [followingIds, setFollowingIds]= useState(new Set());
  const [loadingIds,   setLoadingIds]  = useState(new Set());
  // Track which channels this session the user has joined
  const [joinedChannels, setJoinedChannels] = useState(new Set());

  const followers = myFollowers || [];
  const following = myFollowing || [];
  const suggests  = suggested   || [];
  const acts      = activity    || [];

  const handleFollow = async (userId) => {
    setLoadingIds((prev) => new Set([...prev, userId]));
    const willFollow = !followingIds.has(userId) && !following.some((f) => f._id === userId);
    setFollowingIds((prev) => { const n = new Set(prev); willFollow ? n.add(userId) : n.delete(userId); return n; });
    try { await toggleFollow({ followingId: userId }); }
    catch (err) {
      setFollowingIds((prev) => { const n = new Set(prev); willFollow ? n.delete(userId) : n.add(userId); return n; });
      toast.error(err.message || "Failed");
    } finally {
      setLoadingIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
    }
  };

  const isFollowingUser = (id) =>
    followingIds.has(id) || following.some((f) => f._id === id);

  const handleJoinChannel = (channel) => {
    if (joinedChannels.has(channel.id)) {
      setJoinedChannels((prev) => { const n = new Set(prev); n.delete(channel.id); return n; });
      toast.success(`Left ${channel.name}`);
    } else {
      setJoinedChannels((prev) => new Set([...prev, channel.id]));
      toast.success(`Joined ${channel.name}! Welcome to the community.`, { duration: 4000 });
    }
  };

  const activeList = tab === "suggested" ? suggests : tab === "followers" ? followers : following;
  const listLoading= tab === "suggested" ? loadSuggested : tab === "followers" ? loadFollowers : loadFollowing;

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">

      {/* Header */}
      <section className="app-panel overflow-hidden p-5 md:p-7 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Connect</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Community</h1>
            <p className="mt-1 text-sm text-slate-500">Connect with creators, join channels, and grow together.</p>
          </div>
          <Link href="/dashboard/followers">
            <Button className="soft-button self-start sm:self-auto">
              <Users className="h-4 w-4" />
              Manage followers
            </Button>
          </Link>
        </div>

        {/* Real stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Followers",    value: followers.length, color: "text-orange-600" },
            { label: "Following",    value: following.length, color: "text-violet-600" },
            { label: "Mutual",       value: followers.filter((f) => f.followsBack).length, color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl bg-white/80 p-4 text-center">
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Channels — created by CreateK */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Platform channels</h2>
          <p className="text-[11px] text-slate-400">Created by the CreateK team</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((ch) => {
            const joined = joinedChannels.has(ch.id);
            return (
              <div key={ch.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${ch.grad}`} />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Channel icon — plain colored square, no emoji */}
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: ch.iconBg }}>
                      <Users style={{ width: 20, height: 20, color: ch.iconColor }} />
                    </div>
                    <p className="text-base font-bold text-slate-950">{ch.name}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{ch.desc}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    {ch.tag}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">by CreateK Team</p>
                  <button
                    onClick={() => handleJoinChannel(ch)}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                      joined
                        ? "border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        : "bg-gradient-to-r from-orange-400 to-violet-500 text-white shadow-sm hover:opacity-90"
                    }`}
                  >
                    {joined ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" />Joined</>
                    ) : (
                      "Join"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">

        {/* Creators with tabs */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 gap-1">
            {[
              { id: "suggested", label: "Suggested", count: suggests.length  },
              { id: "followers", label: "Followers", count: followers.length },
              { id: "following", label: "Following", count: following.length },
            ].map(({ id, label, count }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                  tab === id
                    ? "bg-gradient-to-r from-orange-300 to-violet-300 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}>
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="app-panel overflow-hidden">
            {listLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
            ) : activeList.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {tab === "suggested" ? "No suggestions yet — publish content first" : tab === "followers" ? "No followers yet" : "You're not following anyone"}
                </p>
                {tab !== "suggested" && (
                  <button onClick={() => setTab("suggested")}
                    className="text-xs font-semibold text-orange-500 hover:text-orange-700">
                    Browse suggested creators →
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {activeList.map((user) => {
                  const followed = isFollowingUser(user._id);
                  const busy     = loadingIds.has(user._id);
                  return (
                    <div key={user._id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                      {user.imageUrl ? (
                        <Image src={user.imageUrl} alt={user.name || ""} width={44} height={44}
                          className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-base font-bold text-white">
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link href={user.username ? `/${user.username}` : "#"}>
                          <p className="truncate text-sm font-semibold text-slate-900">{user.username || user.name}</p>
                        </Link>
                        <p className="truncate text-xs text-slate-400">{user.name}</p>
                        {tab === "followers" && user.followsBack && (
                          <span className="text-[10px] font-semibold text-emerald-600">Follows you back</span>
                        )}
                      </div>
                      <button onClick={() => handleFollow(user._id)} disabled={busy}
                        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50 ${
                          followed
                            ? "border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-600"
                            : "bg-gradient-to-r from-orange-400 to-violet-500 text-white shadow-sm hover:opacity-90"
                        }`}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : followed ? <><UserMinus className="h-3.5 w-3.5" /><span className="hidden xs:inline">Unfollow</span></>
                          : <><UserPlus className="h-3.5 w-3.5" /><span className="hidden xs:inline">Follow</span></>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {FEATURES.map(({ icon: Icon, title, desc, grad, color }) => (
              <div key={title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-orange-200 transition-colors">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${grad}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-sm font-bold text-slate-950">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>

          <section className="app-panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-bold text-slate-950">Recent activity</p>
            </div>
            <div className="divide-y divide-slate-50">
              {acts.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No recent activity yet</p>
              ) : acts.slice(0, 6).map((item, i) => (
                <div key={item._id || i} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-violet-100">
                    <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-700">
                      {item.message || item.description || "New activity"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{item.timeAgo || "Recently"}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 p-4">
              <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-br from-orange-50 to-violet-50 p-3.5">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Community guidelines</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Be respectful and support your fellow creators.</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
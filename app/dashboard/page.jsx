"use client";

import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  ArrowRight, BarChart3, Clapperboard,
  Eye, FileText, Heart, ImageIcon,
  Mic2, PenTool, Radio, Sparkles,
  TrendingUp, Users, Video, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DailyViewsChart from "@/components/daily-views-chart";

const CONTENT_TYPE_META = {
  article:    { icon: FileText,     color: "text-slate-500",    bg: "bg-slate-50"    },
  reel:       { icon: Clapperboard, color: "text-violet-600",   bg: "bg-violet-50"   },
  video:      { icon: Video,        color: "text-blue-600",     bg: "bg-blue-50"     },
  livestream: { icon: Radio,        color: "text-red-600",      bg: "bg-red-50"      },
  podcast:    { icon: Mic2,         color: "text-amber-600",    bg: "bg-amber-50"    },
  carousel:   { icon: ImageIcon,    color: "text-emerald-600",  bg: "bg-emerald-50"  },
};

export default function DashboardPage() {
  const { data: analytics             } = useConvexQuery(api.dashboard.getAnalytics);
  const { data: postsWithAnalytics    } = useConvexQuery(api.dashboard.getPostsWithAnalytics);
  const { data: dailyViews            } = useConvexQuery(api.dashboard.getDailyViews);
  const { data: recentActivity        } = useConvexQuery(api.dashboard.getRecentActivity);

  const stats = [
    { label: "Total views",     value: analytics?.totalViews     || 0, icon: Eye,      color: "text-blue-500"   },
    { label: "Followers",       value: analytics?.totalFollowers || 0, icon: Users,    color: "text-violet-500" },
    { label: "Total likes",     value: analytics?.totalLikes     || 0, icon: Heart,    color: "text-red-500"    },
    { label: "Posts published", value: analytics?.totalPosts     || 0, icon: PenTool,  color: "text-orange-500" },
  ];

  const topPosts   = (postsWithAnalytics || []).slice(0, 5);
  const activity   = recentActivity || [];
  const noContent  = !analytics?.totalViews;

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">

      {/* Header + stats */}
      <section className="app-panel overflow-hidden p-5 md:p-7 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Overview</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Dashboard</h1>
          </div>
          <Link href="/dashboard/create">
            <Button className="soft-button self-start sm:self-auto">
              <PenTool className="h-4 w-4" />
              Create post
            </Button>
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl bg-white/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-500 leading-4">{label}</p>
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {value > 9999
                  ? `${(value / 1000).toFixed(1)}K`
                  : value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Chart + Activity */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">

        <section className="app-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="section-label">Performance</p>
              <p className="mt-1 text-base font-bold text-slate-950">Views over time</p>
            </div>
            <BarChart3 className="h-5 w-5 text-orange-500" />
          </div>
          {(dailyViews || []).length > 0 ? (
            <DailyViewsChart data={dailyViews} />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-50">
              <div className="text-center">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                <p className="text-sm font-semibold text-slate-400">No view data yet</p>
                <p className="mt-1 text-xs text-slate-400">Publish a post to start tracking</p>
              </div>
            </div>
          )}
        </section>

        <section className="app-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="section-label">Activity</p>
              <p className="mt-1 text-base font-bold text-slate-950">Recent</p>
            </div>
            <Zap className="h-4 w-4 text-orange-500" />
          </div>
          {activity.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-slate-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 6).map((item, i) => (
                <div key={item._id || i} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-violet-100">
                    <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-700">
                      {item.description || item.message || "New activity"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {item.timeAgo || "Recently"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Next best move */}
      <section className="app-panel overflow-hidden p-5 md:p-6">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-300 to-violet-300" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-violet-100">
              <Sparkles className="h-6 w-6 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="section-label">AI suggestion</p>
              <h2 className="mt-1 text-base font-bold text-slate-950 sm:text-lg">
                Next best move
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {noContent
                  ? "You haven't published anything yet. Create your first post to start growing your audience and tracking performance."
                  : "Your views are growing. Try a carousel or reel — visual content gets 3× more engagement on this platform."}
              </p>
            </div>
          </div>
          <Link href="/dashboard/create">
            <Button className="soft-button shrink-0 self-start sm:self-auto">
              {noContent ? "Create first post" : "Create content"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Top posts */}
      {topPosts.length > 0 && (
        <section className="app-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
            <div>
              <p className="section-label">Content</p>
              <p className="mt-0.5 text-base font-bold text-slate-950">Top posts</p>
            </div>
            <Link href="/dashboard/posts">
              <Button className="quiet-button h-8 gap-1 px-3 text-xs">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {topPosts.map((post) => {
              const meta = CONTENT_TYPE_META[post.contentType || "article"];
              const Icon = meta?.icon || FileText;
              return (
                <Link key={post._id}
                  href={`/dashboard/posts/edit/${post._id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:gap-4 sm:px-5">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta?.bg || "bg-slate-50"}`}>
                    <Icon className={`h-4 w-4 ${meta?.color || "text-slate-500"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {post.title || "Untitled"}
                    </p>
                    <p className="text-[11px] capitalize text-slate-400">
                      {post.contentType || "post"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {(post.viewCount || 0).toLocaleString()}
                    </span>
                    <span className="hidden items-center gap-1 sm:flex">
                      <Heart className="h-3.5 w-3.5" />
                      {(post.likeCount || 0).toLocaleString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Workspace",     href: "/dashboard/workspace",     icon: Sparkles,   desc: "Idea board"        },
          { label: "Calendar",      href: "/dashboard/calendar",      icon: BarChart3,  desc: "Schedule posts"    },
          { label: "Trends",        href: "/dashboard/trends",        icon: TrendingUp, desc: "Trending topics"   },
          { label: "Monetization",  href: "/dashboard/monetization",  icon: Zap,        desc: "Earn from content" },
        ].map(({ label, href, icon: Icon, desc }) => (
          <Link key={label} href={href}>
            <div className="group soft-panel cursor-pointer p-4 transition-all hover:border-orange-200 hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-violet-50 transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-sm font-bold text-slate-900">{label}</p>
              <p className="mt-0.5 hidden text-[11px] text-slate-400 sm:block">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
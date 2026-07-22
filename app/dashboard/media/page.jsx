"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import {
  Clapperboard, ImageIcon, Loader2,
  Mic2, Plus, Radio, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const MEDIA_TYPES = [
  { id: "all",        label: "All"         },
  { id: "reel",       label: "Reels"       },
  { id: "video",      label: "Videos"      },
  { id: "podcast",    label: "Podcasts"    },
  { id: "carousel",   label: "Carousels"   },
  { id: "livestream", label: "Livestreams" },
];

const TYPE_META = {
  reel:       { icon: Clapperboard, color: "text-violet-600",   bg: "bg-violet-50",   label: "Reel"       },
  video:      { icon: Video,        color: "text-blue-600",     bg: "bg-blue-50",     label: "Video"      },
  podcast:    { icon: Mic2,         color: "text-amber-600",    bg: "bg-amber-50",    label: "Podcast"    },
  carousel:   { icon: ImageIcon,    color: "text-emerald-600",  bg: "bg-emerald-50",  label: "Carousel"   },
  livestream: { icon: Radio,        color: "text-red-600",      bg: "bg-red-50",      label: "Livestream" },
};

const LIVE_QUEUE = [
  { title: "Q&A Session",    scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),  type: "livestream" },
  { title: "Weekly Podcast", scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), type: "podcast"    },
];

export default function MediaStudioPage() {
  const { data: allPosts, isLoading } = useConvexQuery(api.posts.getUserPosts);
  const [filter, setFilter] = useState("all");

  const mediaPosts = useMemo(() => {
    const nonArticle = (allPosts || []).filter(
      (p) => p.contentType && p.contentType !== "article"
    );
    if (filter === "all") return nonArticle;
    return nonArticle.filter((p) => p.contentType === filter);
  }, [allPosts, filter]);

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">

      {/* Header */}
      <section className="app-panel overflow-hidden p-5 md:p-7 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Studio</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Media Studio
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your reels, videos, podcasts, and livestreams.
            </p>
          </div>
          <Link href="/dashboard/create">
            <Button className="soft-button self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              New media
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["reel", "video", "podcast", "carousel"].map((t) => {
            const meta  = TYPE_META[t];
            const Icon  = meta.icon;
            const count = (allPosts || []).filter((p) => p.contentType === t).length;
            return (
              <div key={t} className={`rounded-2xl p-4 ${meta.bg}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <p className="text-[11px] font-semibold text-slate-600">{meta.label}s</p>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-950">{count}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {MEDIA_TYPES.map((t) => (
          <button key={t.id} type="button" onClick={() => setFilter(t.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              filter === t.id
                ? "bg-gradient-to-r from-orange-400 to-violet-500 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">

        {/* Media grid */}
        <div>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : mediaPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-violet-50">
                <Video className="h-8 w-8 text-orange-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">No media found</p>
                <p className="mt-1 text-xs text-slate-400">
                  {filter === "all"
                    ? "Create a reel, video, podcast, or carousel to see it here."
                    : `You have no ${filter}s yet.`}
                </p>
              </div>
              <Link href={`/dashboard/create${filter !== "all" ? `?type=${filter}` : ""}`}>
                <Button className="soft-button">
                  <Plus className="h-4 w-4" />
                  Create {filter !== "all" ? filter : "media"}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mediaPosts.map((post) => {
                const meta = TYPE_META[post.contentType] || TYPE_META.video;
                const Icon = meta.icon;
                return (
                  <Link key={post._id}
                    href={`/dashboard/posts/edit/${post._id}`}
                    className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                      {post.featuredImage ? (
                        <img src={post.featuredImage} alt={post.title || ""}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Icon className={`h-10 w-10 ${meta.color} opacity-20`} />
                        </div>
                      )}
                      <span className={`absolute left-2 top-2 rounded-full ${meta.bg} px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        post.status === "published"
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-400 text-white"
                      }`}>
                        {post.status === "published" ? "Live" : "Draft"}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                        {post.title || "Untitled"}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{(post.viewCount || 0).toLocaleString()} views</span>
                        {post.publishedAt && (
                          <span>
                            {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">

          {/* Scheduled live */}
          <section className="app-panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4">
              <Radio className="h-4 w-4 text-red-500" />
              <p className="text-sm font-bold text-slate-950">Scheduled</p>
            </div>
            <div className="divide-y divide-slate-50">
              {LIVE_QUEUE.map((item, i) => {
                const meta = TYPE_META[item.type] || TYPE_META.livestream;
                const Icon = meta.icon;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(item.scheduledAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4">
              <Link href="/dashboard/create?type=livestream">
                <Button className="quiet-button w-full">
                  <Plus className="h-4 w-4" />
                  Schedule live
                </Button>
              </Link>
            </div>
          </section>

          {/* Quick create */}
          <section className="app-panel p-4">
            <p className="section-label mb-3">Quick create</p>
            <div className="space-y-1">
              {[
                { label: "Reel",      href: "/dashboard/create?type=reel",      icon: Clapperboard },
                { label: "Video",     href: "/dashboard/create?type=video",     icon: Video        },
                { label: "Podcast",   href: "/dashboard/create?type=podcast",   icon: Mic2         },
                { label: "Carousel",  href: "/dashboard/create?type=carousel",  icon: ImageIcon    },
              ].map(({ label, href, icon: Icon }) => (
                <Link key={label} href={href}>
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    Create {label}
                  </div>
                </Link>
              ))}
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
}
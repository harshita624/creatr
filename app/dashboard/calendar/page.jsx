"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Clapperboard, FileText, ImageIcon, List,
  Mic2, PlusCircle, Radio, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const TYPE_META = {
  article:    { label: "Post",     icon: FileText,     dot: "bg-slate-400"   },
  reel:       { label: "Reel",     icon: Clapperboard, dot: "bg-violet-500"  },
  video:      { label: "Video",    icon: Video,        dot: "bg-blue-500"    },
  livestream: { label: "Live",     icon: Radio,        dot: "bg-red-500"     },
  podcast:    { label: "Podcast",  icon: Mic2,         dot: "bg-amber-500"   },
  carousel:   { label: "Carousel", icon: ImageIcon,    dot: "bg-emerald-500" },
};

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildGrid(monthDate) {
  const first      = startOfMonth(monthDate);
  const startDay   = first.getDay();
  const daysInMonth= new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CalendarPage() {
  const { data: postsData, isLoading } = useConvexQuery(api.posts.getUserPosts);
  const posts = postsData || [];
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  // view: "grid" (desktop default) or "list" (mobile default)
  const [view, setView] = useState("grid");

  const { postsByDay, unscheduled } = useMemo(() => {
    const map  = {};
    const loose= [];

    for (const post of posts) {
      const isFuture = post.scheduledFor && post.scheduledFor > Date.now();
      const anchor   = isFuture
        ? post.scheduledFor
        : post.status === "published" ? post.publishedAt : post.scheduledFor;

      if (!anchor) {
        if (post.status === "draft") loose.push(post);
        continue;
      }

      const key = dayKey(new Date(anchor));
      if (!map[key]) map[key] = [];
      map[key].push({ ...post, _anchor: anchor });
    }
    for (const key of Object.keys(map))
      map[key].sort((a, b) => a._anchor - b._anchor);

    return { postsByDay: map, unscheduled: loose };
  }, [posts]);

  const cells   = useMemo(() => buildGrid(monthDate), [monthDate]);
  const todayKey= dayKey(new Date());
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const goToMonth = (delta) =>
    setMonthDate((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  // Posts in the current month for the list view
  const monthPosts = useMemo(() => {
    const result = [];
    cells.forEach((date) => {
      if (!date) return;
      const key = dayKey(date);
      (postsByDay[key] || []).forEach((p) => result.push({ ...p, _dateKey: key, _date: date }));
    });
    return result.sort((a, b) => a._anchor - b._anchor);
  }, [cells, postsByDay]);

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">

      {/* Header */}
      <section className="app-panel overflow-hidden p-4 md:p-6 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-cyan-300" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Content calendar</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">{monthLabel}</h1>
            <p className="mt-1 text-sm text-slate-500 hidden sm:block">
              Every scheduled and published post, colour-coded by format.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => goToMonth(-1)} className="quiet-button h-9 w-9 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={() => setMonthDate(startOfMonth(new Date()))} className="quiet-button h-9 px-3 text-xs">
              Today
            </Button>
            <Button onClick={() => goToMonth(1)} className="quiet-button h-9 w-9 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {/* View toggle — mobile gets list by default */}
            <Button
              onClick={() => setView((v) => v === "grid" ? "list" : "grid")}
              className="quiet-button h-9 w-9 p-0"
              title={view === "grid" ? "List view" : "Grid view"}
            >
              {view === "grid"
                ? <List className="h-4 w-4" />
                : <CalendarDays className="h-4 w-4" />}
            </Button>
            <Link href="/dashboard/create">
              <Button className="soft-button h-9">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden xs:inline">New post</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">

        {/* ── Grid view ─────────────────────────────────────────── */}
        {view === "grid" && (
          <section className="app-panel overflow-hidden p-3 md:p-4">
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-slate-100">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className="bg-white px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">
                  {/* Show full name on sm+ */}
                  <span className="sm:hidden">{d}</span>
                  <span className="hidden sm:inline">
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]}
                  </span>
                </div>
              ))}
              {cells.map((date, i) => {
                if (!date) return (
                  <div key={i} className="min-h-[60px] bg-slate-50/40 sm:min-h-[90px]" />
                );
                const key      = dayKey(date);
                const dayPosts = postsByDay[key] || [];
                const isToday  = key === todayKey;
                return (
                  <div key={i}
                    className={`min-h-[60px] bg-white p-1 sm:min-h-[90px] sm:p-2 ${
                      isToday ? "ring-2 ring-inset ring-orange-300" : ""
                    }`}>
                    <div className={`text-[10px] font-bold sm:text-xs ${
                      isToday ? "text-orange-500" : "text-slate-400"
                    }`}>
                      {date.getDate()}
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {dayPosts.slice(0, 2).map((post) => {
                        const meta = TYPE_META[post.contentType || "article"];
                        return (
                          <Link key={post._id}
                            href={`/dashboard/posts/edit/${post._id}`}
                            className="flex items-center gap-1 rounded bg-slate-50 px-1 py-0.5 text-[9px] font-semibold text-slate-600 hover:bg-orange-50 sm:text-[10px]">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                            <span className="truncate hidden sm:inline">{post.title || "Untitled"}</span>
                          </Link>
                        );
                      })}
                      {dayPosts.length > 2 && (
                        <p className="px-1 text-[9px] font-semibold text-slate-400 sm:text-[10px]">
                          +{dayPosts.length - 2}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── List / agenda view ────────────────────────────────── */}
        {view === "list" && (
          <section className="app-panel overflow-hidden p-4">
            <p className="section-label mb-3">Posts this month</p>
            {monthPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No posts scheduled for {monthLabel}.
              </p>
            ) : (
              <div className="space-y-2">
                {monthPosts.map((post) => {
                  const meta = TYPE_META[post.contentType || "article"];
                  const Icon = meta.icon;
                  return (
                    <Link key={post._id}
                      href={`/dashboard/posts/edit/${post._id}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 hover:border-orange-200 hover:bg-orange-50 transition-colors">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {post.title || "Untitled"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {post._date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {" · "}
                          <span className="capitalize">{post.status}</span>
                        </p>
                      </div>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.dot.replace("bg-", "bg-").replace("-500", "-100")}`}>
                        <Icon className={`h-3.5 w-3.5 ${meta.dot.replace("bg-", "text-")}`} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <aside className="space-y-4">
          {/* Format key */}
          <section className="app-panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-bold text-slate-950">Format key</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <div key={key} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    {meta.label}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Unscheduled drafts */}
          <section className="app-panel p-4">
            <p className="mb-3 text-sm font-bold text-slate-950">Unscheduled drafts</p>
            {isLoading ? (
              <p className="text-xs text-slate-400">Loading...</p>
            ) : unscheduled.length === 0 ? (
              <p className="text-xs text-slate-400">No unscheduled drafts. Nice.</p>
            ) : (
              <div className="space-y-2">
                {unscheduled.slice(0, 8).map((post) => (
                  <Link key={post._id}
                    href={`/dashboard/posts/edit/${post._id}`}
                    className="block rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-orange-50 transition-colors">
                    {post.title || "Untitled draft"}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
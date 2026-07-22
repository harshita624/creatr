"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, Clock, Hash, Loader2, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const COUNTRIES = [
  { code: "IN", flag: "🇮🇳", label: "India"     },
  { code: "US", flag: "🇺🇸", label: "USA"       },
  { code: "GB", flag: "🇬🇧", label: "UK"        },
  { code: "CA", flag: "🇨🇦", label: "Canada"    },
  { code: "AU", flag: "🇦🇺", label: "Australia" },
  { code: "DE", flag: "🇩🇪", label: "Germany"   },
  { code: "JP", flag: "🇯🇵", label: "Japan"     },
  { code: "BR", flag: "🇧🇷", label: "Brazil"    },
];

const CATEGORIES = [
  { id: "technology", label: "Tech"      },
  { id: "design",     label: "Design"    },
  { id: "marketing",  label: "Marketing" },
  { id: "business",   label: "Business"  },
  { id: "lifestyle",  label: "Lifestyle" },
  { id: "education",  label: "Education" },
  { id: "health",     label: "Health"    },
  { id: "finance",    label: "Finance"   },
  { id: "ai",         label: "AI"        },
  { id: "creator",    label: "Creators"  },
];

const REFRESH_INTERVAL = 5 * 60;
const GENERIC = /^(everything about|introduction to|guide to|top \d|best \d|all about|what is)/i;

function buildBlueprints(topics = []) {
  const FORMATS = ["carousel", "reel", "article"];
  return topics
    .filter((t) => t.topic && !GENERIC.test(t.topic))
    .slice(0, 4)
    .map((t, i) => ({
      title:    t.topic,
      hashtags: (t.description?.match(/#\w+/g) || []).slice(0, 3),
      format:   FORMATS[i % FORMATS.length],
    }));
}

function normalise(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    hotTopics:        Array.isArray(raw.hotTopics)         ? raw.hotTopics :
                      Array.isArray(raw.trendingTopics)    ? raw.trendingTopics.map((t) => ({ topic: t.title || t.topic || t, description: "", volume: t.score || 0, growth: 0 })) : [],
    trendingHashtags: Array.isArray(raw.trendingHashtags)  ? raw.trendingHashtags :
                      Array.isArray(raw.predictedHashtags) ? raw.predictedHashtags : [],
    insights:         Array.isArray(raw.insights)          ? raw.insights :
                      Array.isArray(raw.ml_insights)       ? raw.ml_insights : [],
    stats: {
      activeTrends: raw.stats?.activeTrends ?? (raw.hotTopics?.length || 0),
      trendingTags: raw.stats?.trendingTags ?? (raw.trendingHashtags?.length || 0),
      totalVolume:  raw.stats?.totalVolume  ?? "Live",
    },
  };
}

export default function TrendsPage() {
  const [category,  setCategory]  = useState("technology");
  const [country,   setCountry]   = useState("IN"); // default India
  const [trends,    setTrends]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const fetchTrends = useCallback(async (cat, cty) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/trends/categories?category=${cat}&country=${cty}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to fetch trends");
      setTrends(normalise(data));
      setCountdown(REFRESH_INTERVAL);
    } catch (err) {
      toast.error(err.message || "Could not fetch trends — check the ML backend is running.");
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, []);

  useEffect(() => { fetchTrends(category, country); }, [category, country, fetchTrends]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { fetchTrends(category, country); return REFRESH_INTERVAL; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [category, country, fetchTrends]);

  const blueprints = buildBlueprints(trends?.hotTopics || []);
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const currentCountry = COUNTRIES.find((c) => c.code === country);

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">

      {/* Header */}
      <section className="app-panel overflow-hidden p-5 md:p-7 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Discover</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Trends
              {currentCountry && (
                <span className="ml-2 text-xl">{currentCountry.flag}</span>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Trending topics in {currentCountry?.label || "your region"} to fuel your next post.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {mins}:{String(secs).padStart(2, "0")}
            </span>
            <Button onClick={() => fetchTrends(category, country)} disabled={loading} className="quiet-button">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Country selector */}
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Country</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {COUNTRIES.map((c) => (
              <button key={c.code} type="button"
                onClick={() => setCountry(c.code)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                  country === c.code
                    ? "bg-gradient-to-r from-orange-400 to-violet-500 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}>
                <span>{c.flag}</span>
                <span className="hidden sm:inline">{c.label}</span>
                <span className="sm:hidden">{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} type="button"
                onClick={() => setCategory(cat.id)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  category === cat.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Loading / empty */}
      {firstLoad && loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : !trends ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center px-6">
          <TrendingUp className="h-10 w-10 text-slate-200" />
          <div>
            <p className="text-sm font-semibold text-slate-600">No trend data available</p>
            <p className="mt-1 text-xs text-slate-400">Start the ML backend or check your internet connection, then refresh.</p>
          </div>
          <Button onClick={() => fetchTrends(category, country)} className="soft-button">
            <RefreshCw className="h-4 w-4" />Try again
          </Button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Active trends", value: trends.stats.activeTrends || 0,   icon: TrendingUp, bg: "bg-orange-50", color: "text-orange-500" },
              { label: "Trending tags", value: trends.stats.trendingTags || 0,   icon: Hash,       bg: "bg-violet-50", color: "text-violet-500" },
              { label: "Volume",        value: trends.stats.totalVolume  || "—", icon: BarChart3,  bg: "bg-blue-50",   color: "text-blue-500"   },
            ].map(({ label, value, icon: Icon, bg, color }) => (
              <div key={label} className={`rounded-2xl p-3 sm:p-4 ${bg}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <p className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">{label}</p>
                </div>
                <p className="mt-1.5 text-xl font-black text-slate-950 sm:text-2xl">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Hot topics */}
            <section className="app-panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-bold text-slate-950">Hot topics</p>
                <span className="ml-1 text-[10px] text-slate-400">{currentCountry?.flag} {currentCountry?.label}</span>
                {loading && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-slate-300" />}
              </div>
              <div className="divide-y divide-slate-50">
                {(trends.hotTopics || []).length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-slate-400">No topics found — try a different category or country</p>
                ) : (
                  (trends.hotTopics || []).slice(0, 8).map((topic, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[10px] font-black text-orange-500">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {topic.topic || topic.title || topic}
                        </p>
                        {topic.description && <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{topic.description}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                          {topic.volume > 0 && <span>{topic.volume.toLocaleString()} mentions</span>}
                          {topic.growth > 0 && <span className="text-emerald-600">+{topic.growth}%</span>}
                          {topic.location    && <span>{topic.location}</span>}
                        </div>
                      </div>
                      <Link href="/dashboard/create?type=article"
                        className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:border-orange-300 hover:text-orange-600 transition-colors">
                        Write
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Hashtags */}
            <section className="app-panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <Hash className="h-4 w-4 text-violet-500" />
                <p className="text-sm font-bold text-slate-950">Trending hashtags</p>
                <span className="ml-1 text-[10px] text-slate-400">{currentCountry?.flag}</span>
              </div>
              <div className="p-5">
                {(trends.trendingHashtags || []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No hashtags found</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(trends.trendingHashtags || []).map((tag, i) => {
                      const tagStr = typeof tag === "string" ? tag : (tag.tag || tag.keyword || "");
                      if (!tagStr) return null;
                      return (
                        <button key={i}
                          onClick={() => navigator.clipboard.writeText(`#${tagStr.replace(/^#/, "")}`).then(() => toast.success("Copied!"))}
                          className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-100">
                          #{tagStr.replace(/^#/, "")}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Content blueprints */}
          {blueprints.length > 0 && (
            <section className="app-panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <BookOpen className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-bold text-slate-950">Content blueprints</p>
                <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  From {currentCountry?.label} trends
                </span>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {blueprints.map((bp, i) => (
                  <Link key={i} href={`/dashboard/create?type=${bp.format}`}>
                    <div className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-orange-200 hover:bg-orange-50">
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex-1 text-sm font-semibold leading-5 text-slate-900">{bp.title}</p>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold capitalize text-slate-500 shadow-sm">{bp.format}</span>
                      </div>
                      {bp.hashtags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {bp.hashtags.map((tag, j) => (
                            <span key={j} className="text-[11px] font-medium text-violet-600">{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-orange-400" />
                        <span className="text-[11px] font-semibold text-slate-500">Tap to create →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* AI insights */}
          {(trends.insights || []).length > 0 && (
            <section className="app-panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-bold text-slate-950">AI insights</p>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {trends.insights.slice(0, 4).map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 p-4">
                    <Zap className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p className="text-sm leading-5 text-slate-700">{insight}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
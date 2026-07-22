"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useConvexQuery, useConvexMutation } from "@/hooks/use-convex-query";
import { toast } from "sonner";
import {
  ChevronDown, Edit3, Eye, FileText, Filter,
  Loader2, MoreHorizontal, Plus, Search, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

const SORT_OPTIONS = [
  { value: "newest",    label: "Newest first"   },
  { value: "oldest",    label: "Oldest first"   },
  { value: "views",     label: "Most views"     },
  { value: "likes",     label: "Most likes"     },
  { value: "title",     label: "Title A–Z"      },
];

const STATUS_LABELS = {
  all:       "All",
  published: "Published",
  draft:     "Drafts",
};

export default function PostsPage() {
  const { data: postsData, isLoading } = useConvexQuery(api.posts.getUserPosts);
  const { mutate: deletePost }         = useConvexMutation(api.posts.deletePost);

  const [search,       setSearch]       = useState("");
  const [status,       setStatus]       = useState("all");
  const [sort,         setSort]         = useState("newest");
  const [showFilters,  setShowFilters]  = useState(false);
  const [deletingId,   setDeletingId]   = useState(null);

  const posts = postsData || [];

  const filtered = useMemo(() => {
    let list = [...posts];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.title?.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    if (status !== "all") list = list.filter((p) => p.status === status);

    switch (sort) {
      case "oldest":  list.sort((a, b) => a.createdAt - b.createdAt);    break;
      case "views":   list.sort((a, b) => (b.viewCount  || 0) - (a.viewCount  || 0)); break;
      case "likes":   list.sort((a, b) => (b.likeCount  || 0) - (a.likeCount  || 0)); break;
      case "title":   list.sort((a, b) => (a.title || "").localeCompare(b.title || "")); break;
      default:        list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [posts, search, status, sort]);

  const stats = useMemo(() => ({
    total:     posts.length,
    published: posts.filter((p) => p.status === "published").length,
    drafts:    posts.filter((p) => p.status === "draft").length,
    views:     posts.reduce((s, p) => s + (p.viewCount || 0), 0),
  }), [posts]);

  const handleDelete = async (post) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeletingId(post._id);
    try {
      await deletePost({ id: post._id });
      toast.success("Post deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">

      {/* Header */}
      <section className="app-panel overflow-hidden p-4 md:p-6 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Content</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">My posts</h1>
          </div>
          <Link href="/dashboard/create">
            <Button className="soft-button self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              New post
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total",     value: stats.total     },
            { label: "Published", value: stats.published },
            { label: "Drafts",    value: stats.drafts    },
            { label: "Views",     value: stats.views.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-white/80 p-4 text-center">
              <p className="text-2xl font-black text-slate-950">{value}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search + filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="bg-white pl-9"
          />
        </div>

        {/* Filter toggle button (mobile) */}
        <Button onClick={() => setShowFilters((v) => !v)} className="quiet-button sm:hidden">
          <Filter className="h-4 w-4" />
          Filters
          {(status !== "all" || sort !== "newest") && (
            <span className="ml-1 h-2 w-2 rounded-full bg-orange-500" />
          )}
        </Button>

        {/* Desktop: inline filters */}
        <div className="hidden items-center gap-2 sm:flex">
          {/* Status */}
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <button key={val} type="button" onClick={() => setStatus(val)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                status === val
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}>
              {label}
            </button>
          ))}
          {/* Sort */}
          <div className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Mobile filter panel */}
      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:hidden">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
          <div className="mb-4 flex gap-2">
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setStatus(val)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                  status === val ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Sort by</p>
          <div className="grid grid-cols-2 gap-2">
            {SORT_OPTIONS.map((o) => (
              <button key={o.value} type="button" onClick={() => setSort(o.value)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  sort === o.value ? "bg-orange-500 text-white" : "border border-slate-200 text-slate-600"
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Posts list */}
      <div className="app-panel overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="mx-auto mb-3 h-12 w-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-500">
              {search || status !== "all" ? "No posts match your filters" : "No posts yet"}
            </p>
            {!search && status === "all" && (
              <Link href="/dashboard/create">
                <Button className="soft-button mt-4">
                  <Plus className="h-4 w-4" />
                  Create your first post
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((post) => (
              <PostRow key={post._id} post={post}
                onDelete={() => handleDelete(post)}
                deleting={deletingId === post._id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PostRow({ post, onDelete, deleting }) {
  const [showMenu, setShowMenu] = useState(false);
  const contentType = post.contentType || "article";

  return (
    <div className="flex items-start gap-3 px-4 py-4 sm:items-center sm:gap-4">
      {/* Thumbnail */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-16 sm:w-16">
        {post.featuredImage ? (
          <img src={post.featuredImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-6 w-6 text-slate-300" />
          </div>
        )}
        {/* Status badge */}
        <span className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ring-1 ring-white ${
          post.status === "published" ? "bg-emerald-500" : "bg-amber-400"
        }`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className="line-clamp-1 text-sm font-semibold text-slate-900 sm:text-base">
            {post.title || "Untitled"}
          </p>
          <span className="mt-0.5 hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-500 sm:inline">
            {contentType}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className={`font-medium ${post.status === "published" ? "text-emerald-600" : "text-amber-600"}`}>
            {post.status === "published" ? "Published" : "Draft"}
          </span>
          {post.publishedAt && (
            <span>{formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}</span>
          )}
          {/* Stats — visible on sm+ */}
          <span className="hidden items-center gap-1 sm:flex">
            <Eye className="h-3 w-3" />
            {post.viewCount || 0}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <Link href={`/dashboard/posts/edit/${post._id}`}>
          <button className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </Link>

        <div className="relative">
          <button onClick={() => setShowMenu((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <button onClick={() => { onDelete(); setShowMenu(false); }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                  {deleting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
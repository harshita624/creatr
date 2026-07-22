"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Clapperboard, Clock,
  FileText, ImageIcon, Loader2,
  Mic2, PenTool, Radio, Video,
} from "lucide-react";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import PostEditor from "@/components/post-editor";
import { formatDistanceToNow } from "date-fns";

const FORMAT_TYPES = [
  { type: "article",    icon: FileText,    label: "Post / Article", desc: "Long-form articles, tutorials, newsletters or blog posts.",            grad: "from-slate-100 to-slate-200",     accent: "text-slate-600",   border: "hover:border-slate-300"   },
  { type: "reel",       icon: Clapperboard,label: "Reel",           desc: "Short vertical videos for maximum reach and engagement.",              grad: "from-violet-100 to-purple-200",   accent: "text-violet-600",  border: "hover:border-violet-300"  },
  { type: "video",      icon: Video,       label: "Video",          desc: "Long-form video with chapters, subtitles, and AI summaries.",          grad: "from-blue-100 to-sky-200",       accent: "text-blue-600",    border: "hover:border-blue-300"    },
  { type: "livestream", icon: Radio,       label: "Livestream",     desc: "Go live directly from your browser — no software needed.",             grad: "from-red-100 to-rose-200",       accent: "text-red-600",     border: "hover:border-red-300"     },
  { type: "podcast",    icon: Mic2,        label: "Podcast",        desc: "Audio episodes with show notes, chapters, and guest details.",         grad: "from-amber-100 to-yellow-200",   accent: "text-amber-600",   border: "hover:border-amber-300"   },
  { type: "carousel",   icon: ImageIcon,   label: "Carousel",       desc: "Multi-slide visual content. Generate slides from a title with AI.",   grad: "from-emerald-100 to-green-200",  accent: "text-emerald-600", border: "hover:border-emerald-300" },
];

const FORMAT_META = Object.fromEntries(FORMAT_TYPES.map((f) => [f.type, f]));

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-400" /></div>}>
      <CreateContent />
    </Suspense>
  );
}

function CreateContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const type         = searchParams.get("type");

  const { data: currentUser, isLoading: userLoading } = useConvexQuery(api.users.getCurrentUser);
  const { data: allDrafts,   isLoading: draftsLoading}= useConvexQuery(api.posts.getUserPosts, { status: "draft" });
  const drafts = allDrafts || [];

  /* ── Username guard ─────────────────────────────────────────── */
  if (!userLoading && currentUser && !currentUser.username) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-violet-100">
          <PenTool className="h-10 w-10 text-orange-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Set your username first</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">You need a username before you can publish content.</p>
        </div>
        <Link href="/dashboard/settings"><Button className="soft-button">Go to Settings</Button></Link>
      </div>
    );
  }

  /* ── Show editor when type is provided ──────────────────────── */
  if (type) {
    const validTypes = FORMAT_TYPES.map((f) => f.type);
    const safeType   = validTypes.includes(type) ? type : "article";
    // Find existing draft for this exact content type
    const matchingDraft = drafts.find((d) => (d.contentType || "article") === safeType);

    return (
      <div>
        {matchingDraft && (
          <div className="mx-auto max-w-3xl px-4 pt-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">
                  You have an unsaved {safeType} draft: <span className="italic">"{matchingDraft.title || "Untitled"}"</span>
                </p>
              </div>
              <Link href={`/dashboard/posts/edit/${matchingDraft._id}`}>
                <Button className="quiet-button h-8 shrink-0 px-3 text-xs">Continue draft <ArrowRight className="h-3 w-3" /></Button>
              </Link>
            </div>
          </div>
        )}
        <PostEditor initialContentType={safeType} mode="create" />
      </div>
    );
  }

  /* ── Format picker ──────────────────────────────────────────── */
  return (
    <div className="space-y-5 p-4 lg:space-y-6 lg:p-8">

      <section className="app-panel overflow-hidden p-5 md:p-7 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
        <p className="section-label">Studio</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">What are you creating?</h1>
        <p className="mt-2 text-sm text-slate-500">Choose a format to open the right editor for your content type.</p>
      </section>

      {/* DRAFTS SECTION — shown when drafts exist */}
      {drafts.length > 0 && (
        <section className="app-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-bold text-slate-950">Continue a draft</p>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                {drafts.length}
              </span>
            </div>
            <Link href="/dashboard/posts">
              <Button className="quiet-button h-7 px-3 text-xs">View all</Button>
            </Link>
          </div>

          {draftsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : (
            <div className="divide-y divide-slate-50">
              {drafts.slice(0, 5).map((draft) => {
                const meta = FORMAT_META[draft.contentType || "article"];
                const Icon = meta?.icon || FileText;
                return (
                  <Link key={draft._id}
                    href={`/dashboard/posts/edit/${draft._id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 group">
                    {/* Format icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta?.grad || "from-slate-100 to-slate-200"}`}>
                      <Icon className={`h-5 w-5 ${meta?.accent || "text-slate-600"}`} />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                        {draft.title || "Untitled draft"}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="capitalize">{draft.contentType || "article"}</span>
                        <span>·</span>
                        <span>
                          {draft.updatedAt
                            ? `Edited ${formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}`
                            : "Not edited yet"}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 group-hover:border-orange-300 group-hover:text-orange-600 transition-all">
                      Continue
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Format grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FORMAT_TYPES.map(({ type: t, icon: Icon, label, desc, grad, accent, border }) => (
          <button key={t} type="button"
            onClick={() => router.push(`/dashboard/create?type=${t}`)}
            className={`group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-6 ${border}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-0 transition-opacity duration-300 group-hover:opacity-60`} />
            <div className="relative">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} shadow-sm`}>
                <Icon className={`h-6 w-6 ${accent}`} />
              </div>
              <h2 className="text-base font-bold text-slate-950">{label}</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-500">{desc}</p>
              {/* Show draft count badge for this format */}
              {drafts.filter((d) => (d.contentType || "article") === t).length > 0 && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  <Clock className="h-2.5 w-2.5" />
                  {drafts.filter((d) => (d.contentType || "article") === t).length} draft
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
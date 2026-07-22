"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import PostEditor from "@/components/post-editor";
import Link from "next/link";

export default function EditPostPage() {
  const params  = useParams();
  const router  = useRouter();
  const postId  = params.id;

  const {
    data: post,
    isLoading,
    error,
  } = useConvexQuery(api.posts.getById, { id: postId });

  /* ── Loading ─────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Gradient ring spinner */}
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300 p-0.5">
              <div className="h-full w-full rounded-full bg-white" />
            </div>
            <Loader2 className="relative h-7 w-7 animate-spin text-orange-400" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Loading your post</p>
            <p className="mt-1 text-sm text-slate-400">Just a moment…</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error / not found ───────────────────────────────────────── */
  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-violet-50">
          <AlertCircle className="h-10 w-10 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Post not found</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {error
              ? "There was an error loading this post. Please try again."
              : "This post doesn't exist or you don't have permission to edit it."}
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => router.back()}
            className="quiet-button flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
          <Link
            href="/dashboard/posts"
            className="soft-button px-5 py-2.5 text-sm"
          >
            My posts
          </Link>
        </div>
      </div>
    );
  }

  /* ── Editor ──────────────────────────────────────────────────── */
  return <PostEditor initialData={post} mode="edit" />;
}
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { Authenticated, Unauthenticated } from "convex/react";
import {
  ArrowLeft, Bookmark, ChevronLeft, ChevronRight,
  Heart, Loader2, MessageCircle, Music2,
  Send, Share2, Smile, UserCheck, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { SignInButton } from "@clerk/nextjs";

/* ── Slide styles (matches the editor) ────────────────────────────── */
const SLIDE_STYLES = {
  "gradient-dark":  { bg: "bg-gradient-to-br from-slate-900 to-slate-700", text: "text-white",      accent: "text-orange-400" },
  "gradient-light": { bg: "bg-gradient-to-br from-orange-50 to-violet-50",  text: "text-slate-900",  accent: "text-orange-500" },
  "gradient":       { bg: "bg-gradient-to-br from-orange-400 to-violet-500", text: "text-white",      accent: "text-white/80"   },
  "bold":           { bg: "bg-slate-900",                                    text: "text-white",      accent: "text-orange-400" },
  "minimal":        { bg: "bg-white border border-slate-200",                text: "text-slate-900",  accent: "text-orange-500" },
  "card":           { bg: "bg-slate-50 border border-slate-200",             text: "text-slate-900",  accent: "text-violet-600" },
};

function SlideCard({ slide, index, total }) {
  const style = SLIDE_STYLES[slide.template] || SLIDE_STYLES.minimal;
  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden ${style.bg}`}
      style={slide.bgColor ? { backgroundColor: slide.bgColor } : {}}
    >
      {/* Background image */}
      {slide.imageUrl && (
        <Image src={slide.imageUrl} alt="" fill className="object-cover"
          style={{ opacity: slide.imageOpacity ?? 0.4 }} />
      )}
      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
        <p className={`mb-2 text-[11px] font-black uppercase tracking-widest ${style.accent}`}>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
        {slide.title && (
          <h2
            className={`text-xl font-black leading-tight sm:text-2xl lg:text-3xl ${style.text}`}
            style={slide.textColor ? { color: slide.textColor } : {}}
          >
            {slide.title}
          </h2>
        )}
        {slide.caption && (
          <p
            className={`mt-3 text-sm leading-6 opacity-80 sm:text-base ${style.text}`}
            style={slide.textColor ? { color: slide.textColor } : {}}
          >
            {slide.caption}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Moderation (same as feed) ────────────────────────────────────── */
const TOXIC_PATTERNS = [
  /\b(fuck|shit|bitch|ass\b|damn|crap|bastard|cunt|dick|cock|pussy)\b/i,
  /\b(kill|murder|rape|suicide|die|death)\b/i,
  /\b(stupid|idiot|moron|dumb|retard|loser|ugly)\b/i,
  /\b(hate (you|this|it)|i hate|you suck|you('re| are) (terrible|awful|worthless|trash|garbage))\b/i,
  /\b(scam|spam|buy now|click here|free money)\b/i,
];

async function isSafeToPost(text) {
  for (const p of TOXIC_PATTERNS) if (p.test(text)) return false;
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    const res  = await fetch("/api/ai/moderation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }), signal: controller.signal,
    });
    const data = await res.json();
    if (data.safe === false)        return false;
    if ((data.toxicity ?? 0) > 60) return false;
    return true;
  } catch { return true; }
}

export default function PublicPostPage() {
  const params   = useParams();
  const router   = useRouter();
  const username = params.username;
  const postId   = params.postId;

  // FIX: module name is "public", not "publicPosts" — matches convex/public.js
  // and matches how api.public.getPublishedPostsByUsername is already called
  // correctly elsewhere (profile page).
  const post          = useQuery(api.public.getPublishedPost, { username, postId });
  const incrementView = useMutation(api.public.incrementViewCount);
  const toggleLike    = useMutation(api.likes.toggleLike);
  const toggleBm      = useMutation(api.bookmarks.toggleBookmark);
  const addComment    = useMutation(api.comments.addComment);
  const toggleFollow  = useMutation(api.follows.toggleFollow);

  const comments     = useQuery(api.comments.getPostComments,  post ? { postId: post._id } : "skip") ?? [];
  const likedStatus  = useQuery(api.likes.hasUserLiked,        post ? { postId: post._id } : "skip");
  const bmStatus     = useQuery(api.bookmarks.isBookmarked,    post ? { postId: post._id } : "skip");
  const followStatus = useQuery(api.follows.isFollowing,       post?.author ? { followingId: post.author._id } : "skip");

  const [carouselIdx,  setCarouselIdx]  = useState(0);
  const [liked,        setLiked]        = useState(false);
  const [likeCount,    setLikeCount]    = useState(0);
  const [saved,        setSaved]        = useState(false);
  const [following,    setFollowing]    = useState(false);
  const [commentText,  setCommentText]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [showAllCmt,   setShowAllCmt]   = useState(false);
  const inputRef = useRef(null);

  // Seed state from queries
  useEffect(() => { if (likedStatus  !== undefined) setLiked(likedStatus);   }, [likedStatus]);
  useEffect(() => { if (bmStatus     !== undefined) setSaved(bmStatus);       }, [bmStatus]);
  useEffect(() => { if (followStatus !== undefined) setFollowing(followStatus);}, [followStatus]);
  useEffect(() => { if (post?.likeCount !== undefined) setLikeCount(post.likeCount); }, [post?.likeCount]);

  // Increment view once
  useEffect(() => {
    if (post?._id) incrementView({ postId: post._id }).catch(() => {});
  }, [post?._id]);

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    try { await toggleLike({ postId: post._id }); }
    catch { setLiked(!next); setLikeCount((c) => (next ? Math.max(0, c - 1) : c + 1)); }
  };

  const handleSave = async () => {
    setSaved((s) => !s);
    try { await toggleBm({ postId: post._id }); }
    catch { setSaved((s) => !s); }
  };

  const handleFollow = async () => {
    setFollowing((f) => !f);
    try { await toggleFollow({ followingId: post.author._id }); }
    catch { setFollowing((f) => !f); toast.error("Failed to update follow"); }
  };

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }
    catch { toast.error("Could not copy link"); }
  };

  const handleComment = async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const safe = await isSafeToPost(text);
      if (!safe) { toast.error("Your comment contains inappropriate content."); return; }
      await addComment({ postId: post._id, content: text });
      setCommentText("");
      setShowAllCmt(true);
    } catch (err) {
      toast.error(err.message || "Could not post comment");
    } finally { setSubmitting(false); }
  };

  /* ── Loading ─────────────────────────────────────────────────── */
  if (post === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
          <p className="text-sm text-slate-400">Loading post...</p>
        </div>
      </div>
    );
  }

  /* ── Not found ───────────────────────────────────────────────── */
  if (post === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-violet-50">
          <MessageCircle className="h-10 w-10 text-orange-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Post not found</h1>
        <p className="max-w-sm text-sm text-slate-500">
          This post may have been removed or is no longer public.
        </p>
        <div className="flex gap-3">
          <button onClick={() => router.back()}
            className="quiet-button flex items-center gap-2 px-5 py-2.5 text-sm">
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
          {username && (
            <Link href={`/${username}`} className="soft-button px-5 py-2.5 text-sm">
              View profile
            </Link>
          )}
        </div>
      </div>
    );
  }

  const author        = post.author;
  const isCarousel    = post.contentType === "carousel";
  const slides        = post.carouselSlides ?? [];
  const totalSlides   = slides.length;
  const isVideo       = post.contentType === "reel" || post.contentType === "video";
  const isPodcast     = post.contentType === "podcast";
  const caption       = post.title || "";

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex h-[56px] items-center gap-3 border-b border-[#dbdbdb] bg-white/95 px-4 backdrop-blur-sm">
        <button onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="flex-1 truncate text-sm font-bold text-slate-900">{caption || "Post"}</p>
        <button onClick={handleShare}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto max-w-[935px] px-0 py-0 lg:px-5 lg:py-6">
        <div className="flex flex-col gap-0 lg:flex-row lg:gap-8">

          {/* ── Media panel ──────────────────────────────────────── */}
          <div className="w-full lg:flex-1">
            <div
              className="relative overflow-hidden bg-black lg:rounded-2xl"
              style={{ aspectRatio: "1/1" }}
            >
              {/* Carousel */}
              {isCarousel && totalSlides > 0 ? (
                <>
                  <SlideCard
                    slide={slides[carouselIdx]}
                    index={carouselIdx}
                    total={totalSlides}
                  />

                  {carouselIdx > 0 && (
                    <button
                      onClick={() => setCarouselIdx((i) => i - 1)}
                      className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {carouselIdx < totalSlides - 1 && (
                    <button
                      onClick={() => setCarouselIdx((i) => i + 1)}
                      className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}

                  {/* Dot indicators */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                    {slides.map((_, i) => (
                      <button key={i} onClick={() => setCarouselIdx(i)}
                        className={`rounded-full transition-all ${
                          i === carouselIdx ? "w-4 bg-white" : "h-2 w-2 bg-white/50 hover:bg-white/80"
                        } h-2`}
                      />
                    ))}
                  </div>

                  {/* Slide counter */}
                  <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                    {carouselIdx + 1} / {totalSlides}
                  </div>
                </>
              ) : isVideo && post.mediaUrl ? (
                <video
                  src={post.mediaUrl}
                  poster={post.featuredImage}
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : post.featuredImage ? (
                <Image
                  src={post.featuredImage}
                  alt={caption}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 600px"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center px-8"
                  style={{ background: "linear-gradient(135deg,#fff7ed,#fdf2f8,#f5f3ff)" }}
                >
                  <p className="text-center text-2xl font-bold text-slate-800">{caption}</p>
                </div>
              )}
            </div>

            {/* Podcast audio player */}
            {isPodcast && post.mediaUrl && (
              <div className="bg-white p-4 lg:rounded-b-2xl lg:border-t-0 lg:border lg:border-[#dbdbdb]">
                <div className="flex items-center gap-2 mb-3">
                  <Music2 className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-900">Listen to episode</p>
                </div>
                <audio src={post.mediaUrl} controls className="w-full rounded-xl" />
              </div>
            )}

            {/* Slide navigation strip for carousel — mobile */}
            {isCarousel && totalSlides > 1 && (
              <div className="flex gap-2 overflow-x-auto bg-white p-3 no-scrollbar lg:hidden">
                {slides.map((slide, i) => (
                  <button key={i} onClick={() => setCarouselIdx(i)}
                    className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 transition-all ${
                      i === carouselIdx ? "border-orange-400 shadow-md" : "border-transparent opacity-60"
                    }`}>
                    <div className={`h-full w-full flex items-center justify-center text-[10px] font-bold ${
                      (SLIDE_STYLES[slide.template] || SLIDE_STYLES.minimal).bg
                    } ${(SLIDE_STYLES[slide.template] || SLIDE_STYLES.minimal).text}`}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info panel ───────────────────────────────────────── */}
          <div className="flex w-full flex-col bg-white lg:w-[350px] lg:shrink-0 lg:rounded-2xl lg:border lg:border-[#dbdbdb]">

            {/* Author header */}
            <div className="flex items-center gap-3 border-b border-[#efefef] px-4 py-3.5">
              <Link href={`/${author.username}`} className="shrink-0">
                {author.imageUrl ? (
                  <Image src={author.imageUrl} alt={author.name || ""} width={40} height={40}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-[#dbdbdb]" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-sm font-bold text-white">
                    {author.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/${author.username}`}>
                  <p className="text-sm font-bold text-[#262626]">
                    {author.username || author.name}
                  </p>
                </Link>
                <p className="text-xs text-[#8e8e8e] truncate">{author.name}</p>
              </div>
              <Authenticated>
                <button
                  onClick={handleFollow}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    following
                      ? "border border-[#dbdbdb] bg-white text-[#262626] hover:bg-[#fafafa]"
                      : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                  }`}
                >
                  {following
                    ? <><UserCheck className="h-3.5 w-3.5" />Following</>
                    : <><UserPlus className="h-3.5 w-3.5" />Follow</>}
                </button>
              </Authenticated>
              <Unauthenticated>
                <SignInButton mode="modal">
                  <button className="rounded-xl bg-[#0095f6] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1877f2]">
                    Follow
                  </button>
                </SignInButton>
              </Unauthenticated>
            </div>

            {/* Caption */}
            {caption && (
              <div className="border-b border-[#efefef] px-4 py-3.5">
                <div className="flex items-start gap-3">
                  {author.imageUrl ? (
                    <Image src={author.imageUrl} alt="" width={32} height={32}
                      className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-xs font-bold text-white">
                      {author.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[18px] text-[#262626]">
                      <span className="mr-1 font-bold">{author.username || author.name}</span>
                      {caption}
                    </p>
                    {(post.tags ?? []).length > 0 && (
                      <p className="mt-1 text-[13px] text-[#00376b]">
                        {post.tags.map((t) => `#${t}`).join(" ")}
                      </p>
                    )}
                    {post.publishedAt && (
                      <p className="mt-1 text-[11px] text-[#8e8e8e]">
                        {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <p className="text-base font-bold text-[#262626]">No comments yet.</p>
                  <p className="text-sm text-[#8e8e8e]">Start the conversation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(showAllCmt ? comments : comments.slice(0, 5)).map((c) => (
                    <div key={c._id} className="flex items-start gap-3">
                      {c.author?.imageUrl ? (
                        <Image src={c.author.imageUrl} alt="" width={32} height={32}
                          className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efefef] text-xs font-semibold text-[#262626]">
                          {(c.author?.name || c.authorName)?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-[18px] text-[#262626]">
                          <span className="mr-1 font-bold">{c.author?.username || c.authorName}</span>
                          {c.content}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8e8e8e]">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!showAllCmt && comments.length > 5 && (
                    <button onClick={() => setShowAllCmt(true)}
                      className="text-sm font-semibold text-[#8e8e8e] hover:text-[#262626]">
                      View all {comments.length} comments
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="border-t border-[#efefef]">
              <div className="flex items-center justify-between px-2 pt-2.5 pb-1">
                <div className="flex items-center gap-0.5">
                  <Authenticated>
                    <button onClick={handleLike}
                      className="rounded-full p-2 transition-transform active:scale-125">
                      <Heart
                        className={`h-6 w-6 transition-all ${liked ? "fill-red-500 text-red-500" : "text-[#262626]"}`}
                        strokeWidth={liked ? 0 : 2}
                      />
                    </button>
                  </Authenticated>
                  <button
                    onClick={() => { setShowAllCmt(true); setTimeout(() => inputRef.current?.focus(), 80); }}
                    className="rounded-full p-2">
                    <MessageCircle className="h-6 w-6 text-[#262626]" strokeWidth={2} />
                  </button>
                  <button onClick={handleShare} className="rounded-full p-2">
                    <Send className="h-6 w-6 -rotate-12 text-[#262626]" strokeWidth={2} />
                  </button>
                </div>
                <Authenticated>
                  <button onClick={handleSave} className="rounded-full p-2 active:scale-125 transition-transform">
                    <Bookmark
                      className={`h-6 w-6 transition-all ${saved ? "fill-[#262626] text-[#262626]" : "text-[#262626]"}`}
                      strokeWidth={saved ? 0 : 2}
                    />
                  </button>
                </Authenticated>
              </div>

              {likeCount > 0 && (
                <p className="px-4 text-[13px] font-bold text-[#262626]">
                  {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
                </p>
              )}

              {/* Comment input */}
              <Authenticated>
                <div className="flex items-center gap-3 border-t border-[#efefef] px-3 py-3">
                  <Smile className="h-5 w-5 shrink-0 text-[#c7c7c7]" />
                  <input
                    ref={inputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent text-[13px] text-[#262626] outline-none placeholder:text-[#8e8e8e]"
                  />
                  {commentText.trim() && (
                    <button onClick={handleComment} disabled={submitting}
                      className="shrink-0 text-[13px] font-bold text-[#0095f6] disabled:opacity-40 hover:text-[#00376b]">
                      {submitting ? "..." : "Post"}
                    </button>
                  )}
                </div>
              </Authenticated>
              <Unauthenticated>
                <div className="border-t border-[#efefef] px-4 py-3 text-center">
                  <p className="text-[13px] text-[#8e8e8e]">
                    <SignInButton mode="modal">
                      <button className="font-bold text-[#0095f6] hover:text-[#00376b]">Log in</button>
                    </SignInButton>
                    {" "}to like and comment.
                  </p>
                </div>
              </Unauthenticated>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
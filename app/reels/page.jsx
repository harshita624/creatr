"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeft, Bookmark, Heart, MessageCircle,
  Music2, Send, Volume2, VolumeX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

export default function ReelsPage() {
  const feed  = useQuery(api.feed.getFeed, { limit: 20, cursor: 0 });
  const reels = (feed?.posts ?? []).filter(
    (p) => (p.contentType === "reel" || p.contentType === "video") && p.mediaUrl
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [muted,     setMuted]     = useState(true);
  const containerRef              = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let t = false;
    const fn = () => {
      if (t) return; t = true;
      requestAnimationFrame(() => {
        // el.clientHeight = real viewport height (fixed container)
        setActiveIdx(Math.round(el.scrollTop / el.clientHeight));
        t = false;
      });
    };
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, []);

  /* ── Loading ─────────────────────────────────────────────────── */
  if (feed === undefined) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#000" }}
        className="flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-white" />
      </div>
    );
  }

  /* ── Empty ───────────────────────────────────────────────────── */
  if (reels.length === 0) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#000" }}
        className="flex flex-col items-center justify-center gap-4 text-white">
        <Link href="/feed"
          style={{ top: "max(16px, env(safe-area-inset-top))" }}
          className="absolute left-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
          <ArrowLeft className="h-4 w-4" /> Feed
        </Link>
        <Music2 className="h-16 w-16 text-slate-700" />
        <p className="text-xl font-bold">No reels yet</p>
        <p className="px-8 text-center text-sm text-slate-400">Create a reel in your studio.</p>
        <Link href="/dashboard/create?type=reel"
          className="mt-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black">
          Create a reel
        </Link>
      </div>
    );
  }

  return (
    <>
      {/*
        CSS approach:
        .reel-card uses height:100dvh with vh/svh fallbacks.
        dvh = dynamic viewport height — adjusts as browser chrome
        shows/hides. This is the ONLY reliable cross-browser fix.
      */}
      <style>{`
        .reel-card {
          height: 100vh;
          height: 100svh;
          height: 100dvh;
          width: 100%;
          position: relative;
          overflow: hidden;
          background: #000;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          flex-shrink: 0;
        }
        .reel-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Fixed top bar */}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex items-center justify-between px-4"
        style={{ top: 0, paddingTop: "max(14px, env(safe-area-inset-top))" }}
      >
        <Link href="/feed"
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/50 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm">
          <ArrowLeft className="h-4 w-4" /> Feed
        </Link>
        <p className="text-base font-bold text-white drop-shadow">Reels</p>
        <button onClick={() => setMuted((m) => !m)}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/*
        position:fixed + inset:0 pins to the REAL visual viewport.
        overflow-y:scroll + scroll-snap gives swipe behaviour.
        Each card is .reel-card (height:100dvh) so it fills exactly
        what the user sees — no partial cards, no gray gaps.
      */}
      <div
        ref={containerRef}
        className="reel-scroll"
        style={{
          position: "fixed",
          inset: 0,
          overflowY: "scroll",
          overflowX: "hidden",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          background: "#000",
        }}
      >
        {reels.map((post, idx) => (
          <ReelCard
            key={post._id}
            post={post}
            isActive={idx === activeIdx}
            muted={muted}
          />
        ))}
      </div>
    </>
  );
}

/* ─── One reel card ────────────────────────────────────────────── */
function ReelCard({ post, isActive, muted }) {
  const bgRef    = useRef(null);   // blurred backdrop
  const videoRef = useRef(null);   // main video

  const toggleLike     = useMutation(api.likes.toggleLike);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
  const addComment     = useMutation(api.comments.addComment);

  const [liked,        setLiked]        = useState(post.isLiked ?? false);
  const [likeCount,    setLikeCount]    = useState(post.likeCount ?? 0);
  const [saved,        setSaved]        = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText,  setCommentText]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);

  const postComments = useQuery(api.comments.getPostComments, { postId: post._id });

  /* Play both videos together; pause when off-screen */
  useEffect(() => {
    const v  = videoRef.current;
    const bg = bgRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().catch(() => {});
      if (bg) { bg.currentTime = 0; bg.play().catch(() => {}); }
    } else {
      v.pause(); v.currentTime = 0;
      if (bg) { bg.pause(); bg.currentTime = 0; }
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
    // backdrop is always muted
  }, [muted]);

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    try { await toggleLike({ postId: post._id }); }
    catch { setLiked(!next); setLikeCount((c) => (next ? Math.max(0, c - 1) : c + 1)); }
  };

  const handleSave = async () => {
    setSaved((s) => !s);
    try { await toggleBookmark({ postId: post._id }); }
    catch { setSaved((s) => !s); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/${post.author?.username}/${post._id}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied!"); }
    catch { toast.error("Could not copy link"); }
  };

  const submitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment({ postId: post._id, content: commentText.trim() });
      setCommentText("");
    } catch (err) { toast.error(err.message || "Could not post"); }
    finally { setSubmitting(false); }
  };

  const commentCount = (postComments ?? []).length || post.commentCount || 0;

  return (
    /*
      .reel-card supplies height: 100dvh via CSS (with fallbacks).
      The two videos inside use position:absolute + inset:0 + 100%
      dimensions to fill it completely.

      WHY TWO VIDEOS?
      ────────────────
      Landscape videos (16:9 shot in 9:16 player) show black bars
      with object-fit:contain. The blurred backdrop (object-fit:cover)
      fills those black areas — exactly what TikTok and Instagram do.
      The main video stays un-cropped (contain) so nothing is cut off.
    */
    <div className="reel-card">

      {/* ① Blurred backdrop — covers black bars for non-portrait videos */}
      <video
        ref={bgRef}
        src={post.mediaUrl}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          filter: "blur(18px)",
          transform: "scale(1.06)", // hide blur edges
          opacity: 0.75,
        }}
        muted playsInline loop preload="none" aria-hidden="true"
      />

      {/* ② Main video — always fully visible, never cropped */}
      <video
        ref={videoRef}
        src={post.mediaUrl}
        poster={post.featuredImage}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "contain",    // ← key: show full frame
          objectPosition: "center",
        }}
        loop playsInline muted={muted} preload="metadata"
      />

      {/* Gradient for text legibility */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 25%, transparent 50%, rgba(0,0,0,0.85) 100%)",
        pointerEvents: "none",
      }} />

      {/* ── Right-side actions ────────────────────────────────── */}
      <div style={{
        position: "absolute", right: 12, zIndex: 20,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        bottom: "calc(max(90px, env(safe-area-inset-bottom) + 80px))",
      }}>
        {/* Author avatar */}
        <Link href={post.author?.username ? `/${post.author.username}` : "#"}
          style={{ position: "relative", display: "block" }}>
          <div className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-white">
            {post.author?.imageUrl ? (
              <Image src={post.author.imageUrl} alt={post.author.name || ""} width={44} height={44} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-300 to-violet-400 text-sm font-bold text-white">
                {post.author?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full text-[10px] font-black text-white ring-1 ring-black"
            style={{ bottom: -8, background: "#ff3040" }}>+</div>
        </Link>

        <ReelBtn icon={<Heart className={`h-7 w-7 ${liked ? "fill-[#ff3040] text-[#ff3040]" : "text-white"}`} />} count={likeCount} onClick={handleLike} />
        <ReelBtn icon={<MessageCircle className="h-7 w-7 text-white" />} count={commentCount} onClick={() => setShowComments((v) => !v)} />
        <ReelBtn icon={<Send className="h-7 w-7 -rotate-12 text-white" />} onClick={handleShare} />
        <ReelBtn icon={<Bookmark className={`h-7 w-7 ${saved ? "fill-white text-white" : "text-white"}`} />} onClick={handleSave} />
      </div>

      {/* ── Bottom info ───────────────────────────────────────── */}
      <div style={{
        position: "absolute", left: 12, right: 76, zIndex: 20,
        bottom: "calc(max(24px, env(safe-area-inset-bottom) + 16px))",
      }}>
        <Link href={post.author?.username ? `/${post.author.username}` : "#"}>
          <p className="text-[14px] font-bold text-white drop-shadow">@{post.author?.username || post.author?.name}</p>
        </Link>
        {post.title && <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-white/90 drop-shadow">{post.title}</p>}
        {(post.tags ?? []).length > 0 && <p className="mt-0.5 text-[12px] text-white/70">{post.tags.map((t) => `#${t}`).join(" ")}</p>}
        {/* Music info - shows chosen music from postMeta */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <Music2 className="h-3.5 w-3.5 text-white/60" />
          <p className="text-[11px] text-white/60 truncate max-w-[200px]">
            {post.postMeta?.music
              ? post.postMeta.music
              : `Original audio · ${post.author?.username || "Creator"}`}
          </p>
        </div>
      </div>

      {/* ── Comments sheet ─────────────────────────────────────── */}
      {showComments && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
          onClick={() => setShowComments(false)}
        >
          <div className="max-h-[65vh] min-h-[35vh] overflow-hidden rounded-t-3xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#efefef] px-5 py-4">
              <p className="text-sm font-semibold text-[#262626]">{commentCount} comments</p>
              <button onClick={() => setShowComments(false)} className="text-sm font-semibold text-[#8e8e8e]">✕</button>
            </div>
            <div className="max-h-[calc(65vh-110px)] overflow-y-auto px-5 py-3 space-y-3">
              {(postComments ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-[#8e8e8e]">No comments yet. Be first!</p>
              ) : (postComments ?? []).map((c) => (
                <div key={c._id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efefef] text-xs font-semibold text-[#262626]">
                    {(c.author?.name || c.authorName)?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="mr-1 text-[13px] font-semibold text-[#262626]">{c.author?.username || c.authorName}</span>
                    <span className="text-[13px] text-[#262626]">{c.content}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 border-t border-[#efefef] px-5 py-3"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                placeholder="Add a comment..."
                className="flex-1 rounded-full border border-[#dbdbdb] bg-[#fafafa] px-4 py-2 text-[13px] text-[#262626] outline-none" />
              {commentText.trim() && (
                <button onClick={submitComment} disabled={submitting} className="shrink-0 text-[13px] font-semibold text-[#0095f6] disabled:opacity-40">Post</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReelBtn({ icon, count, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 transition-transform active:scale-90">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm">{icon}</div>
      {count > 0 && <span className="text-[12px] font-bold text-white drop-shadow">{count > 999 ? `${(count / 1000).toFixed(1)}K` : count}</span>}
    </button>
  );
}
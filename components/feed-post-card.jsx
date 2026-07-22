"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import {
  Bookmark, ChevronLeft, ChevronRight,
  Heart, MessageCircle, MoreHorizontal,
  Send, Smile,
} from "lucide-react";
import { toast } from "sonner";

/*
  TWO-STAGE MODERATION
  ────────────────────
  Stage 1 (sync, instant) — local regex.
    Uses \w* suffix on root words to catch ALL inflections:
      shit  → shitty, shithead, shitface
      fuck  → fucking, fucker, fucked
      bitch → bitches, bitching, bitchy
    Also catches directed phrases ("bad face", "you ugly", etc.)

  Stage 2 (async, 3s timeout) — AI moderation API.
    Catches context-dependent toxicity the regex misses.
    Fails OPEN (allows) if the service is down.
*/

const TOXIC_PATTERNS = [
  // Strong profanity + ALL word-form variations (shitty, fucking, bitches …)
  /\b(fuck\w*|shit\w*|bitch\w*|ass(?:hole\w*|\s*wipe)?|bastard\w*|cunt\w*|dick\w*|cock(?:sucker)?\w*|pussy\w*|piss\w*|crap\w*|damn\w*)\b/i,
  // Violence / self-harm
  /\b(kill\w*|murder\w*|rap(?:e|ing|ed)\w*|suicid\w*|hang\w*|shoot\w*|stab\w*|die\b|death)\b/i,
  // Personal insults (standalone)
  /\b(stupid|idiot|moron|dumbass|dumb\b|retard\w*|loser\b|ugly\b|disgusting|pathetic|worthless|useless|horrible|awful)\b/i,
  // Directed body / face shaming — "bad face", "ugly face", "terrible person"
  /\b(bad|ugly|gross|horrible|nasty|terrible|awful|disgusting)\s+(face|person|body|hair|skin|look\w*|voice)\b/i,
  // "you are / u r [insult]" pattern — catches "you bad", "u r ugly" etc.
  /\b(you|u|ur|you're|you are)\s+(bad\b|ugly\b|terrible\b|horrible\b|stupid\b|dumb\b|fat\b|gross\b|nasty\b|worthless\b|useless\b|trash\b|garbage\b|disgusting\b)/i,
  // Hate speech keywords
  /\b(racist\w*|sexist\w*|nazi\w*|terrorist\w*)\b/i,
  // Spam
  /\b(spam|scam|buy\s+now|click\s+here|free\s+money|dm\s+me|follow\s*4\s*follow|f4f|like\s*4\s*like|l4l)\b/i,
];

async function isSafeToPost(text) {
  const t = text.trim();
  if (!t) return false;

  // Stage 1: instant local check
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(t)) return false;
  }

  // Stage 2: AI check (3s timeout, fail open)
  try {
    const ctrl    = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);
    const res     = await fetch("/api/ai/moderation", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: t }),
      signal:  ctrl.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.safe === false)           return false;
    if ((data.toxicity ?? 0) > 60)    return false;
    if ((data.spam     ?? 0) > 70)    return false;
    return true;
  } catch {
    return true; // AI unavailable → local check already passed
  }
}

/* ── Slide preview for carousel posts ──────────────────────────── */
const SLIDE_STYLES = {
  "gradient-dark":  { bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", text: "#fff",    accent: "#f97316" },
  "gradient-light": { bg: "linear-gradient(135deg,#fff7ed,#fdf2f8,#f5f3ff)", text: "#0f172a", accent: "#f97316" },
  "gradient":       { bg: "linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)", text: "#fff",    accent: "rgba(255,255,255,0.8)" },
  "bold":           { bg: "#0f172a",  text: "#fff",    accent: "#f97316" },
  "minimal":        { bg: "#ffffff",  text: "#0f172a", accent: "#f97316" },
  "card":           { bg: "#f8fafc",  text: "#0f172a", accent: "#8b5cf6" },
};

function FeedSlidePreview({ slide, index, total }) {
  const s = SLIDE_STYLES[slide.template] || SLIDE_STYLES.minimal;
  return (
    <div style={{ position: "absolute", inset: 0, background: slide.bgColor || s.bg, overflow: "hidden" }}>
      {slide.imageUrl && (
        <img src={slide.imageUrl} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: slide.imageOpacity ?? 0.35 }} />
      )}
      <div style={{ position: "absolute", inset: 0, padding: "clamp(12px,5%,28px)", display: "flex", flexDirection: "column", justifyContent: slide.layout === "cover" ? "center" : "flex-end" }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: slide.accentColor || s.accent, marginBottom: 6 }}>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
        {slide.title && (
          <h2 style={{ margin: 0, fontSize: "clamp(13px,3.5vw,20px)", fontWeight: 900, lineHeight: 1.2, color: slide.textColor || s.text }}>
            {slide.title}
          </h2>
        )}
        {slide.caption && (
          <p style={{ margin: "6px 0 0", fontSize: "clamp(10px,2.5vw,13px)", lineHeight: 1.5, color: slide.textColor || s.text, opacity: 0.8 }}>
            {slide.caption}
          </p>
        )}
      </div>
    </div>
  );
}

export default function FeedPostCard({ post }) {
  const toggleLike     = useMutation(api.likes.toggleLike);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
  const addComment     = useMutation(api.comments.addComment);
  const postComments   = useQuery(api.comments.getPostComments, { postId: post._id });
  const bookmarkStatus = useQuery(api.bookmarks.isBookmarked,   { postId: post._id });

  const [liked,        setLiked]        = useState(post.isLiked ?? false);
  const [likeCount,    setLikeCount]    = useState(post.likeCount ?? 0);
  const [saved,        setSaved]        = useState(false);
  const [showBurst,    setShowBurst]    = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText,  setCommentText]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [carouselIdx,  setCarouselIdx]  = useState(0);

  const lastTap  = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => { if (bookmarkStatus !== undefined) setSaved(bookmarkStatus); }, [bookmarkStatus]);

  const isCarousel     = post.contentType === "carousel";
  const carouselSlides = post.carouselSlides ?? [];
  const isVideo        = post.mediaUrl && (post.contentType === "reel" || post.contentType === "video");
  const imgSrc         = post.featuredImage || (!isVideo ? post.mediaUrl : null);
  const hasMedia       = isVideo || !!imgSrc || isCarousel;

  const handleDoubleTap = useCallback(async () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 900);
      if (!liked) {
        setLiked(true); setLikeCount((c) => c + 1);
        try { await toggleLike({ postId: post._id }); }
        catch { setLiked(false); setLikeCount((c) => Math.max(0, c - 1)); }
      }
    }
    lastTap.current = now;
  }, [liked, post._id, toggleLike]);

  const handleLike = async () => {
    const next = !liked;
    setLiked(next); setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
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

  const handleComment = async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const safe = await isSafeToPost(text);
      if (!safe) {
        toast.error("Your comment was flagged as inappropriate and cannot be posted.", { duration: 4000 });
        return;
      }
      await addComment({ postId: post._id, content: text });
      setCommentText(""); setShowComments(true);
    } catch (err) { toast.error(err.message || "Could not post comment"); }
    finally { setSubmitting(false); }
  };

  const author   = post.author;
  const caption  = post.title || "";
  const LIMIT    = 125;
  const comments = postComments ?? [];

  return (
    <article className="overflow-hidden bg-white border-b border-[#dbdbdb] lg:border lg:border-[#dbdbdb] lg:rounded-md">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Link href={author?.username ? `/${author.username}` : "#"} className="shrink-0">
          {author?.imageUrl ? (
            <div className="h-[34px] w-[34px] overflow-hidden rounded-full ring-1 ring-[#dbdbdb]">
              <Image src={author.imageUrl} alt={author.name || ""} width={34} height={34} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-violet-500 text-xs font-bold text-white">
              {author?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={author?.username ? `/${author.username}` : "#"}>
              <p className="text-[13px] font-semibold text-[#262626]">{author?.username || author?.name}</p>
            </Link>
            {post.contentType && post.contentType !== "article" && (
              <span className="hidden rounded-full bg-[#efefef] px-2 py-0.5 text-[10px] font-medium capitalize text-[#8e8e8e] sm:inline">
                {post.contentType}
              </span>
            )}
          </div>
          {post.postMeta?.location && <p className="text-[11px] text-[#737373]">{post.postMeta.location}</p>}
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setShowMenu((v) => !v)} className="p-1">
            <MoreHorizontal className="h-5 w-5 text-[#262626]" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 w-48 overflow-hidden rounded-2xl border border-[#dbdbdb] bg-white shadow-2xl">
                {[
                  { label: "Copy link",      fn: () => { handleShare(); setShowMenu(false); } },
                  { label: "Not interested", fn: () => setShowMenu(false) },
                  { label: "Report",         fn: () => { toast.info("Reported"); setShowMenu(false); } },
                ].map(({ label, fn }) => (
                  <button key={label} onClick={fn}
                    className="block w-full border-b border-[#efefef] px-4 py-3 text-left text-sm text-[#262626] last:border-0 hover:bg-[#fafafa]">
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Media */}
      {isCarousel && carouselSlides.length > 0 ? (
        <div style={{ position: "relative", aspectRatio: "1/1", background: "#000" }} onClick={handleDoubleTap}>
          <div style={{ position: "absolute", inset: 0 }}>
            <FeedSlidePreview slide={carouselSlides[carouselIdx]} index={carouselIdx} total={carouselSlides.length} />
          </div>
          {carouselIdx > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setCarouselIdx((i) => i - 1); }}
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {carouselIdx < carouselSlides.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setCarouselIdx((i) => i + 1); }}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
            {carouselSlides.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCarouselIdx(i); }}
                className={`rounded-full transition-all h-1.5 ${i === carouselIdx ? "w-3 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            {carouselIdx + 1} / {carouselSlides.length}
          </div>
          {showBurst && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="heart-burst select-none text-[90px] drop-shadow-2xl">❤️</span>
            </div>
          )}
        </div>
      ) : isVideo ? (
        <div className="relative select-none bg-black" style={{ aspectRatio: "1/1" }} onClick={handleDoubleTap}>
          <video src={post.mediaUrl} className="absolute inset-0 h-full w-full object-cover" muted playsInline autoPlay loop />
          {showBurst && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="heart-burst text-[90px]">❤️</span></div>}
        </div>
      ) : imgSrc ? (
        <div className="relative select-none bg-[#efefef]" style={{ aspectRatio: "1/1" }} onClick={handleDoubleTap}>
          <Image src={imgSrc} alt={caption || "Post"} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 574px" />
          {showBurst && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="heart-burst text-[90px]">❤️</span></div>}
        </div>
      ) : (
        <div className="relative select-none px-8 py-14" style={{ background: "linear-gradient(135deg,#fff7ed,#fdf2f8,#f5f3ff)", minHeight: 180 }} onClick={handleDoubleTap}>
          <p className="text-center text-lg font-semibold leading-7 text-[#262626]">{caption}</p>
          {showBurst && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="heart-burst text-[80px]">❤️</span></div>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-2 pt-2.5 pb-0.5">
        <div className="flex items-center gap-0.5">
          <button onClick={handleLike} className="p-1.5 active:scale-125 transition-transform" aria-label="Like">
            <Heart className={`h-[26px] w-[26px] transition-all duration-150 ${liked ? "fill-red-500 text-red-500" : "text-[#262626]"}`} strokeWidth={liked ? 0 : 2} />
          </button>
          <button onClick={() => { setShowComments(true); setTimeout(() => inputRef.current?.focus(), 50); }} className="p-1.5">
            <MessageCircle className="h-[26px] w-[26px] text-[#262626]" strokeWidth={2} />
          </button>
          <button onClick={handleShare} className="p-1.5">
            <Send className="h-[26px] w-[26px] -rotate-12 text-[#262626]" strokeWidth={2} />
          </button>
        </div>
        <button onClick={handleSave} className="p-1.5 active:scale-125 transition-transform">
          <Bookmark className={`h-[26px] w-[26px] transition-all duration-150 ${saved ? "fill-[#262626] text-[#262626]" : "text-[#262626]"}`} strokeWidth={saved ? 0 : 2} />
        </button>
      </div>

      <div className="px-3 pb-1 pt-1">
        {likeCount > 0 && <p className="text-[13px] font-semibold text-[#262626]">{likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}</p>}
        {caption && hasMedia && (
          <p className="mt-0.5 text-[13px] leading-[18px] text-[#262626]">
            <Link href={author?.username ? `/${author.username}` : "#"} className="mr-1 font-semibold">{author?.username || author?.name}</Link>
            {caption.length > LIMIT && !expanded ? (
              <>{caption.slice(0, LIMIT)}<button onClick={() => setExpanded(true)} className="ml-1 text-[#8e8e8e]">...more</button></>
            ) : caption}
          </p>
        )}
        {(post.tags ?? []).length > 0 && <p className="mt-0.5 text-[13px] text-[#00376b]">{post.tags.map((t) => `#${t}`).join(" ")}</p>}
        {comments.length > 2 && !showComments && (
          <button onClick={() => setShowComments(true)} className="mt-0.5 block text-[13px] text-[#8e8e8e]">View all {comments.length} comments</button>
        )}
        {!showComments && comments.slice(-2).map((c) => (
          <p key={c._id} className="mt-0.5 text-[13px] leading-[18px] text-[#262626]">
            <span className="mr-1 font-semibold">{c.author?.username || c.authorName}</span>{c.content}
          </p>
        ))}
        {showComments && (
          <div className="mt-1 max-h-52 space-y-2 overflow-y-auto">
            {comments.map((c) => (
              <div key={c._id} className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#efefef] text-[10px] font-semibold text-[#262626]">
                  {(c.author?.name || c.authorName)?.charAt(0)?.toUpperCase()}
                </div>
                <p className="min-w-0 flex-1 text-[13px] leading-[18px] text-[#262626]">
                  <span className="mr-1 font-semibold">{c.author?.username || c.authorName}</span>{c.content}
                </p>
              </div>
            ))}
          </div>
        )}
        {post.publishedAt && <p className="mb-2 mt-1.5 text-[10px] text-[#8e8e8e]">{formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}</p>}
      </div>

      {/* Comment input */}
      <div className="flex items-center gap-3 border-t border-[#efefef] px-3 py-2.5">
        <Smile className="h-5 w-5 shrink-0 text-[#c7c7c7]" />
        <input ref={inputRef} value={commentText} onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
          placeholder="Add a comment..."
          className="flex-1 bg-transparent text-[13px] text-[#262626] outline-none placeholder:text-[#8e8e8e]" />
        {commentText.trim() && (
          <button onClick={handleComment} disabled={submitting}
            className="shrink-0 text-[13px] font-semibold text-[#0095f6] disabled:opacity-40 hover:text-[#00376b]">
            {submitting ? "..." : "Post"}
          </button>
        )}
      </div>
    </article>
  );
}
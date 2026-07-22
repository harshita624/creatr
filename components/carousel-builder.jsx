"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlignCenter, AlignLeft, AlignRight, Check, Copy, Eye, EyeOff,
  LayoutTemplate, Loader2, Plus, Trash2, Upload,
  Layers, ChevronLeft, ChevronRight, Wand2, X,
  Palette, Type, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadToImageKit } from "@/lib/imagekit";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: "clean",     label: "Clean",     bg: "#ffffff",  text: "#0f172a", accent: "#f97316", gradient: null },
  { id: "bold",      label: "Bold",      bg: "#0f172a",  text: "#f8fafc", accent: "#f97316", gradient: null },
  { id: "editorial", label: "Editorial", bg: "#fafaf9",  text: "#1c1917", accent: "#8b5cf6", gradient: null },
  { id: "minimal",   label: "Minimal",   bg: "#f1f5f9",  text: "#334155", accent: "#0ea5e9", gradient: null },
  { id: "vibrant",   label: "Vibrant",   bg: "#7c3aed",  text: "#ffffff", accent: "#fbbf24", gradient: "linear-gradient(135deg,#7c3aed,#ec4899)" },
  { id: "sunset",    label: "Sunset",    bg: "#f97316",  text: "#ffffff", accent: "#fef08a", gradient: "linear-gradient(135deg,#f97316,#fb923c,#fef08a)" },
  { id: "ocean",     label: "Ocean",     bg: "#0ea5e9",  text: "#ffffff", accent: "#7dd3fc", gradient: "linear-gradient(135deg,#0ea5e9,#0284c7)" },
  { id: "dark",      label: "Dark",      bg: "#18181b",  text: "#fafafa", accent: "#22d3ee", gradient: null },
  { id: "rose",      label: "Rose",      bg: "#fff1f2",  text: "#881337", accent: "#e11d48", gradient: null },
  { id: "forest",    label: "Forest",    bg: "#052e16",  text: "#f0fdf4", accent: "#86efac", gradient: "linear-gradient(135deg,#052e16,#14532d)" },
];

const LAYOUTS = [
  { id: "cover", label: "Cover",  desc: "Hero opener",    icon: "⬛" },
  { id: "split", label: "Split",  desc: "Title + body",   icon: "⬜" },
  { id: "quote", label: "Quote",  desc: "Pull quote",     icon: "❝"  },
  { id: "stat",  label: "Stat",   desc: "Big number",     icon: "🔢" },
  { id: "cta",   label: "CTA",    desc: "Call to action", icon: "→"  },
];

const FONT_SIZES = [
  { id: "sm", label: "S",  title: "1.1rem",  caption: "0.68rem" },
  { id: "md", label: "M",  title: "1.35rem", caption: "0.78rem" },
  { id: "lg", label: "L",  title: "1.6rem",  caption: "0.86rem" },
  { id: "xl", label: "XL", title: "2rem",    caption: "1rem"    },
];

const COLOR_PRESETS = {
  bg:     ["#ffffff","#0f172a","#18181b","#f1f5f9","#fafaf9","#7c3aed","#ec4899","#f97316","#0ea5e9","#10b981","#052e16","#fff1f2"],
  text:   ["#0f172a","#1e293b","#ffffff","#f8fafc","#334155","#7c3aed","#f97316","#0ea5e9","#10b981","#881337"],
  accent: ["#f97316","#fbbf24","#8b5cf6","#ec4899","#0ea5e9","#10b981","#22d3ee","#ef4444","#ffffff","#0f172a"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
export function resolveSlideStyle(slide) {
  const tpl = TEMPLATES.find((t) => t.id === (slide.template || "clean")) || TEMPLATES[0];
  const rawBg = slide.bgColor || tpl.gradient || tpl.bg;
  const isGradient = typeof rawBg === "string" && (rawBg.startsWith("linear") || rawBg.startsWith("radial"));
  return { bg: rawBg, isGradient, text: slide.textColor || tpl.text, accent: slide.accentColor || tpl.accent };
}

function resolveFonts(slide) {
  return FONT_SIZES.find((f) => f.id === (slide.fontSize || "lg")) || FONT_SIZES[2];
}

// ─────────────────────────────────────────────────────────────────────────────
// SlideCanvas — the visual card (edit + preview)
// Sizing is done with pure CSS clamp() (viewport-relative), NOT a JS
// ResizeObserver measurement. clamp() is driven by the browser's layout
// engine directly and cannot create a feedback loop the way JS-measured,
// state-driven sizing can — so this is safe on mobile.
// ─────────────────────────────────────────────────────────────────────────────
export function SlideCanvas({ slide, index, editing = false, onUpdate, compact = false }) {
  const s  = resolveSlideStyle(slide);
  const f  = resolveFonts(slide);
  const ta = slide.textAlign || "left";

  const isCover = slide.layout === "cover";
  const isQuote = slide.layout === "quote";
  const isStat  = slide.layout === "stat";
  const isCta   = slide.layout === "cta";

  const bgStyle = s.isGradient ? { background: s.bg } : { backgroundColor: s.bg };

  const accentBarAlign =
    ta === "center" ? { margin: "0 auto 10px" } :
    ta === "right"  ? { marginLeft: "auto", marginBottom: "10px" } :
                      { marginBottom: "10px" };

  const titleSize = compact
    ? (isCover ? "clamp(0.9rem,3.2vw,1.3rem)" : "clamp(0.8rem,2.8vw,1.1rem)")
    : (isCover || isStat ? "clamp(1.4rem,7vw,2rem)" : `clamp(1rem,6vw,${f.title})`);
  const captionSize = compact
    ? "clamp(0.6rem,1.8vw,0.75rem)"
    : (isCta ? "clamp(0.8rem,3.5vw,1rem)" : `clamp(0.65rem,3vw,${f.caption})`);
  const statSize = compact ? "clamp(1.4rem,4vw,2rem)" : "clamp(2rem,11vw,3.5rem)";
  const px = compact ? "px-3 pb-3 pt-8" : "px-4 sm:px-5 pb-4 sm:pb-5 pt-8 sm:pt-12";

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-lg"
      style={{ aspectRatio: "4/5", color: s.text, ...bgStyle }}
    >
      {slide.imageUrl && (
        <img src={slide.imageUrl} alt=""
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          style={{ opacity: slide.imageOpacity ?? 0.18 }} />
      )}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 80% 10%, ${s.accent}28 0%, transparent 55%)` }} />

      {/* Slide number */}
      <div className={`absolute top-2 left-3 z-10 flex items-center gap-1 ${compact ? "" : "top-4 left-4"}`}>
        <span className="font-black uppercase tracking-widest" style={{ fontSize: compact ? "0.55rem" : "0.7rem", color: s.accent }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="opacity-40" style={{ fontSize: compact ? "0.5rem" : "0.65rem", color: s.text }}>
          · {slide.layout}
        </span>
      </div>

      {isQuote && (
        <div className="absolute top-6 sm:top-8 left-3 z-10 font-black leading-none pointer-events-none"
          style={{ fontSize: compact ? "2.5rem" : "clamp(2.5rem,9vw,4rem)", color: s.accent, opacity: 0.25 }}>
          &ldquo;
        </div>
      )}

      <div className={`absolute inset-0 z-10 flex flex-col ${px} ${isCover ? "justify-center" : "justify-end"}`}
        style={{ textAlign: ta }}>
        {!isCover && !isQuote && (
          <div className="rounded-full shrink-0"
            style={{ height: "2px", width: compact ? "16px" : "24px", backgroundColor: s.accent, ...accentBarAlign }} />
        )}

        {editing ? (
          <div className="space-y-2 w-full">
            <textarea
              value={slide.title || ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder={isStat ? "42%" : isCover ? "Your big idea" : "Headline"}
              rows={isStat ? 1 : 2}
              className="w-full bg-transparent resize-none border-none outline-none font-black leading-tight placeholder-current placeholder-opacity-20 overflow-hidden"
              style={{ fontSize: titleSize, color: isStat ? s.accent : s.text, textAlign: ta, caretColor: s.accent }}
            />
            <textarea
              value={slide.caption || ""}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Caption or body text…"
              rows={3}
              className="w-full bg-transparent resize-none border-none outline-none leading-relaxed placeholder-current placeholder-opacity-20 overflow-hidden"
              style={{ fontSize: captionSize, fontWeight: isCta ? 600 : 400, color: s.text, opacity: 0.85, textAlign: ta, caretColor: s.accent }}
            />
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            {isStat ? (
              <>
                <div className="font-black leading-none break-words" style={{ fontSize: statSize, color: s.accent }}>
                  {slide.title || "–"}
                </div>
                {slide.caption && (
                  <p className="mt-1 leading-snug break-words" style={{ fontSize: captionSize, opacity: 0.75 }}>
                    {slide.caption}
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 className="font-black leading-tight break-words" style={{ fontSize: titleSize }}>
                  {slide.title || <span style={{ opacity: 0.3 }}>Untitled</span>}
                </h3>
                {slide.caption && (
                  <p className="mt-1.5 leading-snug break-words"
                    style={{ fontSize: captionSize, fontWeight: isCta ? 600 : 400, opacity: 0.82 }}>
                    {slide.caption}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-2 right-2.5 z-10 font-bold uppercase tracking-widest"
        style={{ fontSize: "0.42rem", color: s.text, opacity: 0.18 }}>
        {slide.template || "clean"}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ColorPicker
// ─────────────────────────────────────────────────────────────────────────────
function ColorPicker({ label, value, onChange, presets }) {
  const ref = useRef(null);
  const isGrad = value?.startsWith("linear") || value?.startsWith("radial");
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <button type="button" onClick={() => !isGrad && ref.current?.click()}
          title={isGrad ? "Gradient — set by template" : "Custom colour"}
          className="h-7 w-7 rounded-lg border-2 border-slate-200 shadow-sm hover:scale-110 transition-transform"
          style={{ background: value }} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`h-6 w-6 rounded-lg transition-all hover:scale-110 ${value === c ? "ring-2 ring-orange-500 ring-offset-1 scale-110" : "border border-slate-200"}`}
            style={{ background: c }} />
        ))}
      </div>
      {!isGrad && (
        <input ref={ref} type="color"
          value={value?.startsWith("#") ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute opacity-0 w-0 h-0" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DesignToolbar — horizontal bar below the canvas (replaces cramped right panel)
// Pure CSS flex-wrap — wraps naturally with zero JS, zero measurement.
// ─────────────────────────────────────────────────────────────────────────────
function DesignToolbar({ slide, onUpdate }) {
  const [openPanel, setOpenPanel] = useState(null); // "style" | "layout" | "colors" | null
  const tpl = TEMPLATES.find((t) => t.id === (slide.template || "clean")) || TEMPLATES[0];

  const toggle = (panel) => setOpenPanel((p) => (p === panel ? null : panel));

  const applyTemplate = (t) => {
    onUpdate({ template: t.id, bgColor: null, textColor: null, accentColor: null });
  };

  return (
    <div className="border-t border-slate-100 bg-white shrink-0">
      {/* Tab row — wraps onto multiple lines on narrow screens instead of overflowing */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-4 py-2 border-b border-slate-100">
        <div className="flex items-center gap-1">
          {[
            { id: "style",  label: "Style",   icon: <Palette className="h-3.5 w-3.5" /> },
            { id: "layout", label: "Layout",  icon: <Layers  className="h-3.5 w-3.5" /> },
            { id: "colors", label: "Colors",  icon: <Type    className="h-3.5 w-3.5" /> },
          ].map((tab) => (
            <button key={tab.id} type="button" onClick={() => toggle(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                openPanel === tab.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Font size inline */}
        <div className="flex items-center gap-1 sm:ml-auto">
          <span className="text-xs text-slate-400 mr-1">Size</span>
          {FONT_SIZES.map((f) => (
            <button key={f.id} type="button" onClick={() => onUpdate({ fontSize: f.id })}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                (slide.fontSize || "lg") === f.id
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Alignment inline */}
        <div className="flex items-center gap-1">
          {[
            { v: "left",   Icon: AlignLeft   },
            { v: "center", Icon: AlignCenter  },
            { v: "right",  Icon: AlignRight   },
          ].map(({ v, Icon }) => (
            <button key={v} type="button" onClick={() => onUpdate({ textAlign: v })}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                (slide.textAlign || "left") === v
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Expandable panels */}
      {openPanel === "style" && (
        <div className="px-3 sm:px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {TEMPLATES.map((t) => {
              const active = (slide.template || "clean") === t.id;
              return (
                <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                  className={`relative overflow-hidden rounded-xl shrink-0 flex items-end p-2 transition-all hover:scale-[1.04] ${
                    active ? "ring-2 ring-orange-500 ring-offset-1" : ""
                  }`}
                  style={{ width: 72, height: 56, background: t.gradient || t.bg }}>
                  {active && (
                    <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  <span className="text-[10px] font-bold leading-none" style={{ color: t.text }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {openPanel === "layout" && (
        <div className="px-3 sm:px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {LAYOUTS.map((l) => (
              <button key={l.id} type="button" onClick={() => onUpdate({ layout: l.id })}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-2.5 transition-all ${
                  slide.layout === l.id
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}>
                <span className="text-lg">{l.icon}</span>
                <span className="text-xs font-bold">{l.label}</span>
                <span className={`text-[10px] ${slide.layout === l.id ? "text-orange-100" : "text-slate-400"}`}>{l.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {openPanel === "colors" && (
        <div className="px-3 sm:px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ColorPicker label="Background"
              value={slide.bgColor || tpl.gradient || tpl.bg}
              onChange={(v) => onUpdate({ bgColor: v })}
              presets={COLOR_PRESETS.bg} />
            <ColorPicker label="Text"
              value={slide.textColor || tpl.text}
              onChange={(v) => onUpdate({ textColor: v })}
              presets={COLOR_PRESETS.text} />
            <ColorPicker label="Accent"
              value={slide.accentColor || tpl.accent}
              onChange={(v) => onUpdate({ accentColor: v })}
              presets={COLOR_PRESETS.accent} />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <span className="text-xs text-slate-500 shrink-0">Image opacity</span>
              <input type="range" min={0} max={1} step={0.05}
                value={slide.imageOpacity ?? 0.18}
                onChange={(e) => onUpdate({ imageOpacity: parseFloat(e.target.value) })}
                className="flex-1 h-1.5 accent-orange-500" />
              <span className="text-xs text-slate-400 w-7 text-right">
                {Math.round((slide.imageOpacity ?? 0.18) * 100)}%
              </span>
            </div>
            <button type="button"
              onClick={() => onUpdate({ bgColor: null, textColor: null, accentColor: null })}
              className="text-xs text-slate-400 hover:text-orange-600 transition-colors shrink-0">
              ↺ Reset colours
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CarouselBuilder
// ─────────────────────────────────────────────────────────────────────────────
export default function CarouselBuilder({ postId, title, content, onEnsureDraft }) {
  const slides           = useQuery(api.carousels.listSlides, postId ? { postId } : "skip");
  const createSlide      = useMutation(api.carousels.createSlide);
  const createManySlides = useMutation(api.carousels.createManySlides);
  const updateSlideMut   = useMutation(api.carousels.updateSlide);
  const duplicateSlide   = useMutation(api.carousels.duplicateSlide);
  const deleteSlide      = useMutation(api.carousels.deleteSlide);
  const reorderSlides    = useMutation(api.carousels.reorderSlides);

  const [selectedId,      setSelectedId]      = useState(null);
  const [previewMode,     setPreviewMode]      = useState(false);
  const [draggedId,       setDraggedId]        = useState(null);
  const [uploadingId,     setUploadingId]      = useState(null);
  const [isGenerating,    setIsGenerating]     = useState(false);
  const [aiTopic,         setAiTopic]          = useState("");
  const [slideCount,      setSlideCount]       = useState(6);
  const [confirmDeleteId, setConfirmDeleteId]  = useState(null);

  const sortedSlides = useMemo(
    () => [...(slides || [])].sort((a, b) => a.order - b.order),
    [slides]
  );
  const selectedSlide = sortedSlides.find((s) => s._id === selectedId) || sortedSlides[0];
  const selectedIdx   = sortedSlides.findIndex((s) => s._id === selectedSlide?._id);

  const ensurePost = async () => {
    const id = postId || (await onEnsureDraft?.());
    if (!id) throw new Error("Save the carousel draft first");
    return id;
  };

  const addSlide = async () => {
    try {
      const id = await ensurePost();
      const slideId = await createSlide({
        postId:   id,
        title:    sortedSlides.length ? `Slide ${sortedSlides.length + 1}` : "Your big idea",
        caption:  sortedSlides.length ? "" : "Write the promise of this carousel.",
        layout:   sortedSlides.length ? "split" : "cover",
        template: selectedSlide?.template || "clean",
      });
      setSelectedId(slideId);
      toast.success("Slide added");
    } catch (err) {
      toast.error(err.message || "Failed to add slide");
    }
  };

  const generateSlides = async () => {
    if (!aiTopic.trim()) { toast.error("Enter a topic first"); return; }
    setIsGenerating(true);
    try {
      const id = await ensurePost();
      const res = await fetch("/api/ai/carousel-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, topic: aiTopic.trim(), slideCount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "AI generation failed");
      const ids = await createManySlides({ postId: id, slides: data.slides });
      setSelectedId(ids[0]);
      toast.success(`${data.slides.length} slides generated`);
    } catch (err) {
      toast.error(err.message || "AI generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSlide = async (id, patch) => {
    try { await updateSlideMut({ id, ...patch }); }
    catch (err) { toast.error(err.message || "Failed to update"); }
  };

  const copySlide = async (id) => {
    try { const cid = await duplicateSlide({ id }); setSelectedId(cid); toast.success("Duplicated"); }
    catch (err) { toast.error(err.message || "Failed"); }
  };

  const removeSlide = async (id) => {
    try {
      await deleteSlide({ id });
      const rest = sortedSlides.filter((s) => s._id !== id);
      setSelectedId(rest.at(-1)?._id ?? null);
      setConfirmDeleteId(null);
      toast.success("Slide deleted");
    } catch (err) { toast.error(err.message || "Failed"); }
  };

  const uploadImage = async (slide, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(slide._id);
    try {
      const r = await uploadToImageKit(file, `carousel-${Date.now()}-${file.name}`, "creator-media");
      if (!r.success) throw new Error(r.error || "Upload failed");
      await updateSlide(slide._id, { imageUrl: r.data.url });
      toast.success("Image uploaded");
    } catch (err) { toast.error(err.message || "Upload failed"); }
    finally { setUploadingId(null); e.target.value = ""; }
  };

  const handleDrop = async (targetId) => {
    if (!draggedId || draggedId === targetId || !postId) return;
    const ids = sortedSlides.map((s) => s._id);
    const from = ids.indexOf(draggedId); const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    try { await reorderSlides({ postId, orderedIds: next }); }
    catch (err) { toast.error(err.message || "Failed to reorder"); }
    finally { setDraggedId(null); }
  };

  const navigate = (dir) => { const n = sortedSlides[selectedIdx + dir]; if (n) setSelectedId(n._id); };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!sortedSlides.length) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-orange-50 to-pink-50 border-b border-slate-100 px-4 sm:px-6 py-4 sm:py-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">AI Slide Generator</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateSlides()}
              placeholder="Topic (e.g. '5 ways to grow on LinkedIn')"
              className="flex-1 bg-white border-slate-200" />
            <div className="flex gap-2 shrink-0">
              <select value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                {[4,5,6,7,8,10].map(n => <option key={n} value={n}>{n} slides</option>)}
              </select>
              <Button type="button" onClick={generateSlides} disabled={isGenerating}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold">
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </div>
        </div>
        <button type="button" onClick={addSlide}
          className="flex h-48 sm:h-56 w-full flex-col items-center justify-center gap-3 hover:bg-orange-50 transition-colors">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200">
            <LayoutTemplate className="h-7 w-7 text-orange-400" />
          </div>
          <div className="text-center px-4">
            <p className="text-slate-600 font-semibold text-sm">Or add a slide manually</p>
            <p className="text-slate-400 text-xs mt-0.5">Click to create your first slide</p>
          </div>
        </button>
      </section>
    );
  }

  // ── Preview mode — CSS grid auto-fill, no JS measurement ─────────────────
  if (previewMode) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 sm:px-5 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Preview</p>
            <p className="text-sm font-bold text-slate-800">{sortedSlides.length} slides</p>
          </div>
          <Button type="button" onClick={() => setPreviewMode(false)} variant="outline" size="sm"
            className="gap-2 rounded-xl text-xs font-bold">
            <EyeOff className="h-3.5 w-3.5" />Back to editor
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 p-4 sm:p-6">
          {sortedSlides.map((slide, i) => (
            <div key={slide._id}
              onClick={() => { setPreviewMode(false); setSelectedId(slide._id); }}
              className="cursor-pointer rounded-2xl transition-all hover:scale-[1.02] hover:shadow-xl">
              <SlideCanvas slide={slide} index={i} compact />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── Editor — 2 panel: left strip + right canvas+toolbar ──────────────────
  // Layout switching (stacked on mobile, side-by-side on desktop) is driven
  // purely by the `lg:` CSS breakpoint below — no JS measurement, no
  // ResizeObserver, so there is no feedback loop and nothing can toggle.
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ── Top toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-3 sm:px-5 py-3">
        <div className="flex items-center gap-3 mr-auto">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Carousel</p>
            <p className="text-sm font-bold text-slate-800">{sortedSlides.length} slide{sortedSlides.length !== 1 ? "s" : ""}</p>
          </div>
          {/* AI bar — desktop only */}
          <div className="hidden lg:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            <Wand2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateSlides()}
              placeholder="AI topic…"
              className="h-6 w-44 border-0 bg-transparent p-0 text-sm focus-visible:ring-0" />
            <Button type="button" size="sm" onClick={generateSlides} disabled={isGenerating}
              className="h-6 gap-1 px-2.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Go
            </Button>
          </div>
        </div>
        <Button type="button" onClick={() => setPreviewMode(true)} variant="outline" size="sm"
          className="gap-1.5 rounded-xl text-xs font-bold">
          <Eye className="h-3.5 w-3.5" />Preview
        </Button>
        <Button type="button" onClick={addSlide} size="sm"
          className="gap-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white">
          <Plus className="h-3.5 w-3.5" />Add slide
        </Button>
      </div>

      {/* ── 2-panel body: thumbnail strip | canvas + design toolbar ──
           Below lg: stacked (strip on top, horizontal scroll row).
           At lg and above: side-by-side (slim vertical strip + canvas).
           This is a plain CSS media query — stable, no toggling possible. */}
      <div className="flex flex-col lg:flex-row min-h-[520px] lg:min-h-[600px]">

        {/* LEFT: thumbnail strip */}
        <div className="flex w-full lg:w-28 shrink-0 flex-row lg:flex-col gap-2 overflow-x-auto overflow-y-hidden lg:overflow-x-hidden lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/80 p-2">
          {sortedSlides.map((slide, index) => {
            const s    = resolveSlideStyle(slide);
            const act  = selectedSlide?._id === slide._id;
            const bgSt = s.isGradient ? { background: s.bg } : { backgroundColor: s.bg };
            const isDel = confirmDeleteId === slide._id;

            return (
              <div key={slide._id} className="relative group shrink-0 w-16 sm:w-20 lg:w-full">
                <button type="button" draggable
                  onDragStart={() => setDraggedId(slide._id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(slide._id)}
                  onClick={() => { setSelectedId(slide._id); setConfirmDeleteId(null); }}
                  className={`relative w-full overflow-hidden rounded-xl transition-all cursor-grab active:cursor-grabbing ${
                    act ? "ring-2 ring-orange-500 ring-offset-2 shadow-md" : "opacity-60 hover:opacity-95 hover:ring-1 hover:ring-slate-300"
                  }`}
                  style={{ aspectRatio: "4/5", ...bgSt }}>
                  {slide.imageUrl && (
                    <img src={slide.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.18 }} />
                  )}
                  <div className="absolute inset-0"
                    style={{ background: `radial-gradient(circle at 80% 10%, ${s.accent}38 0%, transparent 60%)` }} />
                  <div className="absolute top-1 left-1.5 font-black uppercase"
                    style={{ fontSize: "0.4rem", color: s.accent, letterSpacing: "0.06em" }}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="absolute bottom-1.5 left-1.5 right-5">
                    <p className="truncate font-black" style={{ fontSize: "0.45rem", color: s.text }}>
                      {slide.title || "Untitled"}
                    </p>
                  </div>
                </button>

                {isDel ? (
                  <div className="absolute inset-0 z-20 rounded-xl flex flex-col items-center justify-center gap-1"
                    style={{ background: "rgba(0,0,0,0.75)" }}>
                    <p className="text-white font-bold text-center" style={{ fontSize: "0.48rem" }}>Delete?</p>
                    <button type="button" onClick={() => removeSlide(slide._id)}
                      className="rounded-md bg-red-500 text-white font-bold px-2 py-0.5" style={{ fontSize: "0.48rem" }}>
                      Yes
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)}
                      className="rounded-md bg-white/20 text-white font-bold px-2 py-0.5" style={{ fontSize: "0.48rem" }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(slide._id); }}
                    className="absolute top-0.5 right-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button type="button" onClick={addSlide}
            className="w-16 sm:w-20 lg:w-full shrink-0 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center hover:border-orange-400 hover:bg-orange-50 transition-colors"
            style={{ aspectRatio: "4/5" }}>
            <Plus className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        {/* RIGHT: canvas + design toolbar stacked vertically */}
        {selectedSlide ? (
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">

            {/* Canvas action bar — wraps on narrow screens instead of overflowing */}
            <div className="flex flex-wrap shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 sm:px-5 py-2 sm:py-2.5 gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigate(-1)} disabled={selectedIdx === 0}
                  className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-25 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                <span className="text-xs font-semibold text-slate-500 tabular-nums">
                  {selectedIdx + 1} / {sortedSlides.length}
                </span>
                <button type="button" onClick={() => navigate(1)} disabled={selectedIdx === sortedSlides.length - 1}
                  className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-25 transition-colors">
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
                <span className="text-xs text-slate-300 hidden sm:block ml-1">· click text to edit</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingId === selectedSlide._id ? "Uploading…" : "Image"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(selectedSlide, e)} />
                </label>
                <Button type="button" size="sm" onClick={() => copySlide(selectedSlide._id)}
                  variant="outline" className="h-auto px-2.5 sm:px-3 py-1.5 text-xs rounded-xl gap-1.5 border-slate-200">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Duplicate
                </Button>
                <Button type="button" size="sm"
                  onClick={() => setConfirmDeleteId(confirmDeleteId === selectedSlide._id ? null : selectedSlide._id)}
                  variant="outline" className="h-auto px-2.5 sm:px-3 py-1.5 text-xs rounded-xl gap-1.5 border-red-100 text-red-500 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />Delete
                </Button>
              </div>
            </div>

            {/* Canvas — dot-grid, padding shrinks on mobile via CSS only */}
            <div className="flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-10"
              style={{
                backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                backgroundColor: "#f1f5f9",
              }}>
              <div className="w-full drop-shadow-2xl" style={{ maxWidth: "340px" }}>
                <SlideCanvas
                  slide={selectedSlide}
                  index={selectedIdx}
                  editing
                  onUpdate={(patch) => updateSlide(selectedSlide._id, patch)}
                />
              </div>
            </div>

            {/* Design toolbar — horizontal, below canvas */}
            <DesignToolbar
              slide={selectedSlide}
              onUpdate={(patch) => updateSlide(selectedSlide._id, patch)}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400 py-10">
            Select a slide to edit
          </div>
        )}
      </div>
    </section>
  );
}
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  BarChart3, CalendarClock, Captions, Clapperboard,
  FileText, Hash, ImageIcon, Languages, Lightbulb,
  Mic2, PanelRight, Radio, Scissors, Search, Share2,
  Sparkles, Upload, Users, Video, Wand2, X,
} from "lucide-react";
import { BarLoader } from "react-spinners";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateBlogContent, improveContent } from "@/app/actions/ollama";
import { resolveVideoUrl } from "@/app/actions/media";
import { uploadToImageKit } from "@/lib/imagekit";
import PostEnhancer from "./post-enhancer";
import AudienceSimulator from "./audience-simulator";
import MediaIntelligencePanel from "./media-intelligence-panel";
import CarouselBuilder from "./carousel-builder";
import VideoReelStudio from "./video-reel-studio";
import PodcastStudio from "./podcast-studio";
import LivestreamStudio from "./livestream-studio";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
if (typeof window !== "undefined") import("react-quill-new/dist/quill.snow.css");

const FORMAT_CONFIG = {
  article: {
    label: "Post", icon: FileText,
    titleLabel: "Title", titlePlaceholder: "Write a clear, irresistible title...",
    contentLabel: "Body", contentPlaceholder: "Start writing your post...",
    mediaTitle: "Cover image", mediaAccept: "image/*", mediaButton: "Upload cover", mediaField: "featuredImage",
    ai:        ["AI writer","Grammar correction","Headline generator","SEO optimization","Readability score"],
    tools:     ["Draft saving","Scheduled publishing","Collaborator mode","Analytics preview"],
    analytics: ["Reads","Read time","Shares","Engagement rate"],
  },
  reel: {
    label: "Reel", icon: Clapperboard,
    titleLabel: "Hook", titlePlaceholder: "Short hook or reel title...",
    contentLabel: "Caption", contentPlaceholder: "Caption, call to action, hashtags...",
    mediaTitle: "Short video", mediaAccept: "video/*", mediaButton: "Upload reel", mediaField: "mediaUrl",
    ai:        ["Auto subtitles","AI caption","AI hashtags","Viral score","Best posting time"],
    tools:     ["Video trimming","Thumbnail generator","Auto clip","Music selection"],
    analytics: ["Views","Watch time","Completion rate","Shares","Saves"],
  },
  video: {
    label: "Video", icon: Video,
    titleLabel: "Title", titlePlaceholder: "Title your long-form video...",
    contentLabel: "Description", contentPlaceholder: "Description, links, summary...",
    mediaTitle: "Video", mediaAccept: "video/*", mediaButton: "Upload video", mediaField: "mediaUrl",
    ai:        ["Auto chapters","Video summary","Auto subtitles","Thumbnail suggestions","Title optimisation"],
    tools:     ["Monetisation","Member-only","Premiere scheduling","Playlist"],
    analytics: ["Avg watch duration","Retention","CTR","Revenue"],
  },
  livestream: {
    label: "Livestream", icon: Radio,
    titleLabel: "Stream title", titlePlaceholder: "Name the livestream...",
    contentLabel: "Description", contentPlaceholder: "Session description, agenda, guests...",
    mediaTitle: "Live URL", mediaAccept: "", mediaButton: "", mediaField: "mediaUrl",
    ai:        ["AI moderation","Toxicity filtering","Auto highlights","Live sentiment"],
    tools:     ["Stream scheduling","Co-hosting","Screen sharing","Polls","Donations"],
    analytics: ["Peak viewers","Avg viewers","Engagement rate","Revenue"],
  },
  podcast: {
    label: "Podcast", icon: Mic2,
    titleLabel: "Episode title", titlePlaceholder: "Name the episode...",
    contentLabel: "Show notes", contentPlaceholder: "Notes, links, guest info, key moments...",
    mediaTitle: "Audio", mediaAccept: "audio/*", mediaButton: "Upload audio", mediaField: "mediaUrl",
    ai:        ["Transcript","Auto summary","Key points","Clip generation","Translation"],
    tools:     ["Guest management","Series","Premium episodes","Episode number"],
    analytics: ["Listens","Completion rate","Subscriber growth"],
  },
  carousel: {
    label: "Carousel", icon: ImageIcon,
    titleLabel: "Title", titlePlaceholder: "Name the carousel...",
    contentLabel: "Slide captions", contentPlaceholder: "Slide captions and final CTA...",
    mediaTitle: "Carousel images", mediaAccept: "image/*", mediaButton: "Upload image", mediaField: "mediaUrl",
    ai:        ["AI slide generation","AI infographic","Design suggestions","Educational content"],
    tools:     ["Templates","Brand kit","Auto resize","CTA slide"],
    analytics: ["Swipe rate","Completion rate","Saves","Shares"],
  },
};

const META_FIELDS = {
  article: [
    ["postMeta.seoKeywords","SEO keywords",Search,"creator growth, AI tools"],
    ["postMeta.visibility","Visibility",Users,"Public, members, private"],
    ["postMeta.collaborators","Collaborators",Users,"Invite collaborators"],
  ],
  reel: [
    ["postMeta.caption","Caption",Captions,"Short caption"],
    ["postMeta.location","Location",Share2,"City or event"],
    ["postMeta.music","Music",Sparkles,"Track or sound"],
  ],
  video: [
    ["postMeta.chapters","Chapters",Scissors,"00:00 Intro, 02:15 Demo"],
    ["postMeta.playlist","Playlist",Video,"Series or playlist"],
    ["postMeta.seoKeywords","SEO keywords",Search,"video keywords"],
  ],
  livestream: [
    ["mediaUrl","Live URL",Radio,"https://youtube.com/live/..."],
    ["postMeta.collaborators","Co-hosts",Users,"Guest names"],
    ["postMeta.readinessNotes","Polls & donations",BarChart3,"Poll ideas"],
  ],
  podcast: [
    ["postMeta.episodeNumber","Episode number",Mic2,"Episode 12"],
    ["postMeta.showNotes","Guest / series",Users,"Guest, series, sponsor"],
    ["postMeta.seoKeywords","SEO keywords",Search,"podcast keywords"],
  ],
  carousel: [
    ["postMeta.ctaSlide","CTA slide",Lightbulb,"Save, share, subscribe"],
    ["postMeta.readinessNotes","Design notes",ImageIcon,"Template, brand kit"],
    ["postMeta.seoKeywords","Keywords",Hash,"carousel keywords"],
  ],
};

const quillModules = {
  toolbar: [
    [{ header: [1,2,3,false] }],
    ["bold","italic","underline"],
    [{ list: "ordered" },{ list: "bullet" }],
    ["link","blockquote"],
  ],
};
const quillFormats = ["header","bold","italic","underline","list","link","blockquote"];

export default function FormatEditorContent({ form, postId, onEnsureDraft, onImageUpload }) {
  const { register, watch, setValue, formState: { errors } } = form;
  const values = watch();
  const type   = values.contentType || "article";
  const config = FORMAT_CONFIG[type] || FORMAT_CONFIG.article;
  const Icon   = config.icon;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading,  setIsUploading]  = useState(false);
  const [captionData,  setCaptionData]  = useState(null);
  const [showSidebar,  setShowSidebar]  = useState(false);
  const [resolvingUrl, setResolvingUrl] = useState(false);

  const setNestedValue = (field, value) =>
    setValue(field, value, { shouldDirty: true, shouldValidate: true });

  const uploadMedia = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const r = await uploadToImageKit(file, `creator-${type}-${Date.now()}-${file.name}`, "creator-media");
      if (!r.success) { toast.error(r.error || "Upload failed"); return; }
      setValue(config.mediaField, r.data.url, { shouldDirty: true, shouldValidate: true });
      setValue("postMeta.embedType", "", { shouldDirty: true });
      setValue("postMeta.embedThumbnailUrl", "", { shouldDirty: true });
      if (file.type.startsWith("image/"))
        setValue("featuredImage", r.data.url, { shouldDirty: true, shouldValidate: true });
      toast.success(`${config.label} media uploaded`);
    } finally { setIsUploading(false); e.target.value = ""; }
  };

  const handleMediaUrlBlur = async (e) => {
    const raw = e.target.value.trim();
    if (!raw || type === "livestream") return; // livestream URLs are stored as-is

    setResolvingUrl(true);
    try {
      const result = await resolveVideoUrl(raw);
      if (result.success) {
        setValue("mediaUrl", result.url, { shouldDirty: true, shouldValidate: true });
        setValue("postMeta.embedType", result.type === "embed" ? result.provider : "", { shouldDirty: true });
        setValue("postMeta.embedThumbnailUrl", result.thumbnailUrl || "", { shouldDirty: true });

        if (result.type === "embed") {
          toast.success(`Linked as a ${result.provider} embed`);
        } else if (result.warning) {
          toast.success("Video linked — thumbnail capture may be unavailable for this source");
        } else {
          toast.success("Video link resolved");
        }
      } else {
        toast.error(result.error);
      }
    } finally {
      setResolvingUrl(false);
    }
  };

  const runAiDraft = async () => {
    if (!values.title?.trim()) { toast.error(`Add a ${config.titleLabel.toLowerCase()} first`); return; }
    setIsGenerating(true);
    try {
      const r = await generateBlogContent(values.title, values.category, values.tags || []);
      if (r.success) { setValue("content", r.content, { shouldDirty: true, shouldValidate: true }); toast.success("Draft generated"); }
      else toast.error(r.error);
    } finally { setIsGenerating(false); }
  };

  const improve = async () => {
    if (!values.content || values.content === "<p><br></p>") { toast.error("Add content first"); return; }
    setIsGenerating(true);
    try {
      const r = await improveContent(values.content, "enhance");
      if (r.success) { setValue("content", r.content, { shouldDirty: true, shouldValidate: true }); toast.success("Content improved"); }
      else toast.error(r.error);
    } finally { setIsGenerating(false); }
  };

  const generateCaption = async () => {
    if (!values.title && !values.content) { toast.error("Add a title or content first"); return; }
    setIsGenerating(true);
    try {
      const res  = await fetch("/api/ai/caption-hashtags", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: values.title, content: values.content, category: values.category }),
      });
      const data = await res.json();
      setCaptionData(data);
      setValue("postMeta.caption", data.caption || "", { shouldDirty: true });
      toast.success("Caption generated");
    } catch { toast.error("Failed to generate caption"); }
    finally { setIsGenerating(false); }
  };

  return (
    /*
      KEY: overflow-x-hidden on the outermost wrapper prevents ANY child
      from making the page scroll horizontally on mobile.
    */
    <div className="relative overflow-x-hidden">

      {/* Mobile "AI Features" drawer toggle */}
      <div className="sticky top-[56px] z-30 flex items-center justify-end border-b border-slate-100 bg-white px-3 py-2 xl:hidden">
        <button
          type="button"
          onClick={() => setShowSidebar(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <PanelRight className="h-3.5 w-3.5" />
          AI Features &amp; Analytics
        </button>
      </div>

      {/* Mobile sidebar drawer */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-50 flex justify-end xl:hidden"
          onClick={() => setShowSidebar(false)}
        >
          <div
            className="h-full w-full max-w-[300px] overflow-y-auto bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Tools &amp; Analytics</p>
              <button onClick={() => setShowSidebar(false)} className="rounded-full p-1.5 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <InfoPanel title="AI features"   items={config.ai}        icon={Sparkles}     />
              <InfoPanel title="Creator tools" items={config.tools}     icon={CalendarClock}/>
              <InfoPanel title="Analytics"     items={config.analytics} icon={BarChart3}    />
              <ReadinessBanner />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-3 py-5 sm:px-5 sm:py-7 lg:px-6 lg:py-8">

        {/* Format header */}
        <div className="mb-5 flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
            <Icon className="h-5 w-5 text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="section-label">{config.label} studio</p>
            <h1 className="mt-0.5 truncate text-lg font-bold text-slate-950 sm:text-xl">
              Create a {config.label.toLowerCase()}
            </h1>
          </div>
        </div>

        {/*
          Two-column on xl+, single column below.
          `min-w-0` on BOTH children prevents flex/grid children from
          overflowing their allocated space.
        */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">

          {/* ── Editor column ─────────────────────────────────── */}
          <div className="min-w-0 w-full space-y-5">

            {/* Title */}
            <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <label className="text-sm font-bold text-slate-800">{config.titleLabel}</label>
              <Input
                {...register("title")}
                placeholder={config.titlePlaceholder}
                className="mt-3 w-full border-0 bg-slate-50 text-xl font-bold text-slate-950 focus-visible:ring-orange-200 sm:text-2xl"
              />
              {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title.message}</p>}
            </section>

            {/*
              CAROUSEL BUILDER WRAPPER
              `overflow-hidden` here is the critical fix for Image 2.
              Without it, the carousel builder's absolutely-positioned
              slide canvas can bleed outside and appear offset/cut-off.
              `w-full` ensures the builder never exceeds the column width.
            */}
            {type === "carousel" && (
              <div className="w-full overflow-hidden">
                <CarouselBuilder
                  postId={postId}
                  title={values.title}
                  content={values.content}
                  onEnsureDraft={onEnsureDraft}
                />
              </div>
            )}

            {/* Media upload */}
            <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">{config.mediaTitle}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {type === "livestream"
                      ? "Optional external URL — or use the Go Live studio below."
                      : "Upload a file or paste a URL."}
                  </p>
                </div>
                {type !== "livestream" && config.mediaButton && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    {isUploading ? "Uploading..." : config.mediaButton}
                    <input type="file" accept={config.mediaAccept} className="hidden" disabled={isUploading} onChange={uploadMedia} />
                  </label>
                )}
              </div>

              {type === "article" ? (
                values.featuredImage ? (
                  <div className="relative overflow-hidden rounded-xl border border-slate-100">
                    <img src={values.featuredImage} alt="Cover" className="h-48 w-full object-cover sm:h-64" />
                    <button
                      type="button"
                      onClick={() => setValue("featuredImage", "", { shouldDirty: true })}
                      className="absolute right-3 top-3 rounded-full bg-white p-2 shadow"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onImageUpload("featured")}
                    className="flex h-36 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-600 hover:border-orange-300 hover:bg-orange-50 transition-colors sm:h-44"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Add cover image
                  </button>
                )
              ) : (
                <>
                  <Input
                    value={values.mediaUrl || ""}
                    onChange={(e) => setNestedValue("mediaUrl", e.target.value)}
                    onBlur={handleMediaUrlBlur}
                    placeholder={type === "livestream" ? "Paste live URL (optional)..." : "Paste media URL..."}
                    className="w-full bg-slate-50"
                  />
                  {resolvingUrl && (
                    <p className="mt-2 text-xs text-slate-400">Checking that link...</p>
                  )}
                </>
              )}
            </section>

            {/* Format-specific studios */}
            {type === "livestream" && (
              <div className="w-full overflow-hidden">
                <LivestreamStudio postId={postId} onEnsureDraft={onEnsureDraft} />
              </div>
            )}
            {(type === "video" || type === "reel") && (
              <div className="w-full overflow-hidden">
                <VideoReelStudio
                  postId={postId}
                  mediaUrl={values.mediaUrl}
                  contentType={type}
                  embedType={values.postMeta?.embedType}
                  embedThumbnailUrl={values.postMeta?.embedThumbnailUrl}
                  onEnsureDraft={onEnsureDraft}
                />
              </div>
            )}
            {type === "podcast" && (
              <div className="w-full overflow-hidden">
                <PodcastStudio postId={postId} mediaUrl={values.mediaUrl} onEnsureDraft={onEnsureDraft} />
              </div>
            )}

            <div className="w-full overflow-hidden">
              <MediaIntelligencePanel contentType={type} postId={postId} onEnsureDraft={onEnsureDraft} />
            </div>

            {/* Content editor */}
            <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="mb-3 text-sm font-bold text-slate-800">{config.contentLabel}</p>
              {/* Quill overflows on mobile — overflow-hidden on the wrapper clips it */}
              <div className="w-full overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={values.content}
                  onChange={(c) => setValue("content", c, { shouldDirty: true, shouldValidate: true })}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder={config.contentPlaceholder}
                />
              </div>
              {errors.content && <p className="mt-2 text-sm text-red-600">{errors.content.message}</p>}
            </section>

            {/*
              META FIELDS
              Single column on mobile, 2 columns on sm, 3 on lg.
              `overflow-hidden` on each card stops long placeholder text
              from widening the cell.
            */}
            {(META_FIELDS[type] || []).length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(META_FIELDS[type] || []).map(([field, label, FieldIcon, placeholder]) => (
                  <label key={field} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <FieldIcon className="h-4 w-4 shrink-0 text-orange-500" />
                      <span className="truncate">{label}</span>
                    </span>
                    <Input
                      value={field.split(".").reduce((acc, k) => acc?.[k], values) || ""}
                      onChange={(e) => setNestedValue(field, e.target.value)}
                      placeholder={placeholder}
                      className="mt-3 w-full bg-slate-50"
                    />
                  </label>
                ))}
              </div>
            )}

            {/* Loading bar */}
            {(isGenerating || isUploading) && (
              <div className="w-full overflow-hidden rounded-full bg-orange-50 p-1">
                <BarLoader width="100%" color="#f97316" height={5} />
              </div>
            )}

            {/*
              AI ACTION BUTTONS
              Stack vertically on mobile (flex-col), row on sm+.
              This fixes Image 3 where 3 buttons in a row overflow the screen.
            */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" onClick={runAiDraft} className="soft-button w-full sm:flex-1">
                <Wand2 className="h-4 w-4" />
                AI draft
              </Button>
              <Button type="button" onClick={improve} className="quiet-button w-full sm:flex-1">
                <Sparkles className="h-4 w-4" />
                Improve
              </Button>
              <Button type="button" onClick={generateCaption} className="quiet-button w-full sm:flex-1">
                <Hash className="h-4 w-4" />
                Caption
              </Button>
            </div>

            {/* Caption kit result */}
            {captionData && (
              <section className="w-full overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 p-4 sm:p-5">
                <p className="text-sm font-bold text-slate-900">AI caption kit</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 break-words">{captionData.caption}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {captionData.hashtags?.map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <div className="w-full overflow-hidden">
              <PostEnhancer text={values.content} onApplySuggestions={(c) => setValue("content", c)} />
            </div>
            <div className="w-full overflow-hidden">
              <AudienceSimulator text={values.content} />
            </div>
          </div>

          {/* ── Right sidebar (desktop xl+ only) ─────────────── */}
          <aside className="hidden min-w-0 space-y-4 xl:block">
            <InfoPanel title="AI features"   items={config.ai}        icon={Sparkles}     />
            <InfoPanel title="Creator tools" items={config.tools}     icon={CalendarClock}/>
            <InfoPanel title="Analytics"     items={config.analytics} icon={BarChart3}    />
            <ReadinessBanner />
          </aside>
        </div>
      </main>
    </div>
  );
}

function InfoPanel({ title, items, icon: Icon }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Icon className="h-4 w-4 shrink-0 text-orange-500" />
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadinessBanner() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Languages className="h-4 w-4 shrink-0 text-orange-500" />
        Publish readiness
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-400 to-emerald-400" />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Add media, tags, and settings to improve readiness.
      </p>
    </section>
  );
}
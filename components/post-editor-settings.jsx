"use client";

import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Check, ChevronDown, ChevronUp,
  DollarSign, Eye, EyeOff, Globe, Heart,
  ImageIcon, Loader2, Lock, MapPin,
  MessageCircle, Mic2, Plus, Radio,
  Shield, Upload, Users, Video, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { uploadToImageKit } from "@/lib/imagekit";

const CATEGORIES = [
  "Technology","Design","Marketing","Business",
  "Lifestyle","Education","Health","Travel","Food","Entertainment",
];

const CONTENT_TYPES = [
  { value: "article",    label: "Post"       },
  { value: "reel",       label: "Reel"       },
  { value: "video",      label: "Video"      },
  { value: "livestream", label: "Livestream" },
  { value: "podcast",    label: "Podcast"    },
  { value: "carousel",   label: "Carousel"   },
];

const MEDIA_SETTINGS = {
  reel:       { icon: Video,     title: "Reel media",      accept: "video/*", placeholder: "Paste a reel URL..."      },
  video:      { icon: Video,     title: "Video source",    accept: "video/*", placeholder: "Paste a video URL..."     },
  livestream: { icon: Radio,     title: "Livestream link", accept: "",        placeholder: "Paste your live URL..."   },
  podcast:    { icon: Mic2,      title: "Podcast audio",   accept: "audio/*", placeholder: "Paste episode URL..."    },
  carousel:   { icon: ImageIcon, title: "Carousel images", accept: "image/*", placeholder: "Paste an image URL..."   },
};

/* Inline toggle matching CreateK's orange→violet gradient */
function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        value ? "bg-gradient-to-r from-orange-400 to-violet-500" : "bg-slate-200"
      }`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
        value ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  );
}

export default function PostEditorSettings({ isOpen, onClose, onSave, form, mode }) {
  const [tagInput,         setTagInput]         = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showAdvanced,     setShowAdvanced]     = useState(false);

  const { watch, setValue } = form;
  const v    = watch();
  const type = v.contentType || "article";
  const ms   = MEDIA_SETTINGS[type];

  const set = (field, val) => setValue(field, val, { shouldDirty: true });

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !v.tags.includes(tag) && v.tags.length < 10) {
      set("tags", [...v.tags, tag]);
      setTagInput("");
    }
  };

  const handleTagKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMedia(true);
    try {
      const r = await uploadToImageKit(file, `media-${Date.now()}-${file.name}`, "creator-media");
      if (!r.success) { toast.error(r.error || "Upload failed"); return; }
      set("mediaUrl", r.data.url);
      if (file.type.startsWith("image/")) set("featuredImage", r.data.url);
      toast.success("Media uploaded");
    } finally { setIsUploadingMedia(false); e.target.value = ""; }
  };

  /* reusable toggle row with CreateK icons */
  const ToggleRow = ({ iconBg, icon: Icon, label, subtitle, field, metaField }) => {
    const current = metaField
      ? v.postMeta?.[metaField] !== "false"
      : (v[field] ?? true);
    const toggle = () => {
      if (metaField) set(`postMeta.${metaField}`, current ? "false" : "true");
      else set(field, !current);
    };
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <Toggle value={current} onChange={toggle} />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white shadow-2xl sm:max-w-[540px]">
        {/* Gradient top bar */}
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />

        <DialogHeader className="pt-3">
          <DialogTitle className="text-xl font-bold text-slate-950">
            Post settings
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Configure your post before publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">

          {/* Format + Access */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="section-label">Format</label>
              <Select value={type} onValueChange={(val) => set("contentType", val)}>
                <SelectTrigger className="border-slate-200 bg-slate-50 focus:border-orange-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white">
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="section-label">Access</label>
              <Select value={v.monetization || "free"} onValueChange={(val) => set("monetization", val)}>
                <SelectTrigger className="border-slate-200 bg-slate-50 focus:border-orange-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white">
                  <SelectItem value="free">🌐 Free (Public)</SelectItem>
                  <SelectItem value="members">👥 Members only</SelectItem>
                  <SelectItem value="paid">💳 Paid post</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price (paid posts) */}
          {v.monetization === "paid" && (
            <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-violet-50 p-4">
              <label className="section-label">Price (USD)</label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">$</span>
                <Input
                  type="number" min="0.50" step="0.50"
                  value={v.priceCents ? (v.priceCents / 100).toFixed(2) : ""}
                  onChange={(e) => {
                    const d = parseFloat(e.target.value);
                    set("priceCents", Number.isFinite(d) ? Math.round(d * 100) : undefined);
                  }}
                  placeholder="4.99"
                  className="border-slate-200 bg-white pl-7 focus:border-orange-300"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Buyers pay once via Stripe to unlock this post.
              </p>
            </div>
          )}

          {/* Media upload */}
          {type !== "article" && ms && (
            <div className="space-y-1.5">
              <label className="section-label">{ms.title}</label>
              <div className="rounded-2xl bg-slate-50 p-4 space-y-3 border border-slate-200">
                {type !== "livestream" && (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-500 transition-colors">
                    {isUploadingMedia
                      ? <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                      : <Upload className="h-4 w-4" />
                    }
                    {isUploadingMedia ? "Uploading..." : `Upload ${type}`}
                    <input type="file" accept={ms.accept} className="hidden" onChange={handleMediaUpload} disabled={isUploadingMedia} />
                  </label>
                )}
                <Input
                  value={v.mediaUrl || ""}
                  onChange={(e) => set("mediaUrl", e.target.value)}
                  placeholder={ms.placeholder}
                  className="border-slate-200 bg-white focus:border-orange-300"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-1.5">
            <label className="section-label">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={v.postMeta?.location || ""}
                onChange={(e) => set("postMeta.location", e.target.value)}
                placeholder="Add location..."
                className="border-slate-200 bg-slate-50 pl-9 focus:border-orange-300 focus:bg-white"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="section-label">Category</label>
            <Select value={v.category || ""} onValueChange={(val) => set("category", val)}>
              <SelectTrigger className="border-slate-200 bg-slate-50 focus:border-orange-300">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="section-label">
              Tags <span className="font-normal normal-case tracking-normal text-slate-400">({v.tags?.length || 0}/10)</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                placeholder="Type a tag, press Enter..."
                className="border-slate-200 bg-slate-50 focus:border-orange-300 focus:bg-white"
              />
              <button type="button" onClick={addTag}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-orange-400 to-violet-500 text-white shadow-sm hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {(v.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {v.tags.map((tag, i) => (
                  <Badge key={i} className="gap-1 border-0 bg-gradient-to-r from-orange-100 to-violet-100 px-2.5 py-1 text-[12px] text-slate-700">
                    #{tag}
                    <button onClick={() => set("tags", v.tags.filter((t) => t !== tag))}>
                      <X className="h-3 w-3 text-slate-400 hover:text-slate-700" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Schedule (create mode only) */}
          {mode === "create" && (
            <div className="space-y-1.5">
              <label className="section-label">Schedule</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="datetime-local"
                  value={v.scheduledFor || ""}
                  onChange={(e) => set("scheduledFor", e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="border-slate-200 bg-slate-50 pl-9 focus:border-orange-300 focus:bg-white"
                />
              </div>
              <p className="text-[11px] text-slate-400">Leave empty to publish immediately</p>
            </div>
          )}

          {/* Interaction toggles */}
          <div className="space-y-2">
            <label className="section-label">Interactions</label>
            <ToggleRow
              icon={MessageCircle}
              iconBg="bg-gradient-to-br from-orange-400 to-rose-500"
              label="Allow comments"
              subtitle="Readers can comment on this post"
              field="allowComments"
            />
            <ToggleRow
              icon={Heart}
              iconBg="bg-gradient-to-br from-rose-400 to-pink-500"
              label="Show like count"
              subtitle="Others can see how many likes"
              metaField="showLikes"
            />
          </div>

          {/* Advanced settings accordion */}
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <button type="button" onClick={() => setShowAdvanced((s) => !s)}
              className="flex w-full items-center justify-between bg-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-100">
              <p className="text-sm font-semibold text-slate-700">Advanced settings</p>
              {showAdvanced
                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {showAdvanced && (
              <div className="space-y-4 border-t border-slate-100 p-4">

                {/* Audience picker */}
                <div className="space-y-2">
                  <label className="section-label">Audience</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Public",        icon: Globe,   val: "public"        },
                      { label: "Followers",     icon: Users,   val: "followers"     },
                      { label: "Close friends", icon: Shield,  val: "close_friends" },
                    ].map(({ label, icon: Icon, val }) => {
                      const active = (v.postMeta?.visibility || "public") === val;
                      return (
                        <button key={val} type="button"
                          onClick={() => set("postMeta.visibility", val)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                            active
                              ? "border-orange-300 bg-gradient-to-br from-orange-50 to-violet-50 shadow-sm"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}>
                          <Icon className={`h-5 w-5 ${active ? "text-orange-500" : "text-slate-400"}`} />
                          <span className={`text-[11px] font-semibold ${active ? "text-orange-600" : "text-slate-600"}`}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Alt text */}
                <div className="space-y-1.5">
                  <label className="section-label">Alt text <span className="font-normal normal-case tracking-normal text-slate-400">(accessibility)</span></label>
                  <Input
                    value={v.postMeta?.seoKeywords || ""}
                    onChange={(e) => set("postMeta.seoKeywords", e.target.value)}
                    placeholder="Describe this post for screen readers..."
                    className="border-slate-200 bg-slate-50 focus:border-orange-300 focus:bg-white"
                  />
                </div>

                <ToggleRow
                  icon={DollarSign}
                  iconBg="bg-gradient-to-br from-amber-400 to-orange-500"
                  label="Paid partnership"
                  subtitle="Label this as a sponsored post"
                  metaField="paidPartnership"
                />

                <ToggleRow
                  icon={EyeOff}
                  iconBg="bg-gradient-to-br from-slate-400 to-slate-600"
                  label="Sensitive content warning"
                  subtitle="Add a blur / warning before showing"
                  metaField="sensitive"
                />

                {type === "reel" && (
                  <ToggleRow
                    icon={Zap}
                    iconBg="bg-gradient-to-br from-violet-500 to-pink-500"
                    label="Allow remix"
                    subtitle="Let others remix this reel"
                    metaField="allowRemix"
                  />
                )}

                {type === "podcast" && (
                  <div className="space-y-1.5">
                    <label className="section-label">Episode number</label>
                    <Input
                      value={v.postMeta?.episodeNumber || ""}
                      onChange={(e) => set("postMeta.episodeNumber", e.target.value)}
                      placeholder="e.g. Episode 12"
                      className="border-slate-200 bg-slate-50 focus:border-orange-300 focus:bg-white"
                    />
                  </div>
                )}

                {type === "video" && (
                  <div className="space-y-1.5">
                    <label className="section-label">Playlist / Series</label>
                    <Input
                      value={v.postMeta?.playlist || ""}
                      onChange={(e) => set("postMeta.playlist", e.target.value)}
                      placeholder="e.g. Building with AI — Season 1"
                      className="border-slate-200 bg-slate-50 focus:border-orange-300 focus:bg-white"
                    />
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}
            className="border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </Button>
          <button
            type="button"
            onClick={async () => { await onSave?.(); onClose(); }}
            className="soft-button flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold">
            <Check className="h-4 w-4" />
            Save settings
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { uploadToImageKit } from "@/lib/imagekit";
import { toast } from "sonner";

export default function StoriesBar() {
  const storyGroups = useQuery(api.stories.listActiveStories) ?? [];
  const createStory = useMutation(api.stories.createStory);
  const viewStory   = useMutation(api.stories.viewStory);

  const [viewing,    setViewing]   = useState(null);
  const [uploading,  setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef    = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadToImageKit(file, `story-${Date.now()}`, "creator-media");
      if (!result.success) throw new Error(result.error);
      await createStory({
        mediaUrl:  result.data.url,
        mediaType: file.type.startsWith("video/") ? "video" : "image",
      });
      toast.success("Story posted — visible for 24 hours!");
    } catch (err) {
      toast.error(err.message || "Failed to post story");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const openStory = async (group, startIndex = 0) => {
    setViewing({ group, index: startIndex });
    const storyId = group.stories[startIndex]?._id;
    if (storyId) viewStory({ storyId });
  };

  const scroll = (dir) =>
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });

  return (
    <>
      {/* Stories row */}
      <div className="relative border-b border-[#dbdbdb] bg-white">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-4 py-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Add your story */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="relative h-[66px] w-[66px]">
              <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-orange-300 hover:bg-orange-50">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                ) : (
                  <Plus className="h-7 w-7 text-slate-300" />
                )}
              </div>
              {!uploading && (
                <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 ring-2 ring-white">
                  <Plus className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <span className="max-w-[66px] truncate text-[11px] font-medium text-slate-600">
              Your story
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleUpload}
          />

          {/* Other users' stories */}
          {storyGroups.map((group) => (
            <button
              key={group.ownerId}
              onClick={() => openStory(group)}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <div className="h-[66px] w-[66px]">
                <div
                  className={`flex h-full w-full items-center justify-center rounded-full p-[2.5px] ${
                    group.hasUnseen
                      ? "bg-gradient-to-tr from-yellow-400 via-orange-400 via-rose-500 to-violet-500"
                      : "bg-slate-200"
                  }`}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-[2px]">
                    {group.owner?.imageUrl ? (
                      <Image
                        src={group.owner.imageUrl}
                        alt={group.owner.name || ""}
                        width={58}
                        height={58}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-xl font-bold text-white">
                        {group.owner?.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <span className="max-w-[66px] truncate text-[11px] font-medium text-slate-700">
                {group.owner?.username || group.owner?.name}
              </span>
            </button>
          ))}
        </div>

        {/* Scroll arrows — desktop only */}
        {storyGroups.length > 5 && (
          <>
            <button
              onClick={() => scroll(-1)}
              className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-100 h-8 w-8 lg:flex"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-100 h-8 w-8 lg:flex"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </>
        )}
      </div>

      {/* Story viewer */}
      {viewing && (
        <StoryViewer
          group={viewing.group}
          startIndex={viewing.index}
          onClose={() => setViewing(null)}
          onView={(id) => viewStory({ storyId: id })}
        />
      )}
    </>
  );
}

/* ─── Full-screen story viewer ────────────────────────────────────── */
function StoryViewer({ group, startIndex, onClose, onView }) {
  const [index, setIndex] = useState(startIndex);
  const story = group.stories[index];

  const goNext = () => {
    if (index < group.stories.length - 1) {
      const next = index + 1;
      setIndex(next);
      onView(group.stories[next]._id);
    } else {
      onClose();
    }
  };

  const goPrev = () => { if (index > 0) setIndex(index - 1); };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95">
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl"
        style={{ height: "min(100vh, calc(100vw * 16/9))", maxHeight: "100dvh" }}
      >
        {/* Progress bars */}
        <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: i < index ? "100%" : i === index ? "50%" : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-3 top-6 z-10 flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {group.owner?.imageUrl ? (
              <Image
                src={group.owner.imageUrl}
                alt={group.owner.name || ""}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-white/70"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-sm font-bold text-white ring-2 ring-white/70">
                {group.owner?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold leading-none text-white">
                {group.owner?.username || group.owner?.name}
              </p>
              {story.createdAt && (
                <p className="mt-0.5 text-[11px] text-white/70">
                  {Math.round((Date.now() - story.createdAt) / 3600000)}h ago
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-black/30 p-1.5 backdrop-blur-sm">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Media */}
        {story.mediaType === "video" ? (
          <video
            src={story.mediaUrl}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <Image
            src={story.mediaUrl}
            alt="Story"
            fill
            className="object-cover"
            sizes="100vw"
          />
        )}

        {/* Caption */}
        {story.caption && (
          <div className="absolute inset-x-4 bottom-16 z-10 rounded-2xl bg-black/50 p-3 text-sm text-white backdrop-blur-sm">
            {story.caption}
          </div>
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 flex">
          <button className="h-full w-1/3" onClick={goPrev} />
          <button className="h-full flex-1" onClick={goNext} />
        </div>
      </div>
    </div>
  );
}
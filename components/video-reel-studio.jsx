"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Camera, Flag, Loader2, Pause, Play, Save, Scissors, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getVideoThumbnailUrl, isImageKitUrl } from "@/lib/video-thumbnail";

function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoReelStudio({ postId, mediaUrl, contentType, embedType, embedThumbnailUrl, onEnsureDraft }) {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const draggingRef = useRef(null);

  const saved = useQuery(api.mediaStudio.getForPost, postId ? { postId } : "skip");
  const upsert = useMutation(api.mediaStudio.upsert);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [newChapterLabel, setNewChapterLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (saved === undefined || hydrated) return;
    if (saved) {
      setTrimStart(saved.trimStart || 0);
      setTrimEnd(saved.trimEnd || 0);
      setChapters(saved.chapters || []);
      setThumbnailUrl(saved.thumbnailUrl || "");
    }
    setHydrated(true);
  }, [saved, hydrated]);

  useEffect(() => {
    if (duration > 0 && trimEnd === 0) setTrimEnd(duration);
  }, [duration, trimEnd]);

  // Reset playback/error state whenever the source changes
  useEffect(() => {
    setLoadError(false);
    setDuration(0);
    setCurrentTime(0);
  }, [mediaUrl]);

  useEffect(() => {
    const handleMove = (event) => {
      if (!draggingRef.current || !duration) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const time = pct * duration;

      if (draggingRef.current === "start") {
        setTrimStart(Math.max(0, Math.min(time, trimEnd - 0.5)));
      } else {
        setTrimEnd(Math.min(duration, Math.max(time, trimStart + 0.5)));
      }
    };
    const handleUp = () => {
      draggingRef.current = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [duration, trimStart, trimEnd]);

  if (!mediaUrl) return null;

  const label = contentType === "reel" ? "Reel" : "Video";

  // Embedded providers (YouTube/Vimeo/etc.) can't expose frames or duration
  // to us across origins, so trim/chapter tools don't apply. Their own
  // thumbnail (fetched server-side when the link was resolved) is shown
  // instead of any frame-capture UI.
  if (embedType) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="section-label">{label} studio</p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-950">
          <Scissors className="h-5 w-5 text-orange-500" />
          {embedType} video
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Trim and chapter tools aren&apos;t available for embedded {embedType} videos.
          Paste a direct file link (ending in .mp4) instead if you need those tools.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={mediaUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`${embedType} video`}
          />
        </div>
        {embedThumbnailUrl && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="mb-2 text-sm font-bold text-slate-900">Thumbnail</p>
            <img src={embedThumbnailUrl} alt="Video thumbnail" className="h-32 w-full rounded-lg object-cover" />
            <p className="mt-2 text-xs text-slate-400">Provided automatically by {embedType}.</p>
          </div>
        )}
      </section>
    );
  }

  const canCaptureThumbnail = isImageKitUrl(mediaUrl);

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration || 0);
    setLoadError(false);
  };

  const handleVideoError = () => {
    setLoadError(true);
    setDuration(0);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const pctFromClientX = (clientX) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const seekToPct = (pct) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = pct * duration;
    setCurrentTime(video.currentTime);
  };

  const handleTrackClick = (event) => {
    if (draggingRef.current) return;
    seekToPct(pctFromClientX(event.clientX));
  };

  const startDrag = (handle) => (event) => {
    event.stopPropagation();
    draggingRef.current = handle;
  };

  const addChapterHere = () => {
    const label = newChapterLabel.trim() || `Chapter ${chapters.length + 1}`;
    const time = Math.round(currentTime * 10) / 10;
    setChapters((current) => [...current, { time, label }].sort((a, b) => a.time - b.time));
    setNewChapterLabel("");
  };

  const removeChapter = (time) => {
    setChapters((current) => current.filter((chapter) => chapter.time !== time));
  };

  /*
    No <canvas>, no toBlob(), no CORS — this simply builds a URL that
    ImageKit generates the JPG frame for, server-side, on request.
    That's what makes it work for any ImageKit-hosted video regardless
    of where the original file came from.
  */
  const captureThumbnail = () => {
    const url = getVideoThumbnailUrl(mediaUrl, currentTime);
    if (!url) {
      toast.error("Thumbnail capture isn't available for this video source.");
      return;
    }
    setThumbnailUrl(url);
    toast.success("Thumbnail captured");
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const ensuredId = postId || (await onEnsureDraft?.());
      if (!ensuredId) throw new Error("Save the draft first");
      await upsert({
        postId: ensuredId,
        trimStart,
        trimEnd,
        chapters,
        thumbnailUrl: thumbnailUrl || undefined,
      });
      toast.success("Saved trim, chapters, and thumbnail");
    } catch (error) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const startPct = duration ? (trimStart / duration) * 100 : 0;
  const endPct = duration ? (trimEnd / duration) * 100 : 100;
  const playheadPct = duration ? (currentTime / duration) * 100 : 0;
  const trimmedLength = Math.max(0, trimEnd - trimStart);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-label">{label} studio</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-950">
            <Scissors className="h-5 w-5 text-orange-500" />
            Trim, chapters, and thumbnail
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Drag the orange handles to set the usable range, drop chapter markers as you watch, and grab a real frame as the thumbnail.
          </p>
        </div>
        <Button type="button" onClick={save} disabled={isSaving} className="soft-button shrink-0">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          src={mediaUrl}
          className="max-h-[420px] w-full"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={handleVideoError}
          playsInline
        />
      </div>

      {loadError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          This URL can&apos;t be played as a video. Make sure it&apos;s a direct link to a video file
          (e.g. ending in .mp4), not a page URL.
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={loadError}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white disabled:opacity-40"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <span className="shrink-0 font-mono text-xs text-slate-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div ref={trackRef} onClick={handleTrackClick} className="relative h-10 flex-1 cursor-pointer rounded-lg bg-slate-100">
          <div
            className="absolute inset-y-0 rounded-lg bg-orange-100"
            style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
          />
          <div
            className="pointer-events-none absolute top-0 h-full w-0.5 bg-slate-900"
            style={{ left: `${playheadPct}%` }}
          />
          {chapters.map((chapter) => (
            <div
              key={chapter.time}
              title={chapter.label}
              className="pointer-events-none absolute -top-1.5 h-3 w-3 -translate-x-1/2 rotate-45 bg-violet-500"
              style={{ left: `${duration ? (chapter.time / duration) * 100 : 0}%` }}
            />
          ))}
          <div
            onPointerDown={startDrag("start")}
            className="absolute top-0 h-full w-2.5 -translate-x-1/2 cursor-ew-resize rounded bg-orange-500"
            style={{ left: `${startPct}%` }}
          />
          <div
            onPointerDown={startDrag("end")}
            className="absolute top-0 h-full w-2.5 -translate-x-1/2 cursor-ew-resize rounded bg-orange-500"
            style={{ left: `${endPct}%` }}
          />
        </div>
      </div>

      <p className="mt-2 text-xs font-semibold text-slate-500">
        Usable range: {formatTime(trimStart)} – {formatTime(trimEnd)} ({formatTime(trimmedLength)} long)
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">Chapters</p>
            <span className="text-xs font-semibold text-slate-400">{chapters.length}</span>
          </div>
          <div className="mb-3 flex gap-2">
            <Input
              value={newChapterLabel}
              onChange={(event) => setNewChapterLabel(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addChapterHere()}
              placeholder={`Chapter name at ${formatTime(currentTime)}`}
              className="bg-white"
            />
            <Button type="button" onClick={addChapterHere} className="quiet-button shrink-0">
              <Flag className="h-4 w-4" />
            </Button>
          </div>
          {chapters.length === 0 ? (
            <p className="text-xs text-slate-400">
              Play the {label.toLowerCase()}, pause where a new section starts, and add a chapter.
            </p>
          ) : (
            <div className="space-y-1.5">
              {chapters.map((chapter) => (
                <div key={chapter.time} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                  <button
                    type="button"
                    onClick={() => seekToPct(duration ? chapter.time / duration : 0)}
                    className="flex items-center gap-2 font-semibold text-slate-700 hover:text-orange-600"
                  >
                    <span className="font-mono text-xs text-slate-400">{formatTime(chapter.time)}</span>
                    {chapter.label}
                  </button>
                  <button type="button" onClick={() => removeChapter(chapter.time)}>
                    <X className="h-3.5 w-3.5 text-slate-300 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="mb-3 text-sm font-bold text-slate-900">Thumbnail</p>
          {thumbnailUrl ? (
            <div className="relative mb-3 overflow-hidden rounded-lg">
              <img
                src={thumbnailUrl}
                alt="Thumbnail"
                className="h-32 w-full object-cover"
                onError={() => {
                  toast.error("Couldn't load a thumbnail for that frame — try a different moment.");
                  setThumbnailUrl("");
                }}
              />
            </div>
          ) : (
            <div className="mb-3 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-400">
              No thumbnail yet
            </div>
          )}
          <Button type="button" onClick={captureThumbnail} disabled={!canCaptureThumbnail} className="quiet-button w-full">
            <Camera className="h-4 w-4" />
            Use current frame
          </Button>
          {canCaptureThumbnail ? (
            <p className="mt-2 text-xs text-slate-400">Pause on the frame you want, then capture it as the thumbnail.</p>
          ) : (
            <p className="mt-2 text-xs text-amber-600">Thumbnail capture isn&apos;t available for this video source.</p>
          )}
        </div>
      </div>
    </section>
  );
}
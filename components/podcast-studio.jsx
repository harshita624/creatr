"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Flag, Image as ImageIcon, Loader2, Pause, Play, Save, Scissors, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadToImageKit } from "@/lib/imagekit";

function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const BAR_COUNT = 180;

export default function PodcastStudio({ postId, mediaUrl, onEnsureDraft }) {
  const audioRef = useRef(null);
  const trackRef = useRef(null);
  const draggingRef = useRef(null);

  const saved = useQuery(api.mediaStudio.getForPost, postId ? { postId } : "skip");
  const upsert = useMutation(api.mediaStudio.upsert);

  const [peaks, setPeaks] = useState([]);
  const [waveformError, setWaveformError] = useState(false);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [newChapterLabel, setNewChapterLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (saved === undefined || hydrated) return;
    if (saved) {
      setTrimStart(saved.trimStart || 0);
      setTrimEnd(saved.trimEnd || 0);
      setChapters(saved.chapters || []);
      setCoverUrl(saved.thumbnailUrl || "");
    }
    setHydrated(true);
  }, [saved, hydrated]);

  useEffect(() => {
    if (!mediaUrl) return;
    let cancelled = false;

    async function computePeaks() {
      setIsLoadingWaveform(true);
      setWaveformError(false);
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const response = await fetch(mediaUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.max(1, Math.floor(channelData.length / BAR_COUNT));
        const computed = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const start = i * blockSize;
          let max = 0;
          for (let j = 0; j < blockSize; j++) {
            const value = Math.abs(channelData[start + j] || 0);
            if (value > max) max = value;
          }
          computed.push(max);
        }
        setPeaks(computed);
        audioCtx.close();
      } catch (error) {
        if (!cancelled) setWaveformError(true);
      } finally {
        if (!cancelled) setIsLoadingWaveform(false);
      }
    }

    computePeaks();
    return () => {
      cancelled = true;
    };
  }, [mediaUrl]);

  useEffect(() => {
    if (duration > 0 && trimEnd === 0) setTrimEnd(duration);
  }, [duration, trimEnd]);

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

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration || 0);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const pctFromClientX = (clientX) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const seekToPct = (pct) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
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

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const result = await uploadToImageKit(file, `podcast-cover-${Date.now()}-${file.name}`, "creator-media");
      if (!result.success) throw new Error(result.error || "Upload failed");
      setCoverUrl(result.data.url);
      toast.success("Cover art uploaded");
    } catch (error) {
      toast.error(error.message || "Upload failed");
    } finally {
      setIsUploadingCover(false);
      event.target.value = "";
    }
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
        thumbnailUrl: coverUrl || undefined,
      });
      toast.success("Saved trim, chapters, and cover art");
    } catch (error) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const startPct = duration ? (trimStart / duration) * 100 : 0;
  const endPct = duration ? (trimEnd / duration) * 100 : 100;
  const playheadPct = duration ? (currentTime / duration) * 100 : 0;
  const maxPeak = Math.max(0.01, ...peaks);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-label">Podcast studio</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-950">
            <Scissors className="h-5 w-5 text-orange-500" />
            Waveform, chapters, and cover art
          </h2>
          <p className="mt-1 text-sm text-slate-500">Trim dead air from the start or end, mark chapters as you listen, and set real cover art.</p>
        </div>
        <Button type="button" onClick={save} disabled={isSaving} className="soft-button shrink-0">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      <audio
        ref={audioRef}
        src={mediaUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <span className="shrink-0 font-mono text-xs text-slate-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div ref={trackRef} onClick={handleTrackClick} className="relative h-16 flex-1 cursor-pointer overflow-hidden rounded-lg bg-slate-100">
          {isLoadingWaveform ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">Reading waveform...</div>
          ) : waveformError ? (
            <div className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-400">
              Waveform unavailable — trimming still works, click anywhere to seek.
            </div>
          ) : (
            <div className="flex h-full items-end gap-px px-1 py-2">
              {peaks.map((peak, index) => (
                <div key={index} className="flex-1 rounded-sm bg-slate-300" style={{ height: `${Math.max(6, (peak / maxPeak) * 100)}%` }} />
              ))}
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-y-0 bg-orange-200/50"
            style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
          />
          <div className="pointer-events-none absolute top-0 h-full w-0.5 bg-slate-900" style={{ left: `${playheadPct}%` }} />
          {chapters.map((chapter) => (
            <div
              key={chapter.time}
              title={chapter.label}
              className="pointer-events-none absolute -top-0.5 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-violet-500"
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
        Usable range: {formatTime(trimStart)} – {formatTime(trimEnd)}
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
            <p className="text-xs text-slate-400">Listen along, pause where a new segment starts, and add a chapter.</p>
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
          <p className="mb-3 text-sm font-bold text-slate-900">Cover art</p>
          {coverUrl ? (
            <div className="relative mb-3 aspect-square w-32 overflow-hidden rounded-lg">
              <img src={coverUrl} alt="Cover art" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="mb-3 flex aspect-square w-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-400">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
          <label className="quiet-button inline-flex w-full cursor-pointer items-center justify-center gap-2">
            {isUploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploadingCover ? "Uploading..." : "Upload cover art"}
            <input type="file" accept="image/*" className="hidden" onChange={uploadCover} disabled={isUploadingCover} />
          </label>
        </div>
      </div>
    </section>
  );
}
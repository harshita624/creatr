"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Captions,
  CheckCircle2,
  Clapperboard,
  Clock,
  FileText,
  Loader2,
  PlayCircle,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

const SUPPORTED_TYPES = ["reel", "video", "podcast"];

export default function MediaIntelligencePanel({ contentType, postId, onEnsureDraft }) {
  const enqueue = useMutation(api.mediaIntelligence.enqueue);
  const updateSubtitles = useMutation(api.mediaIntelligence.updateSubtitles);
  const latest = useQuery(
    api.mediaIntelligence.getLatestForPost,
    postId ? { postId } : "skip"
  );
  const latestJob = useQuery(
    api.mediaIntelligence.getLatestJobForPost,
    postId ? { postId } : "skip"
  );
  const [starting, setStarting] = useState(false);
  const [subtitleDrafts, setSubtitleDrafts] = useState([]);

  const isSupported = SUPPORTED_TYPES.includes(contentType);
  const isRunning = latestJob && ["queued", "processing"].includes(latestJob.status);

  useEffect(() => {
    if (latest?.subtitles) {
      setSubtitleDrafts(latest.subtitles);
    }
  }, [latest?._id, latest?.subtitles]);

  const statusText = useMemo(() => {
    if (!latestJob) return "Ready";
    if (latestJob.status === "queued") return "Queued";
    if (latestJob.status === "processing") return "Processing";
    if (latestJob.status === "completed") return "Completed";
    return "Failed";
  }, [latestJob]);

  if (!isSupported) return null;

  const startAnalysis = async () => {
    setStarting(true);
    try {
      const ensuredPostId = postId || (await onEnsureDraft?.());
      if (!ensuredPostId) {
        toast.error("Save a draft before running media intelligence");
        return;
      }

      const result = await enqueue({ postId: ensuredPostId });
      toast.success(result.cached ? "Using cached media intelligence" : "Media intelligence queued");
    } catch (error) {
      toast.error(error.message || "Failed to start media intelligence");
    } finally {
      setStarting(false);
    }
  };

  const saveSubtitles = async () => {
    if (!latest?._id) return;
    try {
      await updateSubtitles({
        resultId: latest._id,
        subtitles: subtitleDrafts.map((item) => ({
          start: Number(item.start) || 0,
          end: Number(item.end) || 1,
          text: item.text || "",
        })),
      });
      toast.success("Subtitles saved");
    } catch (error) {
      toast.error(error.message || "Failed to save subtitles");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-label">Media intelligence</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-950">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Transcript, subtitles, clips, chapters
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Runs as a background job and reuses cached results when the draft has not changed.
          </p>
        </div>
        <Button
          type="button"
          onClick={startAnalysis}
          disabled={starting || isRunning}
          className="soft-button"
        >
          {starting || isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {isRunning ? statusText : latest ? "Refresh analysis" : "Run analysis"}
        </Button>
      </div>

      {latestJob && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="flex items-center gap-2">
              {latestJob.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Clock className="h-4 w-4 text-orange-500" />
              )}
              {statusText}
            </span>
            <span>{latestJob.progress || 0}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-emerald-400 transition-all"
              style={{ width: `${latestJob.progress || 0}%` }}
            />
          </div>
          {latestJob.error && (
            <p className="mt-2 text-xs font-semibold text-red-600">{latestJob.error}</p>
          )}
        </div>
      )}

      {latest && (
        <div className="mt-5 grid gap-4">
          <ResultBlock icon={FileText} title="Transcript draft">
            <p className="max-h-48 overflow-y-auto text-sm leading-6 text-slate-600">
              {latest.transcript}
            </p>
          </ResultBlock>

          <ResultBlock icon={Captions} title="Editable subtitles">
            <div className="space-y-2">
              {subtitleDrafts.map((subtitle, index) => (
                <div key={`${subtitle.start}-${index}`} className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[72px_72px_minmax(0,1fr)]">
                  <input
                    value={subtitle.start}
                    onChange={(event) => updateSubtitle(index, "start", event.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    aria-label="Subtitle start"
                  />
                  <input
                    value={subtitle.end}
                    onChange={(event) => updateSubtitle(index, "end", event.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    aria-label="Subtitle end"
                  />
                  <input
                    value={subtitle.text}
                    onChange={(event) => updateSubtitle(index, "text", event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                    aria-label="Subtitle text"
                  />
                </div>
              ))}
              <Button type="button" onClick={saveSubtitles} className="quiet-button">
                <Save className="h-4 w-4" />
                Save subtitles
              </Button>
            </div>
          </ResultBlock>

          <div className="grid gap-4 lg:grid-cols-2">
            <ResultList icon={PlayCircle} title="AI clips" items={latest.clips} render={(item) => (
              <>
                <p className="font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.start}s - {item.end}s</p>
                <p className="mt-2 text-sm text-slate-600">{item.hook}</p>
                <p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">{item.caption}</p>
              </>
            )} />
            <ResultList icon={Clapperboard} title="Highlights" items={latest.highlights} render={(item) => (
              <>
                <p className="font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.start}s - {item.end}s</p>
                <p className="mt-2 text-sm text-slate-600">{item.reason}</p>
              </>
            )} />
          </div>

          <ResultList icon={Clock} title="Chapters" items={latest.chapters} render={(item) => (
            <>
              <p className="font-bold text-slate-900">{item.start}s · {item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
            </>
          )} />

          <ResultBlock icon={Sparkles} title="Title and thumbnail suggestions">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                {latest.titleSuggestions.map((title) => (
                  <div key={title} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    {title}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {latest.thumbnailIdeas.map((idea) => (
                  <div key={idea.title} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-sm font-bold text-slate-900">{idea.overlayText}</p>
                    <p className="mt-1 text-xs text-slate-500">{idea.prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          </ResultBlock>
        </div>
      )}
    </section>
  );

  function updateSubtitle(index, key, value) {
    setSubtitleDrafts((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  }
}

function ResultBlock({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
        <Icon className="h-4 w-4 text-orange-500" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function ResultList({ icon, title, items = [], render }) {
  return (
    <ResultBlock icon={icon} title={title}>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-xl bg-slate-50 p-3">
            {render(item)}
          </div>
        ))}
      </div>
    </ResultBlock>
  );
}

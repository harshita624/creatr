import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Hash,
  Loader2,
  Megaphone,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PostEnhancer({ text, onApplySuggestions }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!text || text === "<p><br></p>") return;

    const timeout = setTimeout(() => {
      analyzePost();
    }, 700);

    return () => clearTimeout(timeout);
  }, [text]);

  const analyzePost = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ml/enhance-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Failed to analyze");

      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error("Enhancement error:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyHashtags = () => {
    const tags = analysis?.keywords?.hashtags || [];
    if (!tags.length) return;
    onApplySuggestions(`${text}<p>${tags.join(" ")}</p>`);
  };

  if (!text || text === "<p><br></p>") return null;

  if (loading && !analysis) {
    return (
      <div className="app-panel flex items-center justify-center gap-3 p-6 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        Analyzing content quality, SEO, tone, and audience fit...
      </div>
    );
  }

  if (!analysis) return null;

  const score = analysis.contentScore || 0;
  const scoreLabel = score >= 75 ? "Strong" : score >= 55 ? "Promising" : "Needs work";

  return (
    <section className="app-panel overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-cyan-300" />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-label">Content intelligence</p>
          <h3 className="mt-2 flex items-center gap-2 text-xl font-bold text-slate-950">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Publish readiness
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Quick signals for clarity, engagement, SEO, audience, and reuse.
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-violet-50 p-4 text-center">
          <div className="text-4xl font-black text-slate-950">{score}</div>
          <div className="text-xs font-semibold uppercase tracking-wide text-orange-500">
            {scoreLabel}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <ScoreCard label="Readability" value={analysis.readability?.score} detail={analysis.readability?.level} />
        <ScoreCard label="SEO" value={analysis.seo?.score} detail={analysis.seo?.score >= 70 ? "Good" : "Improve"} />
        <ScoreCard label="Engagement" value={analysis.engagement?.score} detail={analysis.engagement?.score >= 70 ? "High" : "Medium"} />
        <ScoreCard label="Tone" value={analysis.tone?.primary} detail={analysis.tone?.description} textValue />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <InsightPanel icon={Target} title="Audience Fit">
          <div className="rounded-xl bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                {analysis.audienceFit?.segment}
              </span>
              <span className="text-sm font-bold text-orange-500">
                {analysis.audienceFit?.confidence}% match
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {analysis.audienceFit?.reason}
            </p>
          </div>
        </InsightPanel>

        <InsightPanel icon={ClipboardList} title="Publishing Checklist">
          <div className="space-y-2">
            {analysis.publishingChecklist?.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <CheckCircle2
                  className={`h-4 w-4 ${
                    item.done ? "text-emerald-500" : "text-slate-300"
                  }`}
                />
                <span className={item.done ? "text-slate-700" : "text-slate-400"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </InsightPanel>

        <InsightPanel icon={Wand2} title="Title Ideas">
          <List items={analysis.titleIdeas} />
        </InsightPanel>

        <InsightPanel icon={Megaphone} title="Hook Suggestions">
          <List items={analysis.hookSuggestions} />
        </InsightPanel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <InsightPanel icon={Hash} title="Suggested Hashtags">
          <div className="flex flex-wrap gap-2">
            {analysis.keywords?.hashtags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 ring-1 ring-orange-100"
              >
                {tag}
              </span>
            ))}
          </div>
          <Button onClick={applyHashtags} className="quiet-button mt-4 h-9">
            Add hashtags to post
          </Button>
        </InsightPanel>

        <InsightPanel icon={BadgeCheck} title="Repurpose Ideas">
          <List items={analysis.repurposeIdeas} />
        </InsightPanel>
      </div>

      {analysis.suggestions?.length > 0 && (
        <div className="mt-4 rounded-2xl bg-slate-50/80 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">
            Suggestions
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.title}-${index}`}
                className="rounded-xl border border-white bg-white/80 p-3"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {suggestion.title}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {suggestion.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ScoreCard({ label, value, detail, textValue = false }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/72 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black capitalize text-slate-950">
        {textValue ? value || "N/A" : `${value || 0}`}
        {!textValue && <span className="text-sm text-slate-400">/100</span>}
      </div>
      <div className="mt-1 line-clamp-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function InsightPanel({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/62 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
        <span className="rounded-xl bg-orange-50 p-2">
          <Icon className="h-4 w-4 text-orange-500" />
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

function List({ items = [] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="text-sm leading-6 text-slate-600">
          {item}
        </li>
      ))}
    </ul>
  );
}

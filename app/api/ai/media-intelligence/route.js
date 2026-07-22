import { NextResponse } from "next/server";
import { stripHtml } from "@/lib/ollama-server";
import { generateJsonWithFallback } from "@/lib/ai-provider";

const TYPE_LABELS = {
  reel: "short vertical reel",
  video: "long-form video",
  podcast: "podcast episode",
};

export async function POST(request) {
  try {
    const { post } = await request.json();
    if (!post?._id) {
      return NextResponse.json({ error: "Post is required" }, { status: 400 });
    }

    const contentType = post.contentType || "video";
    const sourceText = buildSourceText(post);
    if (!sourceText) {
      return NextResponse.json(
        { error: "Add a description, caption, or show notes before analysis" },
        { status: 400 }
      );
    }

    const system =
      "You are a media producer for a creator platform. Return strict JSON only. Do not include markdown fences.";
    const user = `Analyze this ${TYPE_LABELS[contentType] || "media post"} for creator production.

Return JSON with this exact shape:
{
  "transcript": "clean transcript or transcript draft based on source material",
  "subtitles": [{"start":0,"end":6,"text":"subtitle"}],
  "highlights": [{"title":"highlight","start":0,"end":30,"reason":"why it matters"}],
  "clips": [{"title":"clip title","hook":"opening hook","start":0,"end":45,"caption":"social caption"}],
  "chapters": [{"title":"chapter","start":0,"summary":"summary"}],
  "titleSuggestions": ["title"],
  "thumbnailIdeas": [{"title":"thumbnail concept","prompt":"visual prompt","overlayText":"short overlay"}],
  "summary": "short production summary"
}

Rules:
- Use realistic timestamps in seconds.
- For reels, keep clips under 45 seconds.
- For long videos and podcasts, create 4 to 7 chapters.
- Subtitles should be short and editable.
- If the source is show notes or a description, say transcript draft, not verified audio transcript.

Title: ${post.title || "Untitled"}
Media URL: ${post.mediaUrl || "none"}
Category: ${post.category || "general"}
Tags: ${(post.tags || []).join(", ") || "none"}
Source material:
${sourceText.slice(0, 6500)}`;

    const { json: parsed, provider } = await generateJsonWithFallback({
      system,
      user,
      temperature: 0.45,
      maxTokens: 1400,
      timeoutMs: 18000,
    });
    validateResult(parsed);

    return NextResponse.json({
      success: true,
      provider,
      result: normalizeResult(parsed),
    });
  } catch (error) {
    console.error("Media intelligence error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Media intelligence failed",
      },
      { status: error.status || 502 }
    );
  }
}

function buildSourceText(post) {
  const meta = post.postMeta || {};
  return [
    meta.caption,
    meta.showNotes,
    meta.chapters,
    meta.readinessNotes,
    stripHtml(post.content || ""),
    post.title,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function validateResult(result) {
  const requiredArrays = [
    "subtitles",
    "highlights",
    "clips",
    "chapters",
    "titleSuggestions",
    "thumbnailIdeas",
  ];

  if (!result || typeof result !== "object") {
    throw new Error("AI returned an empty media intelligence result");
  }

  if (!result.transcript || typeof result.transcript !== "string") {
    throw new Error("AI result is missing transcript");
  }

  if (!result.summary || typeof result.summary !== "string") {
    throw new Error("AI result is missing summary");
  }

  for (const field of requiredArrays) {
    if (!Array.isArray(result[field])) {
      throw new Error(`AI result is missing ${field}`);
    }
  }
}

function normalizeResult(result = {}) {
  return {
    transcript: result.transcript.trim(),
    subtitles: normalizeTimedItems(
      result.subtitles,
      ["text"]
    ),
    highlights: normalizeTimedItems(
      result.highlights,
      ["title", "reason"]
    ),
    clips: normalizeTimedItems(
      result.clips,
      ["title", "hook", "caption"]
    ),
    chapters: normalizeChapters(result.chapters),
    titleSuggestions: normalizeStrings(result.titleSuggestions),
    thumbnailIdeas: normalizeThumbnailIdeas(result.thumbnailIdeas),
    summary: result.summary.trim(),
  };
}

function normalizeTimedItems(items, stringKeys) {
  return items.slice(0, 8).map((item, index) => {
    const start = Number.isFinite(Number(item.start)) ? Number(item.start) : index * 20;
    const end = Number.isFinite(Number(item.end)) ? Number(item.end) : start + 20;
    const normalized = { start, end: Math.max(end, start + 1) };
    stringKeys.forEach((key) => {
      normalized[key] = String(item[key] || "").slice(0, 220);
    });
    return normalized;
  });
}

function normalizeChapters(items) {
  return items.slice(0, 8).map((item, index) => ({
    title: String(item.title || `Chapter ${index + 1}`).slice(0, 80),
    start: Number.isFinite(Number(item.start)) ? Number(item.start) : index * 90,
    summary: String(item.summary || "").slice(0, 220),
  }));
}

function normalizeStrings(items) {
  return items.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
}

function normalizeThumbnailIdeas(items) {
  return items.slice(0, 6).map((item) => ({
    title: String(item.title || "Thumbnail idea").slice(0, 80),
    prompt: String(item.prompt || "").slice(0, 240),
    overlayText: buildOverlay(item.overlayText || ""),
  }));
}

function buildOverlay(value) {
  return String(value)
    .replace(/[^\w\s?!-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ")
    .toUpperCase();
}

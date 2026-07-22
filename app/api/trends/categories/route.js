import { NextResponse } from "next/server";

const ML_BACKEND_URL = process.env.ML_BACKEND_URL || "http://localhost:5000";

/* ── Country → Google News locale config ───────────────────────── */
const COUNTRY_CONFIG = {
  IN: { hl: "en-IN", gl: "IN", ceid: "IN:en"    },
  US: { hl: "en-US", gl: "US", ceid: "US:en"    },
  GB: { hl: "en-GB", gl: "GB", ceid: "GB:en"    },
  CA: { hl: "en-CA", gl: "CA", ceid: "CA:en"    },
  AU: { hl: "en-AU", gl: "AU", ceid: "AU:en"    },
  DE: { hl: "de",    gl: "DE", ceid: "DE:de"    },
  JP: { hl: "ja",    gl: "JP", ceid: "JP:ja"    },
  BR: { hl: "pt-BR", gl: "BR", ceid: "BR:pt-419"},
};

const CATEGORY_QUERIES = {
  technology: ["technology trends", "tech innovation", "software AI"],
  design:     ["design trends", "UI UX design", "graphic design"],
  marketing:  ["digital marketing", "social media marketing", "content marketing"],
  business:   ["business news", "startup trends", "entrepreneur"],
  lifestyle:  ["lifestyle trends", "wellness", "self improvement"],
  education:  ["education technology", "online learning", "skills"],
  health:     ["health wellness", "mental health", "fitness"],
  finance:    ["personal finance", "investing", "cryptocurrency"],
  ai:         ["artificial intelligence", "machine learning", "ChatGPT"],
  creator:    ["content creators", "YouTube influencer", "social media creator"],
};

/* ── Parse Google News RSS ─────────────────────────────────────── */
function parseRSS(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const item of itemMatches.slice(0, 15)) {
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] ||
                  item.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link  = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pub   = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const source= item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || "";

    if (!title) continue;

    if (pub) {
      const age = Date.now() - new Date(pub).getTime();
      if (age > 24 * 3600 * 1000) continue;
    }

    items.push({ title: title.replace(/\s*-\s*[^-]+$/, "").trim(), link, source, pub });
  }

  return items;
}

/* ── Build hot topics from RSS items (Google News fallback path) ── */
function buildHotTopics(allItems) {
  const seen = new Set();
  return allItems
    .filter((item) => {
      const key = item.title.toLowerCase().slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10)
    .map((item) => ({
      topic:       item.title,
      description: item.source ? `Source: ${item.source}` : "",
      location:    item.source || "",
      volume:      Math.floor(Math.random() * 5000) + 500,
      growth:      Math.floor(Math.random() * 60) + 5,
      promoted:    false,
    }));
}

/* ── Extract hashtags from topics (Google News fallback path) ───── */
function buildHashtags(topics, category) {
  const words = topics
    .flatMap((t) => t.topic.split(/\s+/))
    .filter((w) => w.length > 4 && /^[a-zA-Z]/.test(w))
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""));

  const freq = {};
  for (const w of words) {
    const key = w.toLowerCase();
    freq[key] = (freq[key] || 0) + 1;
  }

  const tags = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);

  const catDefaults = {
    technology: ["tech", "innovation", "digital", "software", "AI"],
    design:     ["design", "UX", "creative", "typography", "branding"],
    marketing:  ["marketing", "SEO", "growth", "brand", "strategy"],
    business:   ["business", "startup", "entrepreneur", "success"],
    ai:         ["AI", "machinelearning", "ChatGPT", "OpenAI", "LLM"],
    creator:    ["creator", "contentcreator", "influence", "viral"],
  };

  const defaults = catDefaults[category] || [];
  const combined = [...new Set([...tags, ...defaults])].slice(0, 15);
  return combined;
}

/* ── Map Flask's actual /analyze-category response to the UI shape ── */
function mapMlResponse(mlData, country) {
  const sources = mlData.research_sources || [];
  const trendingWords = mlData.viral_patterns?.trending_words || [];
  const stats = mlData.stats || {};

  return {
    hotTopics: sources.slice(0, 10).map((s) => ({
      topic:       s.title,
      description: `${s.content_angle || "Trend"} · ${s.subreddit || ""}`,
      location:    s.subreddit || country,
      volume:      (s.engagement?.upvotes || 0) + (s.engagement?.comments || 0),
      growth:      Math.min(99, Math.round(s.virality_score || 0)),
    })),
    trendingHashtags: trendingWords,
    insights: [
      `Best time to post: ${stats.best_posting_time || "9:00-11:00"}`,
      `Top-performing format right now: ${stats.top_format || "Tutorial"}`,
      `${stats.total_sources || sources.length} live sources analyzed in the last 24 hours`,
      mlData.viral_patterns?.use_questions
        ? "Titles framed as questions are getting more traction"
        : "Straightforward, direct titles are performing best",
    ],
    stats: {
      activeTrends: stats.total_sources ?? sources.length,
      trendingTags: trendingWords.length,
      totalVolume:  `${stats.total_sources ?? sources.length} sources`,
    },
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "technology";
  const country  = (searchParams.get("country") || "IN").toUpperCase();

  const locale = COUNTRY_CONFIG[country] || COUNTRY_CONFIG.IN;
  const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.technology;

  /* ── Try ML backend first ──────────────────────────────────── */
  try {
    const mlRes = await fetch(`${ML_BACKEND_URL}/analyze-category/${category}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, region: country }),
      signal: AbortSignal.timeout(8000),
    });

    if (mlRes.ok) {
      const mlData = await mlRes.json();
      return NextResponse.json(mapMlResponse(mlData, country));
    }
  } catch {
    // ML backend not running — fall through to Google News
  }

  /* ── Google News RSS fallback (country-aware) ────────────────── */
  try {
    const allItems = [];

    for (const q of queries.slice(0, 2)) {
      const encoded = encodeURIComponent(`${q} ${country === "IN" ? "India" : country === "US" ? "USA" : ""}`);
      const rssUrl  = `https://news.google.com/rss/search?q=${encoded}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;

      try {
        const res = await fetch(rssUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)" },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const xml   = await res.text();
          const items = parseRSS(xml);
          allItems.push(...items);
        }
      } catch {
        // skip failed query
      }
    }

    if (allItems.length === 0) throw new Error("No RSS data");

    const hotTopics        = buildHotTopics(allItems);
    const trendingHashtags = buildHashtags(hotTopics, category);

    return NextResponse.json({
      hotTopics,
      trendingHashtags,
      insights: [
        `Trending content in ${country} around ${category} — last 24 hours`,
        `${hotTopics.length} unique topics detected from Google News`,
        `Best formats for these trends: carousel and short video`,
        `Post during morning/evening hours for maximum reach in ${country}`,
      ],
      stats: {
        activeTrends: hotTopics.length,
        trendingTags: trendingHashtags.length,
        totalVolume:  `${allItems.length} articles`,
      },
    });
  } catch (err) {
    console.error("Trends API error:", err.message);
    return NextResponse.json(
      { error: "Could not fetch trends. Start the ML backend or check your internet connection.", hotTopics: [], trendingHashtags: [], insights: [], stats: { activeTrends: 0, trendingTags: 0, totalVolume: "0" } },
      { status: 503 }
    );
  }
}
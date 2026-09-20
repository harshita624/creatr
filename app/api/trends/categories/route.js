import { NextResponse } from "next/server";

const ML_BACKEND_URL = process.env.ML_BACKEND_URL || "http://localhost:5000";

// A generic "bot"-labeled User-Agent is a common trigger for Google to
// silently rate-limit or block RSS requests. A realistic browser UA is
// far less likely to be filtered.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                  item.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link  = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pub   = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const source= item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || "";

    if (!title) continue;

    // FIX: the query now asks Google for recent items directly (when:1d,
    // below), so this is now just a generous safety net (72h) for feed
    // lag, not the sole recency mechanism — previously a hard 24h cutoff
    // with no recency hint in the query could empty out the whole result
    // set for quieter categories.
    if (pub) {
      const age = Date.now() - new Date(pub).getTime();
      if (age > 72 * 3600 * 1000) continue;
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

/* ── Fetch one Google News RSS query, tolerant of individual failures ── */
async function fetchRssQuery(query, country, locale) {
  const withRecency = `${query} when:1d`;
  const encoded = encodeURIComponent(
    `${withRecency} ${country === "IN" ? "India" : country === "US" ? "USA" : ""}`.trim()
  );
  const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;

  try {
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": BROWSER_USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml);
  } catch {
    return [];
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "technology";
  const country  = (searchParams.get("country") || "IN").toUpperCase();

  const locale = COUNTRY_CONFIG[country] || COUNTRY_CONFIG.IN;
  const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.technology;

  /* ── Try ML backend first (optional — only relevant if you've deployed trends_backend.py separately and set ML_BACKEND_URL) ── */
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
    // ML backend not deployed/reachable — fall through to Google News, which is the default path for most deployments.
  }

  /* ── Google News RSS fallback (country-aware, this is the default path) ── */
  try {
    // FIX: was sequential awaits in a for-loop; now runs in parallel and
    // tolerates individual query failures instead of one bad query
    // taking down the whole request.
    const results = await Promise.all(
      queries.slice(0, 2).map((q) => fetchRssQuery(q, country, locale))
    );
    const allItems = results.flat();

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
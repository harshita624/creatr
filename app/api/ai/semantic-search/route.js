import { NextResponse } from "next/server";
import { askOllama, searchPostsLocally, stripHtml } from "@/lib/ollama-server";

export async function POST(request) {
  let payload = {};
  try {
    payload = await request.json();
    const { query = "", posts = [] } = payload;
    if (!query.trim()) {
      return NextResponse.json({ success: true, results: [] });
    }

    const compactPosts = posts.slice(0, 12).map((post, index) => ({
      index,
      id: post._id,
      title: post.title,
      tags: post.tags || [],
      category: post.category || "",
      text: stripHtml(post.content || "").slice(0, 140),
      engagement: (post.viewCount || 0) + (post.likeCount || 0) * 4 + (post.commentCount || 0) * 6,
    }));

    const reply = await askOllama(
      [
        {
          role: "system",
          content:
            "You rank creator posts for semantic search. Return only valid compact JSON with this exact shape: {\"matches\":[{\"id\":\"post id\",\"score\":0-100,\"reason\":\"max 8 words\"}]}. No markdown. No extra keys.",
        },
        {
          role: "user",
          content: `Search query: ${query}

Posts:
${JSON.stringify(compactPosts)}`,
        },
      ],
      { temperature: 0.1, numPredict: 320, format: "json" }
    );

    const matches = parseJson(reply).matches || [];
    return NextResponse.json({ success: true, results: matches });
  } catch (error) {
    console.error("Semantic search error:", error.message);
    return NextResponse.json({
      success: true,
      fallback: true,
      results: searchPostsLocally(payload.query, payload.posts),
    });
  }
}

function parseJson(value) {
  const clean = (value || "").replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  const jsonText = start >= 0 && end >= 0 ? clean.slice(start, end + 1) : clean;
  try {
    return JSON.parse(jsonText);
  } catch {
    const matches = [];
    const objectMatches = jsonText.match(/\{[^{}]*"id"[^{}]*\}/g) || [];
    for (const item of objectMatches) {
      try {
        const parsed = JSON.parse(item);
        if (parsed.id) matches.push(parsed);
      } catch {}
    }
    return { matches };
  }
}

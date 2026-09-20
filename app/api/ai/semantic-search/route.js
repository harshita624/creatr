// app/api/ai/semantic-search/route.js
import { NextResponse } from "next/server";
import { generateJsonWithFallback } from "@/lib/ai-provider";
import { searchPostsLocally, stripHtml } from "@/lib/ollama-server";

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

    const { json } = await generateJsonWithFallback({
      system:
        'You rank creator posts for semantic search. Return only valid compact JSON with this exact shape: {"matches":[{"id":"post id","score":0-100,"reason":"max 8 words"}]}. No markdown. No extra keys.',
      user: `Search query: ${query}

Posts:
${JSON.stringify(compactPosts)}`,
      temperature: 0.1,
      maxTokens: 320,
    });

    return NextResponse.json({ success: true, results: json.matches || [] });
  } catch (error) {
    console.error("Semantic search error:", error.message);
    return NextResponse.json({
      success: true,
      fallback: true,
      results: searchPostsLocally(payload.query, payload.posts),
    });
  }
}
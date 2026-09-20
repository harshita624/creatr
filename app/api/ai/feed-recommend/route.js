// app/api/ai/feed-recommendations/route.js
import { NextResponse } from "next/server";
import { generateJsonWithFallback } from "@/lib/ai-provider";
import { rankPostsLocally, stripHtml } from "@/lib/ollama-server";

export async function POST(request) {
  let payload = {};
  try {
    payload = await request.json();
    const { posts = [], intent = "recommend strong creator posts" } = payload;
    const compactPosts = posts.slice(0, 12).map((post) => ({
      id: post._id,
      title: post.title,
      tags: post.tags || [],
      category: post.category || "",
      text: stripHtml(post.content || "").slice(0, 120),
      stats: {
        views: post.viewCount || 0,
        likes: post.likeCount || 0,
        comments: post.commentCount || 0,
      },
    }));

    const { json } = await generateJsonWithFallback({
      system:
        'You are an AI feed recommender. Return only valid compact JSON with this exact shape: {"recommendations":[{"id":"post id","score":0-100,"why":"max 8 words"}]}. No markdown. No extra keys.',
      user: `User intent: ${intent}

Posts:
${JSON.stringify(compactPosts)}`,
      temperature: 0.1,
      maxTokens: 320,
    });

    return NextResponse.json({ success: true, recommendations: json.recommendations || [] });
  } catch (error) {
    console.error("Feed recommendation error:", error.message);
    return NextResponse.json({
      success: true,
      fallback: true,
      recommendations: rankPostsLocally(payload.posts, payload.intent),
    });
  }
}
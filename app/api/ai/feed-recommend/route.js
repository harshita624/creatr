import { NextResponse } from "next/server";
import { askOllama, rankPostsLocally, stripHtml } from "@/lib/ollama-server";

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

    const reply = await askOllama(
      [
        {
          role: "system",
          content:
            "You are an AI feed recommender. Return only valid compact JSON with this exact shape: {\"recommendations\":[{\"id\":\"post id\",\"score\":0-100,\"why\":\"max 8 words\"}]}. No markdown. No extra keys.",
        },
        {
          role: "user",
          content: `User intent: ${intent}

Posts:
${JSON.stringify(compactPosts)}`,
        },
      ],
      { temperature: 0.1, numPredict: 320, format: "json" }
    );

    const recommendations = parseJson(reply).recommendations || [];
    return NextResponse.json({ success: true, recommendations });
  } catch (error) {
    console.error("Feed recommendation error:", error.message);
    return NextResponse.json({
      success: true,
      fallback: true,
      recommendations: rankPostsLocally(payload.posts, payload.intent),
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
    const recommendations = [];
    const objectMatches = jsonText.match(/\{[^{}]*"id"[^{}]*\}/g) || [];
    for (const item of objectMatches) {
      try {
        const parsed = JSON.parse(item);
        if (parsed.id) recommendations.push(parsed);
      } catch {}
    }
    return { recommendations };
  }
}

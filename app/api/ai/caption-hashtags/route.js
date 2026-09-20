// app/api/ai/caption-hashtags/route.js
import { NextResponse } from "next/server";
import { generateJsonWithFallback } from "@/lib/ai-provider";
import { stripHtml } from "@/lib/ollama-server";

export async function POST(request) {
  try {
    const { title = "", content = "", category = "" } = await request.json();
    const text = stripHtml(content);

    const { json } = await generateJsonWithFallback({
      system:
        'Generate creator captions and hashtags. Return strict JSON only: {"caption":"short caption","hashtags":["#tag"],"altCaptions":["caption"]}',
      user: `Title: ${title}
Category: ${category}
Post: ${text.slice(0, 2200)}`,
      temperature: 0.65,
      maxTokens: 500,
    });

    return NextResponse.json({ success: true, ...json });
  } catch (error) {
    console.error("Caption generator error:", error.message);
    return NextResponse.json({
      success: true,
      fallback: true,
      caption: "A practical idea for creators who want to publish with more clarity.",
      hashtags: ["#creator", "#content", "#writing", "#growth"],
      altCaptions: [
        "Save this if you are building a better content workflow.",
        "A simple way to make your next post stronger.",
      ],
    });
  }
}
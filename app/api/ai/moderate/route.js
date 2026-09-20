// app/api/ai/moderation/route.js
import { NextResponse } from "next/server";
import { generateJsonWithFallback } from "@/lib/ai-provider";
import { stripHtml } from "@/lib/ollama-server";

export async function POST(request) {
  let payload = {};
  try {
    payload = await request.json();
    const { text = "" } = payload;
    const cleanText = stripHtml(text);
    if (!cleanText) {
      return NextResponse.json({ success: true, safe: true, toxicity: 0, spam: 0 });
    }

    const { json } = await generateJsonWithFallback({
      system:
        'You classify creator-platform comments for toxicity and spam. Return strict JSON only: {"safe":boolean,"toxicity":0-100,"spam":0-100,"reason":"short reason"}',
      user: cleanText.slice(0, 1200),
      temperature: 0.1,
      maxTokens: 260,
    });

    return NextResponse.json({ success: true, ...json });
  } catch (error) {
    console.error("Moderation error:", error.message);
    const text = (payload.text || "").toLowerCase();
    const toxic = /(idiot|stupid|hate|kill|trash|scam)/i.test(text);
    const spam = /(buy now|free money|click here|http|www\.)/i.test(text);
    return NextResponse.json({
      success: true,
      fallback: true,
      safe: !toxic && !spam,
      toxicity: toxic ? 78 : 5,
      spam: spam ? 82 : 5,
      reason: toxic || spam ? "Heuristic moderation flagged this." : "No obvious issue found.",
    });
  }
}
// app/api/ai/audience-simulator/route.js
import { NextResponse } from "next/server";
import { generateJsonWithFallback } from "@/lib/ai-provider";
import { heuristicAudienceSimulation, stripHtml } from "@/lib/ollama-server";

export async function POST(request) {
  let text = "";

  try {
    const payload = await request.json();
    text = payload.text || "";

    if (!stripHtml(text)) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const { json: parsed } = await generateJsonWithFallback({
      system:
        "You are an audience simulator for a creator platform. Return strict JSON only. No markdown.",
      user: `Analyze this draft and simulate audience reactions.

Return this exact JSON shape:
{
  "originalityScore": number,
  "likelyComments": string,
  "audienceTwins": [
    {"name": "Busy creator", "reaction": string, "improvement": string},
    {"name": "Beginner", "reaction": string, "improvement": string},
    {"name": "Skeptic", "reaction": string, "improvement": string}
  ],
  "hiddenRisk": string,
  "bestNextMove": string
}

Draft:
${stripHtml(text).slice(0, 4500)}`,
      temperature: 0.45,
      maxTokens: 700,
    });

    return NextResponse.json({ success: true, simulation: parsed });
  } catch (error) {
    console.error("Audience simulator error:", error.message);
    return NextResponse.json({
      success: true,
      fallback: true,
      simulation: heuristicAudienceSimulation(text),
    });
  }
}
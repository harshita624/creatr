import { NextResponse } from "next/server";
import {
  askOllama,
  heuristicAudienceSimulation,
  stripHtml,
} from "@/lib/ollama-server";

export async function POST(request) {
  let text = "";

  try {
    const payload = await request.json();
    text = payload.text || "";

    if (!stripHtml(text)) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const response = await askOllama(
      [
        {
          role: "system",
          content:
            "You are an audience simulator for a creator platform. Return strict JSON only. No markdown.",
        },
        {
          role: "user",
          content: `Analyze this draft and simulate audience reactions.

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
        },
      ],
      { temperature: 0.45, numPredict: 700 }
    );

    const parsed = parseJson(response);
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

function parseJson(value) {
  const clean = value.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  const json = start >= 0 && end >= 0 ? clean.slice(start, end + 1) : clean;
  return JSON.parse(json);
}

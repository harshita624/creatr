import { NextResponse } from "next/server";
import { askOllama, fallbackCopilotReply } from "@/lib/ollama-server";

export async function POST(request) {
  let payload = {};
  try {
    payload = await request.json();
    const { message, context = "", history = [] } = payload;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const reply = await askOllama(
      [
        {
          role: "system",
          content:
            "You are CreateK Copilot, a concise creator assistant. Help with posts, hooks, SEO, audience strategy, trends, and dashboard decisions. Keep replies practical, warm, and under 130 words unless asked for more.",
        },
        {
          role: "user",
          content: `Current app context:
${context || "General creator workflow"}

Recent chat history:
${history
  .slice(-10)
  .map((item) => `${item.role}: ${item.content}`)
  .join("\n") || "No previous messages"}

User question:
${message}`,
        },
      ],
      { temperature: 0.62, numPredict: 500 }
    );

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("Copilot error:", error.message);
    return NextResponse.json({
      success: true,
      fallback: true,
      reply: fallbackCopilotReply(payload.message),
    });
  }
}

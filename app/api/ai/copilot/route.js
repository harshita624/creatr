// app/api/ai/copilot/route.js
import { NextResponse } from "next/server";
import { generateTextWithFallback } from "@/lib/ai-provider";

export async function POST(request) {
  try {
    const payload = await request.json();
    const { message, context = "", history = [] } = payload || {};

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    const safeHistory = Array.isArray(history) ? history : [];

    const { text: reply } = await generateTextWithFallback({
      system:
        "You are CreateK Copilot, a concise creator assistant. Help with posts, hooks, SEO, audience strategy, trends, and dashboard decisions. Keep replies practical, warm, and under 130 words unless asked for more.",
      user: `Current app context:
${context || "General creator workflow"}

Recent chat history:
${safeHistory
  .slice(-10)
  .map((item) => `${item.role}: ${item.content}`)
  .join("\n") || "No previous messages"}

User question:
${message}`,
      temperature: 0.62,
      maxTokens: 500,
    });

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("Copilot error:", error.message);
    return NextResponse.json(
      { success: false, error: "The AI assistant could not respond. Check the AI provider configuration and try again." },
      { status: error.status || 503 }
    );
  }
}

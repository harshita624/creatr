import { NextResponse } from "next/server";
import { askOllama, stripHtml } from "@/lib/ollama-server";

export async function POST(request) {
  try {
    const { title = "", content = "", category = "" } = await request.json();
    const text = stripHtml(content);

    const reply = await askOllama(
      [
        {
          role: "system",
          content:
            "Generate creator captions and hashtags. Return strict JSON only: {\"caption\":\"short caption\",\"hashtags\":[\"#tag\"],\"altCaptions\":[\"caption\"]}",
        },
        {
          role: "user",
          content: `Title: ${title}
Category: ${category}
Post: ${text.slice(0, 2200)}`,
        },
      ],
      { temperature: 0.65, numPredict: 500 }
    );

    return NextResponse.json({ success: true, ...parseJson(reply) });
  } catch (error) {
    console.error("Caption generator error:", error.message);
    return NextResponse.json({
      success: true,
      caption: "A practical idea for creators who want to publish with more clarity.",
      hashtags: ["#creator", "#content", "#writing", "#growth"],
      altCaptions: [
        "Save this if you are building a better content workflow.",
        "A simple way to make your next post stronger.",
      ],
    });
  }
}

function parseJson(value) {
  const clean = (value || "").replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return JSON.parse(start >= 0 && end >= 0 ? clean.slice(start, end + 1) : clean);
}

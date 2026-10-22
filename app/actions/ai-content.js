"use server";

import { generateTextWithFallback } from "@/lib/ai-provider";

function stripHtml(content) {
  return (content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatContent(content) {
  return (content || "")
    .trim()
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => (line.match(/^<(h|ul|ol|li|p)/i) ? line : `<p>${line}</p>`))
    .join("\n");
}

export async function generateBlogContent(title, category = "", tags = []) {
  try {
    if (!title?.trim()) {
      throw new Error("Title required");
    }

    const { text: content } = await generateTextWithFallback({
      system:
        "You are CreateK's writing assistant. Write practical, engaging creator content. Return markdown only.",
      user: `Write a concise blog post.
Title: ${title}
Category: ${category || "general"}
Tags: ${(tags || []).join(", ") || "none"}

Requirements:
- 3 clear sections
- 300 to 450 words
- Use ## headings
- Add a practical closing question
- Do not include preface text`,
      temperature: 0.72,
      maxTokens: 900,
    });

    if (!content || content.length < 80) {
      throw new Error("AI returned too little content");
    }

    return {
      success: true,
      content: formatContent(content),
    };
  } catch (error) {
    console.error("AI generation error:", error.message);
    return {
      success: false,
      error: error.message || "AI generation failed. Check the configured AI provider and try again.",
    };
  }
}

export async function improveContent(content, mode = "enhance") {
  try {
    if (!content?.trim()) {
      throw new Error("Content required");
    }

    const text = stripHtml(content);

    const prompts = {
      expand:
        "Expand this post with richer examples, stronger transitions, and a better closing question.",
      simplify:
        "Simplify this post so it is clearer, more direct, and easier for beginners to read.",
      enhance:
        "Improve this post for clarity, hook strength, SEO, and audience engagement.",
    };

    const { text: improved } = await generateTextWithFallback({
      system:
        "You are CreateK's content editor. Preserve the author's intent. Return improved markdown only.",
      user: `${prompts[mode] || prompts.enhance}

Post:
${text}`,
      temperature: 0.55,
      maxTokens: 900,
    });

    return {
      success: true,
      content: formatContent(improved),
    };
  } catch (error) {
    console.error("AI improvement error:", error.message);
    return {
      success: false,
      error: error.message || "AI improvement failed. Check the configured AI provider and try again.",
    };
  }
}

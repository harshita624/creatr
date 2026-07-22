"use server";

import ollama from "ollama";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

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

async function chatWithOllama(messages, options = {}) {
  const response = await ollama.chat({
    model: options.model || OLLAMA_MODEL,
    messages,
    options: {
      temperature: options.temperature ?? 0.7,
      num_predict: options.numPredict ?? 900,
    },
  });

  return response?.message?.content || "";
}

export async function generateBlogContent(title, category = "", tags = []) {
  try {
    if (!title?.trim()) {
      throw new Error("Title required");
    }

    const content = await chatWithOllama(
      [
        {
          role: "system",
          content:
            "You are CreateK's local Ollama writing assistant. Write practical, engaging creator content. Return markdown only.",
        },
        {
          role: "user",
          content: `Write a concise blog post.
Title: ${title}
Category: ${category || "general"}
Tags: ${(tags || []).join(", ") || "none"}

Requirements:
- 3 clear sections
- 300 to 450 words
- Use ## headings
- Add a practical closing question
- Do not include preface text`,
        },
      ],
      { temperature: 0.72, numPredict: 900 }
    );

    if (!content || content.length < 80) {
      throw new Error("Ollama returned too little content");
    }

    return {
      success: true,
      content: formatContent(content),
    };
  } catch (error) {
    console.error("Ollama generation error:", error.message);
    return {
      success: false,
      error:
        "Ollama generation failed. Make sure Ollama is running and OLLAMA_MODEL is installed.",
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

    const improved = await chatWithOllama(
      [
        {
          role: "system",
          content:
            "You are a local Ollama content editor. Preserve the author's intent. Return improved markdown only.",
        },
        {
          role: "user",
          content: `${prompts[mode] || prompts.enhance}

Post:
${text}`,
        },
      ],
      { temperature: 0.55, numPredict: 900 }
    );

    return {
      success: true,
      content: formatContent(improved),
    };
  } catch (error) {
    console.error("Ollama improvement error:", error.message);
    return {
      success: false,
      error:
        "Ollama improvement failed. Make sure Ollama is running and your model is available.",
    };
  }
}

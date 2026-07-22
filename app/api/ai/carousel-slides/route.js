import { NextResponse } from "next/server";
import { stripHtml } from "@/lib/ollama-server";

const VALID_LAYOUTS   = new Set(["cover", "split", "quote", "stat", "cta"]);
const VALID_TEMPLATES = new Set(["minimal", "bold", "gradient", "card", "gradient-dark", "gradient-light"]);
const LAYOUT_CYCLE    = ["cover", "split", "quote", "stat", "split", "cta"];
const TEMPLATE_CYCLE  = ["gradient-dark", "minimal", "bold", "gradient", "card", "gradient-light"];

/* ── Robust JSON parser ───────────────────────────────────────────── */
function robustParse(text) {
  if (!text) throw new Error("Empty response");
  let s = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  const arrIdx = s.indexOf("[");
  const objIdx = s.indexOf("{");
  let raw = s;
  if (arrIdx >= 0 && (objIdx < 0 || arrIdx < objIdx)) {
    const end = s.lastIndexOf("]");
    if (end > arrIdx) raw = s.slice(arrIdx, end + 1);
  } else if (objIdx >= 0) {
    const end = s.lastIndexOf("}");
    if (end > objIdx) raw = s.slice(objIdx, end + 1);
  }

  try { return JSON.parse(raw); } catch {}

  const fixed = raw
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,\[]\s*)'([^'\n]+?)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^'\n]*)'/g, ': "$1"')
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/[\r\n]+/g, " ")
    .replace(/[\x00-\x1f]/g, " ");

  try { return JSON.parse(fixed); } catch {}

  const objects = [];
  const pattern = /\{[^{}]*\}/g;
  let m;
  while ((m = pattern.exec(fixed)) !== null) {
    try { const p = JSON.parse(m[0]); if (p.title) objects.push(p); } catch {}
  }
  if (objects.length > 0) return objects;
  throw new Error("Could not parse JSON");
}

/* ── Sanitise a slide ─────────────────────────────────────────────── */
function sanitise(raw, index) {
  return {
    title:    String(raw.title   || raw.heading  || `Slide ${index + 1}`).slice(0, 80),
    caption:  String(raw.caption || raw.body     || raw.text || "").slice(0, 220),
    layout:   VALID_LAYOUTS.has(raw.layout)    ? raw.layout    : LAYOUT_CYCLE[index % LAYOUT_CYCLE.length],
    template: VALID_TEMPLATES.has(raw.template) ? raw.template : TEMPLATE_CYCLE[index % TEMPLATE_CYCLE.length],
  };
}

/* ── Parse title to extract key structure ─────────────────────────── */
function parseTitle(title) {
  const t = title.trim();

  // "N Ways/Tips/Reasons/Steps/Mistakes/Hacks/Tools"
  const numbered = t.match(/^(\d+)\s+(ways?|tips?|reasons?|steps?|mistakes?|hacks?|tools?|things?|ideas?|facts?|rules?|secrets?)\s+/i);
  if (numbered) {
    return {
      type:   "numbered",
      count:  parseInt(numbered[1]),
      verb:   numbered[2],
      topic:  t.slice(numbered[0].length),
    };
  }

  // "How to ..."
  if (/^how\s+to\s+/i.test(t)) {
    const topic = t.replace(/^how\s+to\s+/i, "");
    return { type: "howto", topic };
  }

  // "Why ..."
  if (/^why\s+/i.test(t)) {
    return { type: "why", topic: t.replace(/^why\s+/i, "") };
  }

  // "What is/are ..."
  if (/^what\s+(is|are)\s+/i.test(t)) {
    return { type: "explainer", topic: t.replace(/^what\s+(is|are)\s+/i, "") };
  }

  return { type: "generic", topic: t };
}

/* ── Smart template fallback — title-aware, never generic ────────── */
function smartTemplateSlides(title, content, numSlides) {
  const plain   = stripHtml(content || "");
  const parsed  = parseTitle(title);

  // Try to extract bullet points or sentences from content
  const sentences = plain
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 200);

  const slides = [];

  // Slide 1: Cover — ALWAYS uses the exact title
  slides.push({
    title:   title,
    caption: "Swipe to learn more →",
    layout:  "cover",
    template:"gradient-dark",
  });

  if (parsed.type === "numbered") {
    const { count, verb, topic } = parsed;
    const actualCount = Math.min(count, numSlides - 2);
    for (let i = 0; i < actualCount; i++) {
      const sentence = sentences[i] || "";
      slides.push({
        title:    `${verb.charAt(0).toUpperCase() + verb.slice(1)} #${i + 1}`,
        caption:  sentence || `Key ${verb.toLowerCase().replace(/s$/, "")} about ${topic}`,
        layout:   i % 3 === 0 ? "split" : i % 3 === 1 ? "stat" : "quote",
        template: TEMPLATE_CYCLE[(i + 1) % TEMPLATE_CYCLE.length],
      });
    }
  } else if (parsed.type === "howto") {
    const steps = ["What you need", "Step 1", "Step 2", "Step 3", "Pro tip", "Common mistake to avoid"];
    const needed = Math.min(steps.length, numSlides - 2);
    for (let i = 0; i < needed; i++) {
      slides.push({
        title:   steps[i],
        caption: sentences[i] || `How to ${parsed.topic} — step ${i + 1}`,
        layout:  i % 2 === 0 ? "split" : "stat",
        template:TEMPLATE_CYCLE[(i + 1) % TEMPLATE_CYCLE.length],
      });
    }
  } else if (parsed.type === "why") {
    const reasons = ["The Problem", "The Root Cause", "Why It Matters", "The Solution", "What to Do Next"];
    const needed = Math.min(reasons.length, numSlides - 2);
    for (let i = 0; i < needed; i++) {
      slides.push({
        title:   reasons[i],
        caption: sentences[i] || `${reasons[i]} — ${parsed.topic}`,
        layout:  i % 2 === 0 ? "split" : "quote",
        template:TEMPLATE_CYCLE[(i + 1) % TEMPLATE_CYCLE.length],
      });
    }
  } else {
    // Generic: use content sentences, fall back to topic-based titles
    const topics = [
      "The key idea",
      "Why this matters",
      "What you need to know",
      "The big takeaway",
      "How to apply this",
    ];
    const needed = Math.min(topics.length, numSlides - 2);
    for (let i = 0; i < needed; i++) {
      slides.push({
        title:   topics[i],
        caption: sentences[i] || `${topics[i]} about: ${parsed.topic}`,
        layout:  LAYOUT_CYCLE[(i + 1) % LAYOUT_CYCLE.length],
        template:TEMPLATE_CYCLE[(i + 1) % TEMPLATE_CYCLE.length],
      });
    }
  }

  // Pad to requested count if still short
  while (slides.length < numSlides - 1) {
    const i = slides.length;
    const sentence = sentences[i] || `More about ${parsed.topic}`;
    slides.push({
      title:   `Point ${i}`,
      caption: sentence,
      layout:  LAYOUT_CYCLE[i % LAYOUT_CYCLE.length],
      template:TEMPLATE_CYCLE[i % TEMPLATE_CYCLE.length],
    });
  }

  // Last slide: always CTA
  slides.push({
    title:   "Found this helpful?",
    caption: `Follow for more content like this! Save this post to revisit it later. 🔖`,
    layout:  "cta",
    template:"gradient-light",
  });

  return slides.slice(0, numSlides);
}

/* ── AI prompt — title-aware, few-shot examples ──────────────────── */
function buildPrompt(title, content, numSlides) {
  const parsed = parseTitle(title);
  let hint = "";

  if (parsed.type === "numbered") {
    hint = `
This is a numbered list post: "${title}"
- Slide 1 MUST use the exact title as the carousel cover
- Slides 2 through ${Math.min(parsed.count + 1, numSlides - 1)} MUST each cover one specific ${parsed.verb.replace(/s$/, "")} with a concrete, specific caption
- Last slide MUST be a CTA asking to follow/save
- Every caption must be SPECIFIC and related to "${parsed.topic}" — no generic filler`;
  } else if (parsed.type === "howto") {
    hint = `
This is a "how to" post: "${title}"
- Slide 1: Cover with the exact title
- Middle slides: Step-by-step instructions for how to ${parsed.topic}
- Last slide: CTA`;
  } else {
    hint = `
This post is titled: "${title}"
- Slide 1: Cover — use the EXACT title
- Middle slides: Key insights, points, or sections DIRECTLY about "${title}"
- Each caption must be specific and informative, not generic
- Last slide: CTA to follow/save`;
  }

  return `You are a professional carousel creator. Create EXACTLY ${numSlides} slides for this post.
${hint}

IMPORTANT RULES:
- The first slide MUST have title: "${title}" (exact)
- Every caption must be SPECIFIC to "${title}" — never use generic filler like "Add your content here"
- Use concrete facts, actionable tips, or specific points
- Each slide must flow naturally to the next

Return ONLY a JSON array. No markdown, no explanation. Use double quotes. Example format:
[{"title":"${title}","caption":"Swipe to discover the key insights →","layout":"cover","template":"gradient-dark"},{"title":"First Key Point","caption":"A specific, concrete insight directly about this topic","layout":"split","template":"minimal"},{"title":"Follow for more!","caption":"Save this post and follow for weekly tips on this topic 🔖","layout":"cta","template":"gradient-light"}]

Available layouts: cover, split, quote, stat, cta
Available templates: minimal, bold, gradient, card, gradient-dark, gradient-light

Title: ${title}
Content: ${content.slice(0, 1500)}

JSON array (${numSlides} slides):`;
}

/* ── Try AI providers ────────────────────────────────────────────── */
async function tryAI(title, content, numSlides) {
  const prompt = buildPrompt(title, content, numSlides);

  // Groq
  if (process.env.GROQ_API_KEY) {
    try {
      const Groq = (await import("groq-sdk")).default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const res  = await groq.chat.completions.create({
        model:       process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages:    [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens:  1200,
      });
      const text = res.choices?.[0]?.message?.content || "";
      const data = robustParse(text);
      const arr  = Array.isArray(data) ? data : (data.slides || Object.values(data)[0] || []);
      if (Array.isArray(arr) && arr.length >= 2) return { slides: arr, provider: "groq" };
    } catch (e) { console.error("Groq carousel:", e.message); }
  }

  // Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model:            process.env.GEMINI_MODEL || "gemini-1.5-flash",
        generationConfig: {
          temperature:      0.4,
          maxOutputTokens:  1200,
          responseMimeType: "application/json",
        },
      });
      const r    = await model.generateContent(prompt);
      const text = r.response.text();
      const data = robustParse(text);
      const arr  = Array.isArray(data) ? data : (data.slides || Object.values(data)[0] || []);
      if (Array.isArray(arr) && arr.length >= 2) return { slides: arr, provider: "gemini" };
    } catch (e) { console.error("Gemini carousel:", e.message); }
  }

  // Ollama
  try {
    const { askOllama } = await import("@/lib/ollama-server");
    const ollamaPrompt = `Return ONLY a JSON array with ${numSlides} slides for: "${title}"
First slide title must be exactly: "${title}"
Each caption must be specific to "${title}"
Format: [{"title":"...","caption":"...","layout":"cover","template":"gradient-dark"},...]
${content ? `Content: ${content.slice(0, 800)}` : ""}`;

    const raw  = await askOllama(
      [{ role: "user", content: ollamaPrompt }],
      { temperature: 0.3, numPredict: 900, format: "json" }
    );
    const data = robustParse(raw);
    const arr  = Array.isArray(data) ? data : (data.slides || Object.values(data)[0] || []);
    if (Array.isArray(arr) && arr.length >= 2) return { slides: arr, provider: "ollama" };
  } catch (e) { console.error("Ollama carousel:", e.message); }

  return null;
}

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch {}

  const { title = "", content = "", numSlides = 6 } = body;
  const cleanContent = stripHtml(content);

  if (!title.trim()) {
    return NextResponse.json({
      success: false,
      error: "A title is required to generate carousel slides.",
    }, { status: 400 });
  }

  const aiResult = await tryAI(title, cleanContent, numSlides);

  if (aiResult) {
    let slides = aiResult.slides.slice(0, numSlides).map((s, i) => sanitise(s, i));

    // Always ensure slide 1 uses the actual title
    if (slides.length > 0) {
      slides[0].title   = title;
      slides[0].layout  = "cover";
      slides[0].template= "gradient-dark";
    }

    // Always ensure last slide is CTA
    if (slides.length > 1) {
      slides[slides.length - 1].layout   = "cta";
      slides[slides.length - 1].template = "gradient-light";
    }

    // Pad if needed
    while (slides.length < numSlides) {
      const i = slides.length;
      slides.push({
        title:    `Key point ${i}`,
        caption:  `Important insight about: ${title}`,
        layout:   LAYOUT_CYCLE[i % LAYOUT_CYCLE.length],
        template: TEMPLATE_CYCLE[i % TEMPLATE_CYCLE.length],
      });
    }

    return NextResponse.json({ success: true, slides, provider: aiResult.provider });
  }

  // Template fallback — always title-aware
  const slides = smartTemplateSlides(title, cleanContent, numSlides);
  return NextResponse.json({ success: true, slides, fallback: true });
}
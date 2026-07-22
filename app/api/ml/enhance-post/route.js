import { NextResponse } from "next/server";

const ML_BACKEND_URL = process.env.ML_BACKEND_URL || "http://localhost:5000";

export async function POST(request) {
  let text = "";

  try {
    const payload = await request.json();
    text = payload.text || "";

    if (!text || text === "<p><br></p>") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const plainText = stripHtml(text);

    const mlResponse = await fetch(`${ML_BACKEND_URL}/enhance-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: plainText }),
    });

    if (!mlResponse.ok) {
      throw new Error("ML backend request failed");
    }

    const mlData = await mlResponse.json();

    return NextResponse.json({
      success: true,
      ...buildAnalysis(mlData, text),
    });
  } catch (error) {
    console.error("ML API Error:", error);

    return NextResponse.json({
      success: true,
      ...buildAnalysis({}, text),
      warning: "Using fallback analysis. Start the ML backend for deeper signals.",
    });
  }
}

function buildAnalysis(mlData, htmlText) {
  const plainText = stripHtml(htmlText);
  const words = plainText.split(/\s+/).filter(Boolean);
  const sentences = plainText
    .split(/[.!?]+/)
    .filter((sentence) => sentence.trim().length > 0);
  const readabilityScore = mlData.readability_score || estimateReadability(plainText);
  const seo = analyzeSEO(plainText, htmlText);
  const engagement = analyzeEngagement(plainText, htmlText);

  return {
    contentScore: calculateContentScore(
      readabilityScore,
      seo.score,
      engagement.score,
      words.length
    ),
    readability: {
      score: readabilityScore,
      level: getReadingLevel(readabilityScore),
      metrics: {
        words: mlData.word_count || words.length,
        sentences: sentences.length,
        readingTime: Math.max(1, Math.ceil((mlData.word_count || words.length) / 200)),
        gradeLevel: estimateGradeLevel(plainText),
      },
    },
    keywords: {
      hashtags: mlData.suggested_hashtags || suggestHashtags(plainText),
      topTopics: extractKeywords(plainText).slice(0, 3),
    },
    suggestions: buildSuggestions(mlData.suggestions || [], plainText, htmlText),
    sentiment: analyzeSentiment(plainText),
    seo,
    engagement,
    tone: analyzeTone(plainText),
    audienceFit: analyzeAudienceFit(plainText),
    titleIdeas: generateTitleIdeas(plainText),
    hookSuggestions: generateHooks(plainText),
    publishingChecklist: buildPublishingChecklist(plainText, htmlText),
    repurposeIdeas: generateRepurposeIdeas(plainText),
  };
}

function stripHtml(text) {
  return (text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildSuggestions(mlSuggestions, plainText, htmlText) {
  const suggestions = mlSuggestions.map((suggestion, index) => ({
    type: "ml",
    icon: index === 0 ? "AI" : "Tip",
    title: "ML Suggestion",
    message: suggestion,
    priority: "medium",
  }));

  if (!/<h[1-6]>/i.test(htmlText)) {
    suggestions.push({
      type: "structure",
      icon: "H2",
      title: "Add structure",
      message: "Use 2-3 headings so readers can scan your post quickly.",
      priority: "medium",
    });
  }

  if (!/\?/.test(plainText)) {
    suggestions.push({
      type: "engagement",
      icon: "?",
      title: "Invite response",
      message: "Add one question near the end to increase comments.",
      priority: "low",
    });
  }

  if (plainText.split(/\s+/).filter(Boolean).length < 300) {
    suggestions.push({
      type: "depth",
      icon: "300",
      title: "Add depth",
      message: "Aim for at least 300 words before publishing a full article.",
      priority: "high",
    });
  }

  return suggestions;
}

function getReadingLevel(score) {
  if (score >= 90) return "Very Easy";
  if (score >= 80) return "Easy";
  if (score >= 70) return "Fairly Easy";
  if (score >= 60) return "Standard";
  if (score >= 50) return "Fairly Difficult";
  return "Difficult";
}

function estimateReadability(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const avgWordLength = words.join("").length / words.length;
  const sentenceCount = Math.max(1, text.split(/[.!?]+/).filter(Boolean).length);
  const avgSentenceLength = words.length / sentenceCount;
  return Math.max(20, Math.min(95, Math.round(100 - avgWordLength * 5 - avgSentenceLength * 0.6)));
}

function estimateGradeLevel(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return "N/A";
  const avgWordLength = words.join("").length / words.length;
  if (avgWordLength < 4.3) return "Easy";
  if (avgWordLength < 5.2) return "Standard";
  return "Advanced";
}

function analyzeSentiment(text) {
  const positiveWords = ["good", "great", "excellent", "amazing", "wonderful", "love", "best", "clear", "useful"];
  const negativeWords = ["bad", "terrible", "awful", "hate", "worst", "poor", "confusing", "hard"];
  const lowerText = text.toLowerCase();
  const positive = positiveWords.filter((word) => lowerText.includes(word)).length;
  const negative = negativeWords.filter((word) => lowerText.includes(word)).length;
  const score = 50 + (positive - negative) * 10;

  return {
    score: Math.max(0, Math.min(100, score)),
    label: score >= 60 ? "Positive" : score >= 40 ? "Neutral" : "Negative",
    emoji: score >= 60 ? ":)" : score >= 40 ? ":|" : ":(",
  };
}

function analyzeSEO(plainText, htmlText) {
  const hasHeadings = /<h[1-6]>/i.test(htmlText);
  const hasImages = /<img/i.test(htmlText);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  let score = 55;
  const issues = [];
  const strengths = [];

  if (!hasHeadings) {
    issues.push("Add headings for better structure.");
    score -= 15;
  } else {
    strengths.push("Headings make the post easier to scan.");
    score += 10;
  }

  if (!hasImages) {
    issues.push("Add a visual to improve engagement.");
    score -= 10;
  } else {
    strengths.push("Visual content is included.");
    score += 8;
  }

  if (wordCount < 300) {
    issues.push(`Add ${300 - wordCount} more words for stronger SEO depth.`);
    score -= 15;
  } else {
    strengths.push("Word count is healthy for an article.");
    score += 12;
  }

  return { score: Math.max(0, Math.min(100, score)), issues, strengths };
}

function analyzeEngagement(plainText, htmlText) {
  const hasQuestions = /\?/.test(plainText);
  const hasList = /<ul|<ol/i.test(htmlText);
  const hasCTA = /\b(comment|share|try|tell|subscribe|follow)\b/i.test(plainText);

  let score = 40;
  const tips = [];

  if (hasQuestions) score += 20;
  else tips.push("Ask a question to invite comments.");

  if (hasList) score += 15;
  else tips.push("Use bullet points for easier scanning.");

  if (hasCTA) score += 15;
  else tips.push("Add a clear next step for readers.");

  return { score: Math.min(100, score), tips };
}

function calculateContentScore(readability, seo, engagement, wordCount) {
  const depthScore =
    wordCount >= 600 ? 100 : wordCount >= 300 ? 75 : wordCount >= 120 ? 45 : 20;
  return Math.round(
    readability * 0.25 + seo * 0.3 + engagement * 0.3 + depthScore * 0.15
  );
}

function analyzeAudienceFit(text) {
  const lower = text.toLowerCase();
  const beginner = ["beginner", "simple", "step", "guide", "how to", "basics"].filter((word) => lower.includes(word)).length;
  const expert = ["advanced", "strategy", "framework", "optimize", "analysis", "technical"].filter((word) => lower.includes(word)).length;
  const creator = ["creator", "content", "audience", "post", "brand", "social"].filter((word) => lower.includes(word)).length;

  if (creator >= 2) {
    return {
      segment: "Creators",
      confidence: Math.min(95, 62 + creator * 8),
      reason: "Strong creator and audience language.",
    };
  }

  if (expert > beginner) {
    return {
      segment: "Advanced readers",
      confidence: Math.min(92, 58 + expert * 8),
      reason: "Uses strategy or technical framing.",
    };
  }

  return {
    segment: "General readers",
    confidence: Math.min(88, 58 + beginner * 7),
    reason: "Accessible wording and broad framing.",
  };
}

function generateTitleIdeas(text) {
  const keywords = extractKeywords(text).slice(0, 3);
  const topic = keywords[0] || "your idea";
  return [
    `How to use ${topic} without overcomplicating it`,
    `What creators should know about ${topic}`,
    `A practical guide to ${topic}${keywords[1] ? ` and ${keywords[1]}` : ""}`,
  ];
}

function generateHooks(text) {
  const keywords = extractKeywords(text);
  const topic = keywords[0] || "this topic";
  return [
    `Most people approach ${topic} too late. Here is the simpler way to start.`,
    `If ${topic} feels confusing, this breakdown will make it practical.`,
    `The fastest way to improve ${topic} is to focus on one clear outcome.`,
  ];
}

function generateRepurposeIdeas(text) {
  const keywords = extractKeywords(text);
  const topic = keywords[0] || "this post";
  return [
    `Turn the key points into a 5-slide carousel about ${topic}.`,
    "Create a short video script with one problem, one insight, and one action.",
    "Post a thread summarizing the main checklist and ask readers for their take.",
  ];
}

function buildPublishingChecklist(plainText, htmlText) {
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  return [
    { label: "Clear title or topic", done: wordCount > 0 },
    { label: "At least 300 words", done: wordCount >= 300 },
    { label: "Headings added", done: /<h[1-6]>/i.test(htmlText) },
    { label: "Visual included", done: /<img/i.test(htmlText) },
    {
      label: "Question or CTA",
      done:
        /\?/.test(plainText) ||
        /\b(comment|share|try|tell|subscribe|follow)\b/i.test(plainText),
    },
  ];
}

function analyzeTone(text) {
  const lower = text.toLowerCase();
  if (/\b(we|you|your|let's|try)\b/.test(lower)) {
    return { primary: "conversational", description: "Direct and reader-friendly" };
  }
  if (/\b(data|analysis|framework|optimize|research)\b/.test(lower)) {
    return { primary: "analytical", description: "Structured and insight-led" };
  }
  return { primary: "professional", description: "Clear and balanced" };
}

function suggestHashtags(text) {
  const keywords = extractKeywords(text).slice(0, 5);
  if (!keywords.length) return ["#content", "#writing", "#creator"];
  return keywords.map((keyword) => `#${keyword.replace(/-/g, "")}`);
}

function extractKeywords(text) {
  const stopWords = new Set([
    "about",
    "after",
    "again",
    "also",
    "because",
    "before",
    "being",
    "could",
    "every",
    "from",
    "have",
    "into",
    "more",
    "most",
    "other",
    "should",
    "that",
    "their",
    "there",
    "these",
    "this",
    "those",
    "with",
    "would",
    "your",
  ]);
  const counts = {};
  const words = text.toLowerCase().match(/\b[a-z][a-z0-9-]{3,}\b/g) || [];

  for (const word of words) {
    if (!stopWords.has(word)) counts[word] = (counts[word] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

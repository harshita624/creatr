import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { askOllama } from "@/lib/ollama-server";

const DEFAULT_TIMEOUT_MS = 18000;

export async function generateJsonWithFallback({
  system,
  user,
  temperature = 0.55,
  maxTokens = 1200,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const providers = [
    {
      name: "ollama",
      enabled: true,
      run: () =>
        askOllama(
          [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          {
            temperature,
            numPredict: maxTokens,
            format: "json",
          }
        ),
    },
    {
      name: "groq",
      enabled: Boolean(process.env.GROQ_API_KEY),
      run: () => askGroq({ system, user, temperature, maxTokens }),
    },
    {
      name: "gemini",
      enabled: Boolean(process.env.GEMINI_API_KEY),
      run: () => askGemini({ system, user, temperature, maxTokens }),
    },
  ];

  const errors = [];

  for (const provider of providers) {
    if (!provider.enabled) continue;

    try {
      const text = await withTimeout(provider.run(), timeoutMs, provider.name);
      const json = parseJson(text);
      return {
        provider: provider.name,
        json,
      };
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  const finalError = new Error(
    `All AI providers failed. ${errors.join(" | ") || "No provider is configured."}`
  );
  finalError.status = 503;
  throw finalError;
}

async function askGroq({ system, user, temperature, maxTokens }) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });

  return response.choices?.[0]?.message?.content || "";
}

async function askGemini({ system, user, temperature, maxTokens }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    systemInstruction: system,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  });
  const response = await model.generateContent(user);
  return response.response.text();
}

function withTimeout(promise, timeoutMs, providerName) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(new Error(`${providerName} timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs)
    ),
  ]);
}

export function parseJson(value) {
  const clean = (value || "").replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI returned invalid JSON");
  return JSON.parse(clean.slice(start, end + 1));
}

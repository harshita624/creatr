import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

const DEFAULT_TIMEOUT_MS = 12000;

// Every AI feature uses the same configured cloud providers. Gemini is the
// default, with Groq as a fallback; local Ollama calls are not mixed in.
function getProviderOrder() {
  const selected = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (!new Set(["gemini", "groq"]).has(selected)) {
    throw new Error(`Unsupported AI_PROVIDER: ${selected}`);
  }

  const order = selected === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];
  return order.filter((name) => Boolean(process.env[`${name.toUpperCase()}_API_KEY`]));
}

async function runProvider(name, { system, user, temperature, maxTokens, json }) {
  if (name === "groq") {
    return json
      ? askGroq({ system, user, temperature, maxTokens })
      : askGroqText({ system, user, temperature, maxTokens });
  }

  return json
    ? askGemini({ system, user, temperature, maxTokens })
    : askGeminiText({ system, user, temperature, maxTokens });
}

async function generateWithProviders(options, json) {
  const errors = [];
  const providers = getProviderOrder();

  for (const name of providers) {
    try {
      const text = await withTimeout(
        runProvider(name, { ...options, json }),
        options.timeoutMs || DEFAULT_TIMEOUT_MS,
        name
      );
      if (!text?.trim()) throw new Error("AI returned an empty response");
      return json ? { provider: name, json: parseJson(text) } : { provider: name, text: text.trim() };
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }

  const finalError = new Error(
    `AI providers failed. ${errors.join(" | ") || "Configure GEMINI_API_KEY or GROQ_API_KEY."}`
  );
  finalError.status = 503;
  throw finalError;
}

export async function generateJsonWithFallback({
  system,
  user,
  temperature = 0.55,
  maxTokens = 1200,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  return generateWithProviders({ system, user, temperature, maxTokens, timeoutMs }, true);
}

async function askGroq({ system, user, temperature, maxTokens }) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
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
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
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
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${providerName} timed out after ${timeoutMs / 1000}s`)),
        timeoutMs
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

export function parseJson(value) {
  const clean = (value || "").replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI returned invalid JSON");
  return JSON.parse(clean.slice(start, end + 1));
}

export async function generateTextWithFallback({
  system,
  user,
  temperature = 0.7,
  maxTokens = 1000,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  return generateWithProviders({ system, user, temperature, maxTokens, timeoutMs }, false);
}

async function askGroqText({ system, user, temperature, maxTokens }) {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  return response.choices?.[0]?.message?.content || "";
}

async function askGeminiText({ system, user, temperature, maxTokens }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    systemInstruction: system,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  const response = await model.generateContent(user);

  return response.response.text();
}

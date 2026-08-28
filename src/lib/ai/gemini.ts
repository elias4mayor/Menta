import "server-only";

import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({
    apiKey,
  });
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function askGemini({
  systemPrompt,
  conversation,
}: {
  systemPrompt: string;
  conversation: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}) {
  const client = getClient();

  const model =
    process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const input = conversation
    .map((message) => {
      const role =
        message.role === "assistant" ? "MENTA" : "ATHLETE";

      return `${role}: ${message.content}`;
    })
    .join("\n\n");

  const response = await client.models.generateContent({
    model,
    contents: input,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1200,
      temperature: 0.7,
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

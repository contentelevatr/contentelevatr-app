import { GoogleGenAI } from "@google/genai";
import type { Platform } from "@/lib/platforms/types";
import { getContentGenerationPrompt } from "./prompts";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY ?? "",
});

export interface GeneratedContent {
  variants: Partial<Record<Platform, string>>;
}

/**
 * Generate platform-optimized content using Google Gemini Flash.
 * Returns per-platform content variants.
 */
export async function generatePostContent(
  userPrompt: string,
  platforms: Platform[]
): Promise<GeneratedContent> {
  const systemPrompt = getContentGenerationPrompt(platforms);

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser request: ${userPrompt}` }],
      },
    ],
    config: {
      temperature: 0.8,
      maxOutputTokens: 4096,
    },
  });

  const text = response.text ?? "";

  // Parse the JSON response — strip any markdown code fences
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as GeneratedContent;
    return parsed;
  } catch {
    // If JSON parsing fails, return the raw text as content for all platforms
    const fallbackVariants: Partial<Record<Platform, string>> = {};
    for (const platform of platforms) {
      fallbackVariants[platform] = text;
    }
    return { variants: fallbackVariants };
  }
}

/**
 * Stream content generation using Google Gemini Flash.
 * Yields text chunks as they arrive.
 */
export async function* streamPostContent(
  userPrompt: string,
  platforms: Platform[]
): AsyncGenerator<string> {
  const systemPrompt = getContentGenerationPrompt(platforms);

  const response = await ai.models.generateContentStream({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser request: ${userPrompt}` }],
      },
    ],
    config: {
      temperature: 0.8,
      maxOutputTokens: 4096,
    },
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}

import { GoogleGenAI } from "@google/genai";
import type { Platform } from "@/lib/platforms/types";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY ?? "",
});

export async function generateReplyDraft(
  platform: Platform,
  originalPostContent: string,
  commentAuthor: string,
  commentContent: string
): Promise<string> {
  const prompt = `You are an expert social media community manager handling engagement for a brand or professional on ${platform}.
Your goal is to draft a polite, engaging, and professional reply to a user's comment.

Here is the context:

ORIGINAL POST:
"${originalPostContent}"

USER COMMENT (by ${commentAuthor}):
"${commentContent}"

Rules for the reply:
1. Be concise (1-2 sentences).
2. Maintain a professional yet approachable tone.
3. If the user asks a question, answer it helpfully or acknowledge it.
4. If it's a compliment, express gratitude.
5. Do NOT include hashtags unless specifically relevant to the question.
6. Do NOT include placeholder text like [Name] or [Link].
7. Match the platform's standard etiquette (e.g., LinkedIn = professional, Twitter = brief/casual).

Return ONLY the reply text, with no wrapping quotes or preamble.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.7, maxOutputTokens: 150 },
    });

    const text = response.text ?? "";
    return text.trim().replace(/^"|"$/g, ""); // Remove accidental wrapping quotes
  } catch (error) {
    console.error("Failed to generate AI reply:", error);
    if (error instanceof Error && (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED"))) {
      return "Rate limit exceeded. Please wait a minute before generating more replies.";
    }
    return "Thank you for the comment!"; // Safe fallback
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import type { Platform } from "@/lib/platforms/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const reviewSchema = z.object({
  content: z.string().min(1),
  platform: z.enum(["linkedin", "twitter", "instagram", "threads", "medium", "reddit", "facebook", "pinterest", "youtube"]),
});

const PLATFORM_CONTEXT: Record<Platform, string> = {
  linkedin: "Professional, storytelling, value-driven, and engaging formatting (line breaks).",
  twitter: "Short, punchy hooks, highly engaging, direct, often uses lists or strong opinions.",
  instagram: "Visual-first caption, engaging storytelling, emojis, strong call to action.",
  threads: "Conversational, authentic, quick thoughts or engaging questions.",
  medium: "Long-form editorial, well-structured headers, deep insights, formal tone.",
  reddit: "Authentic, conversational, providing highly relevant context without sounding strictly promotional. Follow subreddit rules strictly.",
  facebook: "Friendly, conversational, community-driven, and shareable. Use a storytelling approach.",
  pinterest: "Keyword-rich, inspiring, visually descriptive, and benefit-focused. Short and searchable.",
  youtube: "Engaging, question-driven, conversational. Encourage comments and interaction.",
};

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Missing Anthropic API Key" }, { status: 500 });
    }

    const json = await req.json();
    const { content, platform } = reviewSchema.parse(json);

    const prompt = `You are an expert social media strategist and copywriter.
Review the user's content draft for ${platform.toUpperCase()}.

Context for ${platform.toUpperCase()}:
${PLATFORM_CONTEXT[platform as Platform]}

Evaluate the content. Provide a JSON response EXACTLY matching this structure, with no markdown formatting around it (just raw JSON so I can JSON.parse it):
{
  "score": <number 1-10>,
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "improvedDraft": "string matching the platform's best practices based on the original content"
}

CONTENT DRAFT:
"${content}"`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1000,
      temperature: 0.7,
      system: "You output only valid JSON. No wrapping fences. Nothing else.",
      messages: [{ role: "user", content: prompt }],
    });

    // In @anthropic-ai/sdk, response.content is an array of content blocks.
    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text returned from Claude");
    }

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text.trim());
    } catch (e) {
      // Try to strip markdown if the model hallucinates it
      const stripped = textBlock.text.replace(/^```json\n/, "").replace(/\n```$/, "");
      parsed = JSON.parse(stripped);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("AI Review error:", error);
    return NextResponse.json(
      { error: "Failed to generate review" },
      { status: 500 }
    );
  }
}

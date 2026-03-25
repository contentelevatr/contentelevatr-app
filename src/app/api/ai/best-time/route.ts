import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const requestSchema = z.object({
  platform: z.enum(["linkedin", "twitter", "instagram", "threads", "medium"]),
  contentPreview: z.string().max(500).optional(),
  timezone: z.string().default("UTC"),
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY ?? "",
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { platform, contentPreview, timezone } = parsed.data;

  try {
    const prompt = `You are a social media analytics expert. Suggest the best time to post on ${platform} for maximum engagement.

${contentPreview ? `The post is about: "${contentPreview.substring(0, 200)}"` : ""}

User's timezone: ${timezone}
Current date: ${new Date().toISOString()}

Consider:
- Platform-specific peak engagement times
- Day of the week patterns
- The content topic if provided

Return ONLY a JSON object with this format:
{
  "suggestedTime": "ISO 8601 datetime string in the user's timezone",
  "reason": "Brief explanation of why this time is optimal",
  "dayOfWeek": "e.g. Tuesday",
  "timeSlot": "e.g. 9:00 AM"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.5, maxOutputTokens: 512 },
    });

    const text = response.text ?? "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const suggestion = JSON.parse(cleaned);
      return NextResponse.json(suggestion);
    } catch {
      return NextResponse.json({
        suggestedTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reason: "Default suggestion — tomorrow at the same time",
        dayOfWeek: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { weekday: "long" }),
        timeSlot: "9:00 AM",
      });
    }
  } catch (error) {
    console.error("Best time suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}

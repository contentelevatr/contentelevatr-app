import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { streamPostContent } from "@/lib/ai/generate-content";

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000),
  platforms: z.array(
    z.enum(["linkedin", "twitter", "instagram", "threads", "medium", "reddit"])
  ).min(1, "Select at least one platform"),
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

  const { prompt, platforms } = parsed.data;

  // Stream the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamPostContent(prompt, platforms)) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI generation failed";
        controller.enqueue(encoder.encode(`\n\nError: ${message}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}

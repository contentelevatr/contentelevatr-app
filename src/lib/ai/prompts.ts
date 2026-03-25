import type { Platform } from "@/lib/platforms/types";

/** Platform-specific formatting guidelines for AI content generation */
export const PLATFORM_PROMPTS: Record<Platform, string> = {
  linkedin: `LinkedIn post guidelines:
- Professional tone, thought-leadership style
- Use line breaks for readability
- Include relevant hashtags (3-5 max)
- Can use emojis sparingly for emphasis
- Max 3000 characters
- Start with a hook that grabs attention`,

  twitter: `X/Twitter post guidelines:
- Concise and punchy (max 280 characters)
- Use hashtags strategically (1-2 max)
- Conversational tone
- End with a call to action or question
- Emojis are welcome`,

  instagram: `Instagram caption guidelines:
- Engaging, visual storytelling tone
- Heavy emoji usage is encouraged
- Include hashtags at the end (up to 30)
- Use line breaks and spacing
- Max 2200 characters
- Start with a compelling first line (shown before "more")`,

  threads: `Threads post guidelines:
- Casual, conversational tone
- Similar to Twitter but slightly longer (max 500 chars)
- Minimal hashtags (0-2)
- Can be more personal and opinionated
- Emojis are okay`,

  medium: `Medium article guidelines:
- Long-form, well-structured content
- Use markdown formatting (headers, lists, bold, italic)
- Educational or storytelling approach
- Include a clear introduction and conclusion
- No character limit practically`,
};

/** System prompt for generating multi-platform content */
export function getContentGenerationPrompt(platforms: Platform[]): string {
  const platformInstructions = platforms
    .map((p) => PLATFORM_PROMPTS[p])
    .join("\n\n---\n\n");

  return `You are a social media content expert. Generate engaging, platform-optimized content based on the user's prompt.

You MUST generate a separate version for EACH requested platform, tailored to that platform's style and constraints.

Return your response in the following JSON format:
{
  "variants": {
    "<platform_name>": "<content for that platform>"
  }
}

Platform-specific instructions:

${platformInstructions}

IMPORTANT:
- Each variant must respect the platform's character limit
- Adapt tone and style per platform while keeping the core message
- Return ONLY valid JSON, no markdown code fences or extra text`;
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPlatformClient, getOAuthRedirectUri } from "@/lib/platforms";
import type { Platform } from "@/lib/platforms/types";
import { redis } from "@/lib/redis";
import crypto from "crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform } = await params;
  const validPlatforms: Platform[] = ["linkedin", "twitter", "instagram", "threads", "medium", "reddit"];

  if (!validPlatforms.includes(platform as Platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const client = getPlatformClient(platform as Platform);
  const redirectUri = getOAuthRedirectUri(platform as Platform);

  // Generate CSRF state token and store in Redis (expires in 10 minutes)
  const state = crypto.randomBytes(32).toString("hex");
  await redis.set(`oauth:state:${state}`, JSON.stringify({ userId, platform }), {
    ex: 600,
  });

  const authorizeUrl = client.getAuthorizeUrl(state, redirectUri);

  return NextResponse.redirect(authorizeUrl);
}

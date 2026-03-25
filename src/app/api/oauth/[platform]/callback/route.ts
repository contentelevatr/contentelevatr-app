import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPlatformClient, getOAuthRedirectUri } from "@/lib/platforms";
import type { Platform } from "@/lib/platforms/types";
import { redis } from "@/lib/redis";
import { encrypt } from "@/lib/platforms/encryption";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const { platform } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings/accounts?error=${error}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard/settings/accounts?error=missing_params", request.url)
    );
  }

  // Verify CSRF state from Redis
  const storedState = await redis.get(`oauth:state:${state}`);
  if (!storedState) {
    return NextResponse.redirect(
      new URL("/dashboard/settings/accounts?error=invalid_state", request.url)
    );
  }

  // Clean up the state token
  await redis.del(`oauth:state:${state}`);

  let stateData: { userId: string; platform: string };
  try {
    stateData = typeof storedState === "string" ? JSON.parse(storedState) : storedState;
  } catch (err) {
    return NextResponse.redirect(
      new URL("/dashboard/settings/accounts?error=invalid_state_data", request.url)
    );
  }

  if (stateData.platform !== platform) {
    return NextResponse.redirect(
      new URL("/dashboard/settings/accounts?error=platform_mismatch", request.url)
    );
  }

  try {
    const client = getPlatformClient(platform as Platform);
    const redirectUri = getOAuthRedirectUri(platform as Platform);
    const tokens = await client.handleCallback(code, redirectUri);

    // Get the active workspace from cookie
    const activeWorkspaceId = request.cookies.get("active_workspace_id")?.value;
    if (!activeWorkspaceId) {
      return NextResponse.redirect(
        new URL("/dashboard/settings/accounts?error=no_workspace", request.url)
      );
    }

    // Fetch the real profile name and avatar from the platform
    let accountName = `${platform} account`;
    let accountAvatar: string | null = null;
    let platformAccountId = `${platform}_user`;

    try {
      if (platform === "linkedin") {
        const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.name ?? profile.given_name ?? accountName;
          accountAvatar = profile.picture ?? null;
          platformAccountId = profile.sub ?? platformAccountId;
        }
      } else if (platform === "reddit") {
        const profileRes = await fetch("https://oauth.reddit.com/api/v1/me", {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "User-Agent": "ContentElevatr/1.0",
          },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.name ?? accountName;
          accountAvatar = profile.icon_img ?? profile.snoovatar_img ?? null;
          platformAccountId = profile.id ?? platformAccountId;
        }
      } else if (platform === "twitter") {
        const profileRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.data?.name ?? profile.data?.username ?? accountName;
          accountAvatar = profile.data?.profile_image_url ?? null;
          platformAccountId = profile.data?.id ?? platformAccountId;
        }
      }
    } catch (profileErr) {
      console.warn(`Could not fetch profile for ${platform}:`, profileErr);
      // Non-fatal — continue with defaults
    }

    // Encrypt tokens before storing
    const accessTokenEnc = encrypt(tokens.accessToken);
    const refreshTokenEnc = tokens.refreshToken
      ? encrypt(tokens.refreshToken)
      : null;

    // Upsert social account
    const existing = await db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.workspaceId, activeWorkspaceId),
          eq(socialAccounts.platform, platform as Platform)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(socialAccounts)
        .set({
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt: tokens.expiresAt,
          accountName,
          accountAvatar,
          platformAccountId,
          updatedAt: new Date(),
        })
        .where(eq(socialAccounts.id, existing[0].id));
    } else {
      await db.insert(socialAccounts).values({
        workspaceId: activeWorkspaceId,
        platform: platform as Platform,
        platformAccountId,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiresAt: tokens.expiresAt,
        accountName,
        accountAvatar,
      });
    }

    return NextResponse.redirect(
      new URL("/dashboard/settings/accounts?success=connected", request.url)
    );
  } catch (err) {
    console.error(`OAuth callback error for ${platform}:`, err);
    return NextResponse.redirect(
      new URL("/dashboard/settings/accounts?error=token_exchange_failed", request.url)
    );
  }
}

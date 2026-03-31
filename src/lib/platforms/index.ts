import type { PlatformClient, Platform } from "./types";
import { linkedinClient } from "./linkedin";
import { twitterClient } from "./twitter";
import { instagramClient } from "./instagram";
import { threadsClient } from "./threads";
import { mediumClient } from "./medium";
import { redditClient } from "./reddit";
import { facebookClient } from "./facebook";
import { pinterestClient } from "./pinterest";
import { youtubeClient } from "./youtube";

const clients: Record<Platform, PlatformClient> = {
  linkedin: linkedinClient,
  twitter: twitterClient,
  instagram: instagramClient,
  threads: threadsClient,
  medium: mediumClient,
  reddit: redditClient,
  facebook: facebookClient,
  pinterest: pinterestClient,
  youtube: youtubeClient,
};

export function getPlatformClient(platform: Platform): PlatformClient {
  const client = clients[platform];
  if (!client) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return client;
}

export function getOAuthRedirectUri(platform: Platform): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/oauth/${platform}/callback`;
}

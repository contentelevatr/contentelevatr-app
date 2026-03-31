import type { PlatformClient, OAuthTokens, PublishResult, PlatformComment, PlatformAnalytics } from "./types";

const YOUTUBE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const YOUTUBE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export const youtubeClient: PlatformClient = {
  platform: "youtube",

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.force-ssl",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `${YOUTUBE_AUTH_URL}?${params.toString()}`;
  },

  async handleCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(YOUTUBE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.YOUTUBE_CLIENT_ID ?? "",
        client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
      }),
    });

    if (!response.ok) {
      throw new Error(`YouTube token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(YOUTUBE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.YOUTUBE_CLIENT_ID ?? "",
        client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
      }),
    });

    if (!response.ok) {
      throw new Error(`YouTube token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    };
  },

  async publish(content: string, accessToken: string): Promise<PublishResult> {
    // YouTube Community Posts — uses the activities or community post endpoint.
    // The YouTube Data API does not have a dedicated community post endpoint,
    // so we use the channel bulletin (activity insert) approach.
    // NOTE: The YouTube Data API's activities.insert has been deprecated for bulletins.
    // For a production app, you would use the YouTube Community Post feature via the Studio API.
    // For now, we attempt the available API and gracefully handle errors.

    // Get the channel ID first
    const channelRes = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=id,snippet&mine=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!channelRes.ok) {
      return { success: false, error: "Failed to fetch YouTube channel" };
    }

    const channelData = await channelRes.json();
    if (!channelData.items || channelData.items.length === 0) {
      return { success: false, error: "No YouTube channel found for this account" };
    }

    const channelId = channelData.items[0].id;

    // Attempt to create a community post via the activities endpoint
    const response = await fetch(
      `${YOUTUBE_API_BASE}/activities?part=snippet,contentDetails`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            channelId,
            description: content,
          },
          contentDetails: {
            bulletin: {
              resourceId: {},
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `YouTube publish failed: ${errText}` };
    }

    const data = await response.json();
    return {
      success: true,
      platformPostId: data.id,
      url: `https://www.youtube.com/channel/${channelId}/community`,
    };
  },

  async fetchComments(_platformPostId: string, _accessToken: string): Promise<PlatformComment[]> {
    return [];
  },

  async fetchAnalytics(_platformPostId: string, _accessToken: string): Promise<PlatformAnalytics> {
    return { likes: 0, comments: 0, shares: 0, impressions: 0 };
  },
};

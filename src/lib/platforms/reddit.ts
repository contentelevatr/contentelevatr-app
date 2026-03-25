import type { PlatformClient, OAuthTokens, PublishResult, PlatformComment, PlatformAnalytics } from "./types";

const REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/authorize";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_BASE = "https://oauth.reddit.com";

export const redditClient: PlatformClient = {
  platform: "reddit",

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.REDDIT_CLIENT_ID ?? "",
      response_type: "code",
      state,
      redirect_uri: redirectUri,
      duration: "permanent",
      scope: "identity submit",
    });
    return `${REDDIT_AUTH_URL}?${params.toString()}`;
  },

  async handleCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    const basicAuth = Buffer.from(
      `${process.env.REDDIT_CLIENT_ID ?? ""}:${process.env.REDDIT_CLIENT_SECRET ?? ""}`
    ).toString("base64");

    const response = await fetch(REDDIT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
        "User-Agent": "ContentElevatr/1.0",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Reddit token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const basicAuth = Buffer.from(
      `${process.env.REDDIT_CLIENT_ID ?? ""}:${process.env.REDDIT_CLIENT_SECRET ?? ""}`
    ).toString("base64");

    const response = await fetch(REDDIT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
        "User-Agent": "ContentElevatr/1.0",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Reddit token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async publish(content: string, accessToken: string): Promise<PublishResult> {
    // 1. Get identity to find the username
    const meResponse = await fetch(`${REDDIT_API_BASE}/api/v1/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ContentElevatr/1.0",
      },
    });

    if (!meResponse.ok) {
      return { success: false, error: "Failed to fetch Reddit profile" };
    }

    const me = await meResponse.json();
    const username = me.name;

    // 2. Determine title and text
    let title = content.substring(0, 100);
    if (content.length > 100) title += "...";

    const firstNewline = content.indexOf("\n");
    if (firstNewline > 0 && firstNewline < 150) {
      title = content.substring(0, firstNewline);
      content = content.substring(firstNewline).trim();
    }
    if (!content) content = title;

    // 3. Post to u_username
    const response = await fetch(`${REDDIT_API_BASE}/api/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ContentElevatr/1.0",
      },
      body: new URLSearchParams({
        api_type: "json",
        sr: `u_${username}`,
        kind: "self",
        title: title,
        text: content,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Reddit publish error: ${errText}` };
    }

    const result = await response.json();

    if (result.json?.errors?.length > 0) {
      return { success: false, error: `Reddit API error: ${JSON.stringify(result.json.errors)}` };
    }

    const postUrl = result.json?.data?.url;
    const postId = result.json?.data?.id;

    return {
      success: true,
      platformPostId: postId,
      url: postUrl,
    };
  },

  async fetchComments(_platformPostId: string, _accessToken: string): Promise<PlatformComment[]> {
    return [];
  },

  async fetchAnalytics(_platformPostId: string, _accessToken: string): Promise<PlatformAnalytics> {
    return { likes: 0, comments: 0, shares: 0, impressions: 0 };
  },
};

import type { PlatformClient, OAuthTokens, PublishResult, PlatformComment, PlatformAnalytics } from "./types";

const MEDIUM_API = "https://api.medium.com/v1";

export const mediumClient: PlatformClient = {
  platform: "medium",

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.MEDIUM_CLIENT_ID ?? "",
      scope: "basicProfile,publishPost",
      state,
      response_type: "code",
      redirect_uri: redirectUri,
    });
    return `${MEDIUM_API}/authorize?${params.toString()}`;
  },

  async handleCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(`${MEDIUM_API}/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.MEDIUM_CLIENT_ID ?? "",
        client_secret: process.env.MEDIUM_CLIENT_SECRET ?? "",
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Medium token exchange failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_at?: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : undefined,
    };
  },

  async publish(content: string, accessToken: string): Promise<PublishResult> {
    // Get the authenticated user's ID
    const meRes = await fetch(`${MEDIUM_API}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meRes.ok) {
      return { success: false, error: "Failed to fetch Medium user" };
    }

    const me = (await meRes.json()) as { data: { id: string; username: string } };

    // Publish as a post
    const postRes = await fetch(`${MEDIUM_API}/users/${me.data.id}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: content.substring(0, 60), // use first 60 chars as title
        contentFormat: "markdown",
        content,
        publishStatus: "public",
      }),
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      return { success: false, error: `Medium publish failed: ${errText}` };
    }

    const post = (await postRes.json()) as { data: { id: string; url: string } };
    return {
      success: true,
      platformPostId: post.data.id,
      url: post.data.url,
    };
  },

  async fetchComments(_platformPostId: string, _accessToken: string): Promise<PlatformComment[]> {
    return [];
  },

  async fetchAnalytics(_platformPostId: string, _accessToken: string): Promise<PlatformAnalytics> {
    return { likes: 0, comments: 0, shares: 0, impressions: 0 };
  },
};

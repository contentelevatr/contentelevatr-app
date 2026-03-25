import type { PlatformClient, OAuthTokens, PublishResult, PlatformComment, PlatformAnalytics } from "./types";

const THREADS_AUTH_URL = "https://threads.net/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const THREADS_API = "https://graph.threads.net/v1.0";

export const threadsClient: PlatformClient = {
  platform: "threads",

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID ?? "",
      redirect_uri: redirectUri,
      scope: "threads_basic,threads_content_publish",
      response_type: "code",
      state,
    });
    return `${THREADS_AUTH_URL}?${params.toString()}`;
  },

  async handleCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(THREADS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.THREADS_APP_ID ?? "",
        client_secret: process.env.THREADS_APP_SECRET ?? "",
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Threads token exchange failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  },

  async publish(content: string, accessToken: string): Promise<PublishResult> {
    // Step 1: Get user ID
    const meRes = await fetch(`${THREADS_API}/me?access_token=${accessToken}`);
    if (!meRes.ok) {
      return { success: false, error: "Failed to fetch Threads user" };
    }
    const me = (await meRes.json()) as { id: string };

    // Step 2: Create media container
    const createRes = await fetch(`${THREADS_API}/${me.id}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "TEXT",
        text: content,
        access_token: accessToken,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return { success: false, error: `Threads creation failed: ${errText}` };
    }

    const { id: containerId } = (await createRes.json()) as { id: string };

    // Step 3: Publish
    const publishRes = await fetch(`${THREADS_API}/${me.id}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      return { success: false, error: `Threads publish failed: ${errText}` };
    }

    const { id: postId } = (await publishRes.json()) as { id: string };
    return {
      success: true,
      platformPostId: postId,
      url: `https://threads.net/@me/post/${postId}`,
    };
  },

  async fetchComments(_platformPostId: string, _accessToken: string): Promise<PlatformComment[]> {
    return [];
  },

  async fetchAnalytics(_platformPostId: string, _accessToken: string): Promise<PlatformAnalytics> {
    return { likes: 0, comments: 0, shares: 0, impressions: 0 };
  },
};

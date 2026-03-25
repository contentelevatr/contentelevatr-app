import type { PlatformClient, OAuthTokens, PublishResult, PlatformComment, PlatformAnalytics } from "./types";

const FB_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const FB_TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";
const GRAPH_API = "https://graph.facebook.com/v21.0";

export const instagramClient: PlatformClient = {
  platform: "instagram",

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID ?? "",
      redirect_uri: redirectUri,
      state,
      scope: "instagram_basic,instagram_content_publish,pages_show_list",
      response_type: "code",
    });
    return `${FB_AUTH_URL}?${params.toString()}`;
  },

  async handleCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID ?? "",
      client_secret: process.env.INSTAGRAM_APP_SECRET ?? "",
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(`${FB_TOKEN_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Instagram token exchange failed: ${response.statusText}`);
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
    // Instagram Graph API requires a linked Page + IG Business Account
    // Step 1: Get the IG Business Account ID
    const accountsRes = await fetch(
      `${GRAPH_API}/me/accounts?fields=instagram_business_account&access_token=${accessToken}`
    );

    if (!accountsRes.ok) {
      return { success: false, error: "Failed to fetch Instagram business account" };
    }

    const accounts = (await accountsRes.json()) as {
      data: Array<{ instagram_business_account?: { id: string } }>;
    };

    const igAccountId = accounts.data?.[0]?.instagram_business_account?.id;
    if (!igAccountId) {
      return { success: false, error: "No Instagram Business Account linked" };
    }

    // For text-only posts on Instagram, we create a "caption-only" media container
    // Note: Instagram typically requires an image — this is a simplified stub
    const createRes = await fetch(
      `${GRAPH_API}/${igAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: content,
          access_token: accessToken,
        }),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      return { success: false, error: `Instagram media creation failed: ${errText}` };
    }

    const { id: containerId } = (await createRes.json()) as { id: string };

    // Step 3: Publish the container
    const publishRes = await fetch(
      `${GRAPH_API}/${igAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      return { success: false, error: `Instagram publish failed: ${errText}` };
    }

    const { id: postId } = (await publishRes.json()) as { id: string };
    return {
      success: true,
      platformPostId: postId,
      url: `https://www.instagram.com/p/${postId}`,
    };
  },

  async fetchComments(_platformPostId: string, _accessToken: string): Promise<PlatformComment[]> {
    return [];
  },

  async fetchAnalytics(_platformPostId: string, _accessToken: string): Promise<PlatformAnalytics> {
    return { likes: 0, comments: 0, shares: 0, impressions: 0 };
  },
};

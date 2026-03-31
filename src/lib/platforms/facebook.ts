import type { PlatformClient, OAuthTokens, PublishResult, PlatformComment, PlatformAnalytics } from "./types";

const FB_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const FB_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const FB_API_BASE = "https://graph.facebook.com/v19.0";

export const facebookClient: PlatformClient = {
  platform: "facebook",

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID ?? "",
      redirect_uri: redirectUri,
      state,
      scope: "pages_manage_posts,pages_read_engagement,pages_show_list",
      response_type: "code",
    });
    return `${FB_AUTH_URL}?${params.toString()}`;
  },

  async handleCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    // 1. Exchange code for short-lived user token
    const tokenRes = await fetch(
      `${FB_TOKEN_URL}?` +
        new URLSearchParams({
          client_id: process.env.FACEBOOK_APP_ID ?? "",
          client_secret: process.env.FACEBOOK_APP_SECRET ?? "",
          redirect_uri: redirectUri,
          code,
        })
    );

    if (!tokenRes.ok) {
      throw new Error(`Facebook token exchange failed: ${tokenRes.statusText}`);
    }

    const tokenData = await tokenRes.json();

    // 2. Exchange short-lived token for long-lived token
    const longRes = await fetch(
      `${FB_TOKEN_URL}?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: process.env.FACEBOOK_APP_ID ?? "",
          client_secret: process.env.FACEBOOK_APP_SECRET ?? "",
          fb_exchange_token: tokenData.access_token,
        })
    );

    if (!longRes.ok) {
      // Fall back to short-lived token
      return {
        accessToken: tokenData.access_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000),
      };
    }

    const longData = await longRes.json();

    // 3. Get user's pages and store the first page token
    const pagesRes = await fetch(`${FB_API_BASE}/me/accounts?access_token=${longData.access_token}`);
    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      if (pagesData.data && pagesData.data.length > 0) {
        const page = pagesData.data[0];
        // Return the PAGE access token (which never expires)
        return {
          accessToken: page.access_token,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Page tokens are long-lived
        };
      }
    }

    return {
      accessToken: longData.access_token,
      expiresAt: new Date(Date.now() + (longData.expires_in ?? 5184000) * 1000),
    };
  },

  async publish(content: string, accessToken: string): Promise<PublishResult> {
    // Publish to the Facebook Page using the page access token
    // First, get the page ID from the token
    const meRes = await fetch(`${FB_API_BASE}/me?access_token=${accessToken}`);
    if (!meRes.ok) {
      return { success: false, error: "Failed to identify Facebook Page" };
    }
    const me = await meRes.json();

    const response = await fetch(`${FB_API_BASE}/${me.id}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: content,
        access_token: accessToken,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Facebook publish failed: ${errText}` };
    }

    const data = await response.json();
    return {
      success: true,
      platformPostId: data.id,
      url: `https://www.facebook.com/${data.id}`,
    };
  },

  async fetchComments(_platformPostId: string, _accessToken: string): Promise<PlatformComment[]> {
    return [];
  },

  async fetchAnalytics(_platformPostId: string, _accessToken: string): Promise<PlatformAnalytics> {
    return { likes: 0, comments: 0, shares: 0, impressions: 0 };
  },
};

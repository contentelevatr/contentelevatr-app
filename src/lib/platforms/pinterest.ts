import type { PlatformClient, OAuthTokens, PublishResult, PlatformComment, PlatformAnalytics } from "./types";

const PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/";
const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const PINTEREST_API_BASE = "https://api.pinterest.com/v5";

export const pinterestClient: PlatformClient = {
  platform: "pinterest",

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.PINTEREST_APP_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "boards:read,pins:read,pins:write",
      state,
    });
    return `${PINTEREST_AUTH_URL}?${params.toString()}`;
  },

  async handleCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    const basicAuth = Buffer.from(
      `${process.env.PINTEREST_APP_ID ?? ""}:${process.env.PINTEREST_APP_SECRET ?? ""}`
    ).toString("base64");

    const response = await fetch(PINTEREST_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinterest token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 2592000) * 1000),
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const basicAuth = Buffer.from(
      `${process.env.PINTEREST_APP_ID ?? ""}:${process.env.PINTEREST_APP_SECRET ?? ""}`
    ).toString("base64");

    const response = await fetch(PINTEREST_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinterest token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 2592000) * 1000),
    };
  },

  async publish(content: string, accessToken: string): Promise<PublishResult> {
    // Pinterest creates "Pins". A text pin requires a board_id.
    // First, get user's boards to find or create a default board.
    const boardsRes = await fetch(`${PINTEREST_API_BASE}/boards`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let boardId: string | null = null;

    if (boardsRes.ok) {
      const boardsData = await boardsRes.json();
      if (boardsData.items && boardsData.items.length > 0) {
        boardId = boardsData.items[0].id;
      }
    }

    if (!boardId) {
      // Create a default board
      const createBoardRes = await fetch(`${PINTEREST_API_BASE}/boards`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "ContentElevatr Posts",
          description: "Posts created via ContentElevatr",
          privacy: "PUBLIC",
        }),
      });

      if (!createBoardRes.ok) {
        return { success: false, error: "Failed to find or create a Pinterest board" };
      }
      const newBoard = await createBoardRes.json();
      boardId = newBoard.id;
    }

    // Extract a title from the first line
    const lines = content.split("\n");
    const title = lines[0].replace(/^[#*]+/, "").trim().slice(0, 100) || "New Pin";
    const description = content.slice(0, 500);

    const pinRes = await fetch(`${PINTEREST_API_BASE}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        board_id: boardId,
        title,
        description,
        // Note: Pinterest ideally needs an image. For text-only posts,
        // we set a link as the source so Pinterest can generate a preview.
        alt_text: description,
      }),
    });

    if (!pinRes.ok) {
      const errText = await pinRes.text();
      return { success: false, error: `Pinterest publish failed: ${errText}` };
    }

    const pinData = await pinRes.json();
    return {
      success: true,
      platformPostId: pinData.id,
      url: `https://www.pinterest.com/pin/${pinData.id}`,
    };
  },

  async fetchComments(_platformPostId: string, _accessToken: string): Promise<PlatformComment[]> {
    return [];
  },

  async fetchAnalytics(_platformPostId: string, _accessToken: string): Promise<PlatformAnalytics> {
    return { likes: 0, comments: 0, shares: 0, impressions: 0 };
  },
};

import { PlatformClient } from "./types";

export const mediumClient: PlatformClient = {
  platform: "medium",
  getAuthorizeUrl: (state: string, redirectUri: string) => {
    // Medium does not use OAuth in our app, so authorize URL is unused.
    return "";
  },

  handleCallback: async (code: string, redirectUri: string) => {
    // Medium uses Integration Tokens, handled directly via API route
    return { accessToken: "" };
  },

  publish: async (content: string, accessToken: string) => {
    // 1. Fetch the user's ID because Medium requires it to post
    const meRes = await fetch("https://api.medium.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
    });
    if (!meRes.ok) throw new Error("Failed to authenticate with Medium token");
    const me = await meRes.json();
    const platformAccountId = me.data.id;

    // 2. Publish
    const lines = content.split('\n');
    const title = lines[0].replace(/^[#*]+/, "").trim().slice(0, 100) || "New Article";

    const response = await fetch(`https://api.medium.com/v1/users/${platformAccountId}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        title,
        contentFormat: "markdown",
        content,
        publishStatus: "public",
        tags: ["Writing"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Medium API Error:", errorText);
      return { success: false, error: `Medium API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, platformPostId: data.data.id, url: data.data.url };
  },
};

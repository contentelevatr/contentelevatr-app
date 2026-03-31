// Platform client interface — all platforms implement this contract

export type Platform = "linkedin" | "twitter" | "instagram" | "threads" | "medium" | "reddit" | "facebook" | "pinterest" | "youtube";

export interface PlatformConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  url?: string;
  error?: string;
}

export interface PlatformComment {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: Date;
}

export interface PlatformAnalytics {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
}

export interface PlatformClient {
  platform: Platform;

  /** Build the OAuth authorization URL */
  getAuthorizeUrl(state: string, redirectUri: string): string;

  /** Exchange auth code for tokens */
  handleCallback(code: string, redirectUri: string): Promise<OAuthTokens>;

  /** Refresh an expired access token */
  refreshAccessToken?(refreshToken: string): Promise<OAuthTokens>;

  /** Publish content to the platform */
  publish(content: string, accessToken: string): Promise<PublishResult>;

  /** Fetch comments for a published post (Phase D) */
  fetchComments?(platformPostId: string, accessToken: string): Promise<PlatformComment[]>;

  /** Reply to a comment (Phase D) */
  replyToComment?(commentId: string, reply: string, accessToken: string): Promise<boolean>;

  /** Fetch analytics for a published post (Phase D) */
  fetchAnalytics?(platformPostId: string, accessToken: string): Promise<PlatformAnalytics>;
}

/** Character limits per platform */
export const PLATFORM_CHAR_LIMITS: Record<Platform, number> = {
  linkedin: 3000,
  twitter: 280,
  instagram: 2200,
  threads: 500,
  medium: 100000,
  reddit: 40000,
  facebook: 63206,
  pinterest: 500,
  youtube: 5000,
};

/** Human-readable display names */
export const PLATFORM_DISPLAY_NAMES: Record<Platform, string> = {
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  instagram: "Instagram",
  threads: "Threads",
  medium: "Medium",
  reddit: "Reddit",
  facebook: "Facebook",
  pinterest: "Pinterest",
  youtube: "YouTube",
};

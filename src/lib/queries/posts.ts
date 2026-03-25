import { db } from "@/lib/db";
import { posts, platformPosts, socialAccounts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Post, PlatformPost } from "@/lib/db/schema";

export type PostWithPlatformPosts = Post & {
  platformPosts: PlatformPost[];
};

/**
 * Get all posts for a workspace, ordered by most recent first.
 * Always workspace-scoped per skill rules.
 */
export async function getPostsByWorkspace(
  workspaceId: string,
  options?: {
    status?: "draft" | "scheduled" | "published" | "failed";
    limit?: number;
    offset?: number;
  }
): Promise<PostWithPlatformPosts[]> {
  const conditions = [eq(posts.workspaceId, workspaceId)];

  if (options?.status) {
    conditions.push(eq(posts.status, options.status));
  }

  const result = await db.query.posts.findMany({
    where: and(...conditions),
    orderBy: [desc(posts.createdAt)],
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
    with: {
      platformPosts: true,
    },
  });

  return result as PostWithPlatformPosts[];
}

/**
 * Get a single post by ID, scoped by workspace.
 */
export async function getPostById(
  postId: string,
  workspaceId: string
): Promise<PostWithPlatformPosts | null> {
  const result = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)),
    with: {
      platformPosts: true,
    },
  });

  return (result as PostWithPlatformPosts) ?? null;
}

/**
 * Get connected social accounts for a workspace.
 */
export async function getSocialAccountsByWorkspace(workspaceId: string) {
  return db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.workspaceId, workspaceId));
}

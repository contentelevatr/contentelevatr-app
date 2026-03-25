import { db } from "@/lib/db";
import { platformPosts, posts } from "@/lib/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import type { PlatformPost } from "@/lib/db/schema";

/**
 * Get all scheduled platform posts that are due to be published.
 * Used by the cron publisher.
 */
export async function getDuePlatformPosts(): Promise<
  (PlatformPost & { post: { workspaceId: string; originalContent: string } })[]
> {
  const now = new Date();

  const results = await db.query.platformPosts.findMany({
    where: and(
      eq(platformPosts.status, "scheduled"),
      lte(platformPosts.scheduledAt, now)
    ),
    with: {
      post: {
        columns: {
          workspaceId: true,
          originalContent: true,
        },
      },
    },
  });

  return results as (PlatformPost & {
    post: { workspaceId: string; originalContent: string };
  })[];
}

/**
 * Get scheduled platform posts for a workspace, for the calendar view.
 */
export async function getScheduledPlatformPosts(
  workspaceId: string,
  options?: { from?: Date; to?: Date }
) {
  const conditions = [eq(platformPosts.status, "scheduled")];

  if (options?.from) {
    conditions.push(lte(platformPosts.scheduledAt, options.to ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  }

  const results = await db.query.platformPosts.findMany({
    where: and(...conditions),
    with: {
      post: {
        columns: {
          id: true,
          workspaceId: true,
          originalContent: true,
          status: true,
        },
      },
    },
    orderBy: [desc(platformPosts.scheduledAt)],
  });

  // Filter by workspace
  return results.filter((pp) => pp.post.workspaceId === workspaceId);
}

/**
 * Update a platform post's status.
 */
export async function updatePlatformPostStatus(
  platformPostId: string,
  status: "draft" | "scheduled" | "publishing" | "published" | "failed",
  extra?: { platformPostId?: string; errorMessage?: string; publishedAt?: Date }
) {
  await db
    .update(platformPosts)
    .set({
      status,
      platformPostId: extra?.platformPostId ?? undefined,
      errorMessage: extra?.errorMessage ?? undefined,
      publishedAt: extra?.publishedAt ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(platformPosts.id, platformPostId));
}

/**
 * Check if all platform posts for a post are published, and update the parent post status accordingly.
 */
export async function syncParentPostStatus(postId: string) {
  const pps = await db.query.platformPosts.findMany({
    where: eq(platformPosts.postId, postId),
  });

  const allPublished = pps.every((pp) => pp.status === "published");
  const anyFailed = pps.some((pp) => pp.status === "failed");
  const allDone = pps.every(
    (pp) => pp.status === "published" || pp.status === "failed"
  );

  if (allPublished) {
    await db.update(posts).set({ status: "published", updatedAt: new Date() }).where(eq(posts.id, postId));
  } else if (anyFailed && allDone) {
    await db.update(posts).set({ status: "failed", updatedAt: new Date() }).where(eq(posts.id, postId));
  }
}

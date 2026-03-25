import { db } from "@/lib/db";
import { comments, platformPosts, posts } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { Comment } from "@/lib/db/schema";

/**
 * Get pending comments for a workspace.
 * Used for the Engagement Inbox.
 */
export async function getPendingComments(workspaceId: string) {
  const results = await db.query.comments.findMany({
    where: and(
      eq(comments.workspaceId, workspaceId),
      eq(comments.status, "pending")
    ),
    with: {
      platformPost: {
        with: {
          post: true,
        },
      },
    },
    orderBy: [desc(comments.createdAt)],
  });

  return results;
}

/**
 * Update a comment's status and optionally set the approved reply.
 */
export async function updateCommentStatus(
  commentId: string,
  status: "pending" | "approved" | "ignored" | "replied" | "failed",
  approvedReply?: string
) {
  await db
    .update(comments)
    .set({
      status,
      ...(approvedReply ? { approvedReply } : {}),
      updatedAt: new Date(),
    })
    .where(eq(comments.id, commentId));
}

/**
 * Get all comments that have been approved but not yet replied to on the platform.
 * (Used by the reply dispatcher cron job if we had one, or processed immediately).
 */
export async function getApprovedCommentsToReply() {
  return db.query.comments.findMany({
    where: eq(comments.status, "approved"),
    with: {
      platformPost: true,
    },
  });
}

"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { updateCommentStatus } from "@/lib/queries/comments";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export async function approveCommentReply(
  commentId: string,
  approvedReplyText: string
) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) return { error: "No active workspace" };

  // Verify ownership
  const existing = await db.query.comments.findFirst({
    where: and(
      eq(comments.id, commentId),
      eq(comments.workspaceId, workspaceId)
    ),
  });

  if (!existing) return { error: "Comment not found" };

  // Update status to approved and save the text
  await updateCommentStatus(commentId, "approved", approvedReplyText);

  try {
    const { postReplyTask } = await import("@/trigger/post-reply");
    await postReplyTask.trigger({ commentId });
  } catch (err) {
    console.error("Trigger fail:", err);
  }

  revalidatePath("/dashboard/engagement");
  return { success: true };
}

export async function ignoreComment(commentId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) return { error: "No active workspace" };

  // Verify ownership
  const existing = await db.query.comments.findFirst({
    where: and(
      eq(comments.id, commentId),
      eq(comments.workspaceId, workspaceId)
    ),
  });

  if (!existing) return { error: "Comment not found" };

  // Update status to ignored
  await updateCommentStatus(commentId, "ignored");

  revalidatePath("/dashboard/engagement");
  return { success: true };
}

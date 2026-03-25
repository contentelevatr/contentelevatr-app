import { task } from "@trigger.dev/sdk/v3";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { getPlatformClient } from "@/lib/platforms";
import { decrypt } from "@/lib/platforms/encryption";
import type { Platform } from "@/lib/platforms/types";
import { eq } from "drizzle-orm";
import { updateCommentStatus } from "@/lib/queries/comments";

export const postReplyTask = task({
  id: "post-reply",
  run: async (payload: { commentId: string }) => {
    console.log(`Executing post-reply task for comment ${payload.commentId}`);

    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, payload.commentId),
      with: {
        platformPost: {
          with: { socialAccount: true },
        },
      },
    });

    if (!comment) {
      throw new Error(`Comment not found: ${payload.commentId}`);
    }

    if (comment.status !== "approved" || !comment.approvedReply) {
      throw new Error("Comment is not approved or is missing a reply");
    }

    const { platformPost } = comment;
    if (!platformPost.socialAccount || !platformPost.platformPostId) {
      throw new Error("Missing social account or platform post ID");
    }

    const client = getPlatformClient(platformPost.platform as Platform);
    if (!client.replyToComment) {
      throw new Error(`${platformPost.platform} does not support API replies`);
    }

    try {
      const accessToken = decrypt(platformPost.socialAccount.accessTokenEnc);
      const success = await client.replyToComment(
        comment.platformCommentId,
        comment.approvedReply,
        accessToken
      );

      if (success) {
        await updateCommentStatus(comment.id, "replied");
        return { success: true };
      } else {
        await updateCommentStatus(comment.id, "failed");
        throw new Error("Platform returned failure for reply");
      }
    } catch (error) {
      await updateCommentStatus(comment.id, "failed");
      throw error;
    }
  },
});

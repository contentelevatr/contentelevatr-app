import { schedules } from "@trigger.dev/sdk/v3";
import { db } from "@/lib/db";
import { platformPosts, socialAccounts, comments, posts } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { getPlatformClient } from "@/lib/platforms";
import { decrypt } from "@/lib/platforms/encryption";
import type { Platform } from "@/lib/platforms/types";
import { generateReplyDraft } from "@/lib/ai/generate-reply";

export const syncCommentsTask = schedules.task({
  id: "sync-comments",
  cron: "0 * * * *", // Runs every hour
  run: async () => {
    console.log("Starting comment sync...");
    
    // Only check posts published in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activePosts = await db.query.platformPosts.findMany({
      where: and(
        eq(platformPosts.status, "published"),
        gte(platformPosts.publishedAt, thirtyDaysAgo)
      ),
      with: {
        post: true,
        socialAccount: true,
      },
    });

    let newCommentsCount = 0;

    for (const pp of activePosts) {
      if (!pp.platformPostId || !pp.socialAccount) continue;

      const client = getPlatformClient(pp.platform as Platform);
      if (!client.fetchComments) continue;

      try {
        const accessToken = decrypt(pp.socialAccount.accessTokenEnc);
        const platformComments = await client.fetchComments(
          pp.platformPostId,
          accessToken
        );

        for (const pc of platformComments) {
          // Check if comment already exists in our DB
          const existing = await db.query.comments.findFirst({
            where: and(
              eq(comments.platformPostId, pp.id),
              eq(comments.platformCommentId, pc.id)
            ),
          });

          if (!existing) {
            // Generate AI reply draft
            const aiReplyDraft = await generateReplyDraft(
              pp.platform as Platform,
              pp.platformContent || pp.post.originalContent,
              pc.authorName,
              pc.content
            );

            await db.insert(comments).values({
              platformPostId: pp.id,
              workspaceId: pp.post.workspaceId,
              platformCommentId: pc.id,
              authorName: pc.authorName,
              content: pc.content,
              aiReplyDraft,
              status: "pending",
            });
            newCommentsCount++;
          }
        }
      } catch (error) {
        console.error(`Failed to sync comments for post ${pp.id}:`, error);
      }
    }

    return { newCommentsCount, checkedPosts: activePosts.length };
  },
});

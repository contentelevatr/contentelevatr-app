import { schedules } from "@trigger.dev/sdk/v3";
import { getDuePlatformPosts, updatePlatformPostStatus, syncParentPostStatus } from "@/lib/queries/platform-posts";
import { getPlatformClient } from "@/lib/platforms";
import { decrypt } from "@/lib/platforms/encryption";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Platform } from "@/lib/platforms/types";

export const publishDuePostsTask = schedules.task({
  id: "publish-due-posts",
  cron: "* * * * *", // Runs every minute
  run: async (payload, { ctx }) => {
    console.log("Starting scheduled publish run...");

    const duePosts = await getDuePlatformPosts();
    if (duePosts.length === 0) {
      console.log("No posts due for publishing.");
      return { published: 0, failed: 0 };
    }

    let published = 0;
    let failed = 0;

    for (const pp of duePosts) {
      // Mark as publishing
      await updatePlatformPostStatus(pp.id, "publishing");

      try {
        // Get the social account for this platform + workspace
        const account = await db.query.socialAccounts.findFirst({
          where: and(
            eq(socialAccounts.workspaceId, pp.post.workspaceId),
            eq(socialAccounts.platform, pp.platform as Platform)
          ),
        });

        if (!account) {
          await updatePlatformPostStatus(pp.id, "failed", {
            errorMessage: `No ${pp.platform} account connected`,
          });
          failed++;
          continue;
        }

        // Decrypt the access token
        const accessToken = decrypt(account.accessTokenEnc);

        // Get the platform client and publish
        const client = getPlatformClient(pp.platform as Platform);
        const content = pp.platformContent || pp.post.originalContent;
        const result = await client.publish(content, accessToken);

        if (result.success) {
          await updatePlatformPostStatus(pp.id, "published", {
            platformPostId: result.platformPostId,
            publishedAt: new Date(),
          });
          published++;
        } else {
          await updatePlatformPostStatus(pp.id, "failed", {
            errorMessage: result.error || "Publishing failed",
          });
          failed++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to publish post ${pp.id}: ${message}`);
        await updatePlatformPostStatus(pp.id, "failed", {
          errorMessage: message,
        });
        failed++;
      }

      // Sync parent post status
      await syncParentPostStatus(pp.postId);
    }

    return {
      published,
      failed,
      total: duePosts.length,
    };
  },
});

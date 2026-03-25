import { NextResponse } from "next/server";
import { getDuePlatformPosts, updatePlatformPostStatus, syncParentPostStatus } from "@/lib/queries/platform-posts";
import { getPlatformClient } from "@/lib/platforms";
import { decrypt } from "@/lib/platforms/encryption";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Platform } from "@/lib/platforms/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const duePosts = await getDuePlatformPosts();

    if (duePosts.length === 0) {
      return NextResponse.json({ message: "No posts due", published: 0, failed: 0 });
    }

    let published = 0;
    let failed = 0;

    for (const pp of duePosts) {
      await updatePlatformPostStatus(pp.id, "publishing");

      try {
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

        const accessToken = decrypt(account.accessTokenEnc);
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
        await updatePlatformPostStatus(pp.id, "failed", {
          errorMessage: message,
        });
        failed++;
      }

      await syncParentPostStatus(pp.postId);
    }

    return NextResponse.json({ published, failed, total: duePosts.length });
  } catch (error) {
    console.error("Cron publish error:", error);
    return NextResponse.json({ error: "Publish cron failed" }, { status: 500 });
  }
}

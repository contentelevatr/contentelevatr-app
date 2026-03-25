import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getPendingComments } from "@/lib/queries/comments";
import { CommentCard } from "@/components/engagement/comment-card";
import { MockPollButton } from "@/components/engagement/mock-poll-button";
import { db } from "@/lib/db";
import { platformPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function EngagementPage() {
  const [{ userId }, cookieStore] = await Promise.all([auth(), cookies()]);
  if (!userId) redirect("/sign-in");

  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) redirect("/onboarding");

  // Run both queries in parallel
  const [pendingComments, publishedPost] = await Promise.all([
    getPendingComments(workspaceId),
    db.query.platformPosts.findFirst({
      where: eq(platformPosts.status, "published"),
      with: { post: true },
    }),
  ]);

  const publishedCount = publishedPost && publishedPost.post.workspaceId === workspaceId ? 1 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Engagement Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review AI-drafted replies to incoming comments across all platforms.
          </p>
        </div>

        <MockPollButton 
          workspaceId={workspaceId} 
          disabled={!publishedCount} 
        />
      </div>

      {!publishedCount && pendingComments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p className="mb-2 text-lg font-medium text-foreground">Nothing to reply to yet!</p>
          <p className="text-sm">You need at least one <span className="font-semibold text-primary">published post</span> before you can receive comments.</p>
          <a href="/dashboard/compose" className="mt-4 inline-block text-primary hover:underline text-sm font-medium">
            Create a post →
          </a>
        </div>
      )}

      {publishedCount > 0 && pendingComments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium text-foreground">Inbox Zero 🎉</p>
          <p className="mt-1 text-sm">No new comments require your attention. Click "Generate Mock Comment" to simulate an incoming reply.</p>
        </div>
      )}

      {pendingComments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground border-b border-border pb-2">
            <span>{pendingComments.length} Pending {pendingComments.length === 1 ? "Reply" : "Replies"}</span>
          </div>
          
          <div className="grid gap-4">
            {pendingComments.map((comment) => (
               <CommentCard 
                 key={comment.id} 
                 comment={comment as any}
               />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

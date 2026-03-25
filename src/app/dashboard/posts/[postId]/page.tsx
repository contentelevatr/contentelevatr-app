import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getPostById } from "@/lib/queries/posts";
import { PLATFORM_DISPLAY_NAMES, PLATFORM_CHAR_LIMITS } from "@/lib/platforms/types";
import type { Platform } from "@/lib/platforms/types";
import { DeletePostButton } from "./delete-button";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) redirect("/onboarding");

  const { postId } = await params;
  const post = await getPostById(postId, workspaceId);

  if (!post) notFound();

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-500/10 text-blue-500",
    publishing: "bg-yellow-500/10 text-yellow-500",
    published: "bg-green-500/10 text-green-500",
    failed: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/posts"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Post Detail</h1>
            <p className="text-sm text-muted-foreground">
              Created{" "}
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              STATUS_COLORS[post.status] ?? STATUS_COLORS.draft
            }`}
          >
            {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
          </span>
          <Link
            href={`/dashboard/compose?edit=${post.id}`}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Edit
          </Link>
          <DeletePostButton postId={post.id} />
        </div>
      </div>

      {/* Original content */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Original Content
        </h3>
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {post.originalContent || "No content"}
        </p>
      </div>

      {/* Platform variants */}
      {post.platformPosts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Platform Variants
          </h3>
          {post.platformPosts.map((pp) => {
            const platform = pp.platform as Platform;
            const limit = PLATFORM_CHAR_LIMITS[platform];
            const charCount = (pp.platformContent ?? "").length;
            const isOver = charCount > limit;

            return (
              <div
                key={pp.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/30">
                  <span className="text-sm font-medium text-foreground">
                    {PLATFORM_DISPLAY_NAMES[platform]}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono ${
                        isOver ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {charCount}/{limit}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[pp.status] ?? STATUS_COLORS.draft
                      }`}
                    >
                      {pp.status}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {pp.platformContent || "No content"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

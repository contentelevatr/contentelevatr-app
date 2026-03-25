import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getPostsByWorkspace } from "@/lib/queries/posts";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/platforms/types";
import type { Platform } from "@/lib/platforms/types";
import { PlatformIcon } from "@/components/ui/platform-icon";

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-500/10 text-blue-500",
  },
  published: {
    label: "Published",
    className: "bg-green-500/10 text-green-500",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive",
  },
};

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ userId }, cookieStore, params] = await Promise.all([
    auth(),
    cookies(),
    searchParams,
  ]);
  if (!userId) redirect("/sign-in");

  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) redirect("/onboarding");

  const statusFilter = params.status as
    | "draft"
    | "scheduled"
    | "published"
    | "failed"
    | undefined;

  const posts = await getPostsByWorkspace(workspaceId, {
    status: statusFilter,
  });

  const tabs = [
    { key: undefined, label: "All" },
    { key: "draft", label: "Drafts" },
    { key: "scheduled", label: "Scheduled" },
    { key: "published", label: "Published" },
    { key: "failed", label: "Failed" },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Posts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your content across all platforms.
          </p>
        </div>
        <Link
          href="/dashboard/compose"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New Post
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={
              tab.key
                ? `/dashboard/posts?status=${tab.key}`
                : "/dashboard/posts"
            }
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-16">
          <p className="mb-2 text-lg font-medium text-foreground">
            No posts yet
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first post and start publishing.
          </p>
          <Link
            href="/dashboard/compose"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create Post
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const badge = STATUS_BADGES[post.status] ?? STATUS_BADGES.draft;
            const platforms = post.platformPosts.map((pp) => pp.platform as Platform);

            return (
              <Link
                key={post.id}
                href={`/dashboard/posts/${post.id}`}
                className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Content preview */}
                    <p className="text-sm text-foreground line-clamp-2 mb-2">
                      {post.originalContent || "Empty draft"}
                    </p>

                    {/* Platform icons */}
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {platforms.map((p) => (
                          <span
                            key={p}
                            title={PLATFORM_DISPLAY_NAMES[p]}
                            className="text-sm"
                          >
                            <PlatformIcon platform={p} className="h-4 w-4" />
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

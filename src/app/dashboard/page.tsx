import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { posts, platformPosts, comments } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { FileText, CalendarDays, CheckCircle2, MessageSquare } from "lucide-react";

export default async function DashboardPage() {
  const [{ userId }, cookieStore] = await Promise.all([auth(), cookies()]);
  if (!userId) redirect("/sign-in");

  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) redirect("/onboarding");

  // Run ALL count queries in parallel instead of sequentially
  const [totalPostsResult, scheduledResult, publishedResult, pendingCommentsCount] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.workspaceId, workspaceId)).then(r => Number(r[0]?.count ?? 0)),
      db.select({ count: sql<number>`count(*)` }).from(posts).where(and(eq(posts.workspaceId, workspaceId), eq(posts.status, "scheduled"))).then(r => Number(r[0]?.count ?? 0)),
      db.select({ count: sql<number>`count(*)` }).from(posts).where(and(eq(posts.workspaceId, workspaceId), eq(posts.status, "published"))).then(r => Number(r[0]?.count ?? 0)),
      db.select({ count: sql<number>`count(*)` })
        .from(comments)
        .innerJoin(platformPosts, eq(comments.platformPostId, platformPosts.id))
        .innerJoin(posts, eq(platformPosts.postId, posts.id))
        .where(and(eq(posts.workspaceId, workspaceId), eq(comments.status, "pending")))
        .then(r => Number(r[0]?.count ?? 0))
        .catch(() => 0),
    ]);

  const stats = [
    { label: "Total Posts", value: totalPostsResult, icon: <FileText className="h-4 w-4" /> },
    { label: "Scheduled", value: scheduledResult, icon: <CalendarDays className="h-4 w-4" /> },
    { label: "Published", value: publishedResult, icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Pending Replies", value: pendingCommentsCount, icon: <MessageSquare className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to ContentElevatr. Your social media command center.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {stat.icon}
              {stat.label}
            </div>
            <div className="mt-2 text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

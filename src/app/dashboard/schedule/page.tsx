import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CalendarView } from "@/components/schedule/calendar-view";
import { getScheduledPlatformPosts } from "@/lib/queries/platform-posts";

export default async function SchedulePage() {
  const [{ userId }, cookieStore] = await Promise.all([auth(), cookies()]);
  if (!userId) redirect("/sign-in");

  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) redirect("/onboarding");

  const scheduledPosts = await getScheduledPlatformPosts(workspaceId);

  const calendarPosts = scheduledPosts.map((pp) => ({
    id: pp.id,
    postId: pp.postId,
    platform: pp.platform,
    platformContent: pp.platformContent,
    scheduledAt: pp.scheduledAt?.toISOString() ?? "",
    status: pp.status,
    originalContent: pp.post.originalContent,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your scheduled posts across all platforms.
        </p>
      </div>

      <CalendarView scheduledPosts={calendarPosts} />
    </div>
  );
}

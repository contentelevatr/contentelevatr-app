import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ComposeEditor } from "@/components/compose/compose-editor";
import { getSocialAccountsByWorkspace } from "@/lib/queries/posts";
import type { Platform } from "@/lib/platforms/types";

export default async function ComposePage() {
  const [{ userId }, cookieStore] = await Promise.all([auth(), cookies()]);
  if (!userId) redirect("/sign-in");

  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) redirect("/onboarding");

  const accounts = await getSocialAccountsByWorkspace(workspaceId);
  const connectedPlatforms = accounts.map((a) => a.platform) as Platform[];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create Post</h1>
        <p className="text-sm text-muted-foreground">
          Write once, publish to all your connected platforms.
        </p>
      </div>

      <ComposeEditor connectedPlatforms={connectedPlatforms} />
    </div>
  );
}

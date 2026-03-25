import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getSocialAccountsByWorkspace } from "@/lib/queries/posts";
import type { Platform } from "@/lib/platforms/types";
import { SocialAccountCard } from "./social-account-card";

const ALL_PLATFORMS: Platform[] = [
  "linkedin",
  "twitter",
  "instagram",
  "threads",
  "medium",
  "reddit",
];

export default async function AccountsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) redirect("/onboarding");

  const params = await searchParams;
  const accounts = await getSocialAccountsByWorkspace(workspaceId);

  // Map connected accounts by platform
  const accountsByPlatform = new Map(
    accounts.map((a) => [a.platform, a])
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Connected Accounts
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect your social media accounts to publish content across
          platforms.
        </p>
      </div>

      {/* Success/error messages */}
      {params.success === "connected" && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
          <p className="text-sm text-green-500 font-medium">
            ✓ Account connected successfully!
          </p>
        </div>
      )}
      {params.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">
            Failed to connect: {params.error.replace(/_/g, " ")}
          </p>
        </div>
      )}

      {/* Platform cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_PLATFORMS.map((platform) => {
          const account = accountsByPlatform.get(platform);
          return (
            <SocialAccountCard
              key={platform}
              platform={platform}
              isConnected={!!account}
              account={
                account
                  ? {
                      id: account.id,
                      platform: account.platform,
                      accountName: account.accountName,
                      accountAvatar: account.accountAvatar,
                      platformAccountId: account.platformAccountId,
                      tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

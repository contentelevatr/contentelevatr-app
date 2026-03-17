import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyInviteToken } from "@/lib/invites";
import { setActiveWorkspace } from "@/lib/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const payload = await verifyInviteToken(token);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Ensure user is logged in
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    redirect(`/sign-in?redirect_url=/invite/${token}`);
  }

  // Get DB user
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) {
    redirect(`/sign-up?redirect_url=/invite/${token}`);
  }

  // Check if already a member
  const existing = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, payload.workspaceId),
      eq(workspaceMembers.userId, user.id)
    ),
  });

  if (!existing) {
    // Add as member
    await db.insert(workspaceMembers).values({
      workspaceId: payload.workspaceId,
      userId: user.id,
      role: payload.role,
    });
  }

  // Get workspace name for display
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, payload.workspaceId),
  });

  // Set as active workspace and redirect
  await setActiveWorkspace(payload.workspaceId);
  redirect("/dashboard");
}

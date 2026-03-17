import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function getActiveWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("active_workspace_id")?.value ?? null;
}

export async function requireActiveWorkspace() {
  const user = await requireUser();
  const workspaceId = await getActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("No active workspace");
  }

  // Verify user is a member of this workspace
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, user.id)
    ),
    with: {
      workspace: true,
    },
  });

  if (!membership) {
    throw new Error("Access denied to workspace");
  }

  return {
    user,
    workspace: membership.workspace,
    role: membership.role,
  };
}

export async function getClerkUser() {
  return currentUser();
}

import { db } from "@/lib/db";
import {
  workspaces,
  workspaceMembers,
  subscriptions,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

export async function getWorkspacesForUser(userId: string) {
  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, userId),
    with: {
      workspace: true,
    },
  });

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));
}

export async function createWorkspace(
  name: string,
  slug: string,
  type: "personal" | "agency",
  ownerId: string
) {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name, slug, type, ownerId })
    .returning();

  // Add owner as a member
  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: ownerId,
    role: "owner",
  });

  // Create free subscription
  await db.insert(subscriptions).values({
    workspaceId: workspace.id,
    plan: "free",
    status: "active",
  });

  return workspace;
}

export async function setActiveWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string
) {
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });

  if (!membership) {
    throw new Error("Access denied");
  }

  return membership;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

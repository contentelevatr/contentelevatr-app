"use server";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function disconnectAccount(accountId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) {
    return { error: "No active workspace" };
  }

  // Verify the account belongs to this workspace
  const account = await db.query.socialAccounts.findFirst({
    where: and(
      eq(socialAccounts.id, accountId),
      eq(socialAccounts.workspaceId, workspaceId)
    ),
  });

  if (!account) {
    return { error: "Account not found" };
  }

  await db.delete(socialAccounts).where(eq(socialAccounts.id, accountId));

  revalidatePath("/dashboard/settings/accounts");

  return { success: true };
}

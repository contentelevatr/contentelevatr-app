import { NextResponse } from "next/server";
import { requireActiveWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { workspace } = await requireActiveWorkspace();

    const members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, workspace.id),
      with: {
        user: {
          columns: {
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Members fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 400 });
  }
}

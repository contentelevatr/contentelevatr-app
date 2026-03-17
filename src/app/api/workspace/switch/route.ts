import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireWorkspaceAccess, setActiveWorkspace } from "@/lib/workspace";

const switchSchema = z.object({
  workspaceId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { workspaceId } = switchSchema.parse(body);

    // Verify membership
    await requireWorkspaceAccess(user.id, workspaceId);

    // Set active workspace cookie
    await setActiveWorkspace(workspaceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Workspace switch error:", error);
    return NextResponse.json(
      { error: "Failed to switch workspace" },
      { status: 400 }
    );
  }
}

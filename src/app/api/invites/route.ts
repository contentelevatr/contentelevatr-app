import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveWorkspace } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { sendInviteEmail } from "@/lib/invites";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]),
});

export async function POST(req: Request) {
  try {
    const { user, workspace, role } = await requireActiveWorkspace();
    requirePermission(role, "manage_team");

    const body = await req.json();
    const { email, role: inviteRole } = inviteSchema.parse(body);

    await sendInviteEmail({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      email,
      role: inviteRole,
      invitedBy: user.name ?? user.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Failed to send invite" },
      { status: 400 }
    );
  }
}

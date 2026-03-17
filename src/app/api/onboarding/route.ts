import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createWorkspace, generateSlug, setActiveWorkspace } from "@/lib/workspace";

const onboardingSchema = z.object({
  type: z.enum(["personal", "agency"]),
  name: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { type, name } = onboardingSchema.parse(body);

    const slug = generateSlug(name) + "-" + user.id.slice(0, 8);
    const workspace = await createWorkspace(name, slug, type, user.id);

    await setActiveWorkspace(workspace.id);

    return NextResponse.json({ workspaceId: workspace.id });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}

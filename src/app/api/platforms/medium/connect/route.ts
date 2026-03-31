import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { socialAccounts } from "@/lib/db/schema";
import { encrypt } from "@/lib/platforms/encryption";
import { cookies } from "next/headers";

const connectSchema = z.object({
  token: z.string().min(1, "Integration token is required"),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    
    const cookieStore = await cookies();
    const workspaceId = cookieStore.get("active_workspace_id")?.value;
    
    if (!workspaceId) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }

    const body = await req.json();
    const { token } = connectSchema.parse(body);

    // 1. Validate the token by fetching the Medium user profile
    const response = await fetch("https://api.medium.com/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Invalid Medium Integration Token" },
        { status: 401 }
      );
    }

    const data = await response.json();
    const mediumUser = data.data;

    // 2. Encrypt the token for safe storage
    const encryptedToken = encrypt(token);

    // 3. Upsert into database
    await db
      .insert(socialAccounts)
      .values({
        workspaceId,
        platform: "medium",
        platformAccountId: mediumUser.id,
        accountName: mediumUser.name || mediumUser.username,
        accountAvatar: mediumUser.imageUrl,
        accessTokenEnc: encryptedToken,
      })
      .onConflictDoUpdate({
        target: [
          socialAccounts.workspaceId,
          socialAccounts.platform,
          socialAccounts.platformAccountId,
        ],
        set: {
          accountName: mediumUser.name || mediumUser.username,
          accountAvatar: mediumUser.imageUrl,
          accessTokenEnc: encryptedToken,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Medium connect error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to connect Medium account" },
      { status: 500 }
    );
  }
}

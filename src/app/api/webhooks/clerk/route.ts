import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createWorkspace, generateSlug } from "@/lib/workspace";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET");
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    console.error("Webhook verification failed");
    return new Response("Webhook verification failed", { status: 400 });
  }

  switch (event.type) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name, image_url } =
        event.data;
      const email = email_addresses[0]?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      const [newUser] = await db
        .insert(users)
        .values({
          clerkId: id,
          email,
          name,
          imageUrl: image_url,
        })
        .returning();

      // Create a default personal workspace
      const workspaceName = name ? `${name}'s Workspace` : "My Workspace";
      await createWorkspace(
        workspaceName,
        generateSlug(workspaceName) + "-" + newUser.id.slice(0, 8),
        "personal",
        newUser.id
      );

      break;
    }

    case "user.updated": {
      const { id, email_addresses, first_name, last_name, image_url } =
        event.data;
      const email = email_addresses[0]?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      await db
        .update(users)
        .set({ email, name, imageUrl: image_url })
        .where(eq(users.clerkId, id));

      break;
    }

    case "user.deleted": {
      const { id } = event.data;
      if (id) {
        await db.delete(users).where(eq(users.clerkId, id));
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}

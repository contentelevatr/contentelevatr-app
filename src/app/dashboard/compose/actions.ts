"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { posts, platformPosts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Platform } from "@/lib/platforms/types";

const createPostSchema = z.object({
  content: z.string().min(1, "Content is required"),
  platforms: z.array(
    z.enum(["linkedin", "twitter", "instagram", "threads", "medium", "reddit"])
  ).min(1, "Select at least one platform"),
  platformContent: z.record(
    z.enum(["linkedin", "twitter", "instagram", "threads", "medium", "reddit"]),
    z.string()
  ).optional(),
  status: z.enum(["draft", "scheduled", "published"]).default("draft"),
});

export async function createPost(formData: {
  content: string;
  platforms: Platform[];
  platformContent?: Partial<Record<Platform, string>>;
  status?: "draft" | "scheduled" | "published";
}) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) {
    return { error: "No active workspace" };
  }

  const parsed = createPostSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { content, platforms, platformContent, status } = parsed.data;

  // Look up the DB user ID from clerk ID
  const dbUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.clerkId, userId),
  });

  if (!dbUser) {
    return { error: "User not found in database" };
  }

  // Create the post
  const [newPost] = await db
    .insert(posts)
    .values({
      workspaceId,
      authorId: dbUser.id,
      originalContent: content,
      status: status ?? "draft",
    })
    .returning();

  // Create platform-specific posts
  const platformPostValues = platforms.map((platform) => ({
    postId: newPost.id,
    platform,
    platformContent: platformContent?.[platform] ?? content,
    status: status === "draft" ? ("draft" as const) : ("scheduled" as const),
  }));

  if (platformPostValues.length > 0) {
    await db.insert(platformPosts).values(platformPostValues);
  }

  revalidatePath("/dashboard/posts");
  revalidatePath("/dashboard/compose");

  return { success: true, postId: newPost.id };
}

export async function updatePost(
  postId: string,
  formData: {
    content: string;
    platformContent?: Partial<Record<Platform, string>>;
  }
) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) {
    return { error: "No active workspace" };
  }

  // Verify post belongs to workspace
  const existing = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)),
    with: { platformPosts: true },
  });

  if (!existing) {
    return { error: "Post not found" };
  }

  // Update main post
  await db
    .update(posts)
    .set({
      originalContent: formData.content,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));

  // Update platform-specific content
  if (formData.platformContent) {
    for (const pp of existing.platformPosts) {
      const newContent = formData.platformContent[pp.platform];
      if (newContent !== undefined) {
        await db
          .update(platformPosts)
          .set({ platformContent: newContent, updatedAt: new Date() })
          .where(eq(platformPosts.id, pp.id));
      }
    }
  }

  revalidatePath("/dashboard/posts");
  revalidatePath(`/dashboard/posts/${postId}`);

  return { success: true };
}

export async function deletePost(postId: string) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) {
    return { error: "No active workspace" };
  }

  // Verify post belongs to workspace
  const existing = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)),
  });

  if (!existing) {
    return { error: "Post not found" };
  }

  await db.delete(posts).where(eq(posts.id, postId));

  revalidatePath("/dashboard/posts");

  return { success: true };
}

export async function schedulePost(formData: {
  content: string;
  platforms: Platform[];
  platformContent?: Partial<Record<Platform, string>>;
  scheduledAt: string; // ISO string
}) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const cookieStore = await cookies();
  const workspaceId = cookieStore.get("active_workspace_id")?.value;
  if (!workspaceId) {
    return { error: "No active workspace" };
  }

  const scheduleDate = new Date(formData.scheduledAt);
  if (isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
    return { error: "Schedule time must be in the future" };
  }

  const dbUser = await db.query.users.findFirst({
    where: (users, { eq: eqOp }) => eqOp(users.clerkId, userId),
  });

  if (!dbUser) {
    return { error: "User not found in database" };
  }

  // Create the post with scheduled status
  const [newPost] = await db
    .insert(posts)
    .values({
      workspaceId,
      authorId: dbUser.id,
      originalContent: formData.content,
      status: "scheduled",
    })
    .returning();

  // Create platform posts with scheduledAt
  const platformPostValues = formData.platforms.map((platform) => ({
    postId: newPost.id,
    platform,
    platformContent: formData.platformContent?.[platform] ?? formData.content,
    status: "scheduled" as const,
    scheduledAt: scheduleDate,
  }));

  if (platformPostValues.length > 0) {
    await db.insert(platformPosts).values(platformPostValues);
  }

  revalidatePath("/dashboard/posts");
  revalidatePath("/dashboard/schedule");

  return { success: true, postId: newPost.id };
}


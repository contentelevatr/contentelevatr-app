import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformPosts, comments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateReplyDraft } from "@/lib/ai/generate-reply";
import type { Platform } from "@/lib/platforms/types";

// Mock data pool
const MOCK_AUTHORS = ["Sarah Jane", "Alex Chen", "Marcus Wong", "Elena Rodriguez", "David Kim"];
const MOCK_COMMENTS = [
  "This is highly insightful, thanks for sharing!",
  "I completely agree with this perspective. Do you have any resources on step 3?",
  "Interesting take, but what about the implications for smaller teams?",
  "Love this! 🔥",
  "This helped me solve a problem I've been stuck on for days. Appreciate it.",
  "Great summary. Looking forward to part 2!",
];

/**
 * Mock Polling API: Instantly generates "fake" incoming platform comments 
 * on the most recently published posts to demonstrate the AI Reply engine.
 * 
 * In production, this would be a webhook receiver or scheduled polling job
 * reaching out to platform APIs via GET /comments endpoints.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    // Find a recently published post to attach a comment to
    const publishedPosts = await db.query.platformPosts.findMany({
      where: eq(platformPosts.status, "published"),
      with: { post: true },
      orderBy: [desc(platformPosts.publishedAt)],
      limit: 5,
    });

    // Filter by the requested workspace
    const workspacePosts = publishedPosts.filter(
      (pp) => pp.post.workspaceId === workspaceId
    );

    if (workspacePosts.length === 0) {
      return NextResponse.json({ 
        error: "No published posts found in this workspace to comment on. Publish a post first." 
      }, { status: 400 });
    }

    // Pick a random post
    const targetPost = workspacePosts[Math.floor(Math.random() * workspacePosts.length)];
    
    // Pick random author & text
    const authorName = MOCK_AUTHORS[Math.floor(Math.random() * MOCK_AUTHORS.length)];
    const commentContent = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];

    // 1. Generate AI Reply draft
    const originalContent = targetPost.platformContent || targetPost.post.originalContent;
    const aiReplyDraft = await generateReplyDraft(
      targetPost.platform as Platform,
      originalContent,
      authorName,
      commentContent
    );

    // 2. Insert into database
    const [newComment] = await db.insert(comments).values({
      workspaceId,
      platformPostId: targetPost.id,
      platformCommentId: `mock_${Math.random().toString(36).substring(7)}`,
      authorName,
      content: commentContent,
      aiReplyDraft,
      status: "pending",
    }).returning();

    return NextResponse.json({
      success: true,
      comment: newComment,
      message: "Mock comment and AI draft generated successfully",
    });

  } catch (error) {
    console.error("Mock poll error:", error);
    return NextResponse.json({ error: "Failed to mock comments" }, { status: 500 });
  }
}

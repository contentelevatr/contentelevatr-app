"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { approveCommentReply, ignoreComment } from "@/app/dashboard/engagement/actions";
import { toast } from "sonner";
import type { Platform } from "@/lib/platforms/types";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/platforms/types";
import { PlatformIcon } from "@/components/ui/platform-icon";

interface CommentCardProps {
  comment: {
    id: string;
    authorName: string | null;
    content: string;
    createdAt: Date;
    aiReplyDraft: string | null;
    platformPost: {
      platform: string;
      platformContent: string;
      post: {
        originalContent: string;
      };
    };
  };
}

export function CommentCard({ comment }: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [replyText, setReplyText] = useState(comment.aiReplyDraft || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived original post context
  const originalContext =
    comment.platformPost.platformContent ||
    comment.platformPost.post.originalContent;

  const handleApprove = async () => {
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await approveCommentReply(comment.id, replyText);
      if (result.error) throw new Error(result.error);
      toast.success("Reply posted!");
    } catch {
      toast.error("Failed to post reply");
      setIsSubmitting(false); // Only reset on fail, on success unmounts
    }
  };

  const handleIgnore = async () => {
    setIsSubmitting(true);
    try {
      const result = await ignoreComment(comment.id);
      if (result.error) throw new Error(result.error);
      toast.success("Comment ignored");
    } catch {
      toast.error("Failed to ignore comment");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      {/* Platform & Post Context */}
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-medium capitalize text-foreground">
            <PlatformIcon platform={comment.platformPost.platform as Platform} className="h-3.5 w-3.5" />
            {PLATFORM_DISPLAY_NAMES[comment.platformPost.platform as Platform] || comment.platformPost.platform}
          </span>
          <span className="truncate max-w-[300px] text-muted-foreground/70">
            On: "{originalContext.substring(0, 60)}..."
          </span>
        </div>
        <span>{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
      </div>

      {/* The Comment */}
      <div className="mb-5 pl-3 border-l-2 border-primary/20">
        <p className="font-semibold text-sm text-foreground mb-0.5">
          {comment.authorName || "Anonymous User"}
        </p>
        <p className="text-sm text-foreground/90">{comment.content}</p>
      </div>

      {/* Reply Area */}
      <div className="rounded-lg bg-muted/30 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-primary">✨ AI Suggested Reply</span>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Edit draft
            </button>
          )}
        </div>

        {isEditing ? (
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
          />
        ) : (
          <p className="text-sm text-foreground/80 italic bg-background p-3 rounded-md border border-border/50">
            "{replyText}"
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3 justify-end">
          <button
            onClick={handleIgnore}
            disabled={isSubmitting}
            className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
          >
            Ignore
          </button>
          <button
            onClick={handleApprove}
            disabled={isSubmitting || !replyText.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Posting..." : "Approve & Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

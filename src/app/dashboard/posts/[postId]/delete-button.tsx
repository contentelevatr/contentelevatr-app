"use client";

import { useRouter } from "next/navigation";
import { deletePost } from "@/app/dashboard/compose/actions";
import { toast } from "sonner";
import { useState } from "react";

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    try {
      const result = await deletePost(postId);
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Delete failed");
        return;
      }
      toast.success("Post deleted");
      router.push("/dashboard/posts");
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-xl border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}

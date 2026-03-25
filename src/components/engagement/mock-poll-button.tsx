"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MockPollButton({ 
  workspaceId, 
  disabled 
}: { 
  workspaceId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [isPolling, setIsPolling] = useState(false);

  const handlePoll = async () => {
    setIsPolling(true);
    try {
      const res = await fetch(`/api/mock/poll-comments?workspaceId=${workspaceId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to poll");
      }

      toast.success(data.message || "New comment received!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error generating mock comment");
    } finally {
      setIsPolling(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handlePoll}
        disabled={isPolling || disabled}
        className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        {isPolling ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            Polling...
          </span>
        ) : (
          <span>⬇️ Generate Mock Comment</span>
        )}
      </button>
      {disabled && (
        <span className="text-[10px] text-muted-foreground">
          Requires a published post
        </span>
      )}
    </div>
  );
}

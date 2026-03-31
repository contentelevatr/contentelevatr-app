"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Platform } from "@/lib/platforms/types";
import { PLATFORM_CHAR_LIMITS } from "@/lib/platforms/types";
import { PlatformToggle } from "./platform-toggle";
import { PlatformPreview } from "./platform-preview";
import { AIGenerateDialog } from "./ai-generate-dialog";
import { AIReviewDialog } from "./ai-review-dialog";
import { TimePicker } from "@/components/schedule/time-picker";
import { createPost, schedulePost } from "@/app/dashboard/compose/actions";
import { Sparkles, Search, CalendarPlus, Check } from "lucide-react";
import { toast } from "sonner";

const ALL_PLATFORMS: Platform[] = [
  "linkedin",
  "twitter",
  "instagram",
  "threads",
  "medium",
  "reddit",
  "facebook",
  "pinterest",
  "youtube",
];

interface ComposeEditorProps {
  connectedPlatforms: Platform[];
}

export function ComposeEditor({ connectedPlatforms }: ComposeEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [platformContent, setPlatformContent] = useState<
    Partial<Record<Platform, string>>
  >({});
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  const handleApplyDraft = useCallback((platform: Platform, newContent: string) => {
    setPlatformContent((prev) => ({ ...prev, [platform]: newContent }));
  }, []);

  const handleTogglePlatform = useCallback((platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }, []);

  const handleAIGenerated = useCallback(
    (variants: Partial<Record<Platform, string>>) => {
      setPlatformContent(variants);
      const firstKey = Object.keys(variants)[0] as Platform | undefined;
      if (firstKey && variants[firstKey]) {
        setContent(variants[firstKey]);
      }
      toast.success("Content generated successfully!");
    },
    []
  );

  const handleSaveDraft = useCallback(async () => {
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    setIsSaving(true);
    try {
      const result = await createPost({
        content,
        platforms: selectedPlatforms,
        platformContent,
        status: "draft",
      });

      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Validation error");
        return;
      }

      toast.success("Draft saved!");
      router.push("/dashboard/posts");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  }, [content, selectedPlatforms, platformContent, router]);

  const handleSchedule = useCallback(async () => {
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }
    if (!scheduledAt) {
      toast.error("Please select a schedule time");
      return;
    }

    setIsSaving(true);
    try {
      const result = await schedulePost({
        content,
        platforms: selectedPlatforms,
        platformContent,
        scheduledAt: scheduledAt.toISOString(),
      });

      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Validation error");
        return;
      }

      toast.success("Post scheduled!");
      router.push("/dashboard/schedule");
    } catch {
      toast.error("Failed to schedule post");
    } finally {
      setIsSaving(false);
    }
  }, [content, selectedPlatforms, platformContent, scheduledAt, router]);

  const shortestLimit =
    selectedPlatforms.length > 0
      ? Math.min(...selectedPlatforms.map((p) => PLATFORM_CHAR_LIMITS[p]))
      : 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left column: Editor */}
      <div className="flex-1 space-y-6">
        {/* Platform selection */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Publish to
          </h3>
          <PlatformToggle
            platforms={ALL_PLATFORMS}
            connectedPlatforms={connectedPlatforms}
            selectedPlatforms={selectedPlatforms}
            onToggle={handleTogglePlatform}
          />
        </div>

        {/* Content editor */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Content</h3>
            <button
              type="button"
              onClick={() => setIsAIDialogOpen(true)}
              disabled={selectedPlatforms.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-3.5 w-3.5" /> AI Generate
            </button>
          </div>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? Write your post or click AI Generate..."
              className="min-h-[200px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              rows={8}
            />
            {shortestLimit > 0 && (
              <div className="absolute bottom-3 right-3">
                <span
                  className={`text-xs font-mono ${
                    content.length > shortestLimit
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {content.length}
                  {shortestLimit < 100000 ? `/${shortestLimit}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Schedule section */}
        {showScheduler && (
          <div className="rounded-xl border border-border bg-card p-4">
            <TimePicker
              value={scheduledAt}
              onChange={setScheduledAt}
              platform={selectedPlatforms[0]}
              contentPreview={content.substring(0, 200)}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsReviewDialogOpen(true)}
            disabled={!content.trim() || selectedPlatforms.length === 0}
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="h-4 w-4" /> Review Content
          </button>
          
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving || !content.trim()}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>

          {!showScheduler ? (
            <button
              type="button"
              onClick={() => setShowScheduler(true)}
              disabled={
                isSaving || !content.trim() || selectedPlatforms.length === 0
              }
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <CalendarPlus className="h-4 w-4" /> Schedule Post
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSchedule}
              disabled={
                isSaving ||
                !content.trim() ||
                selectedPlatforms.length === 0 ||
                !scheduledAt
              }
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? "Scheduling..." : <><Check className="h-4 w-4" /> Confirm Schedule</>}
            </button>
          )}
        </div>
      </div>

      {/* Right column: Preview */}
      <div className="w-full lg:w-96">
        <PlatformPreview
          platforms={selectedPlatforms}
          content={content}
          platformContent={platformContent}
        />
      </div>

      <AIGenerateDialog
        selectedPlatforms={selectedPlatforms}
        onGenerated={handleAIGenerated}
        isOpen={isAIDialogOpen}
        onClose={() => setIsAIDialogOpen(false)}
      />

      {/* AI Review Dialog */}
      <AIReviewDialog
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        content={content}
        selectedPlatforms={selectedPlatforms}
        onApplyDraft={handleApplyDraft}
      />
    </div>
  );
}

"use client";

import type { Platform } from "@/lib/platforms/types";
import { PLATFORM_CHAR_LIMITS, PLATFORM_DISPLAY_NAMES } from "@/lib/platforms/types";
import { PlatformIcon } from "@/components/ui/platform-icon";

interface PlatformPreviewProps {
  platforms: Platform[];
  content: string;
  platformContent: Partial<Record<Platform, string>>;
}

export function PlatformPreview({
  platforms,
  content,
  platformContent,
}: PlatformPreviewProps) {
  if (platforms.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border/50 p-8">
        <p className="text-sm text-muted-foreground">
          Select platforms to see preview
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
      {platforms.map((platform) => {
        const text = platformContent[platform] ?? content;
        const limit = PLATFORM_CHAR_LIMITS[platform];
        const charCount = text.length;
        const percentage = Math.min((charCount / limit) * 100, 100);
        const isOver = charCount > limit;

        return (
          <div
            key={platform}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Platform header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 bg-muted/30">
              <PlatformIcon platform={platform} />
              <span className="text-sm font-medium text-foreground">
                {PLATFORM_DISPLAY_NAMES[platform]}
              </span>
              <span
                className={`ml-auto text-xs font-mono ${
                  isOver
                    ? "text-destructive font-semibold"
                    : percentage > 80
                      ? "text-yellow-500"
                      : "text-muted-foreground"
                }`}
              >
                {charCount}/{limit}
              </span>
            </div>

            {/* Preview content */}
            <div className="p-4">
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {text || (
                  <span className="text-muted-foreground italic">
                    Start typing to see preview...
                  </span>
                )}
              </div>
            </div>

            {/* Character limit bar */}
            <div className="px-4 pb-3">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOver
                      ? "bg-destructive"
                      : percentage > 80
                        ? "bg-yellow-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

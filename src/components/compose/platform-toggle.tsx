"use client";

import { useState } from "react";
import type { Platform } from "@/lib/platforms/types";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/platforms/types";
import { PlatformIcon } from "@/components/ui/platform-icon";

interface PlatformToggleProps {
  platforms: Platform[];
  connectedPlatforms: Platform[];
  selectedPlatforms: Platform[];
  onToggle: (platform: Platform) => void;
}


export function PlatformToggle({
  platforms,
  connectedPlatforms,
  selectedPlatforms,
  onToggle,
}: PlatformToggleProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => {
        const isConnected = connectedPlatforms.includes(platform);
        const isSelected = selectedPlatforms.includes(platform);

        return (
          <button
            key={platform}
            type="button"
            onClick={() => isConnected && onToggle(platform)}
            disabled={!isConnected}
            className={`
              flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium
              transition-all duration-200
              ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : isConnected
                    ? "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent"
                    : "border-border/50 bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
              }
            `}
          >
            <PlatformIcon platform={platform} className="h-5 w-5" />
            <span>{PLATFORM_DISPLAY_NAMES[platform]}</span>
            {!isConnected && (
              <span className="text-xs text-muted-foreground">(not connected)</span>
            )}
            {isSelected && (
              <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

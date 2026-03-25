"use client";

import { useState } from "react";
import type { Platform } from "@/lib/platforms/types";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/platforms/types";
import { Sparkles, Clock } from "lucide-react";

interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  platform?: Platform;
  contentPreview?: string;
}

export function TimePicker({
  value,
  onChange,
  platform,
  contentPreview,
}: TimePickerProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    reason: string;
    timeSlot: string;
    dayOfWeek: string;
  } | null>(null);

  const dateValue = value
    ? new Date(value.getTime() - value.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      onChange(newDate);
    }
  };

  const handleSuggestBestTime = async () => {
    if (!platform) return;

    setIsSuggesting(true);
    setSuggestion(null);

    try {
      const response = await fetch("/api/ai/best-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          contentPreview,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      setSuggestion({
        reason: data.reason,
        timeSlot: data.timeSlot,
        dayOfWeek: data.dayOfWeek,
      });

      if (data.suggestedTime) {
        onChange(new Date(data.suggestedTime));
      }
    } catch {
      setSuggestion({
        reason: "Could not generate suggestion",
        timeSlot: "",
        dayOfWeek: "",
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  // Minimum date = now
  const minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label
            htmlFor="schedule-time"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Schedule for
          </label>
          <input
            id="schedule-time"
            type="datetime-local"
            value={dateValue}
            onChange={handleDateChange}
            min={minDate}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {platform && (
          <button
            type="button"
            onClick={handleSuggestBestTime}
            disabled={isSuggesting}
            className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2.5 text-xs font-medium text-white hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
          >
            {isSuggesting ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                AI...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Best Time
              </span>
            )}
          </button>
        )}
      </div>

      {/* AI suggestion */}
      {suggestion && suggestion.reason && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5" /> AI Suggestion
            {suggestion.dayOfWeek && suggestion.timeSlot && (
              <span className="ml-1 font-normal text-amber-600/80 dark:text-amber-400/80">
                — {suggestion.dayOfWeek} at {suggestion.timeSlot}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {suggestion.reason}
          </p>
        </div>
      )}

      {/* Quick time presets */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "In 1 hour", hours: 1 },
          { label: "Tomorrow 9 AM", preset: "tomorrow9" },
          { label: "Tomorrow 12 PM", preset: "tomorrow12" },
          { label: "Tomorrow 6 PM", preset: "tomorrow18" },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              let date: Date;
              if (preset.hours) {
                date = new Date(Date.now() + preset.hours * 60 * 60 * 1000);
              } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const hour =
                  preset.preset === "tomorrow9"
                    ? 9
                    : preset.preset === "tomorrow12"
                      ? 12
                      : 18;
                tomorrow.setHours(hour, 0, 0, 0);
                date = tomorrow;
              }
              onChange(date);
            }}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

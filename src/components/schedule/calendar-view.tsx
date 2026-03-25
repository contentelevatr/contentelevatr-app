"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import type { Platform } from "@/lib/platforms/types";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/platforms/types";
import { PlatformIcon } from "@/components/ui/platform-icon";

interface ScheduledPost {
  id: string;
  postId: string;
  platform: string;
  platformContent: string;
  scheduledAt: string;
  status: string;
  originalContent: string;
}

interface CalendarViewProps {
  scheduledPosts: ScheduledPost[];
}


const STATUS_DOT_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500",
  publishing: "bg-yellow-500",
  published: "bg-green-500",
  failed: "bg-red-500",
};

export function CalendarView({ scheduledPosts }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Group posts by date
  const postsByDate = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const post of scheduledPosts) {
      if (!post.scheduledAt) continue;
      const dateKey = format(new Date(post.scheduledAt), "yyyy-MM-dd");
      const existing = map.get(dateKey) ?? [];
      existing.push(post);
      map.set(dateKey, existing);
    }
    return map;
  }, [scheduledPosts]);

  const selectedDayPosts = selectedDate
    ? postsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? []
    : [];

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          ← Prev
        </button>
        <h3 className="text-lg font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDate.get(dateKey) ?? [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(day)}
              className={`
                min-h-[80px] p-1.5 text-left transition-colors
                ${isCurrentMonth ? "bg-card" : "bg-muted/30"}
                ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                ${isToday(day) ? "bg-primary/5" : ""}
                hover:bg-accent/50
              `}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    isToday(day)
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayPosts.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {dayPosts.length}
                  </span>
                )}
              </div>

              {/* Post indicators */}
              <div className="mt-1 space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] bg-muted/50"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        STATUS_DOT_COLORS[post.status] ?? "bg-muted-foreground"
                      }`}
                    />
                    <span className="truncate flex items-center gap-1">
                      <PlatformIcon platform={post.platform as Platform} className="h-2.5 w-2.5" />
                      {format(new Date(post.scheduledAt), "h:mm a")}
                    </span>
                  </div>
                ))}
                {dayPosts.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">
                    +{dayPosts.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h4>

          {selectedDayPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posts scheduled for this day.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDayPosts.map((post) => (
                <a
                  key={post.id}
                  href={`/dashboard/posts/${post.postId}`}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="shrink-0 text-lg flex items-center pt-0.5">
                    <PlatformIcon platform={post.platform as Platform} className="h-5 w-5 text-foreground/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-1">
                      {post.platformContent || post.originalContent || "No content"}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(post.scheduledAt), "h:mm a")}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          post.status === "published"
                            ? "bg-green-500/10 text-green-500"
                            : post.status === "failed"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-blue-500/10 text-blue-500"
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

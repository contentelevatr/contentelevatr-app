"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import type { Platform } from "@/lib/platforms/types";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/platforms/types";
import { toast } from "sonner";

interface AIReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  selectedPlatforms: Platform[];
  onApplyDraft: (platform: Platform, newContent: string) => void;
}

interface ReviewResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvedDraft: string;
}

export function AIReviewDialog({
  isOpen,
  onClose,
  content,
  selectedPlatforms,
  onApplyDraft,
}: AIReviewDialogProps) {
  const [activeTab, setActiveTab] = useState<Platform | null>(
    selectedPlatforms[0] || null
  );
  const [reviews, setReviews] = useState<Partial<Record<Platform, ReviewResult>>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    
    setIsAnalyzing(true);
    setReviews({});
    
    try {
      // Analyze concurrently for all platforms
      const promises = selectedPlatforms.map(async (platform) => {
        try {
          const res = await fetch("/api/ai/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, platform }),
          });
          if (!res.ok) throw new Error("Failed");
          const data = await res.json();
          return { platform, data };
        } catch (e) {
          return { platform, error: true };
        }
      });

      const results = await Promise.all(promises);
      const newReviews: Partial<Record<Platform, ReviewResult>> = {};
      
      for (const res of results) {
        if (!res.error && res.data) {
          newReviews[res.platform] = res.data;
        }
      }
      
      setReviews(newReviews);
      if (!activeTab && selectedPlatforms.length > 0) setActiveTab(selectedPlatforms[0]);
    } catch (e) {
      toast.error("Failed to fetch reviews");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open: boolean) => {
      if (!open) onClose();
      else if (Object.keys(reviews).length === 0) handleAnalyze();
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-xl border bg-background text-foreground shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-[700px] flex flex-col max-h-[90vh]">
          
          <div className="flex items-center justify-between border-b px-6 py-4">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Platform-Aware Review
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="flex bg-muted/30 px-6 pt-3 gap-6 border-b overflow-x-auto">
            {selectedPlatforms.map((platform) => (
              <button
                key={platform}
                onClick={() => setActiveTab(platform)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === platform
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {PLATFORM_DISPLAY_NAMES[platform]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Sparkles className="h-8 w-8 animate-pulse text-indigo-500 mb-4" />
                <p>Analyzing context for selected platforms...</p>
              </div>
            ) : activeTab && reviews[activeTab] ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border-4 ${reviews[activeTab]!.score >= 8 ? 'border-green-500 text-green-600' : reviews[activeTab]!.score >= 5 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'}`}>
                    <span className="text-xl font-bold">{reviews[activeTab]!.score}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none">/ 10</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Platform Suitability Score</h4>
                    <p className="text-sm text-muted-foreground">Based on {PLATFORM_DISPLAY_NAMES[activeTab]}'s algorithm and best practices.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-green-500/10 p-4 border border-green-500/20">
                    <h5 className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-400 mb-2">
                      <CheckCircle2 className="h-4 w-4" /> Strengths
                    </h5>
                    <ul className="text-sm text-green-800 dark:text-green-300 space-y-1 list-disc pl-4">
                      {reviews[activeTab]!.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/20">
                    <h5 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400 mb-2">
                      <AlertCircle className="h-4 w-4" /> Weaknesses
                    </h5>
                    <ul className="text-sm text-red-800 dark:text-red-300 space-y-1 list-disc pl-4">
                      {reviews[activeTab]!.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> AI Magic Draft
                    </h5>
                    <button
                      onClick={() => {
                        onApplyDraft(activeTab, reviews[activeTab]!.improvedDraft);
                        toast.success(`Applied improvements for ${PLATFORM_DISPLAY_NAMES[activeTab]}`);
                      }}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium shadow-sm"
                    >
                      Apply this draft
                    </button>
                  </div>
                  <p className="text-sm border-l-2 border-indigo-400 pl-3 py-1 whitespace-pre-wrap text-foreground/90">
                    {reviews[activeTab]!.improvedDraft}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <p>No review data available for this platform.</p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

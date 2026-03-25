"use client";

import { useState, useCallback } from "react";
import type { Platform } from "@/lib/platforms/types";

interface AIGenerateDialogProps {
  selectedPlatforms: Platform[];
  onGenerated: (variants: Partial<Record<Platform, string>>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AIGenerateDialog({
  selectedPlatforms,
  onGenerated,
  isOpen,
  onClose,
}: AIGenerateDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || selectedPlatforms.length === 0) return;

    setIsGenerating(true);
    setStreamedText("");
    setError(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          platforms: selectedPlatforms,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamedText(fullText);
      }

      // Parse the complete response as JSON
      const cleaned = fullText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      try {
        const parsed = JSON.parse(cleaned) as {
          variants: Partial<Record<Platform, string>>;
        };
        onGenerated(parsed.variants);
        onClose();
      } catch {
        // If JSON parsing fails, use the raw text for all platforms
        const variants: Partial<Record<Platform, string>> = {};
        for (const p of selectedPlatforms) {
          variants[p] = fullText;
        }
        onGenerated(variants);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedPlatforms, onGenerated, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              ✨ AI Content Generator
            </h2>
            <p className="text-sm text-muted-foreground">
              Powered by Google Gemini Flash
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Prompt input */}
        <div className="mb-4">
          <label htmlFor="ai-prompt" className="mb-1.5 block text-sm font-medium text-foreground">
            What do you want to post about?
          </label>
          <textarea
            id="ai-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Announce our new product launch, share tips about productivity, write about AI trends..."
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            rows={3}
            disabled={isGenerating}
          />
        </div>

        {/* Platform badges */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {selectedPlatforms.map((p) => (
            <span
              key={p}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {p}
            </span>
          ))}
        </div>

        {/* Streaming output */}
        {streamedText && (
          <div className="mb-4 max-h-48 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono">
              {streamedText}
            </pre>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || selectedPlatforms.length === 0}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                Generating...
              </>
            ) : (
              "✨ Generate"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

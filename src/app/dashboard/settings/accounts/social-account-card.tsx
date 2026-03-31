"use client";

import { useRouter } from "next/navigation";
import { disconnectAccount } from "./actions";
import { toast } from "sonner";
import { useState } from "react";
import Image from "next/image";
import type { Platform } from "@/lib/platforms/types";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/platforms/types";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SocialAccountCardProps {
  account?: {
    id: string;
    platform: string;
    accountName: string | null;
    accountAvatar: string | null;
    platformAccountId: string | null;
    tokenExpiresAt: string | null;
  };
  platform: Platform;
  isConnected: boolean;
}

const PLATFORM_COLORS: Record<Platform, string> = {
  linkedin: "from-blue-600 to-blue-700",
  twitter: "from-zinc-800 to-zinc-900",
  instagram: "from-pink-500 to-purple-600",
  threads: "from-zinc-700 to-zinc-800",
  medium: "from-green-700 to-green-800",
  reddit: "from-orange-500 to-red-500",
};

export function SocialAccountCard({
  account,
  platform,
  isConnected,
}: SocialAccountCardProps) {
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!account || !confirm(`Disconnect ${PLATFORM_DISPLAY_NAMES[platform]}?`))
      return;

    setIsDisconnecting(true);
    try {
      const result = await disconnectAccount(account.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${PLATFORM_DISPLAY_NAMES[platform]} disconnected`);
      router.refresh();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isExpired = account?.tokenExpiresAt
    ? new Date(account.tokenExpiresAt) < new Date()
    : false;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Platform header */}
      <div
        className={`bg-gradient-to-r ${PLATFORM_COLORS[platform]} px-4 py-3`}
      >
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} className="h-5 w-5 text-white" />
          <span className="text-sm font-semibold text-white">
            {PLATFORM_DISPLAY_NAMES[platform]}
          </span>
          {isConnected && (
            <CheckCircle2 className="ml-auto h-4 w-4 text-green-300" />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {isConnected && account ? (
          <div className="space-y-3">
            {/* Account info with avatar */}
            <div className="flex items-center gap-3">
              {account.accountAvatar ? (
                <img
                  src={account.accountAvatar}
                  alt={account.accountName ?? "Avatar"}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold ring-2 ring-border">
                  {account.accountName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {account.accountName ?? "Connected Account"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{account.platformAccountId ?? "unknown"}
                </p>
              </div>
            </div>

            {/* Status row */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isExpired ? "bg-amber-400" : "bg-green-400"}`} />
                <span className={`text-xs font-medium ${isExpired ? "text-amber-500" : "text-green-500"}`}>
                  {isExpired ? "Token Expired" : "Active"}
                </span>
              </div>
              {account.tokenExpiresAt && !isExpired && (
                <span className="text-[10px] text-muted-foreground">
                  Expires {new Date(account.tokenExpiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {isExpired && (
                <a
                  href={`/api/oauth/${platform}/authorize`}
                  className="flex-1 rounded-lg bg-primary py-1.5 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Reconnect
                </a>
              )}
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className={`${isExpired ? "" : "flex-1"} rounded-lg border border-destructive/30 py-1.5 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50`}
              >
                {isDisconnecting ? "..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4" />
              <p className="text-sm">Not connected</p>
            </div>
            {platform === "medium" ? (
              <MediumConnectDialog router={router} />
            ) : (
              <a
                href={`/api/oauth/${platform}/authorize`}
                className="block w-full rounded-lg bg-primary py-2 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Connect {PLATFORM_DISPLAY_NAMES[platform]}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MediumConnectDialog({ router }: { router: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/platforms/medium/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Medium connected successfully!");
      setIsOpen(false);
      setToken("");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to connect Medium");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<button className="block w-full rounded-lg bg-primary py-2 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors" />}>
        Connect Medium
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Medium</DialogTitle>
          <DialogDescription>
            Medium uses Integration Tokens for secure publishing. Follow the short steps below to connect your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-4 rounded-lg bg-muted/50 p-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium border">1</span>
              <div>
                Go to your <a href="https://medium.com/me/settings/security" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">Medium Settings <ArrowRight className="h-3 w-3 "/></a>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium border">2</span>
              <p>Scroll down to <strong>Integration Tokens</strong> and enter "ContentElevatr".</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium border">3</span>
              <p>Click <strong>Get Token</strong> and paste it below.</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="token">Integration Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="Paste your long base64-like token here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={!token.trim() || isSubmitting}>
            {isSubmitting ? "Connecting..." : "Connect Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


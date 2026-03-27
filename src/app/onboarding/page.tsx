"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WorkspaceType = "personal" | "agency";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!workspaceType || !workspaceName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: workspaceType,
          name: workspaceName.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create workspace");

      // Use a hard redirect instead of router.push to bypass Next.js client-side cache
      // This ensures the new setting cookies are fully read by the server on the next request.
      window.location.href = "/dashboard/settings/accounts";
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to ContentElevatr 🚀
          </h1>
          <p className="mt-2 text-muted-foreground">
            Let&apos;s set up your workspace
          </p>
        </div>

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                workspaceType === "personal" ? "border-primary ring-2 ring-primary/20" : ""
              }`}
              onClick={() => {
                setWorkspaceType("personal");
                setStep(2);
              }}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 text-4xl">👤</div>
                <CardTitle>Solo Creator</CardTitle>
                <CardDescription>
                  For individual creators and founders managing their own brand
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:border-primary ${
                workspaceType === "agency" ? "border-primary ring-2 ring-primary/20" : ""
              }`}
              onClick={() => {
                setWorkspaceType("agency");
                setStep(2);
              }}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 text-4xl">🏢</div>
                <CardTitle>Agency</CardTitle>
                <CardDescription>
                  For teams managing multiple client brands with role-based access
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>
                Name your {workspaceType === "agency" ? "agency" : "workspace"}
              </CardTitle>
              <CardDescription>
                You can always change this later in settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  placeholder={
                    workspaceType === "agency"
                      ? "e.g. Acme Marketing"
                      : "e.g. My Brand"
                  }
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!workspaceName.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Creating..." : "Create Workspace"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

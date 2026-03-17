"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  type: "personal" | "agency";
  role: "owner" | "admin" | "editor" | "viewer";
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === activeWorkspaceId) return;

    setIsLoading(true);
    try {
      await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-[200px] justify-start gap-2 truncate rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
        disabled={isLoading}
      >
          <span className="text-lg">
            {activeWorkspace?.type === "agency" ? "🏢" : "👤"}
          </span>
          <span className="truncate">
            {activeWorkspace?.name ?? "Select workspace"}
          </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => switchWorkspace(workspace.id)}
            className="flex items-center gap-2"
          >
            <span>{workspace.type === "agency" ? "🏢" : "👤"}</span>
            <span className="flex-1 truncate">{workspace.name}</span>
            {workspace.id === activeWorkspaceId && (
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/settings/workspaces/new")}
        >
          <span className="mr-2">+</span> New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

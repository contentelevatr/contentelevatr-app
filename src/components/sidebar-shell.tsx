"use client";

import { useState } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { SidebarNav } from "@/components/sidebar-nav";

interface SidebarShellProps {
  workspaces: any[];
  activeWorkspaceId: string | null;
}

export function SidebarShell({ workspaces, activeWorkspaceId }: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden flex-col border-r border-white/10 bg-slate-950 text-slate-50 md:flex transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className={`flex h-14 items-center ${collapsed ? "justify-center px-2" : "px-4"}`}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="ContentElevatr" width={28} height={28} className="shrink-0 rounded-md" />
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight">
              Content<span className="text-indigo-400">Elevatr</span>
            </span>
          )}
        </Link>
      </div>

      <Separator className="bg-white/10" />

      {/* Workspace Switcher */}
      {!collapsed && (
        <div className="p-3">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
          />
        </div>
      )}

      {!collapsed && <Separator className="bg-white/10" />}

      {/* Nav */}
      <SidebarNav collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
    </aside>
  );
}

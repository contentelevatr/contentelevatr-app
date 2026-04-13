"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import {
  LayoutDashboard,
  PenSquare,
  FileText,
  CalendarDays,
  MessageSquare,
  Link as LinkIcon,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Compose", href: "/dashboard/compose", icon: PenSquare },
  { label: "Posts", href: "/dashboard/posts", icon: FileText },
  { label: "Schedule", href: "/dashboard/schedule", icon: CalendarDays },
  { label: "Engagement", href: "/dashboard/engagement", icon: MessageSquare },
  { label: "Accounts", href: "/dashboard/settings/accounts", icon: LinkIcon },
  { label: "Team", href: "/dashboard/settings/team", icon: Users },
];

export function SidebarNav({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <nav className="flex flex-1 flex-col p-3">
      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname?.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={(e) => {
                if (isActive) return;
                e.preventDefault();
                startTransition(() => {
                  router.push(item.href);
                });
              }}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Contact Us */}
      <a
        href="mailto:contact@contentelevatr.com"
        target="_blank"
        rel="noopener noreferrer"
        title={collapsed ? "Contact Us" : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white border border-transparent transition-all duration-150 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <Mail className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Contact Us</span>}
      </a>

      {/* Collapse toggle at bottom */}
      <button
        onClick={onToggle}
        className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4 shrink-0 mx-auto" />
        ) : (
          <>
            <PanelLeftClose className="h-4 w-4 shrink-0" />
            <span>Collapse</span>
          </>
        )}
      </button>
    </nav>
  );
}

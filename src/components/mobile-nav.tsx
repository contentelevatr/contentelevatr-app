"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Menu } from "lucide-react";
import {
  LayoutDashboard,
  PenSquare,
  FileText,
  CalendarDays,
  MessageSquare,
  Link as LinkIcon,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Compose", href: "/dashboard/compose", icon: PenSquare },
  { label: "Posts", href: "/dashboard/posts", icon: FileText },
  { label: "Schedule", href: "/dashboard/schedule", icon: CalendarDays },
  { label: "Engagement", href: "/dashboard/engagement", icon: MessageSquare },
  { label: "Accounts", href: "/dashboard/settings/accounts", icon: LinkIcon },
  { label: "Team", href: "/dashboard/settings/team", icon: Users },
];

interface MobileNavProps {
  workspaces: any[];
  activeWorkspaceId: string | null;
}

export function MobileNav({ workspaces, activeWorkspaceId }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 border-white/10 bg-slate-950 p-0 text-slate-50"
      >
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="text-left">
            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              <Image
                src="/logo.png"
                alt="ContentElevatr"
                width={28}
                height={28}
              />
              <span className="text-xl font-bold tracking-tight text-white">
                Content
                <span className="text-indigo-400">Elevatr</span>
              </span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <Separator className="my-2 bg-white/10" />

        {/* Workspace Switcher */}
        <div className="px-4 py-2">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
          />
        </div>

        <Separator className="my-2 bg-white/10" />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-2">
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
                  e.preventDefault();
                  setOpen(false);
                  startTransition(() => {
                    router.push(item.href);
                  });
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30 shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

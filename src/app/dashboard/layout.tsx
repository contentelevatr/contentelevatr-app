import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser, getActiveWorkspaceId } from "@/lib/auth";
import { getWorkspacesForUser } from "@/lib/workspace";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarShell } from "@/components/sidebar-shell";
import { MobileNav } from "@/components/mobile-nav";
import Image from "next/image";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, activeWorkspaceId] = await Promise.all([
    getCurrentUser(),
    getActiveWorkspaceId(),
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  const workspaces = await getWorkspacesForUser(user.id);

  if (workspaces.length === 0) {
    redirect("/onboarding");
  }

  if (!activeWorkspaceId && workspaces.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Collapsible Sidebar */}
      <SidebarShell
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
            />
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <img src="/logo.png" alt="ContentElevatr" width={24} height={24} className="rounded-md" />
              <span className="text-lg font-bold">
                Content<span className="text-primary">Elevatr</span>
              </span>
            </Link>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

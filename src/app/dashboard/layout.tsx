import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser, getActiveWorkspaceId } from "@/lib/auth";
import { getWorkspacesForUser } from "@/lib/workspace";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  { label: "Compose", href: "/dashboard/compose", icon: "✏️" },
  { label: "Posts", href: "/dashboard/posts", icon: "📄" },
  { label: "Schedule", href: "/dashboard/schedule", icon: "📅" },
  { label: "Engagement", href: "/dashboard/engagement", icon: "💬" },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const workspaces = await getWorkspacesForUser(user.id);
  const activeWorkspaceId = await getActiveWorkspaceId();

  // If no workspaces, redirect to onboarding
  if (workspaces.length === 0) {
    redirect("/onboarding");
  }

  // If no active workspace set, default to first
  if (!activeWorkspaceId && workspaces.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Content<span className="text-primary">Elevatr</span>
          </Link>
        </div>

        <Separator />

        <div className="p-3">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
          />
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b px-6">
          <div className="md:hidden">
            <Link href="/dashboard" className="text-lg font-bold">
              Content<span className="text-primary">Elevatr</span>
            </Link>
          </div>
          <div className="flex-1" />
          <UserButton />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

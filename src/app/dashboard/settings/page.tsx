import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { LinkIcon, Users } from "lucide-react";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const settingsSections = [
    {
      title: "Connected Accounts",
      description: "Manage your social media platform connections.",
      href: "/dashboard/settings/accounts",
      icon: <LinkIcon className="h-5 w-5 text-indigo-400" />,
    },
    {
      title: "Team Members",
      description: "Invite and manage your team members.",
      href: "/dashboard/settings/team",
      icon: <Users className="h-5 w-5 text-indigo-400" />,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace preferences and integrations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {settingsSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
          >
            <div className="flex items-center gap-3 mb-2">
              {section.icon}
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {section.title}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

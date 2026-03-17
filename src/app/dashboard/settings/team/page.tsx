"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  id: string;
  userId: string;
  role: "owner" | "admin" | "editor" | "viewer";
  user: {
    name: string | null;
    email: string;
    imageUrl: string | null;
  };
}

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch("/api/workspace/members");
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadMembers();
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      if (res.ok) {
        setInviteEmail("");
        alert("Invitation sent!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send invite");
      }
    } finally {
      setIsInviting(false);
    }
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner": return "default" as const;
      case "admin": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Manage workspace members and invitations
        </p>
      </div>

      {/* Invite */}
      <Card>
        <CardHeader>
          <CardTitle>Invite a Team Member</CardTitle>
          <CardDescription>
            Send an email invitation to join this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="w-32 space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "admin" | "editor" | "viewer")
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                {isInviting ? "Sending..." : "Invite"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {member.user.name ?? member.user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  <Badge variant={roleBadgeVariant(member.role)}>
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

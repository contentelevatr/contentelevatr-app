import type { WorkspaceMember } from "@/lib/db/schema";

type Role = WorkspaceMember["role"];

type Action =
  | "manage_billing"
  | "manage_team"
  | "connect_accounts"
  | "create_post"
  | "edit_post"
  | "approve_reply"
  | "view_data";

const PERMISSIONS: Record<Action, Role[]> = {
  manage_billing: ["owner"],
  manage_team: ["owner", "admin"],
  connect_accounts: ["owner", "admin"],
  create_post: ["owner", "admin", "editor"],
  edit_post: ["owner", "admin", "editor"],
  approve_reply: ["owner", "admin", "editor"],
  view_data: ["owner", "admin", "editor", "viewer"],
};

export function checkPermission(role: Role, action: Action): boolean {
  return PERMISSIONS[action].includes(role);
}

export function requirePermission(role: Role, action: Action): void {
  if (!checkPermission(role, action)) {
    throw new Error(
      `Permission denied: role "${role}" cannot perform "${action}"`
    );
  }
}

export type { Action, Role };

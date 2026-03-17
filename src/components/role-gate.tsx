"use client";

import { checkPermission, type Action, type Role } from "@/lib/permissions";
import type { ReactNode } from "react";

interface RoleGateProps {
  role: Role;
  allow: Action;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ role, allow, children, fallback = null }: RoleGateProps) {
  if (!checkPermission(role, allow)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

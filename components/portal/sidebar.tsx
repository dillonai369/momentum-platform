"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  Trophy,
  GraduationCap,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Applications", href: "/applications", icon: FileText },
  { label: "Policies", href: "/policies", icon: ShieldCheck },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Trainings", href: "/trainings", icon: GraduationCap },
  { label: "Carriers", href: "/carriers", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

const ROLE_LABEL: Record<UserRole, string> = {
  platform_owner: "Platform Owner",
  agency_owner: "Agency Owner",
  agent: "Agent",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

export function Sidebar({
  userName,
  userRole,
  tenantName,
}: {
  userName: string;
  userRole: UserRole;
  tenantName: string;
}) {
  const pathname = usePathname();
  const initials = getInitials(userName);

  return (
    <aside className="flex h-screen w-64 flex-col bg-nav text-nav-text">
      {/* Brand */}
      <div className="flex h-20 items-center gap-2.5 border-b border-nav-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple text-white font-bold text-sm">
          M
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-base font-semibold tracking-tight text-white">
            {tenantName}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-nav-muted mt-0.5">
            Producer Portal
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-purple text-white shadow-sm"
                      : "text-nav-text hover:bg-nav-hover hover:text-white"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User card */}
      <div className="border-t border-nav-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-nav-hover transition-colors">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-9 w-9",
              },
            }}
            afterSignOutUrl="/sign-in"
          />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-white">
              {userName || initials}
            </span>
            <span className="truncate text-[11px] text-nav-muted">
              {ROLE_LABEL[userRole]} · {tenantName}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

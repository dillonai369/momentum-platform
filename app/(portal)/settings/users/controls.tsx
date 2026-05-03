"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@/lib/types";
import { changeUserRole, toggleUserActive } from "./actions";

export function RoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: UserRole;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const [role, setRole] = useState<UserRole>(currentRole);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={disabled || pending}
        onChange={(e) => {
          const next = e.target.value as UserRole;
          setRole(next);
          setErr(null);
          const fd = new FormData();
          fd.set("userId", userId);
          fd.set("role", next);
          start(async () => {
            const res = await changeUserRole(fd);
            if (!res.ok) {
              setErr(res.error || "Failed");
              setRole(currentRole);
            }
          });
        }}
        className="rounded-md border border-line bg-white px-2 py-1 text-xs text-ink disabled:opacity-50"
      >
        <option value="agent">Agent</option>
        <option value="agency_owner">Agency Owner</option>
        <option value="platform_owner">Platform Owner</option>
      </select>
      {pending && <span className="text-[10px] text-ink-faint">Saving…</span>}
      {err && <span className="text-[10px] text-danger">{err}</span>}
    </div>
  );
}

export function ActiveToggle({
  userId,
  active,
  disabled,
}: {
  userId: string;
  active: boolean;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const [isActive, setIsActive] = useState(active);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => {
          const next = !isActive;
          setIsActive(next);
          setErr(null);
          const fd = new FormData();
          fd.set("userId", userId);
          fd.set("active", String(next));
          start(async () => {
            const res = await toggleUserActive(fd);
            if (!res.ok) {
              setErr(res.error || "Failed");
              setIsActive(active);
            }
          });
        }}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? "bg-success" : "bg-line"} disabled:opacity-50`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-5" : "translate-x-1"}`}
        />
      </button>
      {pending && <span className="text-[10px] text-ink-faint">…</span>}
      {err && <span className="text-[10px] text-danger">{err}</span>}
    </div>
  );
}

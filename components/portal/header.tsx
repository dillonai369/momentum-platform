"use client";

import { Bell, Search } from "lucide-react";

export function Header({ title }: { title: string }) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-line bg-canvas px-8">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Search clients, policies, applications..."
            className="w-80 rounded-lg border border-line bg-surface pl-9 pr-4 py-2 text-sm placeholder:text-ink-faint focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
          />
        </div>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-canvas text-ink-soft hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-purple" />
        </button>
      </div>
    </header>
  );
}

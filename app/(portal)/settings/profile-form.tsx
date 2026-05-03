"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { updateProfile } from "./profile-actions";

export type CarrierOpt = { id: string; name: string };

export function ProfileForm({
  initial,
  carrierOptions,
}: {
  initial: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    states_licensed: string[];
    carriers: string[];
  };
  carrierOptions: CarrierOpt[];
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateProfile(fd);
      if (!res.ok) {
        setErr(res.error || "Failed");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First name</label>
          <input
            name="first_name"
            defaultValue={initial.first_name ?? ""}
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
          />
        </div>
        <div>
          <label className="label">Last name</label>
          <input
            name="last_name"
            defaultValue={initial.last_name ?? ""}
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="label">Phone</label>
        <input
          name="phone"
          type="tel"
          defaultValue={initial.phone ?? ""}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
          placeholder="(555) 555-5555"
        />
      </div>

      <div>
        <label className="label">Headshot URL</label>
        <input
          name="avatar_url"
          type="url"
          defaultValue={initial.avatar_url ?? ""}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
          placeholder="https://…"
        />
        <p className="mt-1 text-[11px] text-ink-faint">
          Direct image URL. (File upload to Supabase Storage coming next.)
        </p>
      </div>

      <div>
        <label className="label">Licensed states</label>
        <input
          name="states_licensed"
          defaultValue={(initial.states_licensed ?? []).join(", ")}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none uppercase"
          placeholder="FL, TX, GA, NC"
        />
        <p className="mt-1 text-[11px] text-ink-faint">
          Comma-separated 2-letter codes (e.g. FL, TX, GA).
        </p>
      </div>

      <div>
        <label className="label">Appointed carriers</label>
        <div className="mt-1 grid grid-cols-2 gap-2 rounded-md border border-line p-3 md:grid-cols-3">
          {carrierOptions.length === 0 && (
            <span className="text-xs text-ink-faint col-span-full">
              No carriers in your tenant yet — add some on the Carriers page.
            </span>
          )}
          {carrierOptions.map((c) => {
            const checked = initial.carriers?.includes(c.id);
            return (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded-md border border-line bg-white px-2 py-1.5 text-xs hover:border-purple/40"
              >
                <input
                  type="checkbox"
                  name="carriers"
                  value={c.id}
                  defaultChecked={checked}
                  className="h-3.5 w-3.5 rounded border-line text-purple focus:ring-purple"
                />
                <span className="text-ink">{c.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {err && (
        <div className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          {err}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Profile"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}

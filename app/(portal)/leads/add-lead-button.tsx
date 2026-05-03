"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { addLead } from "./actions";
import type { LeadStatus } from "@/lib/types";

const SOURCES = [
  "Manual",
  "Meta Lead Ad",
  "Referral",
  "Website Form",
  "Cold Outreach",
  "Walk-in",
];

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "booked", label: "Booked" },
  { value: "qualified", label: "Qualified" },
];

export function AddLeadButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await addLead(fd);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary inline-flex items-center gap-2"
      >
        <Plus className="h-4 w-4" /> Add Lead
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h3 className="text-base font-semibold text-ink">Add Lead</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-faint hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" name="first_name" required />
                <Field label="Last name" name="last_name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" name="email" type="email" />
                <Field label="Phone" name="phone" type="tel" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Source</label>
                  <select
                    name="source"
                    defaultValue="Manual"
                    className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Initial status</label>
                  <select
                    name="status"
                    defaultValue="new"
                    className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
                  placeholder="Anything you want to remember about this lead…"
                />
              </div>

              {err && (
                <div className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
                  {err}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-ink-subtle hover:bg-muted"
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-primary disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
      />
    </div>
  );
}

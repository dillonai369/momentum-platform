"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createApplication } from "./actions";
import type { ApplicationStatus, PolicyType } from "@/lib/types";

const POLICY_TYPES: { value: PolicyType; label: string }[] = [
  { value: "term_life", label: "Term Life" },
  { value: "whole_life", label: "Whole Life" },
  { value: "iul", label: "IUL" },
  { value: "annuity", label: "Annuity" },
  { value: "final_expense", label: "Final Expense" },
  { value: "mortgage_protection", label: "Mortgage Protection" },
  { value: "other", label: "Other" },
];

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "started", label: "Started (in-progress)" },
  { value: "submitted", label: "Submitted to carrier" },
  { value: "underwriting", label: "Underwriting" },
];

export type CarrierOption = { id: string; name: string };
export type LeadOption = { id: string; first_name: string; last_name: string };

export function NewApplicationButton({
  carriers,
  leads,
}: {
  carriers: CarrierOption[];
  leads: LeadOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createApplication(fd);
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
        <Plus className="h-4 w-4" /> New Application
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-6 py-4">
              <h3 className="text-base font-semibold text-ink">New Application</h3>
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
              {/* Optional lead link */}
              <div>
                <label className="label">Link to existing lead (optional)</label>
                <select
                  name="lead_id"
                  defaultValue=""
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
                >
                  <option value="">— Not linked to a lead —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.first_name} {l.last_name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-ink-faint">
                  If linked, the lead status will advance to &ldquo;Application Started&rdquo;.
                </p>
              </div>

              {/* Client */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client first name" name="client_first_name" required />
                <Field label="Client last name" name="client_last_name" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Age" name="client_age" type="number" />
                <Field label="Email" name="client_email" type="email" />
                <Field label="Phone" name="client_phone" type="tel" />
              </div>

              {/* Carrier + product */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">
                    Carrier<span className="text-danger"> *</span>
                  </label>
                  <select
                    name="carrier_id"
                    required
                    defaultValue=""
                    className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
                  >
                    <option value="" disabled>— Pick a carrier —</option>
                    {carriers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">
                    Product type<span className="text-danger"> *</span>
                  </label>
                  <select
                    name="policy_type"
                    required
                    defaultValue="term_life"
                    className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
                  >
                    {POLICY_TYPES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Money */}
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Annual premium ($)"
                  name="annual_premium"
                  type="number"
                  step="0.01"
                />
                <Field
                  label="Coverage amount ($)"
                  name="coverage_amount"
                  type="number"
                  step="1000"
                />
              </div>

              <div>
                <label className="label">Initial status</label>
                <select
                  name="status"
                  defaultValue="submitted"
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
                  placeholder="Anything to remember about this app…"
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
                  {pending ? "Saving…" : "Create Application"}
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
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
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
        step={step}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:border-purple focus:outline-none"
      />
    </div>
  );
}

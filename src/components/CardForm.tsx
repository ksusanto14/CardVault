"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CATEGORIES, CONDITIONS, GRADING_COMPANIES, parseCardForm, type Card } from "@/lib/cards";
import { addCard, updateCard } from "@/lib/store";

export function CardForm({ card, onClose }: { card: Card | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [gradingCompany, setGradingCompany] = useState(card?.grading_company ?? "Raw");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = parseCardForm(new FormData(e.currentTarget));
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    try {
      if (card) updateCard(card.id, parsed.data);
      else addCard(parsed.data);
      onClose();
    } catch {
      setError("Couldn't save. Your browser storage may be full or disabled.");
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-form-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 id="card-form-title" className="text-lg font-semibold">
            {card ? "Edit card" : "Add a card"}
          </h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-6">
          <Field label="Card name *" className="sm:col-span-4">
            <input name="name" required maxLength={200} defaultValue={card?.name} placeholder="e.g. Mickey Mantle, Charizard" className="input" autoFocus />
          </Field>
          <Field label="Category" className="sm:col-span-2">
            <select name="category" defaultValue={card?.category ?? "Baseball"} className="input">
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Set" className="sm:col-span-3">
            <input name="set_name" defaultValue={card?.set_name ?? ""} placeholder="e.g. 1952 Topps, Base Set" className="input" />
          </Field>
          <Field label="Year" className="sm:col-span-1">
            <input name="year" type="number" min={1800} max={2200} step={1} defaultValue={card?.year ?? ""} className="input" />
          </Field>
          <Field label="Card #" className="sm:col-span-2">
            <input name="card_number" defaultValue={card?.card_number ?? ""} placeholder="e.g. 311, 4/102" className="input" />
          </Field>

          <Field label="Condition" className="sm:col-span-2">
            <select name="condition" defaultValue={card?.condition ?? "Near Mint"} className="input">
              {CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Graded by" className="sm:col-span-2">
            <select name="grading_company" value={gradingCompany} onChange={(e) => setGradingCompany(e.target.value)} className="input">
              {GRADING_COMPANIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Grade" className="sm:col-span-2">
            <input
              name="grade"
              type="number"
              min={0}
              max={10}
              step={0.5}
              defaultValue={card?.grade ?? ""}
              disabled={gradingCompany === "Raw"}
              placeholder={gradingCompany === "Raw" ? "Ungraded" : "e.g. 9.5"}
              className="input disabled:opacity-50"
            />
          </Field>

          <Field label="Quantity" className="sm:col-span-2">
            <input name="quantity" type="number" min={1} step={1} defaultValue={card?.quantity ?? 1} className="input" />
          </Field>
          <Field label="Purchase price ($)" className="sm:col-span-2">
            <input name="purchase_price" type="number" min={0} step={0.01} defaultValue={card?.purchase_price ?? ""} className="input" />
          </Field>
          <Field label="Current value ($)" className="sm:col-span-2">
            <input name="current_value" type="number" min={0} step={0.01} defaultValue={card?.current_value ?? ""} className="input" />
          </Field>

          <Field label="Notes" className="sm:col-span-6">
            <textarea name="notes" rows={3} defaultValue={card?.notes ?? ""} placeholder="Where you got it, autographs, variants…" className="input" />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-6 dark:bg-red-950 dark:text-red-300">{error}</p>
          )}

          <div className="flex justify-end gap-2 sm:col-span-6">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {card ? "Save changes" : "Add card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

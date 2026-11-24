"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, CONDITIONS, formatMoney, type Card } from "@/lib/cards";
import { deleteCard, useCards, useIsClient } from "@/lib/store";
import { exportToExcel } from "@/lib/exportExcel";
import { CardForm } from "./CardForm";

type SortKey = "newest" | "name" | "value-desc" | "value-asc" | "year-desc" | "year-asc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest added" },
  { key: "name", label: "Name (A–Z)" },
  { key: "value-desc", label: "Value (high → low)" },
  { key: "value-asc", label: "Value (low → high)" },
  { key: "year-desc", label: "Year (new → old)" },
  { key: "year-asc", label: "Year (old → new)" },
];

const totalValue = (c: Card) => (c.current_value ?? 0) * c.quantity;
const totalCost = (c: Card) => (c.purchase_price ?? 0) * c.quantity;

export function CardVault() {
  const cards = useCards();
  const isClient = useIsClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("All");
  const [graded, setGraded] = useState<"All" | "Graded" | "Raw">("All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [editing, setEditing] = useState<Card | "new" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = cards.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (condition !== "All" && c.condition !== condition) return false;
      if (graded === "Graded" && c.grading_company === "Raw") return false;
      if (graded === "Raw" && c.grading_company !== "Raw") return false;
      if (!q) return true;
      return [c.name, c.set_name, c.card_number, c.notes, c.year?.toString()]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });

    const sorted = [...result];
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "value-desc":
        sorted.sort((a, b) => totalValue(b) - totalValue(a));
        break;
      case "value-asc":
        sorted.sort((a, b) => totalValue(a) - totalValue(b));
        break;
      case "year-desc":
        sorted.sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity));
        break;
      case "year-asc":
        sorted.sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity));
        break;
    }
    return sorted;
  }, [cards, query, category, condition, graded, sort]);

  const stats = useMemo(() => {
    const count = filtered.reduce((n, c) => n + c.quantity, 0);
    const value = filtered.reduce((n, c) => n + totalValue(c), 0);
    const cost = filtered.reduce((n, c) => n + totalCost(c), 0);
    const top = filtered.reduce<Card | null>(
      (best, c) => ((c.current_value ?? 0) > (best?.current_value ?? 0) ? c : best),
      null,
    );
    return { count, unique: filtered.length, value, cost, gain: value - cost, top };
  }, [filtered]);

  const isFiltered = query !== "" || category !== "All" || condition !== "All" || graded !== "All";

  function clearFilters() {
    setQuery("");
    setCategory("All");
    setCondition("All");
    setGraded("All");
  }

  function handleDelete(card: Card) {
    if (confirm(`Delete "${card.name}"? This can't be undone.`)) deleteCard(card.id);
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await exportToExcel(cards);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  // Cards are read from browser storage, so render nothing until we're in the browser.
  if (!isClient) return <div className="h-96" aria-busy="true" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Collection</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isFiltered ? "Stats reflect the current filters." : "All cards in your vault."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={cards.length === 0 || exporting}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "⬇ Export to Excel"}
          </button>
          <button type="button" onClick={() => setEditing("new")} className="btn-primary">
            + Add card
          </button>
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total cards" value={stats.count.toLocaleString()} hint={`${stats.unique} unique`} />
        <Stat label="Collection value" value={formatMoney(stats.value)} />
        <Stat
          label="Gain / loss"
          value={`${stats.gain >= 0 ? "+" : ""}${formatMoney(stats.gain)}`}
          hint={`Cost basis ${formatMoney(stats.cost)}`}
          tone={stats.gain > 0 ? "up" : stats.gain < 0 ? "down" : undefined}
        />
        <Stat
          label="Most valuable"
          value={stats.top ? formatMoney(stats.top.current_value) : "—"}
          hint={stats.top?.name ?? "No values yet"}
        />
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, set, number, notes…"
          className="input sm:min-w-64 sm:flex-1"
          aria-label="Search cards"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input sm:w-auto" aria-label="Category">
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={condition} onChange={(e) => setCondition(e.target.value)} className="input sm:w-auto" aria-label="Condition">
          <option value="All">All conditions</option>
          {CONDITIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={graded}
          onChange={(e) => setGraded(e.target.value as typeof graded)}
          className="input sm:w-auto"
          aria-label="Graded"
        >
          <option value="All">Graded &amp; raw</option>
          <option value="Graded">Graded only</option>
          <option value="Raw">Raw only</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input sm:w-auto" aria-label="Sort">
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        {isFiltered && (
          <button type="button" onClick={clearFilters} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            Clear
          </button>
        )}
      </section>

      {exportError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Couldn&apos;t export: {exportError}
        </p>
      )}

      {/* Card list */}
      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-4xl">🗃️</p>
          <p className="mt-3 font-medium">Your vault is empty</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Add your first card to start tracking your collection.</p>
          <button type="button" onClick={() => setEditing("new")} className="btn-primary mt-4">
            + Add your first card
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No cards match your filters.{" "}
          <button type="button" onClick={clearFilters} className="text-indigo-600 hover:underline dark:text-indigo-400">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Card</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Condition</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((card) => (
                <tr key={card.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{card.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {[card.year, card.set_name, card.card_number && `#${card.card_number}`].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{card.category}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {card.grading_company !== "Raw" ? (
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {card.grading_company} {card.grade ?? ""}
                      </span>
                    ) : (
                      card.condition
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{card.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(card.purchase_price)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(card.current_value)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setEditing(card)} className="mr-3 text-indigo-600 hover:underline dark:text-indigo-400">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(card)}
                      className="text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CardForm
          key={editing === "new" ? "new" : editing.id}
          card={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "up" | "down" }) {
  const color =
    tone === "up" ? "text-emerald-600 dark:text-emerald-400" : tone === "down" ? "text-red-600 dark:text-red-400" : "";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </div>
  );
}

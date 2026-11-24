export const CATEGORIES = [
  "Baseball",
  "Basketball",
  "Football",
  "Hockey",
  "Soccer",
  "Pokémon",
  "Magic: The Gathering",
  "Yu-Gi-Oh!",
  "One Piece",
  "Other",
] as const;

export const CONDITIONS = [
  "Gem Mint",
  "Mint",
  "Near Mint",
  "Excellent",
  "Very Good",
  "Good",
  "Fair",
  "Poor",
] as const;

export const GRADING_COMPANIES = ["Raw", "PSA", "BGS", "SGC", "CGC", "Other"] as const;

export type Card = {
  id: string;
  name: string;
  category: string;
  set_name: string | null;
  year: number | null;
  card_number: string | null;
  condition: string;
  grading_company: string;
  grade: number | null;
  quantity: number;
  purchase_price: number | null;
  current_value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CardInput = Omit<Card, "id" | "created_at" | "updated_at">;

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export type ParseResult = { ok: true; data: CardInput } | { ok: false; error: string };

/** Validates form data from the add/edit card form. */
export function parseCardForm(formData: FormData): ParseResult {
  const text = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const number = (key: string) => {
    const v = text(key);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const name = text("name");
  if (!name) return { ok: false, error: "Card name is required." };
  if (name.length > 200) return { ok: false, error: "Card name is too long." };

  const category = text("category") ?? "Other";
  if (!(CATEGORIES as readonly string[]).includes(category))
    return { ok: false, error: "Pick a valid category." };

  const condition = text("condition") ?? "Near Mint";
  if (!(CONDITIONS as readonly string[]).includes(condition))
    return { ok: false, error: "Pick a valid condition." };

  const grading_company = text("grading_company") ?? "Raw";
  if (!(GRADING_COMPANIES as readonly string[]).includes(grading_company))
    return { ok: false, error: "Pick a valid grading company." };

  const year = number("year");
  if (Number.isNaN(year) || (year !== null && (!Number.isInteger(year) || year < 1800 || year > 2200)))
    return { ok: false, error: "Year must be a whole number between 1800 and 2200." };

  const grade = grading_company === "Raw" ? null : number("grade");
  if (Number.isNaN(grade) || (grade !== null && (grade < 0 || grade > 10)))
    return { ok: false, error: "Grade must be between 0 and 10." };

  const quantity = number("quantity") ?? 1;
  if (Number.isNaN(quantity) || !Number.isInteger(quantity) || quantity < 1)
    return { ok: false, error: "Quantity must be a whole number of at least 1." };

  const purchase_price = number("purchase_price");
  const current_value = number("current_value");
  for (const [label, v] of [
    ["Purchase price", purchase_price],
    ["Current value", current_value],
  ] as const) {
    if (Number.isNaN(v) || (v !== null && v < 0))
      return { ok: false, error: `${label} must be a positive number.` };
  }

  return {
    ok: true,
    data: {
      name,
      category,
      set_name: text("set_name"),
      year,
      card_number: text("card_number"),
      condition,
      grading_company,
      grade,
      quantity,
      purchase_price,
      current_value,
      notes: text("notes"),
    },
  };
}

import { CATEGORIES, CONDITIONS, GRADING_COMPANIES, parseCardForm, type Card, type CardInput } from "./cards";

export type ImportedCard = { data: CardInput; created_at?: string };
export type ImportResult = { cards: ImportedCard[]; duplicates: number; errors: string[] };

/** Lowercase and strip spaces/punctuation so "Card #", "card number" and "CardNumber" compare loosely. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Spreadsheet column headers (normalized) → card form field. Includes the export's own headers. */
const HEADER_FIELDS: Record<string, string> = {
  name: "name",
  cardname: "name",
  player: "name",
  category: "category",
  sport: "category",
  game: "category",
  set: "set_name",
  setname: "set_name",
  year: "year",
  card: "card_number",
  cardnumber: "card_number",
  number: "card_number",
  no: "card_number",
  condition: "condition",
  gradedby: "grading_company",
  gradingcompany: "grading_company",
  grader: "grading_company",
  grade: "grade",
  qty: "quantity",
  quantity: "quantity",
  purchaseprice: "purchase_price",
  paid: "purchase_price",
  cost: "purchase_price",
  price: "purchase_price",
  currentvalue: "current_value",
  value: "current_value",
  notes: "notes",
  dateadded: "created_at",
};

/** Turns any ExcelJS cell value (rich text, formula, hyperlink, date…) into plain text. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as { richText?: { text: string }[]; result?: unknown; text?: unknown; error?: unknown };
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return cellText(v.result);
    if (v.text !== undefined) return cellText(v.text);
    return "";
  }
  return String(value).trim();
}

/** Matches "pokemon" → "Pokémon", "psa" → "PSA", etc. Leaves unknown values as-is so validation can report them. */
function canonical(value: string, options: readonly string[]) {
  const n = norm(value.normalize("NFD").replace(/[̀-ͯ]/g, ""));
  return (
    options.find((o) => norm(o.normalize("NFD").replace(/[̀-ͯ]/g, "")) === n) ?? value
  );
}

/** Same card details = duplicate, so re-importing an exported file doesn't double the collection. */
const cardKey = (c: CardInput) =>
  [c.name, c.category, c.set_name, c.year, c.card_number, c.condition, c.grading_company, c.grade]
    .map((v) => (v === null ? "" : norm(String(v))))
    .join("|");

/** Reads an .xlsx file and returns the valid cards, plus a message for each row it couldn't use. */
export async function importFromExcel(file: File, existing: Card[]): Promise<ImportResult> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error("That file isn't a readable .xlsx workbook. In Excel, use File → Save As → Excel Workbook (.xlsx).");
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no sheets.");

  // Find the header row (the first row with a "Name" column) within the first few rows.
  let headerRow = 0;
  const columns = new Map<number, string>();
  for (let r = 1; r <= Math.min(10, sheet.rowCount) && headerRow === 0; r++) {
    const found = new Map<number, string>();
    sheet.getRow(r).eachCell((cell, col) => {
      const field = HEADER_FIELDS[norm(cellText(cell.value))];
      if (field && ![...found.values()].includes(field)) found.set(col, field);
    });
    if ([...found.values()].includes("name")) {
      headerRow = r;
      found.forEach((f, c) => columns.set(c, f));
    }
  }
  if (headerRow === 0) throw new Error('Couldn\'t find a header row with a "Name" column in the first sheet.');

  const seen = new Set(existing.map(cardKey));
  const cards: ImportedCard[] = [];
  const errors: string[] = [];
  let duplicates = 0;

  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values: Record<string, string> = {};
    columns.forEach((field, col) => {
      values[field] = cellText(row.getCell(col).value);
    });

    if (Object.values(values).every((v) => v === "")) continue; // blank row
    if (norm(values.name ?? "") === "total") continue; // the export's TOTAL row

    if (values.category) values.category = canonical(values.category, CATEGORIES);
    if (values.condition) values.condition = canonical(values.condition, CONDITIONS);
    if (values.grading_company) values.grading_company = canonical(values.grading_company, GRADING_COMPANIES);
    for (const key of ["purchase_price", "current_value"]) {
      if (values[key]) values[key] = values[key].replace(/[$,\s]/g, "");
    }

    const form = new FormData();
    for (const [k, v] of Object.entries(values)) if (k !== "created_at") form.set(k, v);
    const parsed = parseCardForm(form);
    if (!parsed.ok) {
      errors.push(`Row ${r}${values.name ? ` (${values.name})` : ""}: ${parsed.error}`);
      continue;
    }

    const key = cardKey(parsed.data);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);

    const added = values.created_at ? new Date(values.created_at) : null;
    cards.push({
      data: parsed.data,
      created_at: added && !Number.isNaN(added.getTime()) ? added.toISOString() : undefined,
    });
  }

  return { cards, duplicates, errors };
}

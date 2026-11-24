import type { Card } from "./cards";

/** Builds an .xlsx file of the collection in the browser and downloads it. */
export async function exportToExcel(cards: Card[]) {
  // Loaded only when needed so the page itself stays fast.
  const { default: ExcelJS } = await import("exceljs");

  const sorted = [...cards].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CardVault";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Collection", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const money = '"$"#,##0.00';
  sheet.columns = [
    { header: "Name", key: "name", width: 30 },
    { header: "Category", key: "category", width: 20 },
    { header: "Set", key: "set_name", width: 24 },
    { header: "Year", key: "year", width: 8 },
    { header: "Card #", key: "card_number", width: 10 },
    { header: "Condition", key: "condition", width: 12 },
    { header: "Graded By", key: "grading_company", width: 11 },
    { header: "Grade", key: "grade", width: 8 },
    { header: "Qty", key: "quantity", width: 6 },
    { header: "Purchase Price", key: "purchase_price", width: 15, style: { numFmt: money } },
    { header: "Current Value", key: "current_value", width: 15, style: { numFmt: money } },
    { header: "Total Value", key: "total_value", width: 15, style: { numFmt: money } },
    { header: "Gain / Loss", key: "gain", width: 15, style: { numFmt: money } },
    { header: "Notes", key: "notes", width: 40 },
    { header: "Date Added", key: "created_at", width: 14, style: { numFmt: "yyyy-mm-dd" } },
  ];

  for (const c of sorted) {
    const total = c.current_value === null ? null : c.current_value * c.quantity;
    const cost = c.purchase_price === null ? null : c.purchase_price * c.quantity;
    sheet.addRow({
      ...c,
      grade: c.grading_company === "Raw" ? null : c.grade,
      total_value: total,
      gain: total !== null && cost !== null ? total - cost : null,
      created_at: new Date(c.created_at),
    });
  }

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  sheet.autoFilter = { from: "A1", to: { row: 1, column: sheet.columns.length } };

  if (sorted.length > 0) {
    const last = sorted.length + 1;
    const totals = sheet.addRow({
      name: "TOTAL",
      quantity: { formula: `SUM(I2:I${last})` },
      total_value: { formula: `SUM(L2:L${last})` },
      gain: { formula: `SUM(M2:M${last})` },
    });
    totals.font = { bold: true };
    totals.border = { top: { style: "thin" } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cardvault-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

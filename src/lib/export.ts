import * as XLSX from "xlsx";

/**
 * Generate and download an .xlsx file in the browser.
 *
 * @param filename - File name (with or without .xlsx extension)
 * @param headers  - Column headers (first row of the sheet)
 * @param rows     - 2D array of cell values
 */
export function exportToExcel(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const aoa: (string | number | null | undefined)[][] = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto column widths
  ws["!cols"] = headers.map((h, i) => {
    let max = String(h ?? "").length;
    for (const row of rows) {
      const v = row[i];
      const len = v == null ? 0 : String(v).length;
      if (len > max) max = len;
    }
    return { wch: Math.min(Math.max(max + 2, 10), 50) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");

  const name = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}

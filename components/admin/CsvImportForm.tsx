"use client";

import { useState } from "react";
import { bulkImportProducts, type BulkImportResult, type ImportRow } from "@/lib/admin/products-import";

const TEMPLATE_CSV = `name,brand,model,sku,category,actual_price,special_price,stock,status,bluetooth,is_featured,description,compatible_devices,whats_in_box
Sample Earbuds,Acme,X100,SKU-001,Earbuds,2500,,50,draft,true,false,"Comfortable wireless earbuds with long battery life.",iPhone;Android,Earbuds;USB-C cable;Manual
`;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

function csvToRows(text: string): ImportRow[] {
  const parsed = parseCsv(text);
  if (parsed.length === 0) return [];
  const headers = parsed[0].map((h) => h.trim().toLowerCase());
  return parsed.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? "";
    });
    return row as ImportRow;
  });
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CsvImportForm() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setRows(csvToRows(String(reader.result ?? "")));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setPending(true);
    const importResult = await bulkImportProducts(rows);
    setPending(false);
    setResult(importResult);
    setRows([]);
    setFileName("");
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => downloadBlob(TEMPLATE_CSV, "trendymall-products-template.csv", "text/csv")}
        className="self-start rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
      >
        Download CSV template
      </button>

      <div className="flex flex-col gap-1">
        <label htmlFor="csv-file" className="text-sm font-medium">
          Choose CSV file
        </label>
        <input id="csv-file" type="file" accept=".csv,text/csv" onChange={handleFile} />
      </div>

      {fileName && (
        <p className="text-sm text-[var(--muted)]">
          {fileName} — {rows.length} row{rows.length === 1 ? "" : "s"} ready to import
        </p>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={rows.length === 0 || pending}
        className="self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Importing…" : "Import products"}
      </button>

      {result && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4 text-sm">
          <p className="font-medium">
            {result.successCount} product{result.successCount === 1 ? "" : "s"} imported.
          </p>
          {result.errors.length > 0 && (
            <>
              <p className="mt-2 font-medium text-red-600">
                {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped:
              </p>
              <ul className="mt-1 list-disc pl-5 text-[var(--muted)]">
                {result.errors.map((err) => (
                  <li key={err.row}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

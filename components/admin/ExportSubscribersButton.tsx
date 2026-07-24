"use client";

export function ExportSubscribersButton({ emails }: { emails: string[] }) {
  function handleExport() {
    const csv = ["email", ...emails].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "subscribers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={emails.length === 0}
      className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50"
    >
      Export CSV
    </button>
  );
}

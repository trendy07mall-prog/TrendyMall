"use client";

const TEMPLATE_CSV = `name,brand,model,sku,category,actual_price,special_price,stock,status,bluetooth,is_featured,description,compatible_devices,whats_in_box
Sample Earbuds,Acme,X100,SKU-001,Earbuds,2500,,50,draft,true,false,"Comfortable wireless earbuds with long battery life.",iPhone;Android,Earbuds;USB-C cable;Manual
`;

export function DownloadTemplateButton() {
  function handleDownload() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trendymall-products-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="transition-brand rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5"
    >
      Download CSV template
    </button>
  );
}

import { createClient } from "@/lib/supabase/server";

// Read-only — the actual gate is order_error_log's own RLS
// (order_error_log_select_admin, sql/036), same as every other admin
// listing page in this app; app/admin/layout.tsx's redirect is the UI
// convenience, not the security boundary.
export default async function AdminDebugPage() {
  const supabase = await createClient();
  const { data: errors } = await supabase
    .from("order_error_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = errors ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Order Error Log
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        The last {rows.length} unexpected order-creation error{rows.length === 1 ? "" : "s"} — every
        one a customer would have seen only as a generic message plus the reference code shown here.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">No errors logged.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-[var(--radius-md)] border border-[var(--border)] p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-medium">{row.reference_code}</span>
                <span className="text-[var(--muted)]">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2">
                <span className="font-medium">Code:</span> {row.error_code ?? "—"}
              </p>
              <p className="mt-1">
                <span className="font-medium">Message:</span> {row.error_message ?? "—"}
              </p>
              {row.error_detail && (
                <p className="mt-1">
                  <span className="font-medium">Detail:</span> {row.error_detail}
                </p>
              )}
              {row.error_hint && (
                <p className="mt-1">
                  <span className="font-medium">Hint:</span> {row.error_hint}
                </p>
              )}
              {row.context !== null && row.context !== undefined && (
                <pre className="mt-2 overflow-x-auto rounded-[var(--radius-sm)] bg-black/5 p-2 text-xs">
                  {JSON.stringify(row.context, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

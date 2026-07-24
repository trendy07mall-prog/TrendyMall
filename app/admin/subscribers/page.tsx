import { createClient } from "@/lib/supabase/server";
import { ExportSubscribersButton } from "@/components/admin/ExportSubscribersButton";

export default async function AdminSubscribersPage() {
  const supabase = await createClient();
  const { data: subscribers } = await supabase
    .from("subscribers")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = subscribers ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Subscribers
        </h1>
        <ExportSubscribersButton emails={rows.map((s) => s.email)} />
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {rows.length} subscriber{rows.length === 1 ? "" : "s"}
      </p>
      <ul className="mt-6 flex flex-col gap-2">
        {rows.map((subscriber) => (
          <li
            key={subscriber.id}
            className="flex justify-between border-b border-[var(--border)] py-2 text-sm"
          >
            <span>{subscriber.email}</span>
            <span className="text-[var(--muted)]">
              {new Date(subscriber.created_at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

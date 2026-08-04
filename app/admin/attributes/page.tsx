import { getAllAttributesWithValues } from "@/lib/data/attributes";
import { AttributeList } from "@/components/admin/AttributeList";

export default async function AdminAttributesPage() {
  const attributesWithValues = await getAllAttributesWithValues();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Attributes</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Define product attributes like Color, Size, or Storage — their values become filters on the storefront.
      </p>
      <div className="mt-6">
        <AttributeList attributesWithValues={attributesWithValues} />
      </div>
    </div>
  );
}

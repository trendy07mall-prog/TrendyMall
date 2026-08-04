import { getAllTemplatesWithFields } from "@/lib/data/spec-templates";
import { SpecTemplateList } from "@/components/admin/SpecTemplateList";

export default async function AdminSpecTemplatesPage() {
  const templatesWithFields = await getAllTemplatesWithFields();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Spec Templates</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Define which specification fields apply to each category, then assign a template on the category&apos;s edit page.
      </p>
      <div className="mt-6">
        <SpecTemplateList templatesWithFields={templatesWithFields} />
      </div>
    </div>
  );
}

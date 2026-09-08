"use client";

// One band of the product form's single card. The divider lives on the
// section rather than between sections so the last one can drop it without
// the parent having to know how many there are.
export function FormSection({
  id,
  title,
  description,
  last = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      // Read by ProductForm's focus handler to work out which section the
      // admin is currently in, for the progress strip.
      data-section={id}
      aria-labelledby={id + "-heading"}
      className={
        "px-5 py-7 sm:px-8 " + (last ? "" : "border-b border-[var(--border)]")
      }
    >
      <h2 id={id + "-heading"} className="text-base font-semibold">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-[13px] text-[var(--pf-text-2)]">{description}</p>
      )}
      <div className="mt-5 flex flex-col gap-6">{children}</div>
    </section>
  );
}

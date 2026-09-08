"use client";

export interface SectionProgress {
  id: string;
  label: string;
  complete: boolean;
}

// A readout of the form's own validity, not a validator. "Complete" here
// means the required fields that section already had are filled in -- no
// section is a gate, nothing is blocked on it, and the submit button does
// not consult it. Its only job is to make a long form's shape legible while
// scrolling.
export function ProgressStrip({
  sections,
  activeId,
}: {
  sections: SectionProgress[];
  activeId: string | null;
}) {
  return (
    <nav
      aria-label="Form sections"
      className="sticky top-0 z-20 -mx-5 mb-4 flex flex-wrap gap-x-6 gap-y-2 border-b border-[var(--border)] bg-[var(--background)]/95 px-5 py-3 backdrop-blur sm:mx-0 sm:rounded-t-[var(--radius-md)] sm:px-1"
    >
      {sections.map((section) => {
        const active = section.id === activeId;
        return (
          <a
            key={section.id}
            href={"#" + section.id + "-heading"}
            aria-current={active ? "step" : undefined}
            className={
              "flex items-center gap-2 text-[13px] transition-colors " +
              (active
                ? "font-medium text-[var(--pf-navy)] underline underline-offset-4"
                : section.complete
                  ? "text-[var(--pf-navy)]"
                  : "text-[var(--pf-text-3)]")
            }
          >
            <span
              aria-hidden="true"
              className={
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] leading-none " +
                (section.complete
                  ? "bg-[var(--pf-navy)] text-white"
                  : "border border-current")
              }
            >
              {section.complete ? "✓" : ""}
            </span>
            {section.label}
            <span className="sr-only">
              {section.complete ? " — complete" : " — not yet complete"}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

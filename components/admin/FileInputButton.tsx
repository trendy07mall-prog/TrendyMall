import type { InputHTMLAttributes } from "react";

// Every admin file/image upload used to render the browser's own default
// "Choose File" control -- plain, unstyled, inconsistent with the rest of
// the admin UI's buttons. This wraps a native <input type="file"> so it
// always renders as a proper button instead: the input itself keeps every
// prop callers already pass (onChange, accept, multiple, required, id,
// disabled, ...) completely unchanged -- it's only visually hidden
// (sr-only, not display:none/hidden, so it stays keyboard-focusable and
// operable, and a native "required" validation popup still has a real
// element to anchor to) and triggered via the styled <label> wrapping it.
// Same label-wraps-hidden-input technique RichTextEditor.tsx's own toolbar
// "Image" button already used -- this just gives every OTHER file input in
// admin that same treatment, styled to match the secondary/outline pill
// buttons already used elsewhere in admin (e.g. DownloadTemplateButton,
// VariantsEditor's "+ Add color variant").
export function FileInputButton({
  label,
  className = "",
  ...inputProps
}: {
  label: string;
  // Applies to the visible <label> button, not the hidden input -- kept
  // separate so callers can't accidentally style over the sr-only input.
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  return (
    <label
      className={`transition-brand inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium ${
        inputProps.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-black/5"
      } ${className}`}
    >
      {label}
      <input type="file" className="sr-only" {...inputProps} />
    </label>
  );
}

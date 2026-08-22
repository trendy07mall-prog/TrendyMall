// One shared marker so every required field's asterisk is identical --
// same red, same size, same spacing from the label text. aria-hidden
// because it's purely decorative; the actual accessible "this is required"
// signal is the input's own aria-required/required attribute, not this
// character.
export function RequiredMark() {
  return (
    <span className="text-[var(--color-error)]" aria-hidden="true">
      {" *"}
    </span>
  );
}

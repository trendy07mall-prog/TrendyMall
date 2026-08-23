// No profile-image upload exists anywhere in this codebase (confirmed by
// audit) — an initials avatar avoids building new upload infrastructure
// just for this UI pass. Initials: first letter of the first two words in
// full_name (e.g. "Jane Doe" -> "JD", "Jane" -> "J"), uppercased.
function getInitials(fullName: string | null | undefined): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const initials = words.slice(0, 2).map((w) => w[0]);
  return initials.join("").toUpperCase();
}

export function AccountAvatar({
  fullName,
  size = "md",
}: {
  fullName: string | null | undefined;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--color-navy)] font-semibold text-white ${sizeClass}`}
    >
      {getInitials(fullName)}
    </span>
  );
}

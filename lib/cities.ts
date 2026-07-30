// City list backing the searchable city combobox (Phase 0 of the Checkout
// Redesign, v12) — used by both the checkout form and the customer address
// form (Phase 1), built once here rather than duplicated. This is purely
// the UI-facing list; the actual "does this city get the discounted
// delivery rate" decision lives in lib/shipping-rates.ts via a pattern
// match, not a lookup against this array, so a city typed here in a
// slightly different format (extra space, no leading zero) still prices
// correctly.

export const COLOMBO_CITY_ZONES = [
  "Colombo 01", "Colombo 02", "Colombo 03", "Colombo 04", "Colombo 05",
  "Colombo 06", "Colombo 07", "Colombo 08", "Colombo 09", "Colombo 10",
  "Colombo 11", "Colombo 12", "Colombo 13", "Colombo 14", "Colombo 15",
] as const;

// Common towns/cities outside the Colombo 01-15 postal zones — including,
// deliberately, several towns within Colombo District itself (Dehiwala,
// Moratuwa, Kaduwela, Homagama, Maharagama, etc.) so the list doesn't imply
// "Colombo District = cheap rate", which was the exact bug this phase fixes.
export const OTHER_CITIES = [
  "Dehiwala", "Moratuwa", "Kaduwela", "Homagama", "Maharagama", "Nugegoda",
  "Sri Jayawardenepura Kotte", "Negombo", "Gampaha", "Kalutara", "Panadura",
  "Kandy", "Matale", "Nuwara Eliya", "Galle", "Matara", "Hambantota",
  "Jaffna", "Vavuniya", "Batticaloa", "Trincomalee", "Kurunegala",
  "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla", "Monaragala",
  "Ratnapura", "Kegalle",
] as const;

export const SRI_LANKAN_CITIES: readonly string[] = [
  ...COLOMBO_CITY_ZONES,
  ...OTHER_CITIES,
];

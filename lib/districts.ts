// Sri Lanka's 25 districts — address completeness only, never used for
// delivery pricing (see lib/shipping-rates.ts). Matches the `district`
// check constraint on shipping_addresses (sql/020) and customer_addresses
// (sql/030) verbatim; keep in sync by hand if it ever changes.
export const SRI_LANKAN_DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
  "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Monaragala", "Ratnapura", "Kegalle",
] as const;

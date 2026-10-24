// The homepage campaign section's background colour (campaigns
// .section_bg_color, sql/106), picked per campaign in admin. Pure, so the
// storefront section and the admin form agree on what's valid and on which
// text colour stays readable on it.

export const DEFAULT_SECTION_BG = "#dc2626";

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value);
}

// WCAG relative luminance of a #rrggbb colour, 0 (black) to 1 (white).
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// White or near-black, whichever reads better on the background: the
// section's own words (title, View All, "Ends in") sit straight on it, so
// an admin picking a pale colour must not leave white text on it.
export function sectionInk(background: string): "#ffffff" | "#111111" {
  const bg = luminance(background);
  return contrast(bg, 1) >= contrast(bg, luminance("#111111")) ? "#ffffff" : "#111111";
}

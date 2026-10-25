// Storefront dark / light mode.
//
// The choice lives in localStorage under THEME_STORAGE_KEY. With nothing
// saved, the site follows the device's own setting. It is applied as
// data-theme on <html>, which app/globals.css reads. The admin panel is
// always light: it never gets the attribute.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "tm-theme";
export const THEME_CHANGE_EVENT = "tm-theme-change";

export function isAdminPath(pathname: string | null | undefined): boolean {
  return !!pathname && pathname.startsWith("/admin");
}

// Runs inline in <head> before the first paint, so a dark-mode visitor
// never sees a white flash. Kept in sync with resolveTheme() below by
// hand: it cannot import anything.
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement;if(location.pathname.indexOf("/admin")===0){d.removeAttribute("data-theme");return}var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.setAttribute("data-theme",t)}catch(e){}})()`;

export function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

export function resolveTheme(): Theme {
  const saved = readSavedTheme();
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme | null) {
  const root = document.documentElement;
  if (theme) root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

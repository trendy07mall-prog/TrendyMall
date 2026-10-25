"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyTheme, isAdminPath, readSavedTheme, resolveTheme } from "@/lib/theme";

// The inline script in app/layout.tsx sets the theme on a full page load.
// This keeps it right after that: client-side navigation into or out of
// /admin (which is always light), and a visitor who never picked a theme
// changing their device between light and dark while the tab is open.
export function ThemeController() {
  const pathname = usePathname();
  const admin = isAdminPath(pathname);

  useEffect(() => {
    applyTheme(admin ? null : resolveTheme());
    if (admin) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onDeviceChange() {
      if (!readSavedTheme()) applyTheme(resolveTheme());
    }
    media.addEventListener("change", onDeviceChange);
    return () => media.removeEventListener("change", onDeviceChange);
  }, [admin]);

  return null;
}

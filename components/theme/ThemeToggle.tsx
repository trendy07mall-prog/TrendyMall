"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

// The server cannot know the visitor's theme, so it renders "light" and
// React swaps in the real value right after hydration. The knob position
// itself is pure CSS off html[data-theme] (globals.css, .theme-toggle), so
// it is already correct on the very first paint.
function serverTheme(): Theme {
  return "light";
}

export function ThemeToggle({ className = "", label = false }: { className?: string; label?: boolean }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, serverTheme);
  const dark = theme === "dark";

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode: the switch still works for this page view.
    }
    applyTheme(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={toggle}
      className={`group flex min-h-11 items-center gap-3 ${className}`}
    >
      {label && <span className="flex-1 text-left">Dark mode</span>}
      <span className="theme-toggle relative flex h-8 w-14 shrink-0 items-center rounded-full border p-[3px]">
        <span className="theme-toggle-knob flex h-6 w-6 items-center justify-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
          <svg className="theme-toggle-sun h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg className="theme-toggle-moon h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="#FDBA74" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </span>
      </span>
    </button>
  );
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "trendymall-shop-view";

export type ViewMode = "grid" | "list";

interface ViewModeContextValue {
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

// Default value (no-op setter) so components can call useViewMode() safely
// even on pages that don't wrap themselves in <ViewModeProvider> — they
// just always see "grid", matching today's unchanged behavior there.
const ViewModeContext = createContext<ViewModeContextValue>({
  view: "grid",
  setView: () => {},
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<ViewMode>("grid");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "grid" || stored === "list") setView(stored);
    } catch {
      // ignore
    }
  }, []);

  function updateView(next: ViewMode) {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  return (
    <ViewModeContext.Provider value={{ view, setView: updateView }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}

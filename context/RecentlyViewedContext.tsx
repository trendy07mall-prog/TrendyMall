"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "trendymall-recently-viewed";
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  price: number;
}

interface RecentlyViewedContextValue {
  items: RecentlyViewedItem[];
  recordView: (item: RecentlyViewedItem) => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Reading localStorage only after mount (not in useState's initializer)
    // is intentional: it keeps the server-rendered and first client render
    // identical, avoiding a hydration mismatch.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupted data
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const recordView = useCallback((item: RecentlyViewedItem) => {
    setItems((prev) => {
      const withoutCurrent = prev.filter((i) => i.productId !== item.productId);
      return [item, ...withoutCurrent].slice(0, MAX_ITEMS);
    });
  }, []);

  const value = useMemo(() => ({ items, recordView }), [items, recordView]);

  return (
    <RecentlyViewedContext.Provider value={value}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) {
    throw new Error("useRecentlyViewed must be used within a RecentlyViewedProvider");
  }
  return ctx;
}

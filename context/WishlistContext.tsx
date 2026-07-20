"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "trendymall-wishlist";

export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
}

interface WishlistContextValue {
  items: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (productId: string) => void;
  toggle: (item: WishlistItem) => void;
  has: (productId: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
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
      // ignore corrupted wishlist data
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback((item: WishlistItem) => {
    setItems((prev) =>
      prev.some((i) => i.productId === item.productId) ? prev : [...prev, item],
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const has = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items],
  );

  const toggle = useCallback(
    (item: WishlistItem) => {
      if (has(item.productId)) {
        remove(item.productId);
      } else {
        add(item);
      }
    },
    [has, add, remove],
  );

  const count = items.length;

  const value = useMemo(
    () => ({ items, add, remove, toggle, has, count }),
    [items, add, remove, toggle, has, count],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}

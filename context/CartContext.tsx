"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  clearServerCart,
  mergeCartOnLogin,
  removeCartItem,
  upsertCartItem,
} from "@/lib/cart-sync";
import type { CartItem } from "@/types";

const STORAGE_KEY = "trendymall-cart";

// Reads the guest cart directly from localStorage rather than from React
// state — this is what the login-merge effect uses as its input, since it
// must be correct at the exact moment a sign-in fires regardless of whether
// the mount-time hydration effect has already run (avoids an effect-ordering
// race: both effects fire on the same mount, but only one reads localStorage
// synchronously here).
// Pre-Stage-6 stored items have no variantId/variantName/variantColorHex at
// all -- normalizing to null on every read is what makes an old guest cart
// load and behave exactly as it did before variants existed.
function normalizeItem(item: CartItem): CartItem {
  return {
    ...item,
    variantId: item.variantId ?? null,
    variantName: item.variantName ?? null,
    variantColorHex: item.variantColorHex ?? null,
  };
}

function sameLine(a: CartItem, b: { productId: string; variantId: string | null }): boolean {
  return a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);
}

function readGuestItemsFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const items: CartItem[] = Array.isArray(parsed) ? parsed : (parsed.items ?? []);
    return items.map(normalizeItem);
  } catch {
    return [];
  }
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  // Resolves once the server-side clear has finished for a logged-in
  // customer (immediately for a guest) — never rejects, so callers that
  // await it (e.g. checkout's post-order-success flow) can rely on the
  // clear having been attempted without needing their own try/catch.
  clear: () => Promise<void>;
  subtotal: number;
  count: number;
  couponCode: string | null;
  applyCoupon: (code: string) => void;
  removeCoupon: () => void;
  notes: string;
  setNotes: (notes: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);
  // Not exposed on the public context — nothing outside this file needs to
  // know how the cart is persisted, only that items/addItem/etc. work
  // correctly either way.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Reading localStorage only after mount (not in useState's initializer)
    // is intentional: it keeps the server-rendered and first client render
    // identical, avoiding a hydration mismatch.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Older saved carts are a bare array (pre-coupon format) — still
        // read correctly, just with no coupon applied.
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setItems(parsed.map(normalizeItem));
        } else {
          setItems((parsed.items ?? []).map(normalizeItem));
          setCouponCode(parsed.couponCode ?? null);
          setNotes(parsed.notes ?? "");
        }
      }
    } catch {
      // ignore corrupted cart data
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Supabase is the sole source of truth for a logged-in cart's items —
    // not a synced cache — so the guest bucket stays empty while logged in.
    // couponCode/notes are always local regardless of auth state.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items: isLoggedIn ? [] : items, couponCode, notes }),
    );
  }, [items, couponCode, notes, hydrated, isLoggedIn]);

  useEffect(() => {
    const supabase = createBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setIsLoggedIn(false);
        setItems([]);
        setCouponCode(null);
        setNotes("");
        return;
      }

      if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        const guestItems = readGuestItemsFromStorage();
        mergeCartOnLogin(
          guestItems.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        )
          .then((merged) => {
            setItems(merged);
            setIsLoggedIn(true);
          })
          .catch((error) => {
            console.error("Cart merge on login failed:", error);
            setIsLoggedIn(true);
          });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const addItem = useCallback(
    (rawItem: CartItem) => {
      const item = normalizeItem(rawItem);
      setItems((prev) => {
        const existing = prev.find((i) => sameLine(i, item));
        const nextQuantity = (existing?.quantity ?? 0) + item.quantity;
        if (isLoggedIn) {
          upsertCartItem(item.productId, item.variantId, nextQuantity).catch((error) =>
            console.error("Cart sync failed:", error),
          );
        }
        if (existing) {
          return prev.map((i) => (sameLine(i, item) ? { ...i, quantity: nextQuantity } : i));
        }
        return [...prev, item];
      });
    },
    [isLoggedIn],
  );

  const removeItem = useCallback(
    (productId: string, variantId: string | null) => {
      setItems((prev) => prev.filter((i) => !sameLine(i, { productId, variantId })));
      if (isLoggedIn) {
        removeCartItem(productId, variantId).catch((error) =>
          console.error("Cart sync failed:", error),
        );
      }
    },
    [isLoggedIn],
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => !sameLine(i, { productId, variantId }))
          : prev.map((i) =>
              sameLine(i, { productId, variantId }) ? { ...i, quantity } : i,
            ),
      );
      if (isLoggedIn) {
        const sync =
          quantity <= 0
            ? removeCartItem(productId, variantId)
            : upsertCartItem(productId, variantId, quantity);
        sync.catch((error) => console.error("Cart sync failed:", error));
      }
    },
    [isLoggedIn],
  );

  const clear = useCallback(async () => {
    setItems([]);
    setCouponCode(null);
    setNotes("");
    if (isLoggedIn) {
      try {
        await clearServerCart();
      } catch (error) {
        console.error("Cart sync failed:", error);
      }
    }
  }, [isLoggedIn]);

  const applyCoupon = useCallback((code: string) => setCouponCode(code), []);
  const removeCoupon = useCallback(() => setCouponCode(null), []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );
  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      subtotal,
      count,
      couponCode,
      applyCoupon,
      removeCoupon,
      notes,
      setNotes,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      subtotal,
      count,
      couponCode,
      applyCoupon,
      removeCoupon,
      notes,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

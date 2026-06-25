import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "../types";

const STORAGE_KEY = "achridz_cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  addItem: (listingId: string, quantity?: number) => void;
  removeItem: (listingId: string) => void;
  setQuantity: (listingId: string, quantity: number) => void;
  clear: () => void;
  isInCart: (listingId: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem => typeof i?.listingId === "string" && typeof i?.quantity === "number"
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((listingId: string, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.listingId === listingId);
      if (existing) {
        return prev.map((i) =>
          i.listingId === listingId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { listingId, quantity }];
    });
  }, []);

  const removeItem = useCallback((listingId: string) => {
    setItems((prev) => prev.filter((i) => i.listingId !== listingId));
  }, []);

  const setQuantity = useCallback((listingId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.listingId === listingId ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const isInCart = useCallback((listingId: string) => items.some((i) => i.listingId === listingId), [items]);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, count, addItem, removeItem, setQuantity, clear, isInCart }),
    [items, count, addItem, removeItem, setQuantity, clear, isInCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

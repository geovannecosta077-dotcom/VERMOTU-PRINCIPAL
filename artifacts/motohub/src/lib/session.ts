import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
  currentUserId: number | null;
  adminUnlocked: boolean;
  loginOpen: boolean;
  theme: "dark" | "light";
  setCurrentUserId: (id: number | null) => void;
  setAdminUnlocked: (unlocked: boolean) => void;
  setLoginOpen: (open: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      currentUserId: null,
      adminUnlocked: false,
      loginOpen: false,
      theme: "dark",
      setCurrentUserId: (id) => set({ currentUserId: id }),
      setAdminUnlocked: (unlocked) => set({ adminUnlocked: unlocked }),
      setLoginOpen: (open) => set({ loginOpen: open }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    {
      name: "motohub-session",
      partialize: (s) => ({ currentUserId: s.currentUserId, adminUnlocked: s.adminUnlocked, theme: s.theme }),
    },
  ),
);

export interface CartLine {
  itemId: number;
  title: string;
  image: string;
  price: number;
  qty: number;
  sellerId: number;
}

interface CartState {
  lines: CartLine[];
  add: (l: CartLine) => void;
  remove: (itemId: number) => void;
  setQty: (itemId: number, qty: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (l) =>
        set((s) => {
          const existing = s.lines.find((x) => x.itemId === l.itemId);
          if (existing) {
            return {
              lines: s.lines.map((x) =>
                x.itemId === l.itemId ? { ...x, qty: x.qty + l.qty } : x,
              ),
            };
          }
          return { lines: [...s.lines, l] };
        }),
      remove: (itemId) => set((s) => ({ lines: s.lines.filter((x) => x.itemId !== itemId) })),
      setQty: (itemId, qty) =>
        set((s) => ({
          lines: s.lines.map((x) => (x.itemId === itemId ? { ...x, qty: Math.max(1, qty) } : x)),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "motohub-cart" },
  ),
);

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.price * l.qty, 0);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateBR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months === 1) return "há 1 mês";
  return `há ${months} meses`;
}

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function resolveUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("/objects/")) return `${BASE_URL}/api/storage${path}`;
  return path;
}

export function imageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("[")) {
    try {
      const arr = JSON.parse(path) as string[];
      return arr.length > 0 ? resolveUrl(arr[0]!) : "";
    } catch {
      return resolveUrl(path);
    }
  }
  return resolveUrl(path);
}

export function parseImages(path: string | null | undefined): string[] {
  if (!path) return [];
  if (path.startsWith("[")) {
    try {
      const arr = JSON.parse(path) as string[];
      return arr.map(resolveUrl).filter(Boolean);
    } catch {
      return [resolveUrl(path)].filter(Boolean);
    }
  }
  const u = resolveUrl(path);
  return u ? [u] : [];
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const num = (phone || "").replace(/\D/g, "");
  if (num.length < 10) return null;
  const full = num.startsWith("55") ? num : `55${num}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

export function formatPhone(phone: string | null | undefined): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

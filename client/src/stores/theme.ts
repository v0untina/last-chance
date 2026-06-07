import { create } from "zustand";

type Mode = "light" | "dark";
const KEY = "algo.theme";

function getInitial(): Mode {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(KEY) as Mode | null;
  if (saved) return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface ThemeState {
  mode: Mode;
  toggle: () => void;
  set: (m: Mode) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  mode: getInitial(),
  toggle: () =>
    set((s) => {
      const next: Mode = s.mode === "dark" ? "light" : "dark";
      localStorage.setItem(KEY, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return { mode: next };
    }),
  set: (m) => {
    localStorage.setItem(KEY, m);
    document.documentElement.classList.toggle("dark", m === "dark");
    set({ mode: m });
  },
}));

export function applyInitialTheme() {
  const m = getInitial();
  document.documentElement.classList.toggle("dark", m === "dark");
}

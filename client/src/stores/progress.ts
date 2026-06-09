import { create } from "zustand";

const STORAGE_KEY = "algo.progress.v1";
const SCHEMA_VERSION = 1;

export interface AlgorithmProgress {
  theory_completed: boolean;
  test_completed: boolean;
  practice_completed: boolean;
  best_score_percent: number;
  updated_at: string;
}

interface ProgressStateShape {
  version: number;
  bySlug: Record<string, AlgorithmProgress>;
}

type Section = "theory" | "test" | "practice";

interface ProgressActions {
  markSection: (slug: string, section: Section, scorePercent?: number) => void;
  reset: () => void;
  resetAlgorithm: (slug: string) => void;
  isFullyCompleted: (slug: string) => boolean;
  get: (slug: string) => AlgorithmProgress | null;
  isSectionCompleted: (slug: string, section: Section) => boolean;
}

export type ProgressState = ProgressStateShape & ProgressActions;

function emptyProgress(): AlgorithmProgress {
  return {
    theory_completed: false,
    test_completed: false,
    practice_completed: false,
    best_score_percent: 0,
    updated_at: new Date().toISOString(),
  };
}

function loadFromStorage(): ProgressStateShape {
  if (typeof window === "undefined") return { version: SCHEMA_VERSION, bySlug: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: SCHEMA_VERSION, bySlug: {} };
    const parsed = JSON.parse(raw) as ProgressStateShape;
    if (parsed && parsed.version === SCHEMA_VERSION && parsed.bySlug) {
      return parsed;
    }
    return { version: SCHEMA_VERSION, bySlug: {} };
  } catch {
    return { version: SCHEMA_VERSION, bySlug: {} };
  }
}

function saveToStorage(state: ProgressStateShape) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage might be full or disabled — silently ignore.
  }
}

const initial = loadFromStorage();

export const useProgress = create<ProgressState>((set, get) => ({
  version: initial.version,
  bySlug: initial.bySlug,

  markSection: (slug, section, scorePercent) => {
    const prev = get().bySlug[slug] ?? emptyProgress();
    const next: AlgorithmProgress = {
      ...prev,
      [section === "theory"
        ? "theory_completed"
        : section === "test"
        ? "test_completed"
        : "practice_completed"]: true,
      best_score_percent: Math.max(prev.best_score_percent, Math.max(0, Math.min(100, scorePercent ?? prev.best_score_percent))),
      updated_at: new Date().toISOString(),
    };
    const bySlug = { ...get().bySlug, [slug]: next };
    const state = { version: SCHEMA_VERSION, bySlug };
    saveToStorage(state);
    set(state);
  },

  reset: () => {
    const state = { version: SCHEMA_VERSION, bySlug: {} };
    saveToStorage(state);
    set(state);
  },

  resetAlgorithm: (slug) => {
    const bySlug = { ...get().bySlug };
    delete bySlug[slug];
    const state = { version: SCHEMA_VERSION, bySlug };
    saveToStorage(state);
    set(state);
  },

  isFullyCompleted: (slug) => {
    const p = get().bySlug[slug];
    return !!p && p.theory_completed && p.test_completed && p.practice_completed;
  },

  get: (slug) => get().bySlug[slug] ?? null,

  isSectionCompleted: (slug, section) => {
    const p = get().bySlug[slug];
    if (!p) return false;
    if (section === "theory") return p.theory_completed;
    if (section === "test") return p.test_completed;
    return p.practice_completed;
  },
}));

export function applyInitialProgressTheme(): void {
  // no-op, present for symmetry with theme.ts; called on boot.
}

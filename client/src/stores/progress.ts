import { create } from "zustand";

const SCHEMA_VERSION = 1;

function storageKey(userId: number | null) {
  return userId ? `algo.progress.v1.user.${userId}` : null;
}

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
  _userId: number | null;
}

type Section = "theory" | "test" | "practice";

interface ProgressActions {
  initForUser: (userId: number | null) => void;
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

function loadFromStorage(userId: number | null): Pick<ProgressStateShape, "bySlug"> {
  if (typeof window === "undefined" || !userId) return { bySlug: {} };
  try {
    const key = storageKey(userId);
    if (!key) return { bySlug: {} };
    const raw = localStorage.getItem(key);
    if (!raw) return { bySlug: {} };
    const parsed = JSON.parse(raw) as ProgressStateShape;
    if (parsed?.version === SCHEMA_VERSION && parsed.bySlug) {
      return { bySlug: parsed.bySlug };
    }
    return { bySlug: {} };
  } catch {
    return { bySlug: {} };
  }
}

function saveToStorage(userId: number | null, state: { version: number; bySlug: Record<string, AlgorithmProgress> }) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const key = storageKey(userId);
    if (key) localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const useProgress = create<ProgressState>((set, get) => ({
  version: SCHEMA_VERSION,
  bySlug: {},
  _userId: null,

  initForUser: (userId) => {
    const loaded = loadFromStorage(userId);
    set({ ...loaded, _userId: userId, version: SCHEMA_VERSION });
  },

  markSection: (slug, section, scorePercent) => {
    const prev = get().bySlug[slug] ?? emptyProgress();
    // Only update best_score_percent from test section (not practice which is always 100)
    const newScore = section === "test"
      ? Math.max(prev.best_score_percent, Math.max(0, Math.min(100, scorePercent ?? 0)))
      : prev.best_score_percent;
    const next: AlgorithmProgress = {
      ...prev,
      [section === "theory" ? "theory_completed" : section === "test" ? "test_completed" : "practice_completed"]: true,
      best_score_percent: newScore,
      updated_at: new Date().toISOString(),
    };
    const bySlug = { ...get().bySlug, [slug]: next };
    const state = { version: SCHEMA_VERSION, bySlug };
    saveToStorage(get()._userId, state);
    set(state);
  },

  reset: () => {
    const state = { version: SCHEMA_VERSION, bySlug: {} };
    saveToStorage(get()._userId, state);
    set(state);
  },

  resetAlgorithm: (slug) => {
    const bySlug = { ...get().bySlug };
    delete bySlug[slug];
    const state = { version: SCHEMA_VERSION, bySlug };
    saveToStorage(get()._userId, state);
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
  // no-op
}

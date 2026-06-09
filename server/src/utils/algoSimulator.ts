/**
 * Backend algorithm simulator — generates a step-by-step trace for the
 * reference algorithms so that the client can visualise student code on
 * non-JavaScript languages (where the in-browser worker cannot run).
 *
 * The trace shape mirrors the in-browser Worker's TraceOp so the client
 * can reuse the same traceToSteps() conversion.
 */

export type TraceOp = { type: "compare" | "swap" | "set" | "read"; indices: number[]; array: number[]; timestamp: number };
export type TraceResult = { steps: TraceOp[]; ok: boolean; error?: string };

const MAX_STEPS = 2000;

function clone(arr: number[]): number[] {
  return arr.slice();
}

function pushStep(steps: TraceOp[], op: Omit<TraceOp, "timestamp">): boolean {
  if (steps.length >= MAX_STEPS) return false;
  steps.push({ ...op, timestamp: steps.length });
  return true;
}

function bubbleSortTrace(input: number[]): TraceOp[] {
  const arr = clone(input);
  const steps: TraceOp[] = [];
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (!pushStep(steps, { type: "compare", indices: [j, j + 1], array: clone(arr) })) return steps;
      if (arr[j] > arr[j + 1]) {
        const t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
        if (!pushStep(steps, { type: "swap", indices: [j, j + 1], array: clone(arr) })) return steps;
      }
    }
  }
  return steps;
}

function insertionSortTrace(input: number[]): TraceOp[] {
  const arr = clone(input);
  const steps: TraceOp[] = [];
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      if (!pushStep(steps, { type: "set", indices: [j + 1], array: clone(arr) })) return steps;
      j--;
    }
    arr[j + 1] = key;
    if (j + 1 !== i) {
      if (!pushStep(steps, { type: "set", indices: [j + 1], array: clone(arr) })) return steps;
    }
  }
  return steps;
}

function selectionSortTrace(input: number[]): TraceOp[] {
  const arr = clone(input);
  const steps: TraceOp[] = [];
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      if (!pushStep(steps, { type: "compare", indices: [minIdx, j], array: clone(arr) })) return steps;
      if (arr[j] < arr[minIdx]) minIdx = j;
    }
    if (minIdx !== i) {
      const t = arr[i]; arr[i] = arr[minIdx]; arr[minIdx] = t;
      if (!pushStep(steps, { type: "swap", indices: [i, minIdx], array: clone(arr) })) return steps;
    }
  }
  return steps;
}

function binarySearchTrace(input: number[], target: number): TraceOp[] {
  const arr = clone(input);
  const steps: TraceOp[] = [];
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (!pushStep(steps, { type: "compare", indices: [mid], array: clone(arr) })) return steps;
    if (arr[mid] === target) {
      if (!pushStep(steps, { type: "set", indices: [mid], array: clone(arr) })) return steps;
      return steps;
    }
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return steps;
}

export type SupportedSlug = "bubble-sort" | "insertion-sort" | "selection-sort" | "binary-search";

export function simulate(slug: string, input: number[], target?: number): TraceResult {
  try {
    let steps: TraceOp[] = [];
    switch (slug as SupportedSlug) {
      case "bubble-sort":
        steps = bubbleSortTrace(input);
        break;
      case "insertion-sort":
        steps = insertionSortTrace(input);
        break;
      case "selection-sort":
        steps = selectionSortTrace(input);
        break;
      case "binary-search":
        if (typeof target !== "number" || Number.isNaN(target)) {
          return { steps: [], ok: false, error: "Для binary-search требуется target (число)" };
        }
        steps = binarySearchTrace(input, target);
        break;
      default:
        return { steps: [], ok: false, error: `Алгоритм "${slug}" не поддерживается трассировкой` };
    }
    return { steps, ok: true };
  } catch (e) {
    return { steps: [], ok: false, error: (e as Error).message };
  }
}

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

function quickSortTrace(input: number[]): TraceOp[] {
  const arr = clone(input);
  const steps: TraceOp[] = [];
  function qs(lo: number, hi: number): void {
    if (lo >= hi) return;
    const pivot = arr[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      if (!pushStep(steps, { type: "compare", indices: [j, hi], array: clone(arr) })) return;
      if (arr[j] <= pivot) {
        i++;
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        if (!pushStep(steps, { type: "swap", indices: [i, j], array: clone(arr) })) return;
      }
    }
    if (i + 1 !== hi) {
      const t = arr[i + 1]; arr[i + 1] = arr[hi]; arr[hi] = t;
      if (!pushStep(steps, { type: "swap", indices: [i + 1, hi], array: clone(arr) })) return;
    }
    qs(lo, i);
    qs(i + 2, hi);
  }
  qs(0, arr.length - 1);
  return steps;
}

function mergeSortTrace(input: number[]): TraceOp[] {
  const arr = clone(input);
  const steps: TraceOp[] = [];
  function ms(lo: number, hi: number): void {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    ms(lo, mid);
    ms(mid + 1, hi);
    const left = arr.slice(lo, mid + 1);
    const right = arr.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      if (!pushStep(steps, { type: "compare", indices: [lo + i, mid + 1 + j], array: clone(arr) })) return;
      if (left[i] <= right[j]) {
        arr[k++] = left[i++];
      } else {
        arr[k++] = right[j++];
      }
      if (!pushStep(steps, { type: "set", indices: [k - 1], array: clone(arr) })) return;
    }
    while (i < left.length) { arr[k++] = left[i++]; if (!pushStep(steps, { type: "set", indices: [k - 1], array: clone(arr) })) return; }
    while (j < right.length) { arr[k++] = right[j++]; if (!pushStep(steps, { type: "set", indices: [k - 1], array: clone(arr) })) return; }
  }
  ms(0, arr.length - 1);
  return steps;
}

function heapSortTrace(input: number[]): TraceOp[] {
  const arr = clone(input);
  const steps: TraceOp[] = [];
  const n = arr.length;
  function heapify(n: number, i: number): void {
    let largest = i;
    const l = 2 * i + 1, r = 2 * i + 2;
    if (l < n) {
      if (!pushStep(steps, { type: "compare", indices: [l, largest], array: clone(arr) })) return;
      if (arr[l] > arr[largest]) largest = l;
    }
    if (r < n) {
      if (!pushStep(steps, { type: "compare", indices: [r, largest], array: clone(arr) })) return;
      if (arr[r] > arr[largest]) largest = r;
    }
    if (largest !== i) {
      const t = arr[i]; arr[i] = arr[largest]; arr[largest] = t;
      if (!pushStep(steps, { type: "swap", indices: [i, largest], array: clone(arr) })) return;
      heapify(n, largest);
    }
  }
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) heapify(n, i);
  for (let i = n - 1; i > 0; i--) {
    const t = arr[0]; arr[0] = arr[i]; arr[i] = t;
    if (!pushStep(steps, { type: "swap", indices: [0, i], array: clone(arr) })) return steps;
    heapify(i, 0);
  }
  return steps;
}

export type SupportedSlug = "bubble-sort" | "insertion-sort" | "selection-sort" | "binary-search" | "quick-sort" | "merge-sort" | "heap-sort";

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
      case "quick-sort":
        steps = quickSortTrace(input);
        break;
      case "merge-sort":
        steps = mergeSortTrace(input);
        break;
      case "heap-sort":
        steps = heapSortTrace(input);
        break;
      default:
        return { steps: [], ok: false, error: `Алгоритм "${slug}" не поддерживается трассировкой` };
    }
    return { steps, ok: true };
  } catch (e) {
    return { steps: [], ok: false, error: (e as Error).message };
  }
}

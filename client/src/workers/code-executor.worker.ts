/// <reference lib="webworker" />

export type TraceOp = { type: "compare" | "swap" | "set" | "read"; indices: number[]; array: number[]; timestamp: number };

export type WorkerRequest =
  | { id: number; type: "execute"; code: string; entryArg?: unknown; trace?: boolean }
  | { id: number; type: "cancel" };

export type WorkerResponse =
  | { id: number; type: "log"; args: unknown[] }
  | { id: number; type: "result"; value: unknown; runtime: number; trace?: TraceOp[] }
  | { id: number; type: "error"; message: string; stack?: string };

const FORBIDDEN = /\b(eval|Function|fetch|XMLHttpRequest|WebSocket|importScripts|import\s|export\s|postMessage|globalThis|self|window|document|navigator|location|parent|top|frames|self\.|new\s+Function|require\s*\()\b/;
const STEP_LIMIT = 8000;
const TIMEOUT_MS = 5000;

let aborted = false;
let steps = 0;

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

function reset() { aborted = false; steps = 0; }

function buildSandbox(consoleLog: (args: unknown[]) => void): Record<string, unknown> {
  const sandboxConsole = { log: (...a: unknown[]) => consoleLog(a) };
  return {
    Math, Array, Object, Number, String, Boolean, JSON, Date, RegExp, Map, Set, Error, Symbol, Promise,
    parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined,
    proxy: Proxy,
    console: sandboxConsole,
  };
}

function traceArray(arr: number[], onEvent: (op: TraceOp) => void): number[] {
  let lastReads: number[] = [];
  const readTimer: number | null = null;

  return new Proxy([...arr], {
    get(target, prop) {
      const val = (target as any)[prop];
      if (typeof val === "function") return val.bind(target);
      const idx = Number(prop);
      if (!isNaN(idx) && idx >= 0) {
        lastReads.push(idx);
      }
      return val;
    },
    set(target, prop, value) {
      const idx = Number(prop);
      if (!isNaN(idx) && idx >= 0) {
        const oldVal = target[idx];
        target[prop] = value;
        if (oldVal !== undefined) {
          const reads = [...lastReads];
          lastReads = [];
          if (reads.length >= 2 && reads[0] !== reads[1] && value !== oldVal) {
            onEvent({ type: "swap", indices: reads.slice(0, 2), array: [...target], timestamp: performance.now() });
          } else {
            onEvent({ type: "set", indices: [idx], array: [...target], timestamp: performance.now() });
          }
        } else {
          target[prop] = value;
        }
      } else {
        target[prop] = value;
      }
      return true;
    },
  });
}

ctx.addEventListener("message", (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  if (req.type === "cancel") { aborted = true; return; }
  if (req.type !== "execute") return;

  const started = performance.now();
  reset();

  const { code, entryArg, trace } = req;

  if (FORBIDDEN.test(code)) {
    const r: WorkerResponse = { id: req.id, type: "error", message: "Запрещённая конструкция в коде (eval, Function, fetch, import, …)" };
    ctx.postMessage(r);
    return;
  }

  try {
    const traceLog: TraceOp[] = [];
    const sandbox = buildSandbox((args) => ctx.postMessage({ id: req.id, type: "log", args } satisfies WorkerResponse));
    const keys = Object.keys(sandbox);
    const values = keys.map((k) => sandbox[k]);
    const fnSrc = `"use strict"; return (async function(){\n${code}\n})();`;
    const fn = new Function(...keys, fnSrc) as (...args: unknown[]) => Promise<unknown>;

    const stepGuard = setInterval(() => {
      steps++;
      if (aborted) throw new Error("Execution cancelled");
      if (steps > STEP_LIMIT) throw new Error(`Превышен лимит шагов (${STEP_LIMIT})`);
    }, 0);

    const timeoutId = setTimeout(() => { aborted = true; }, TIMEOUT_MS);

        Promise.resolve(fn(...values))
      .then(async (userFn) => {
        let finalArg = entryArg;
        if (trace && Array.isArray(entryArg)) {
          finalArg = traceArray(entryArg as number[], (op) => traceLog.push(op));
        }
        const result = await (userFn as (arg: unknown) => unknown)(finalArg);
        clearInterval(stepGuard);
        clearTimeout(timeoutId);
        const runtime = Math.round(performance.now() - started);
        // Deep-clone result to strip Proxy wrappers (structuredClone can't clone Proxy)
        let cleanValue: unknown;
        try { cleanValue = JSON.parse(JSON.stringify(result)); } catch { cleanValue = result instanceof Array ? [...result] : String(result); }
        const r: WorkerResponse = { id: req.id, type: "result", value: cleanValue, runtime, trace: trace ? traceLog : undefined };
        ctx.postMessage(r);
      })
      .catch((err: Error) => {
        clearInterval(stepGuard);
        clearTimeout(timeoutId);
        const r: WorkerResponse = { id: req.id, type: "error", message: err.message, stack: err.stack };
        ctx.postMessage(r);
      });
  } catch (err) {
    const r: WorkerResponse = { id: req.id, type: "error", message: (err as Error).message };
    ctx.postMessage(r);
  }
});

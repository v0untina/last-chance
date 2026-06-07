/// <reference lib="webworker" />

export type WorkerRequest =
  | { id: number; type: "execute"; code: string; entryArg?: unknown }
  | { id: number; type: "cancel" };

export type WorkerResponse =
  | { id: number; type: "log"; args: unknown[] }
  | { id: number; type: "result"; value: unknown; runtime: number }
  | { id: number; type: "error"; message: string; stack?: string };

const FORBIDDEN = /\b(eval|Function|fetch|XMLHttpRequest|WebSocket|importScripts|import\s|export\s|postMessage|globalThis|self|window|document|navigator|location|parent|top|frames|self\.|new\s+Function|require\s*\()\b/;
const STEP_LIMIT = 5000;
const TIMEOUT_MS = 3000;

let aborted = false;
let steps = 0;

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

function reset() { aborted = false; steps = 0; }

function buildSandbox(consoleLog: (args: unknown[]) => void): Record<string, unknown> {
  const sandboxConsole = { log: (...a: unknown[]) => consoleLog(a) };
  return {
    Math, Array, Object, Number, String, Boolean, JSON, Date, RegExp, Map, Set, Error, Symbol, Promise,
    parseInt, parseFloat, isNaN, isFinite, Infinity, NaN, undefined,
    console: sandboxConsole,
  };
}

ctx.addEventListener("message", (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  if (req.type === "cancel") { aborted = true; return; }
  if (req.type !== "execute") return;

  const started = performance.now();
  reset();

  const { code, entryArg } = req;

  if (FORBIDDEN.test(code)) {
    const r: WorkerResponse = { id: req.id, type: "error", message: "Запрещённая конструкция в коде (eval, Function, fetch, import, …)" };
    ctx.postMessage(r);
    return;
  }

  try {
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
        const result = await (userFn as (arg: unknown) => unknown)(entryArg);
        clearInterval(stepGuard);
        clearTimeout(timeoutId);
        const runtime = Math.round(performance.now() - started);
        const r: WorkerResponse = { id: req.id, type: "result", value: result, runtime };
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

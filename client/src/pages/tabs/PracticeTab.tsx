import { useEffect, useRef, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import Editor, { loader } from "@monaco-editor/react";
import {
  Play, RotateCcw, StepForward, StepBack, CheckCircle2, XCircle, Code2,
  Eye, Pause, Gauge, GitCompare, BarChart3, Sparkles, ChevronDown, ChevronUp,
  Loader2, Sliders, AlertTriangle, Bot, Lightbulb
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { cn } from "@/lib/cn";
import { engines, type EngineKey } from "@/visualization/engines";
import type { Step } from "@/visualization/AlgorithmEngine";
import { AnimationController } from "@/visualization/AnimationController";
import { CanvasRenderer } from "@/visualization/CanvasRenderer";
import {
  SUPPORTED_LANGUAGES, getTemplate, getDefaultTestInput, getExpectedOutput,
  type SupportedLanguage
} from "@/lib/templates";
import { templates } from "@/lib/templates";
import type { Algorithm, DualAIResponse, ExecuteResult, TraceResponse } from "@/types/api";
import type { WorkerRequest, WorkerResponse, TraceOp } from "@/workers/code-executor.worker";
import { DiffView } from "@/components/DiffView";
import { Modal } from "@/components/ui/Modal";
import { api, extractErrorMessage } from "@/lib/api";
import { useProgress } from "@/stores/progress";
import { useTheme } from "@/stores/theme";

loader.init().then((monaco) => {
  monaco.editor.defineTheme("algo-dark", {
    base: "vs-dark", inherit: true,
    rules: [
      { token: "comment", foreground: "6a9955" },
      { token: "keyword", foreground: "569cd6" },
      { token: "string", foreground: "ce9178" },
      { token: "number", foreground: "b5cea8" },
      { token: "function", foreground: "dcdcaa" },
    ],
    colors: {
      "editor.background": "#0b0f19",
      "editor.foreground": "#e6e9ef",
      "editor.lineHighlightBackground": "#1a2231",
      "editor.selectionBackground": "#264f78",
      "editor.inactiveSelectionBackground": "#1e3a5f",
      "editorCursor.foreground": "#4f46e5",
    },
  });
  monaco.editor.defineTheme("algo-light", {
    base: "vs", inherit: true,
    rules: [
      { token: "comment", foreground: "6a9955" },
      { token: "keyword", foreground: "0000ff" },
      { token: "string", foreground: "a31515" },
      { token: "number", foreground: "098658" },
      { token: "function", foreground: "795e26" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#0f172a",
      "editor.lineHighlightBackground": "#f1f5f9",
      "editorCursor.foreground": "#4f46e5",
    },
  });
});

function getEngineKey(slug: string): EngineKey {
  if (slug.includes("bubble")) return "bubble";
  if (slug.includes("insertion")) return "insertion";
  if (slug.includes("selection")) return "selection";
  if (slug.includes("binary")) return "binary";
  if (slug.includes("quick")) return "quick";
  if (slug.includes("merge")) return "merge";
  if (slug.includes("heap")) return "heap";
  if (slug.includes("stack")) return "stack";
  if (slug.includes("queue")) return "queue";
  return "binary";
}

function traceToSteps(trace: TraceOp[]): Step[] {
  if (!trace || trace.length === 0) return [];
  const steps: Step[] = [];
  let comparisons = 0, swaps = 0;
  for (let i = 0; i < trace.length; i++) {
    const op = trace[i];
    if (op.type === "swap") {
      swaps++;
      steps.push({ type: "swap", indices: op.indices, array: [...op.array], note: `Обмен arr[${op.indices[0]}] ↔ arr[${op.indices[1]}]`, explanation: `Меняем местами элементы на позициях ${op.indices[0]} и ${op.indices[1]}`, explanationIcon: "swap", stats: { comparisons, swaps } });
    } else if (op.type === "set") {
      const prev = steps.length > 0 ? steps[steps.length - 1].array : [];
      const prevVal = prev[op.indices[0]], newVal = op.array[op.indices[0]];
      steps.push({ type: "set", indices: op.indices, array: [...op.array], note: `arr[${op.indices[0]}]: ${prevVal} → ${newVal}`, explanation: `Записываем ${newVal} в arr[${op.indices[0]}]`, explanationIcon: "insert", stats: { comparisons, swaps } });
    }
  }
  return steps;
}

// Hard wall-clock limit. Timers INSIDE the worker cannot interrupt a synchronous
// infinite loop (single-threaded), so the main thread must terminate a stuck worker.
const WORKER_HARD_TIMEOUT_MS = 6000;

function runWorker(code: string, entryArg: unknown, trace = false): Promise<{ value: unknown; runtime: number; trace?: TraceOp[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("@/workers/code-executor.worker.ts", import.meta.url), { type: "module" });
    const id = Date.now();
    const watchdog = setTimeout(() => {
      worker.removeEventListener("message", onMsg);
      worker.terminate();
      reject(new Error(`Превышено время выполнения (${WORKER_HARD_TIMEOUT_MS / 1000} с). Возможен бесконечный цикл.`));
    }, WORKER_HARD_TIMEOUT_MS);
    const onMsg = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id !== id) return;
      clearTimeout(watchdog);
      worker.removeEventListener("message", onMsg);
      worker.terminate();
      if (e.data.type === "result") resolve({ value: e.data.value, runtime: e.data.runtime, trace: e.data.trace });
      else if (e.data.type === "error") reject(new Error(e.data.message));
    };
    worker.addEventListener("message", onMsg);
    worker.postMessage({ id, type: "execute", code, entryArg, trace } satisfies WorkerRequest);
  });
}

function generateRandomArray(size: number): number[] {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 99) + 1);
}

function getAlgorithmFnName(slug: string): string {
  if (slug.includes("bubble")) return "bubbleSort";
  if (slug.includes("insertion")) return "insertionSort";
  if (slug.includes("selection")) return "selectionSort";
  if (slug.includes("quick")) return "quickSort";
  if (slug.includes("merge")) return "mergeSort";
  if (slug.includes("heap")) return "heapSort";
  return "binarySearch";
}

const LANG_LABELS: Record<SupportedLanguage, string> = {
  javascript: "JavaScript", python: "Python", java: "Java", cpp: "C++", go: "Go",
};

export default function PracticeTab() {
  const { algo } = useOutletContext<{ algo: Algorithm }>();
  const mode = useTheme((s) => s.mode);
  const engineKey = getEngineKey(algo.slug);
  const engine = engines[engineKey];
  const referenceCode = templates[algo.slug]?.javascript ?? "";

  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [code, setCode] = useState(() => getTemplate(algo.slug, "javascript"));
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ passed: boolean; output: string; runtime?: number; trace?: TraceOp[] } | null>(null);

  const [showDiff, setShowDiff] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpenAI, setAiOpenAI] = useState<string | null>(null);
  const [aiGigaChat, setAiGigaChat] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiIsLocal, setAiIsLocal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const ctrlRef = useRef<AnimationController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);

  const [arraySize, setArraySize] = useState(8);
  const arrayRef = useRef(generateRandomArray(8));

  const codeHasError = runResult && !runResult.passed;

  const fetchDualAI = useCallback(async (userCode: string, errorMessage?: string) => {
    setAiLoading(true);
    setShowAI(true);
    setAiError(null);
    setAiOpenAI(null);
    setAiGigaChat(null);
    setAiIsLocal(false);
    try {
      const { data } = await api.post<DualAIResponse>("/ai/analyze-dual", {
        code: userCode,
        errorMessage,
        algorithmName: algo.name,
        language,
      });
      const oa = data.data.openai?.text ?? null;
      const gc = data.data.gigachat?.text ?? null;
      const isLocal = data.data.openai?.provider === "local";
      if (!oa && !gc) {
        setAiError("ИИ-сервис сейчас недоступен: ни один провайдер не вернул ответ. Проверьте API-ключи OpenAI / GigaChat в настройках сервера.");
      } else {
        setAiOpenAI(oa);
        setAiGigaChat(gc);
        setAiIsLocal(isLocal);
      }
    } catch (e) {
      setAiError(extractErrorMessage(e, "Не удалось получить ответ от ИИ. Попробуйте ещё раз позже."));
    } finally {
      setAiLoading(false);
    }
  }, [algo.name, language]);

  const executeJS = useCallback(async (codeToRun: string, doTrace: boolean): Promise<{ passed: boolean; output: string; runtime?: number; trace?: TraceOp[] }> => {
    // Stack: test push/pop/peek/isEmpty operations
    if (algo.slug === "stack") {
      const execCode = `${codeToRun}
return (arg) => {
  const s = new Stack();
  s.push(1); s.push(2); s.push(3);
  const peek1 = s.peek();
  const pop1 = s.pop();
  const peek2 = s.peek();
  const empty1 = s.isEmpty();
  s.pop(); s.pop();
  const empty2 = s.isEmpty();
  return [peek1, pop1, peek2, empty1, empty2];
};`;
      const result = await runWorker(execCode, null, false);
      const expected = [3, 3, 2, false, true];
      const passed = JSON.stringify(result.value) === JSON.stringify(expected);
      return { passed, output: JSON.stringify(result.value), runtime: result.runtime };
    }

    // Queue: test enqueue/dequeue/front/isEmpty operations
    if (algo.slug === "queue") {
      const execCode = `${codeToRun}
return (arg) => {
  const q = new Queue();
  q.enqueue(1); q.enqueue(2); q.enqueue(3);
  const front1 = q.front();
  const deq1 = q.dequeue();
  const front2 = q.front();
  const empty1 = q.isEmpty();
  q.dequeue(); q.dequeue();
  const empty2 = q.isEmpty();
  return [front1, deq1, front2, empty1, empty2];
};`;
      const result = await runWorker(execCode, null, false);
      const expected = [1, 1, 2, false, true];
      const passed = JSON.stringify(result.value) === JSON.stringify(expected);
      return { passed, output: JSON.stringify(result.value), runtime: result.runtime };
    }

    const fnName = getAlgorithmFnName(algo.slug);
    let execCode: string, entryArg: unknown;

    if (algo.slug === "binary-search") {
      const sortedArray = [...arrayRef.current].sort((a, b) => a - b);
      const targetValue = sortedArray[Math.floor(sortedArray.length / 2)];
      execCode = `${codeToRun}\n\nreturn (a) => ${fnName}(a, ${targetValue});`;
      entryArg = sortedArray;
    } else {
      execCode = `${codeToRun}\n\nreturn ${fnName};`;
      entryArg = [...arrayRef.current];
    }

    const result = await runWorker(execCode, entryArg, doTrace);
    const expected = algo.slug === "binary-search"
      ? Math.floor(arrayRef.current.length / 2)
      : [...arrayRef.current].sort((a, b) => a - b);
    const passed = JSON.stringify(result.value) === JSON.stringify(expected);
    return { passed, output: JSON.stringify(result.value), runtime: result.runtime, trace: result.trace };
  }, [algo.slug]);

  const executePiston = useCallback(async (codeToRun: string): Promise<{ passed: boolean; output: string; runtime?: number; trace?: TraceOp[] }> => {
    const input = [...arrayRef.current];
    const { data } = await api.post<ExecuteResult>("/execute/run", { slug: algo.slug, language, code: codeToRun, input });
    return { passed: data.data.passed, output: data.data.error || data.data.output, runtime: data.data.runtime };
  }, [language, algo.slug]);

  const fetchServerTrace = useCallback(async (): Promise<TraceOp[] | undefined> => {
    try {
      const target = algo.slug === "binary-search"
        ? arrayRef.current[Math.floor(arrayRef.current.length / 2)]
        : undefined;
      const { data } = await api.post<TraceResponse>("/execute/trace", {
        slug: algo.slug,
        input: arrayRef.current,
        target,
      });
      return data.data.ok ? data.data.trace : undefined;
    } catch {
      return undefined;
    }
  }, [algo.slug]);

  const markProgress = useProgress((s) => s.markSection);

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setRunResult(null);
    setAiOpenAI(null);
    setAiGigaChat(null);

    try {
      let result: { passed: boolean; output: string; runtime?: number; trace?: TraceOp[] };
      if (language === "javascript") {
        result = await executeJS(code, true);
      } else {
        const piston = await executePiston(code);
        if (piston.passed) {
          const trace = await fetchServerTrace();
          result = { ...piston, trace };
        } else {
          result = piston;
        }
      }
      setRunResult(result);

      if (result.passed) {
        if (result.trace && result.trace.length > 0 && rendererRef.current) {
          ctrlRef.current?.pause();
          const steps = traceToSteps(result.trace);
          if (steps.length > 0) {
            const ctrl = new AnimationController(
              rendererRef.current,
              (step, idx) => { setCurrentStep(step); setStepIndex(idx); },
              () => setPlaying(false)
            );
            ctrlRef.current = ctrl;
            ctrl.load(steps);
            setTotalSteps(steps.length);
            setStepIndex(0);
            setPlaying(false);
          }
        }
        markProgress(algo.slug, "practice", 100);
        api.put(`/progress/${algo.algorithm_id}`, { practice_completed: true }).catch(() => {});
        // AI анализ не нужен — код правильный
      } else {
        fetchDualAI(code, result.output);
      }
    } catch (e) {
      const errMsg = (e as Error).message;
      setRunResult({ passed: false, output: errMsg });
      fetchDualAI(code, errMsg);
    } finally {
      setRunning(false);
    }
  };

  const loadSteps = useCallback((steps: Step[]) => {
    if (!rendererRef.current) return;
    const ctrl = new AnimationController(
      rendererRef.current,
      (step, idx) => { setCurrentStep(step); setStepIndex(idx); },
      () => setPlaying(false)
    );
    ctrlRef.current = ctrl;
    ctrl.load(steps);
    setTotalSteps(steps.length);
    setStepIndex(0);
    setPlaying(false);
  }, []);

  useEffect(() => {
    setCode(getTemplate(algo.slug, language));
    setRunResult(null);
    setAiOpenAI(null);
    setAiGigaChat(null);
    setAiIsLocal(false);
  }, [algo.slug, language]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;
    renderer.resize();
    arrayRef.current = generateRandomArray(arraySize);
    const steps = engine.generateSteps([...arrayRef.current], engineKey === "binary" ? arrayRef.current[Math.floor(arrayRef.current.length / 2)] : undefined);
    loadSteps(steps);
    // Re-fit the canvas whenever its box changes (e.g. AI panel / metrics appear and
    // shrink the flex area). A plain window resize listener misses these layout shifts.
    const ro = new ResizeObserver(() => {
      renderer.resize();
      ctrlRef.current?.redraw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [engine, engineKey, loadSteps]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayPause = () => {
    if (!ctrlRef.current) return;
    if (playing) { ctrlRef.current.pause(); setPlaying(false); }
    else { ctrlRef.current.play(); setPlaying(true); }
  };
  const handleStepForward = () => ctrlRef.current?.stepForward();
  const handleStepBackward = () => ctrlRef.current?.stepBackward();
  const handleReset = () => { ctrlRef.current?.stop(); setPlaying(false); setStepIndex(0); };
  const handleSpeedChange = (s: number) => { setSpeed(s); ctrlRef.current?.setSpeed(s); };

  const handleRandomize = () => {
    if (!rendererRef.current) return;
    arrayRef.current = generateRandomArray(arraySize);
    const steps = engine.generateSteps([...arrayRef.current], engineKey === "binary" ? arrayRef.current[Math.floor(arrayRef.current.length / 2)] : undefined);
    loadSteps(steps);
    rendererRef.current.clear();
    setRunResult(null);
    setAiOpenAI(null);
    setAiGigaChat(null);
  };

  const handleArraySizeChange = (newSize: number) => {
    setArraySize(newSize);
    if (!rendererRef.current) return;
    arrayRef.current = generateRandomArray(newSize);
    const steps = engine.generateSteps([...arrayRef.current], engineKey === "binary" ? arrayRef.current[Math.floor(arrayRef.current.length / 2)] : undefined);
    loadSteps(steps);
    rendererRef.current.clear();
    setRunResult(null);
    setAiOpenAI(null);
    setAiGigaChat(null);
  };

  const traceOps = runResult?.trace ?? [];
  const traceSwaps = traceOps.filter((t) => t.type === "swap").length;
  const traceWrites = traceOps.filter((t) => t.type === "set").length;
  const traceTotal = traceOps.length;
  const hasTrace = !!runResult?.trace && traceTotal > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px] -mx-4 sm:mx-0">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-elev shrink-0 flex-wrap">
        <Code2 className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium mr-2">Язык:</span>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button key={lang.id} onClick={() => setLanguage(lang.id)} className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            language === lang.id ? "bg-accent text-white" : "bg-bg-subtle text-fg-muted hover:text-fg"
          )}>
            {lang.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-3 pl-3 border-l border-border">
          <Sliders className="h-3.5 w-3.5 text-fg-muted" />
          <span className="text-[11px] text-fg-muted whitespace-nowrap">Размер: {arraySize}</span>
          <input type="range" min={3} max={30} value={arraySize} onChange={(e) => handleArraySizeChange(Number(e.target.value))} className="w-16 accent-accent h-1" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRandomize}>
            <RotateCcw className="h-3.5 w-3.5" /> Новый массив
          </Button>
          <Button size="sm" onClick={handleRun} loading={running}>
            <Play className="h-3.5 w-3.5" /> {running ? "Выполнение..." : "Запустить"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 flex flex-col border-r border-border bg-bg">
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-bg-subtle shrink-0">
            <Eye className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium">
              {codeHasError ? "⛔ Код содержит ошибку" : `Визуализация ${runResult?.trace ? (language === "javascript" ? "(ваш код)" : "(серверная симуляция)") : "(эталон)"}`}
            </span>
            {!codeHasError && (
              <div className="ml-auto flex items-center gap-1">
                <button onClick={handleStepBackward} className="p-1 rounded hover:bg-bg-elev transition-colors" title="Шаг назад"><StepBack className="h-3.5 w-3.5" /></button>
                <button onClick={handlePlayPause} className="p-1 rounded hover:bg-bg-elev transition-colors" title={playing ? "Пауза" : "Воспроизвести"}>
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button onClick={handleStepForward} className="p-1 rounded hover:bg-bg-elev transition-colors" title="Шаг вперёд"><StepForward className="h-3.5 w-3.5" /></button>
                <button onClick={handleReset} className="p-1 rounded hover:bg-bg-elev transition-colors" title="Сброс"><RotateCcw className="h-3.5 w-3.5" /></button>
                <div className="flex items-center gap-1 ml-1">
                  <Gauge className="h-3 w-3 text-fg-muted" />
                  <input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={(e) => handleSpeedChange(Number(e.target.value))} className="w-16 accent-accent h-1" />
                  <span className="text-[10px] text-fg-muted w-6">{speed}x</span>
                </div>
                <span className="text-xs text-fg-muted">{stepIndex}/{totalSteps}</span>
              </div>
            )}
          </div>

          <div className="flex-1 relative min-h-0">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {codeHasError && (
              <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
                <div className="text-center max-w-sm">
                  <AlertTriangle className="h-12 w-12 text-danger/60 mx-auto mb-3" />
                  <p className="text-sm font-medium text-danger mb-1">Код содержит ошибку</p>
                  <p className="text-xs text-fg-muted">Исправьте ошибки в коде, чтобы увидеть визуализацию алгоритма. Ниже показаны подсказки от ИИ.</p>
                </div>
              </div>
            )}
          </div>

          {!codeHasError && (
            <>
              <div className="border-t border-border bg-bg-subtle p-2 space-y-1.5 shrink-0 max-h-[130px] overflow-y-auto">
                {engine.pseudocode.map((line, i) => (
                  <div key={i} className={cn("text-xs font-mono px-2 py-0.5 rounded transition-colors", currentStep?.line === i + 1 ? "bg-accent/15 text-accent font-semibold border-l-2 border-accent" : "text-fg-muted")}>
                    {line}
                  </div>
                ))}
              </div>

              {currentStep?.variables && Object.keys(currentStep.variables).length > 0 && (
                <div className="border-t border-border bg-bg-elev px-3 py-1.5 flex gap-3 flex-wrap shrink-0">
                  {Object.entries(currentStep.variables).map(([k, v]) => (
                    <span key={k} className="text-xs"><span className="text-fg-subtle">{k}:</span> <span className="font-mono font-medium">{String(v)}</span></span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-1/2 flex flex-col bg-bg">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-bg-subtle shrink-0">
            <Code2 className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-fg">Редактор ({LANG_LABELS[language]})</span>
            {runResult && (
              <span className={cn("text-[10px] font-mono ml-2", runResult.passed ? "text-success" : "text-danger")}>
                {runResult.passed ? `✓ ${runResult.runtime}ms` : "✗ ошибка"}
              </span>
            )}
            <Badge tone="default" className="text-[10px] ml-auto">{SUPPORTED_LANGUAGES.find((l) => l.id === language)?.label}</Badge>
          </div>

          <div className="flex-1 min-h-0">
            <Editor
              key={`${algo.slug}-${language}`}
              defaultLanguage={language === "cpp" ? "cpp" : language === "go" ? "go" : language}
              language={language === "cpp" ? "cpp" : language === "go" ? "go" : language}
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme={mode === "dark" ? "algo-dark" : "algo-light"}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "JetBrains Mono, monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                padding: { top: 12 },
                renderWhitespace: "selection",
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {runResult && (
            <div className={cn("border-t px-3 py-2 shrink-0 text-xs font-mono", runResult.passed ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5")}>
              <div className="flex items-center gap-2 mb-1">
                {runResult.passed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-danger" />}
                <span className={cn("font-medium", runResult.passed ? "text-success" : "text-danger")}>
                  {runResult.passed ? "Тест пройден" : "Ошибка"}
                </span>
                <span className="text-fg-muted ml-auto">{runResult.runtime} мс</span>
              </div>
              <pre className="whitespace-pre-wrap text-fg-muted">{runResult.output}</pre>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-bg shrink-0">
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border bg-bg-subtle">
          <button onClick={() => setShowDiff(!showDiff)} className={cn("flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors", showDiff ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg")}>
            <GitCompare className="h-3.5 w-3.5" /> Сравнить с эталоном
          </button>
          <button onClick={() => setShowMetrics(!showMetrics)} className={cn("flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors", showMetrics ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg")}>
            <BarChart3 className="h-3.5 w-3.5" /> Метрики
          </button>
          <button onClick={() => setShowAI(true)} className={cn("flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors relative", aiLoading || aiOpenAI ? "text-accent hover:bg-accent/10" : "text-fg-muted hover:text-fg")}>
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5 text-amber" />}
            AI Анализ
            {aiOpenAI && !aiLoading && <span className="h-1.5 w-1.5 rounded-full bg-success" title="Анализ готов" />}
          </button>
          <span className="ml-auto text-[10px] text-fg-subtle">Шагов: {totalSteps} | Скорость: {speed}×</span>
        </div>
      </div>

      {/* Diff & metrics live in modals so they never reflow the canvas/editor layout */}
      <Modal open={showDiff} onClose={() => setShowDiff(false)} title="Сравнение с эталоном" size="xl">
        <DiffView leftCode={code} rightCode={referenceCode} />
      </Modal>

      <Modal open={showMetrics} onClose={() => setShowMetrics(false)} title="Метрики выполнения" size="lg">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <MetricCard label="Время выполнения" value={runResult ? `${runResult.runtime ?? 0} мс` : "—"} />
          <MetricCard
            label="Результат теста"
            value={runResult ? (runResult.passed ? "✓ Пройден" : "✗ Провален") : "—"}
            color={runResult?.passed ? "text-success" : runResult ? "text-danger" : "text-fg-muted"}
          />
          <MetricCard label="Язык" value={LANG_LABELS[language]} />
          <MetricCard label="Перестановок" value={hasTrace ? String(traceSwaps) : "—"} />
          <MetricCard label="Записей в массив" value={hasTrace ? String(traceWrites) : "—"} />
          <MetricCard label="Всего операций" value={hasTrace ? String(traceTotal) : "—"} />
          <MetricCard label="Размер массива (n)" value={String(arraySize)} />
          <MetricCard label="Шагов визуализации" value={String(totalSteps)} />
          <MetricCard label="Сложность по времени" value={algo.time_complexity || "—"} />
          <MetricCard label="Сложность по памяти" value={algo.space_complexity || "—"} />
        </div>
        {!runResult && (
          <p className="text-xs text-fg-subtle mt-3">Запустите код, чтобы увидеть результаты выполнения.</p>
        )}
        {runResult && !hasTrace && (
          <p className="text-xs text-fg-subtle mt-3">
            Пооперационные метрики (перестановки, записи) отслеживаются только для JavaScript-сортировок «на месте».
            Решения, создающие новый массив, и другие языки выполняются на сервере без трассировки операций.
          </p>
        )}
      </Modal>

      <Modal open={showAI} onClose={() => setShowAI(false)} title="AI-анализ кода" size="xl">
        {aiLoading ? (
          <div className="flex items-center gap-2 text-sm text-fg-muted py-6 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            AI анализирует код…
          </div>
        ) : aiError ? (
          <div className="rounded-xl border border-danger/20 bg-danger/[0.04] p-5 text-center space-y-2">
            <AlertTriangle className="h-9 w-9 text-danger/70 mx-auto" />
            <p className="text-sm font-medium text-danger">ИИ-анализ недоступен</p>
            <p className="text-xs text-fg-muted max-w-md mx-auto leading-relaxed">{aiError}</p>
          </div>
        ) : aiOpenAI || aiGigaChat ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiOpenAI && (
              <div className="bg-gradient-to-br from-bg-elev to-bg-subtle border border-indigo-500/10 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/40">
                  <div className="h-6 w-6 rounded-md bg-indigo-500/10 grid place-items-center">
                    <Bot className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                  <span className="text-xs font-semibold text-indigo-500">
                    {aiIsLocal ? "Локальный анализ" : "OpenAI (GPT-4o-mini)"}
                  </span>
                </div>
                <Markdown text={aiOpenAI} />
              </div>
            )}
            {aiGigaChat ? (
              <div className="bg-gradient-to-br from-bg-elev to-bg-subtle border border-purple-500/10 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/40">
                  <div className="h-6 w-6 rounded-md bg-purple-500/10 grid place-items-center">
                    <Bot className="h-3.5 w-3.5 text-purple-500" />
                  </div>
                  <span className="text-xs font-semibold text-purple-500">GigaChat</span>
                </div>
                <Markdown text={aiGigaChat} />
              </div>
            ) : aiOpenAI ? (
              <div className="bg-bg-subtle rounded-xl p-4 border border-border/50 flex items-center justify-center">
                <p className="text-xs text-fg-muted">GigaChat временно недоступен</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <Lightbulb className="h-10 w-10 text-amber/60 mx-auto" />
            <p className="text-sm font-medium">AI-анализ появится после запуска кода</p>
            <p className="text-xs text-fg-subtle max-w-sm mx-auto">
              Нажмите «Запустить» — нейросеть проанализирует ваше решение, объяснит ошибки и предложит улучшения.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function MetricCard({ label, value, color = "text-fg" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg-subtle rounded-lg px-3 py-2.5 text-center border border-border">
      <p className="text-[11px] text-fg-muted mb-0.5">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums", color)}>{value}</p>
    </div>
  );
}

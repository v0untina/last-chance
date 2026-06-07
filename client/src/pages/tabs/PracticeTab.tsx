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
import type { Algorithm, DualAIResponse, ExecuteResult } from "@/types/api";
import type { WorkerRequest, WorkerResponse, TraceOp } from "@/workers/code-executor.worker";
import { DiffView } from "@/components/DiffView";
import { api, extractErrorMessage } from "@/lib/api";

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
});

function getEngineKey(slug: string): EngineKey {
  if (slug.includes("bubble")) return "bubble";
  if (slug.includes("insertion")) return "insertion";
  if (slug.includes("selection")) return "selection";
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

function runWorker(code: string, entryArg: unknown, trace = false): Promise<{ value: unknown; runtime: number; trace?: TraceOp[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("@/workers/code-executor.worker.ts", import.meta.url), { type: "module" });
    const id = Date.now();
    const onMsg = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id !== id) return;
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
  return "binarySearch";
}

const LANG_LABELS: Record<SupportedLanguage, string> = {
  javascript: "JavaScript", python: "Python", java: "Java", cpp: "C++", go: "Go",
};

export default function PracticeTab() {
  const { algo } = useOutletContext<{ algo: Algorithm }>();
  const engineKey = getEngineKey(algo.slug);
  const engine = engines[engineKey];
  const referenceCode = templates[algo.slug]?.javascript ?? "";

  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [code, setCode] = useState(() => getTemplate(algo.slug, "javascript"));
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ passed: boolean; output: string; runtime?: number; trace?: TraceOp[] } | null>(null);

  const [showDiff, setShowDiff] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showAI, setShowAI] = useState(true);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpenAI, setAiOpenAI] = useState<string | null>(null);
  const [aiGigaChat, setAiGigaChat] = useState<string | null>(null);

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
    try {
      const { data } = await api.post<DualAIResponse>("/ai/analyze-dual", {
        code: userCode,
        errorMessage,
        algorithmName: algo.name,
        language,
      });
      setAiOpenAI(data.data.openai?.text ?? null);
      setAiGigaChat(data.data.gigachat?.text ?? null);
    } catch {
      setAiOpenAI("Не удалось получить ответ от AI");
      setAiGigaChat(null);
    } finally {
      setAiLoading(false);
    }
  }, [algo.name, language]);

  const executeJS = useCallback(async (codeToRun: string, doTrace: boolean): Promise<{ passed: boolean; output: string; runtime?: number; trace?: TraceOp[] }> => {
    const fnName = getAlgorithmFnName(algo.slug);
    const testInput = algo.slug === "binary-search"
      ? [arrayRef.current, arrayRef.current[Math.floor(arrayRef.current.length / 2)]]
      : arrayRef.current;

    let execCode: string, entryArg: unknown;
    if (algo.slug === "binary-search") {
      const target = (testInput as number[])[Math.floor((testInput as number[]).length / 2)];
      execCode = `${codeToRun}\n\nreturn (a) => ${fnName}(a, ${target});`;
      entryArg = testInput;
    } else {
      execCode = `${codeToRun}\n\nreturn ${fnName};`;
      entryArg = testInput;
    }

    const result = await runWorker(execCode, entryArg, doTrace);
    const expected = algo.slug === "binary-search"
      ? Math.floor(arrayRef.current.length / 2)
      : [...arrayRef.current].sort((a, b) => a - b);
    const passed = JSON.stringify(result.value) === JSON.stringify(expected);
    return { passed, output: JSON.stringify(result.value), runtime: result.runtime, trace: result.trace };
  }, [algo.slug]);

  const executePiston = useCallback(async (codeToRun: string): Promise<{ passed: boolean; output: string; runtime?: number }> => {
    const input = [...arrayRef.current];
    const { data } = await api.post<ExecuteResult>("/execute/run", { language, code: codeToRun, input });
    const expected = algo.slug === "binary-search"
      ? String(Math.floor(arrayRef.current.length / 2))
      : getExpectedOutput(algo.slug);
    const passed = data.data.passed && data.data.output.trim() === expected;
    return { passed, output: data.data.output, runtime: data.data.runtime };
  }, [language, algo.slug]);

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setRunResult(null);
    setAiOpenAI(null);
    setAiGigaChat(null);

    try {
      const result = language === "javascript"
        ? await executeJS(code, true)
        : await executePiston(code);
      setRunResult(result);

      if (result.passed) {
        if (result.trace && result.trace.length > 0 && rendererRef.current) {
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
        fetchDualAI(code);
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
    const onResize = () => renderer.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
  const traceComparisons = traceOps.filter((t) => t.type !== "swap").length;
  const traceSwaps = traceOps.filter((t) => t.type === "swap").length;

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
              {codeHasError ? "⛔ Код содержит ошибку" : `Визуализация ${runResult?.trace ? "(ваш код)" : "(эталон)"}`}
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
            {codeHasError ? (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  <AlertTriangle className="h-12 w-12 text-danger/60 mx-auto mb-3" />
                  <p className="text-sm font-medium text-danger mb-1">Код содержит ошибку</p>
                  <p className="text-xs text-fg-muted">Исправьте ошибки в коде, чтобы увидеть визуализацию алгоритма. Ниже показаны подсказки от ИИ.</p>
                </div>
              </div>
            ) : (
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
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

        <div className="w-1/2 flex flex-col bg-[#0b0f19]">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#1e293b] bg-[#0b0f19] shrink-0">
            <Code2 className="h-3.5 w-3.5 text-[#569cd6]" />
            <span className="text-xs font-medium text-[#e6e9ef]">Редактор ({LANG_LABELS[language]})</span>
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
              theme="algo-dark"
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
          {aiOpenAI && (
            <button onClick={() => setShowAI(!showAI)} className={cn("flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors", showAI ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg")}>
              <Lightbulb className="h-3.5 w-3.5 text-amber" /> AI Анализ
            </button>
          )}
          <span className="ml-auto text-[10px] text-fg-subtle">Шагов: {totalSteps} | Скорость: {speed}×</span>
        </div>

        {showDiff && (
          <div className="p-2 border-b border-border max-h-[240px] overflow-y-auto">
            <DiffView leftCode={code} rightCode={referenceCode} />
          </div>
        )}

        {showMetrics && (
          <div className="p-2 border-b border-border">
            <div className="grid grid-cols-5 gap-2">
              <MetricCard label="Время" value={`${runResult?.runtime ?? 0} мс`} />
              <MetricCard label="Сравнений" value={String(runResult?.trace ? traceComparisons : "—")} />
              <MetricCard label="Обменов" value={String(runResult?.trace ? traceSwaps : "—")} />
              <MetricCard label="Тест" value={runResult ? (runResult.passed ? "✓ Пройден" : "✗ Провален") : "—"} color={runResult?.passed ? "text-success" : runResult ? "text-danger" : "text-fg-muted"} />
              <MetricCard label="Элементов" value={`${arraySize}`} />
            </div>
          </div>
        )}

        {showAI && (aiLoading || aiOpenAI || aiGigaChat) && (
          <div className="p-3 border-b border-border">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-fg-muted py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI анализирует код...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {aiOpenAI && (
                  <div className="bg-bg-subtle rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-blue" />
                      <span className="text-xs font-semibold text-blue">OpenAI (GPT-4o-mini)</span>
                    </div>
                    <p className="text-sm leading-relaxed text-fg whitespace-pre-wrap">{aiOpenAI}</p>
                  </div>
                )}
                {aiGigaChat ? (
                  <div className="bg-bg-subtle rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-purple" />
                      <span className="text-xs font-semibold text-purple">GigaChat</span>
                    </div>
                    <p className="text-sm leading-relaxed text-fg whitespace-pre-wrap">{aiGigaChat}</p>
                  </div>
                ) : aiOpenAI && !aiGigaChat ? (
                  <div className="bg-bg-subtle rounded-lg p-3 border border-border/50 flex items-center justify-center">
                    <p className="text-xs text-fg-muted">GigaChat временно недоступен</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = "text-fg" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg-subtle rounded px-2 py-1.5 text-center">
      <p className="text-[10px] text-fg-muted">{label}</p>
      <p className={cn("text-xs font-semibold tabular-nums", color)}>{value}</p>
    </div>
  );
}

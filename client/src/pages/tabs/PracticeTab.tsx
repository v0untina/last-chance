import { useEffect, useRef, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import Editor, { loader } from "@monaco-editor/react";
import { Play, RotateCcw, StepForward, StepBack, CheckCircle2, XCircle, Code2, Eye, Pause, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { engines, type EngineKey } from "@/visualization/engines";
import type { Step } from "@/visualization/AlgorithmEngine";
import { AnimationController } from "@/visualization/AnimationController";
import { CanvasRenderer } from "@/visualization/CanvasRenderer";
import { SUPPORTED_LANGUAGES, getTemplate, getDefaultTestInput, type SupportedLanguage } from "@/lib/templates";
import type { Algorithm } from "@/types/api";
import type { WorkerRequest, WorkerResponse } from "@/workers/code-executor.worker";

loader.init().then((monaco) => {
  monaco.editor.defineTheme("algo-dark", {
    base: "vs-dark",
    inherit: true,
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

export default function PracticeTab() {
  const { algo } = useOutletContext<{ algo: Algorithm }>();
  const engineKey = getEngineKey(algo.slug);
  const engine = engines[engineKey];

  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [code, setCode] = useState(() => getTemplate(algo.slug, "javascript"));
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ passed: boolean; output: string; runtime?: number } | null>(null);
  const [liveResult, setLiveResult] = useState<{ ok: boolean; value?: unknown; error?: string; runtime?: number } | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const ctrlRef = useRef<AnimationController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [randomInput] = useState(() => [5, 2, 8, 1, 9, 3]);

  useEffect(() => {
    setCode(getTemplate(algo.slug, language));
    setRunResult(null);
  }, [algo.slug, language]);

  const loadSteps = useCallback((steps: Step[]) => {
    if (!rendererRef.current) return;
    const ctrl = new AnimationController(
      rendererRef.current,
      (step, idx) => {
        setCurrentStep(step);
        setStepIndex(idx);
      },
      () => setPlaying(false)
    );
    ctrlRef.current = ctrl;
    ctrl.load(steps);
    setTotalSteps(steps.length);
    setStepIndex(0);
    setPlaying(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;
    renderer.resize();
    const steps = engine.generateSteps([...randomInput], engineKey === "binary" ? 7 : undefined);
    loadSteps(steps);
    const onResize = () => renderer.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [engine, randomInput, engineKey, loadSteps]);

  const handlePlayPause = () => {
    if (!ctrlRef.current) return;
    if (playing) { ctrlRef.current.pause(); setPlaying(false); }
    else { ctrlRef.current.play(); setPlaying(true); }
  };

  const handleStepForward = () => ctrlRef.current?.stepForward();
  const handleStepBackward = () => ctrlRef.current?.stepBackward();

  const handleReset = () => {
    if (!ctrlRef.current) return;
    ctrlRef.current.stop();
    setPlaying(false);
    setStepIndex(0);
  };

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    ctrlRef.current?.setSpeed(s);
  };

  const handleRandomize = () => {
    if (!rendererRef.current) return;
    const len = 5 + Math.floor(Math.random() * 4);
    const newArr = Array.from({ length: len }, () => Math.floor(Math.random() * 19) + 1);
    const steps = engine.generateSteps(newArr, engineKey === "binary" ? Math.floor(Math.random() * 19) + 1 : undefined);
    loadSteps(steps);
    rendererRef.current.clear();
    setRunResult(null);
  };

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setRunResult(null);

    if (language !== "javascript") {
      setRunResult({ passed: false, output: `Выполнение ${SUPPORTED_LANGUAGES.find((l) => l.id === language)?.label} доступно после настройки серверного компилятора. Пока доступен только JavaScript.` });
      setRunning(false);
      return;
    }

    try {
      const worker = new Worker(new URL("@/workers/code-executor.worker.ts", import.meta.url), { type: "module" });
      const result = await new Promise<{ value: unknown; runtime: number }>((resolve, reject) => {
        const id = Date.now();
        const onMsg = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.id !== id) return;
          worker.removeEventListener("message", onMsg);
          if (e.data.type === "result") resolve({ value: e.data.value, runtime: e.data.runtime });
          else if (e.data.type === "error") reject(new Error(e.data.message));
        };
        worker.addEventListener("message", onMsg);

        const fnName = code.match(/function\s+(\w+)/)?.[1] ?? "bubbleSort";
        const testInput = getDefaultTestInput(algo.slug);

        let execCode: string;
        let entryArg: unknown;

        if (algo.slug === "binary-search") {
          const [arr, target] = testInput as [number[], number];
          execCode = `${code}\n\nreturn (a) => ${fnName}(a, ${target});`;
          entryArg = arr;
        } else {
          execCode = `${code}\n\nreturn ${fnName};`;
          entryArg = (testInput as [number[]])[0];
        }

        worker.postMessage({ id, type: "execute", code: execCode, entryArg } satisfies WorkerRequest);
      });
      worker.terminate();

      const expected = algo.slug === "binary-search" ? 3 : [1, 2, 3, 5, 8, 9];
      const passed = JSON.stringify(result.value) === JSON.stringify(expected);
      setRunResult({ passed, output: JSON.stringify(result.value), runtime: result.runtime });
    } catch (e) {
      setRunResult({ passed: false, output: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (language !== "javascript") return;
    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => {
      const fnName = code.match(/function\s+(\w+)/)?.[1] ?? "bubbleSort";
      try {
        const testInput = getDefaultTestInput(algo.slug);
        let execCode: string;
        let entryArg: unknown;
        if (algo.slug === "binary-search") {
          const [arr, target] = testInput as [number[], number];
          execCode = `${code}\n\nreturn (a) => ${fnName}(a, ${target});`;
          entryArg = arr;
        } else {
          execCode = `${code}\n\nreturn ${fnName};`;
          entryArg = (testInput as [number[]])[0];
        }
        const worker = new Worker(new URL("@/workers/code-executor.worker.ts", import.meta.url), { type: "module" });
        const id = Date.now();
        const onMsg = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.id !== id) return;
          worker.removeEventListener("message", onMsg);
          worker.terminate();
          if (e.data.type === "result") {
            const expected = algo.slug === "binary-search" ? 3 : [1, 2, 3, 5, 8, 9];
            const passed = JSON.stringify(e.data.value) === JSON.stringify(expected);
            setLiveResult({ ok: e.data.value !== undefined, value: e.data.value, runtime: e.data.runtime });
          } else if (e.data.type === "error") {
            setLiveResult({ ok: false, error: e.data.message });
          }
        };
        worker.addEventListener("message", onMsg);
        worker.postMessage({ id, type: "execute", code: execCode, entryArg } satisfies WorkerRequest);
      } catch {
        setLiveResult(null);
      }
    }, 1200);
    return () => { if (liveTimerRef.current) clearTimeout(liveTimerRef.current); };
  }, [code, language, algo.slug]);

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px] -mx-4 sm:mx-0">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-elev shrink-0 flex-wrap">
        <Code2 className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium mr-2">Язык:</span>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setLanguage(lang.id)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              language === lang.id ? "bg-accent text-white" : "bg-bg-subtle text-fg-muted hover:text-fg"
            )}
          >
            {lang.label}
          </button>
        ))}
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
            <span className="text-xs font-medium">Визуализация</span>
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
          </div>

          <div className="flex-1 relative min-h-0">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          </div>

          <div className="border-t border-border bg-bg-subtle p-2 space-y-1.5 shrink-0 max-h-[130px] overflow-y-auto">
            {engine.pseudocode.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "text-xs font-mono px-2 py-0.5 rounded transition-colors",
                  currentStep?.line === i + 1 ? "bg-accent/15 text-accent font-semibold border-l-2 border-accent" : "text-fg-muted"
                )}
              >
                {line}
              </div>
            ))}
          </div>

          {currentStep?.variables && Object.keys(currentStep.variables).length > 0 && (
            <div className="border-t border-border bg-bg-elev px-3 py-1.5 flex gap-3 flex-wrap shrink-0">
              {Object.entries(currentStep.variables).map(([k, v]) => (
                <span key={k} className="text-xs">
                  <span className="text-fg-subtle">{k}:</span>{" "}
                  <span className="font-mono font-medium">{String(v)}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="w-1/2 flex flex-col bg-[#0b0f19]">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#1e293b] bg-[#0b0f19] shrink-0">
            <Code2 className="h-3.5 w-3.5 text-[#569cd6]" />
            <span className="text-xs font-medium text-[#e6e9ef]">Редактор кода</span>
            {language === "javascript" && liveResult && (
              <span className={cn("text-[10px] font-mono ml-2", liveResult.ok ? "text-success" : "text-danger")}>
                {liveResult.ok ? `✓ ${liveResult.runtime}ms` : `✗ err`}
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
            <div className={cn(
              "border-t px-3 py-2 shrink-0 text-xs font-mono",
              runResult.passed ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
            )}>
              <div className="flex items-center gap-2 mb-1">
                {runResult.passed
                  ? <CheckCircle2 className="h-4 w-4 text-success" />
                  : <XCircle className="h-4 w-4 text-danger" />
                }
                <span className={cn("font-medium", runResult.passed ? "text-success" : "text-danger")}>
                  {runResult.passed ? "Тест пройден" : "Ошибка"}
                </span>
                {runResult.runtime !== undefined && (
                  <span className="text-fg-muted ml-auto">{runResult.runtime} мс</span>
                )}
              </div>
              <pre className="whitespace-pre-wrap text-fg-muted">{runResult.output}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

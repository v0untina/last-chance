import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge, Code2, Sparkles, Loader2, X, Shuffle, BookOpen, Variable } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { engines, type EngineKey } from "@/visualization/engines";
import { CanvasRenderer } from "@/visualization/CanvasRenderer";
import { AnimationController } from "@/visualization/AnimationController";
import { StatsCollector } from "@/visualization/StatsCollector";
import { api, extractErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import type { Algorithm } from "@/types/api";
import type { WorkerRequest, WorkerResponse } from "@/workers/code-executor.worker";

const SAMPLES: Record<EngineKey, string> = {
  bubble: "5, 3, 8, 1, 9, 2, 7, 4, 6, 0",
  insertion: "8, 3, 1, 7, 4, 9, 2, 6, 5",
  selection: "64, 25, 12, 22, 11, 8, 39, 17, 31",
  binary: "1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25",
};

const STARTER_CODE: Record<EngineKey, string> = {
  bubble: `// Сортировка пузырьком
const sort = (arr) => {
  const a = [...arr];
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]];
    }
  }
  return a;
};
return sort;`,
  insertion: `const sort = (arr) => {
  const a = [...arr];
  for (let i = 1; i < a.length; i++) {
    const k = a[i]; let j = i - 1;
    while (j >= 0 && a[j] > k) { a[j + 1] = a[j]; j--; }
    a[j + 1] = k;
  }
  return a;
};
return sort;`,
  selection: `const sort = (arr) => {
  const a = [...arr];
  for (let i = 0; i < a.length; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j;
    [a[i], a[m]] = [a[m], a[i]];
  }
  return a;
};
return sort;`,
  binary: `const search = (arr) => {
  let lo = 0, hi = arr.length - 1;
  const target = 7;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
};
return search;`,
};

function pickEngine(slug: string): EngineKey {
  const s = slug.toLowerCase();
  if (s.includes("bubble")) return "bubble";
  if (s.includes("insertion")) return "insertion";
  if (s.includes("selection")) return "selection";
  if (s.includes("binary")) return "binary";
  return "bubble";
}

const LEGEND = [
  { color: "bg-warning", label: "Сравниваются" },
  { color: "bg-danger", label: "Обмен/сдвиг" },
  { color: "bg-accent", label: "Активный" },
  { color: "bg-success", label: "На своём месте" },
  { color: "bg-info", label: "Подсветка" },
  { color: "bg-fg-subtle", label: "Не обработан" },
];

export default function VisualizationTab() {
  const { algo } = useOutletContext<{ algo: Algorithm }>();
  const { t } = useTranslation();

  const engineKey = useMemo<EngineKey>(() => pickEngine(algo.slug), [algo.slug]);
  const [engineSelection, setEngineSelection] = useState<EngineKey>(engineKey);
  const [arrText, setArrText] = useState(SAMPLES[engineKey]);
  const [target, setTarget] = useState("7");
  const [stats, setStats] = useState({ comparisons: 0, swaps: 0, elapsed: 0 });
  const [stepInfo, setStepInfo] = useState({ current: 0, total: 0 });
  const [currentStep, setCurrentStep] = useState<{ line?: number; variables?: Record<string, number | string>; note?: string }>({});
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ text: string; provider: string; cached?: boolean } | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAction, setAiAction] = useState<"explain" | "analyze" | "hint">("explain");

  const [code, setCode] = useState(STARTER_CODE[engineKey]);
  const [codeResult, setCodeResult] = useState<{ ok: boolean; value?: unknown; error?: string; runtime?: number; logs: unknown[] } | null>(null);
  const [codeRunning, setCodeRunning] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const ctrlRef = useRef<AnimationController | null>(null);
  const statsRef = useRef<StatsCollector>(new StatsCollector());
  const workerRef = useRef<Worker | null>(null);

  const parseArray = (s: string): number[] => s.split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n));

  const engine = engines[engineSelection];

  useEffect(() => {
    setCode(STARTER_CODE[engineSelection]);
    setArrText(SAMPLES[engineSelection]);
    setStepInfo({ current: 0, total: 0 });
    setCurrentStep({});
    setStats({ comparisons: 0, swaps: 0, elapsed: 0 });
    setCodeResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineSelection]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const r = new CanvasRenderer(canvasRef.current);
    r.resize();
    rendererRef.current = r;
    const ro = new ResizeObserver(() => r.resize());
    ro.observe(canvasRef.current);
    ctrlRef.current = new AnimationController(
      r,
      (step, idx) => {
        if (step.stats) statsRef.current.update(step.stats);
        setStats(statsRef.current.get());
        setCurrentStep({ line: step.line, variables: step.variables, note: step.note });
        setStepInfo({ current: idx + 1, total: ctrlRef.current!.totalSteps() });
      },
      () => { setPlaying(false); }
    );
    runVisualization();
    return () => { ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineSelection, arrText, target]);

  const runVisualization = () => {
    const arr = parseArray(arrText);
    if (arr.length === 0) { toast.error("Введите массив"); return; }
    const t = Number(target);
    const steps = engines[engineSelection].generateSteps(arr, Number.isFinite(t) ? t : undefined);
    statsRef.current.start();
    setStats({ comparisons: 0, swaps: 0, elapsed: 0 });
    setStepInfo({ current: 0, total: steps.length });
    setCurrentStep({});
    ctrlRef.current?.load(steps);
    setPlaying(false);
  };

  const handlePlayPause = () => {
    if (!ctrlRef.current) return;
    if (playing) { ctrlRef.current.pause(); setPlaying(false); }
    else { ctrlRef.current.play(); setPlaying(true); }
  };

  const runCode = () => {
    if (codeRunning) return;
    if (playing) { ctrlRef.current?.pause(); setPlaying(false); }
    setCodeRunning(true);
    setCodeResult({ ok: false, logs: [] });

    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("@/workers/code-executor.worker.ts", import.meta.url), { type: "module" });
    }
    const worker = workerRef.current;
    const id = Date.now();
    let currentLogs: unknown[] = [];
    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.id !== id) return;
      if (msg.type === "log") {
        currentLogs = [...currentLogs, ...msg.args];
        setCodeResult((p) => p ? { ...p, logs: currentLogs } : { ok: true, logs: currentLogs });
      } else if (msg.type === "result") {
        setCodeResult({ ok: true, value: msg.value, runtime: msg.runtime, logs: currentLogs });
        setCodeRunning(false);
        worker.removeEventListener("message", onMessage);
      } else if (msg.type === "error") {
        setCodeResult({ ok: false, error: msg.message, logs: currentLogs });
        setCodeRunning(false);
        worker.removeEventListener("message", onMessage);
      }
    };
    worker.addEventListener("message", onMessage);
    const arr = parseArray(arrText);
    const entryArg = engineSelection === "binary" ? [arr, Number(target)] : arr;
    const req: WorkerRequest = { id, type: "execute", code, entryArg };
    worker.postMessage(req);
  };

  const askAI = async () => {
    if (!aiPrompt.trim()) {
      setAiPrompt(`Объясни, как работает алгоритм "${engine.name}" и какая у него временная сложность`);
    }
    setAiLoading(true);
    setAiResponse(null);
    try {
      const { data } = await api.post<{ data: { text: string; provider: string; cached?: boolean } }>("/ai/ask", {
        prompt: aiPrompt || `Объясни ${engine.name}`,
        type: aiAction,
        context: { code: code.slice(0, 3000), algorithm: algo.slug, action: aiAction, language: "javascript" },
        provider: "auto",
      });
      setAiResponse(data.data);
    } catch (e) {
      toast.error(extractErrorMessage(e, t("ai.error")));
    } finally {
      setAiLoading(false);
    }
  };

  const randomize = () => {
    const len = 8 + Math.floor(Math.random() * 6);
    const arr = Array.from({ length: len }, () => Math.floor(Math.random() * 99) + 1);
    setArrText(arr.join(", "));
  };

  return (
    <div className="space-y-4">
      {/* Control panel */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Select
                label="Алгоритм"
                value={engineSelection}
                onChange={(e) => setEngineSelection(e.target.value as EngineKey)}
                options={[
                  { value: "bubble", label: "Пузырьковая сортировка" },
                  { value: "insertion", label: "Сортировка вставками" },
                  { value: "selection", label: "Сортировка выбором" },
                  { value: "binary", label: "Бинарный поиск" },
                ]}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                label={t("visualization.array_input_label")}
                value={arrText}
                onChange={(e) => setArrText(e.target.value)}
                placeholder="5, 3, 8, 1, 9, 2, 7, 4, 6"
              />
            </div>
            {engineSelection === "binary" && (
              <div className="w-24">
                <Input label="Цель" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
            )}
            <Button variant="outline" onClick={randomize}><Shuffle className="h-4 w-4" />Случайный</Button>
            <Button onClick={runVisualization}><RotateCcw className="h-4 w-4" />{t("common.retry")}</Button>
          </div>
        </CardBody>
      </Card>

      {/* Main viz: canvas + side info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardBody>
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Button onClick={handlePlayPause}>
                  {playing ? <><Pause className="h-4 w-4" />{t("visualization.controls.pause")}</> : <><Play className="h-4 w-4" />{t("visualization.controls.play")}</>}
                </Button>
                <Button variant="outline" onClick={() => ctrlRef.current?.stepBackward()}><SkipBack className="h-4 w-4" />{t("visualization.controls.step_back")}</Button>
                <Button variant="outline" onClick={() => ctrlRef.current?.stepForward()}><SkipForward className="h-4 w-4" />{t("visualization.controls.step_forward")}</Button>
                <Button variant="ghost" onClick={() => { ctrlRef.current?.stop(); setPlaying(false); }}><RotateCcw className="h-4 w-4" />{t("visualization.controls.reset")}</Button>
                <div className="ml-auto flex items-center gap-2 min-w-[160px]">
                  <Gauge className="h-4 w-4 text-fg-muted" />
                  <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={(e) => { const v = Number(e.target.value); setSpeed(v); ctrlRef.current?.setSpeed(v); }} className="flex-1 accent-accent" />
                  <span className="text-xs text-fg-muted w-8">{speed}x</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <Stat label={t("visualization.stats.step")} value={`${stepInfo.current} / ${stepInfo.total}`} />
                <Stat label={t("visualization.stats.comparisons")} value={stats.comparisons} />
                <Stat label={t("visualization.stats.swaps")} value={stats.swaps} />
                <Stat label={t("visualization.stats.elapsed")} value={`${(stats.elapsed / 1000).toFixed(1)}s`} />
              </div>

              {/* Timeline scrubber */}
              <input
                type="range"
                min={1}
                max={Math.max(1, stepInfo.total)}
                value={stepInfo.current || 0}
                onChange={(e) => {
                  const idx = Number(e.target.value) - 1;
                  if (idx >= 0 && ctrlRef.current) {
                    ctrlRef.current.pause(); setPlaying(false);
                    // Move to step by playing forward (or implement direct seek)
                    const diff = idx - ctrlRef.current.currentIndex();
                    if (diff > 0) for (let i = 0; i < diff; i++) ctrlRef.current.stepForward();
                    else for (let i = 0; i < -diff; i++) ctrlRef.current.stepBackward();
                  }
                }}
                className="w-full accent-accent mb-3"
              />

              {/* Canvas */}
              <div className="relative w-full h-[340px] sm:h-[420px] bg-bg-subtle rounded-lg overflow-hidden border border-border">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                {!currentStep.note && (
                  <div className="absolute inset-0 grid place-items-center text-fg-subtle text-sm">
                    Нажмите «Старт» или «Шаг вперёд»
                  </div>
                )}
              </div>

              {/* Current step description */}
              <div className="mt-3 p-3 bg-bg-subtle rounded-lg">
                <p className="text-sm leading-relaxed">{currentStep.note ?? "Готово к запуску"}</p>
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                {LEGEND.map((l) => (
                  <span key={l.label} className="inline-flex items-center gap-1.5">
                    <span className={`inline-block w-3 h-3 rounded ${l.color}`} />{l.label}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right column: pseudocode + variables */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4" />Псевдокод</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <pre className="font-mono text-xs leading-relaxed p-4 overflow-x-auto">
                {engine.pseudocode.map((line, i) => {
                  const lineNo = i + 1;
                  const isActive = currentStep.line === lineNo;
                  return (
                    <div
                      key={i}
                      className={`px-2 py-0.5 rounded transition-colors ${isActive ? "bg-accent/20 text-accent font-semibold" : "text-fg-muted"}`}
                    >
                      <span className="inline-block w-5 text-right pr-2 text-fg-subtle">{lineNo}</span>
                      {line || "\u00A0"}
                    </div>
                  );
                })}
              </pre>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Variable className="h-4 w-4" />Переменные</CardTitle>
            </CardHeader>
            <CardBody>
              {currentStep.variables && Object.keys(currentStep.variables).length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {Object.entries(currentStep.variables).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 px-2 py-1 bg-bg-subtle rounded">
                      <span className="font-mono text-fg-muted">{k}</span>
                      <span className="font-mono font-semibold text-fg">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-subtle">— значения появятся при старте —</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Code editor + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code2 className="h-4 w-4" />{t("visualization.code_label")}
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setAiOpen((v) => !v)}>
                <Sparkles className="h-4 w-4" />{t("ai.title")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              spellCheck={false}
            />
            <p className="text-xs text-fg-subtle mt-1">Используйте <code className="px-1 bg-bg-subtle rounded">module.exports = fn</code></p>
            <Button onClick={runCode} loading={codeRunning} className="mt-2">
              {codeRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {codeRunning ? t("visualization.code_running") : t("visualization.run_code")}
            </Button>
            {codeResult && (
              <div className="mt-3 p-3 bg-bg-subtle rounded-lg text-sm space-y-2">
                {codeResult.logs.length > 0 && (
                  <div>
                    <p className="text-xs text-fg-muted mb-1">{t("visualization.code_stdout")}:</p>
                    <pre className="font-mono text-xs whitespace-pre-wrap break-all">{codeResult.logs.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join(" ")}</pre>
                  </div>
                )}
                {codeResult.ok && codeResult.value !== undefined && (
                  <div>
                    <p className="text-xs text-fg-muted mb-1">{t("visualization.code_result")}:</p>
                    <pre className="font-mono text-xs whitespace-pre-wrap break-all text-success">{JSON.stringify(codeResult.value)}</pre>
                    {typeof codeResult.runtime === "number" && (
                      <p className="text-xs text-fg-muted mt-1">{t("visualization.code_runtime")}: {codeResult.runtime} мс</p>
                    )}
                  </div>
                )}
                {!codeResult.ok && codeResult.error && (
                  <p className="text-danger text-xs font-mono whitespace-pre-wrap">{codeResult.error}</p>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {aiOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-accent" />{t("ai.title")}
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setAiOpen(false)}><X className="h-4 w-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["explain", "analyze", "hint"] as const).map((act) => (
                  <Button key={act} size="sm" variant={aiAction === act ? "primary" : "outline"} onClick={() => setAiAction(act)}>
                    {act === "explain" ? t("ai.explain") : act === "analyze" ? t("ai.analyze") : t("ai.hint")}
                  </Button>
                ))}
              </div>
              <Textarea
                label={t("ai.ask_label")}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t("ai.ask_placeholder")}
                rows={3}
              />
              <Button onClick={askAI} loading={aiLoading} className="w-full">
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ai.send")}
              </Button>
              {aiResponse && (
                <div className="p-3 bg-bg-subtle rounded-lg space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs text-fg-muted">
                    <Badge tone="info">{aiResponse.provider}</Badge>
                    {aiResponse.cached && <Badge tone="default">{t("ai.cached")}</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{aiResponse.text}</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bg-subtle rounded-lg px-3 py-2">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

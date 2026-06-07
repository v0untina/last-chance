import { useEffect, useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import { BookOpen, CheckCircle2, XCircle, Save, ArrowRight, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import { api, extractErrorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import toast from "react-hot-toast";
import type { Algorithm } from "@/types/api";

const NOTES_KEY = (algoId: number) => `algo.notes.${algoId}`;

interface TheoryModule {
  material_id: number;
  title: string;
  content: string;
  type: string;
  order_num: number;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  } | null;
}

interface QuizState {
  selectedIndex: number | null;
  checked: boolean;
  correct: boolean;
  explanation: string;
  newQuiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  } | null;
  aiLoading: boolean;
}

export default function TheoryTab() {
  const { algo } = useOutletContext<{ algo: Algorithm }>();
  const { t } = useTranslation();
  const modules = useMemo<TheoryModule[]>(() => {
    if (!algo.theory_materials) return [];
    return algo.theory_materials
      .filter((m) => m.type !== "code" || m.content.length > 10)
      .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
      .map((m) => ({
        material_id: m.material_id,
        title: m.title,
        content: m.content.replace(/\\n/g, "\n"),
        type: m.type ?? "text",
        order_num: m.order_num ?? 0,
        quiz: m.quiz ?? null,
      }));
  }, [algo.theory_materials]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [quizState, setQuizState] = useState<Record<number, QuizState>>({});
  const [theoryCompleted, setTheoryCompleted] = useState(!!algo.progress?.theory_completed);
  const [notes, setNotes] = useState(() => localStorage.getItem(NOTES_KEY(algo.algorithm_id)) ?? "");
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => { localStorage.setItem(NOTES_KEY(algo.algorithm_id), notes); }, [notes, algo.algorithm_id]);
  const saveNotes = () => toast.success(t("theory.saved"));

  const current = modules[currentIdx];
  const isLast = currentIdx === modules.length - 1;
  const progressPct = modules.length > 0 ? Math.round(((completed.size) / modules.length) * 100) : 0;

  const checkAnswer = useCallback(async (moduleId: number) => {
    const state = quizState[moduleId];
    if (!state || state.selectedIndex === null || state.checked) return;

    setQuizState((prev) => ({ ...prev, [moduleId]: { ...prev[moduleId], checked: true, aiLoading: true } }));

    try {
      const { data } = await api.post<{
        data: {
          correct: boolean;
          explanation: string;
          selectedIndex: number;
          correctIndex: number;
          newQuiz: TheoryModule["quiz"] | null;
        };
      }>(`/theory/${moduleId}/check-quiz`, { selectedIndex: state.selectedIndex });

      if (data.data.correct) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        setCompleted((prev) => new Set(prev).add(moduleId));
      }

      setQuizState((prev) => ({
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          checked: true,
          correct: data.data.correct,
          explanation: data.data.explanation,
          newQuiz: data.data.newQuiz,
          aiLoading: false,
        },
      }));
    } catch {
      setQuizState((prev) => ({
        ...prev,
        [moduleId]: { ...prev[moduleId], checked: true, correct: false, explanation: "Ошибка проверки", newQuiz: null, aiLoading: false },
      }));
    }
  }, [quizState]);

  const retryQuiz = useCallback((moduleId: number) => {
    setQuizState((prev) => ({
      ...prev,
      [moduleId]: { selectedIndex: null, checked: false, correct: false, explanation: "", newQuiz: null, aiLoading: false },
    }));
  }, []);

  const goNext = () => {
    if (currentIdx < modules.length - 1) setCurrentIdx(currentIdx + 1);
  };

  const goTo = (idx: number) => {
    if (idx <= currentIdx || completed.has(modules[currentIdx]?.material_id) || isLast) {
      setCurrentIdx(idx);
    }
  };

  const markComplete = async () => {
    try {
      await api.post(`/progress/${algo.algorithm_id}/theory-complete`);
      setTheoryCompleted(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      toast.success(t("theory.marked_complete"));
    } catch (e) {
      toast.error(extractErrorMessage(e, t("common.error")));
    }
  };

  if (modules.length === 0) {
    const missingQuiz = algo.theory_materials && algo.theory_materials.length > 0;
    return (
      <div className="text-center py-16">
        <BookOpen className="h-12 w-12 text-fg-subtle mx-auto mb-4" />
        <p className="text-fg-muted">Теоретический материал скоро появится.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <nav className="lg:w-64 shrink-0 order-2 lg:order-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Модули ({modules.length})</span>
              <span className="text-xs text-fg-muted">{progressPct}%</span>
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="h-[1px] bg-border" />
            <ul className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {modules.map((m, i) => {
                const done = completed.has(m.material_id);
                const active = i === currentIdx;
                const locked = i > currentIdx && !done && !completed.has(modules[currentIdx]?.material_id);
                return (
                  <li key={m.material_id}>
                    <button
                      onClick={() => goTo(i)}
                      disabled={locked}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors",
                        active ? "bg-accent/5 border-l-2 border-accent" : locked ? "opacity-40 cursor-not-allowed" : "hover:bg-bg-subtle"
                      )}
                    >
                      <span className={cn(
                        "flex-shrink-0 w-7 h-7 rounded-full grid place-items-center text-xs font-semibold border",
                        done ? "bg-success text-white border-success" : active ? "border-accent text-accent" : "border-border text-fg-muted"
                      )}>{i + 1}</span>
                      <span className="text-sm truncate flex-1">{m.title}</span>
                      {done && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <button onClick={() => setNotesExpanded((v) => !v)} className="flex items-center justify-between w-full">
              <CardTitle className="text-sm">{t("theory.notes_label")}</CardTitle>
              {notesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CardHeader>
          {notesExpanded && (
            <CardBody>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("theory.notes_placeholder")} rows={8} />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-fg-subtle">{notes.length} символов</span>
                <Button size="sm" variant="ghost" onClick={saveNotes}><Save className="h-4 w-4" /></Button>
              </div>
            </CardBody>
          )}
        </Card>
      </nav>

      <div className="flex-1 min-w-0 order-1 lg:order-2 space-y-4">
        {modules.map((m, i) => (
          <div key={m.material_id} className={i === currentIdx ? "block" : "hidden"}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-white grid place-items-center text-sm font-bold">{i + 1}</span>
                  <span>{m.title}</span>
                  {completed.has(m.material_id) && <CheckCircle2 className="h-5 w-5 text-success ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardBody>
                {m.type === "code" ? (
                  <pre className="p-4 rounded-lg bg-[#0b0f19] text-[#e6e9ef] overflow-x-auto text-sm font-mono leading-relaxed"><code>{m.content}</code></pre>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed text-fg-muted">{m.content}</div>
                )}

                {m.quiz && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <QuizBlock
                      moduleId={m.material_id}
                      quiz={m.quiz}
                      state={quizState[m.material_id]}
                      onSelect={(idx) => setQuizState((prev) => ({
                        ...prev,
                        [m.material_id]: { selectedIndex: idx, checked: false, correct: false, explanation: "", newQuiz: null, aiLoading: false },
                      }))}
                      onCheck={() => checkAnswer(m.material_id)}
                      onRetry={() => retryQuiz(m.material_id)}
                    />
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex gap-2">
                    {i > 0 && (
                      <Button variant="outline" onClick={() => setCurrentIdx(i - 1)}>
                        ← Предыдущий
                      </Button>
                    )}
                    {!isLast && (
                      <Button onClick={goNext} disabled={!completed.has(m.material_id)}>
                        Следующий → <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                    {isLast && (
                      <Button onClick={markComplete} disabled={theoryCompleted}>
                        {theoryCompleted ? <><CheckCircle2 className="h-4 w-4" />Изучено</> : "Завершить изучение"}
                      </Button>
                    )}
                  </div>
                  <Badge tone="default" className="text-xs">Модуль {i + 1} из {modules.length}</Badge>
                </div>
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizBlock({
  moduleId,
  quiz,
  state,
  onSelect,
  onCheck,
  onRetry,
}: {
  moduleId: number;
  quiz: NonNullable<TheoryModule["quiz"]>;
  state?: QuizState;
  onSelect: (idx: number) => void;
  onCheck: () => void;
  onRetry: () => void;
}) {
  const activeQuiz = state?.newQuiz ?? quiz;
  const selected = state?.selectedIndex ?? null;
  const checked = state?.checked ?? false;
  const correct = state?.correct ?? false;
  const explanation = state?.explanation ?? "";

  if (checked && correct) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-2 text-success font-medium">
          <CheckCircle2 className="h-5 w-5" />
          <span>Верно!</span>
        </div>
        <p className="text-sm text-fg-muted bg-success/5 rounded-lg p-3 border border-success/20">{explanation}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        Проверьте понимание
      </h4>
      <p className="font-medium">{activeQuiz.question}</p>
      <div className="space-y-2">
        {activeQuiz.options.map((opt, j) => {
          const isSelected = selected === j;
          let borderClass = "border-border hover:border-accent/50";
          if (checked) {
            if (j === activeQuiz.correctIndex) borderClass = "border-success bg-success/5";
            else if (isSelected) borderClass = "border-danger bg-danger/5";
          } else if (isSelected) {
            borderClass = "border-accent bg-accent/5";
          }
          return (
            <label key={j} className={cn("flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors", borderClass)}>
              <input
                type="radio"
                name={`quiz-${moduleId}`}
                checked={isSelected}
                onChange={() => !checked && onSelect(j)}
                disabled={checked}
                className="accent-accent"
              />
              <span className="text-sm">{opt}</span>
            </label>
          );
        })}
      </div>

      {!checked ? (
        <Button size="sm" onClick={onCheck} disabled={selected === null}>
          Проверить
        </Button>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-danger font-medium">
            <XCircle className="h-5 w-5" />
            <span>Неправильно</span>
          </div>
          <p className="text-sm text-fg-muted bg-danger/5 rounded-lg p-3 border border-danger/20">{explanation}</p>
          {state?.aiLoading ? (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI генерирует новый вопрос...
            </div>
          ) : state?.newQuiz ? (
            <div className="space-y-2">
              <Badge tone="info">Новый вопрос сгенерирован AI</Badge>
              <Button size="sm" variant="outline" onClick={onRetry}>Ответить на новый вопрос</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={onRetry}>Попробовать снова</Button>
          )}
        </div>
      )}
    </div>
  );
}

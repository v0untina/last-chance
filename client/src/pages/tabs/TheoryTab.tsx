import { useEffect, useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import { BookOpen, CheckCircle2, XCircle, Save, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { Textarea } from "@/components/ui/Input";
import { api, extractErrorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import toast from "react-hot-toast";
import type { Algorithm } from "@/types/api";
import { useProgress } from "@/stores/progress";

const QUESTIONS_TO_PASS = 3;
const NOTES_KEY = (algoId: number) => `algo.notes.${algoId}`;
const MODULES_KEY = (algoId: number) => `algo.modules.${algoId}`;

interface TheoryModule {
  material_id: number;
  title: string;
  content: string;
  type: string;
  order_num: number;
}

interface AiQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  explanations: string[];
}

interface QuizAttemptStats {
  total: number;
  correct: number;
  wrong: number;
}

export default function TheoryTab() {
  const { algo } = useOutletContext<{ algo: Algorithm }>();
  const { t } = useTranslation();
  const storeProgress = useProgress((s) => s.bySlug[algo.slug]);

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
      }));
  }, [algo.theory_materials]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(MODULES_KEY(algo.algorithm_id));
      return raw ? new Set<number>(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const [theoryCompleted, setTheoryCompleted] = useState(!!(storeProgress?.theory_completed ?? algo.progress?.theory_completed));
  const [notes, setNotes] = useState(() => localStorage.getItem(NOTES_KEY(algo.algorithm_id)) ?? "");
  const [notesExpanded, setNotesExpanded] = useState(false);

  // AI quiz state per module
  const [quizData, setQuizData] = useState<Record<number, {
    question: AiQuestion;
    selectedIndex: number | null;
    correctCount: number;
    status: "loading" | "answering" | "correct" | "wrong" | "passed";
    previousQuestions: string[];
    nextQuestion: AiQuestion | null;
    attempt: QuizAttemptStats | null;
  }>>({});

  useEffect(() => { localStorage.setItem(NOTES_KEY(algo.algorithm_id), notes); }, [notes, algo.algorithm_id]);
  useEffect(() => { localStorage.setItem(MODULES_KEY(algo.algorithm_id), JSON.stringify([...completed])); }, [completed, algo.algorithm_id]);

  // Load first question when module opens or changes
  const current = modules[currentIdx];
  const isLast = currentIdx === modules.length - 1;
  const progressPct = modules.length > 0 ? Math.round((completed.size / modules.length) * 100) : 0;

  // Load question for current module
  useEffect(() => {
    if (!current || completed.has(current.material_id)) return;

    const state = quizData[current.material_id];
    if (state && state.status !== "loading") return;

    loadQuestion(current.material_id);
  }, [current?.material_id, completed]);

  const loadQuestion = async (materialId: number) => {
    setQuizData((prev) => ({
      ...prev,
      [materialId]: {
        question: null as any,
        selectedIndex: null,
        correctCount: prev[materialId]?.correctCount ?? 0,
        status: "loading",
        previousQuestions: prev[materialId]?.previousQuestions ?? [],
        nextQuestion: null,
      },
    }));

    try {
      const { data } = await api.post<{ data: AiQuestion & { currentStats?: { correct: number; total: number } } }>(`/theory/${materialId}/generate`);
      const stats = data.data.currentStats;
      const serverCorrect = stats?.correct ?? 0;
      const serverAttempt = stats ? { correct: stats.correct, total: stats.total, wrong: stats.total - stats.correct } : null;

      if (serverCorrect >= QUESTIONS_TO_PASS) {
        setCompleted((prev) => new Set(prev).add(materialId));
        setQuizData((prev) => ({
          ...prev,
          [materialId]: {
            question: data.data,
            selectedIndex: null,
            correctCount: serverCorrect,
            status: "passed",
            previousQuestions: prev[materialId]?.previousQuestions ?? [],
            nextQuestion: null,
            attempt: serverAttempt,
          },
        }));
        return;
      }

      setQuizData((prev) => ({
        ...prev,
        [materialId]: {
          question: data.data,
          selectedIndex: null,
          correctCount: serverCorrect,
          status: "answering",
          previousQuestions: prev[materialId]?.previousQuestions ?? [],
          nextQuestion: null,
          attempt: serverAttempt,
        },
      }));
    } catch (e) {
      toast.error(extractErrorMessage(e, "Не удалось загрузить вопрос"));
      setQuizData((prev) => {
        const { [materialId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const selectAnswer = (materialId: number, idx: number) => {
    setQuizData((prev) => {
      const s = prev[materialId];
      if (!s || s.status !== "answering") return prev;
      return { ...prev, [materialId]: { ...s, selectedIndex: idx } };
    });
  };

  const submitAnswer = async (materialId: number) => {
    const s = quizData[materialId];
    if (!s || s.selectedIndex === null) return;

    const is_correct = s.selectedIndex === s.question.correctIndex;
    const question_text = s.question.question;
    const selected_answer = s.question.options[s.selectedIndex];
    const correct_answer = s.question.options[s.question.correctIndex];

    setQuizData((prev) => ({
      ...prev,
      [materialId]: { ...s, status: is_correct ? "correct" : "wrong", nextQuestion: null },
    }));

    const allPrevQuestions = [...(s.previousQuestions ?? []), s.question.question];

    try {
      const { data } = await api.post(`/theory/${materialId}/check`, {
        is_correct,
        question_text,
        selected_answer,
        correct_answer,
        previousQuestions: allPrevQuestions,
      });

      if (data.data.passed) {
        setCompleted((prev) => new Set(prev).add(materialId));
        setQuizData((prev) => ({
          ...prev,
          [materialId]: { ...prev[materialId], status: "passed", attempt: data.data.attempt },
        }));
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } else if (data.data.nextQuestion) {
        setQuizData((prev) => ({
          ...prev,
          [materialId]: {
            ...prev[materialId],
            nextQuestion: data.data.nextQuestion,
            attempt: data.data.attempt,
            correctCount: data.data.attempt?.correct ?? prev[materialId]?.correctCount ?? 0,
          },
        }));
      }
    } catch (e) {
      toast.error(extractErrorMessage(e, "Ошибка проверки"));
      setQuizData((prev) => ({
        ...prev,
        [materialId]: { ...s, status: "answering" },
      }));
    }
  };

  const continueToNextQuestion = (materialId: number) => {
    setQuizData((prev) => {
      const s = prev[materialId];
      if (!s?.nextQuestion) return prev;
      return {
        ...prev,
        [materialId]: {
          question: s.nextQuestion,
          selectedIndex: null,
          correctCount: s.correctCount,
          status: "answering",
          previousQuestions: [...(s.previousQuestions ?? []), s.question.question],
          nextQuestion: null,
        },
      };
    });
  };

  const goTo = (idx: number) => {
    if (idx <= currentIdx || completed.has(modules[currentIdx]?.material_id) || isLast) {
      setCurrentIdx(idx);
    }
  };

  const markComplete = async () => {
    const markProgress = useProgress.getState().markSection;
    try {
      await api.put(`/progress/${algo.algorithm_id}`, { theory_completed: true });
      markProgress(algo.slug, "theory", 100);
      setCompleted(new Set(modules.map((m) => m.material_id)));
      setTheoryCompleted(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      toast.success(t("theory.marked_complete"));
    } catch (e) {
      toast.error(extractErrorMessage(e, t("common.error")));
    }
  };

  if (modules.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-12 w-12 text-fg-subtle mx-auto mb-4" />
        <p className="text-fg-muted">Теоретический материал скоро появится.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* SIDEBAR */}
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
                <Button size="sm" variant="ghost" onClick={() => toast.success(t("theory.saved"))}><Save className="h-4 w-4" /></Button>
              </div>
            </CardBody>
          )}
        </Card>
      </nav>

      {/* CONTENT */}
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
                  <pre className="p-4 rounded-lg bg-bg-subtle text-fg border border-border overflow-x-auto text-sm font-mono leading-relaxed"><code>{m.content}</code></pre>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed text-fg-muted">{m.content}</div>
                )}

                {/* AI Quiz Block */}
                {!completed.has(m.material_id) && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <QuizBlock
                      quizData={quizData[m.material_id]}
                      onSelect={(idx) => selectAnswer(m.material_id, idx)}
                      onSubmit={() => submitAnswer(m.material_id)}
                      onContinue={() => continueToNextQuestion(m.material_id)}
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
                      <Button onClick={() => setCurrentIdx(i + 1)} disabled={!completed.has(m.material_id)}>
                        Следующий →
                      </Button>
                    )}
                    {isLast && (
                      <Button onClick={markComplete} disabled={theoryCompleted}>
                        {theoryCompleted ? <><CheckCircle2 className="h-4 w-4" />Изучено</> : "Завершить изучение теории"}
                      </Button>
                    )}
                  </div>
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
  quizData,
  onSelect,
  onSubmit,
  onContinue,
}: {
  quizData?: {
    question: AiQuestion;
    selectedIndex: number | null;
    correctCount: number;
    status: "loading" | "answering" | "correct" | "wrong" | "passed";
    previousQuestions: string[];
    nextQuestion: AiQuestion | null;
    attempt: QuizAttemptStats | null;
  };
  onSelect: (idx: number) => void;
  onSubmit: () => void;
  onContinue: () => void;
}) {
  if (!quizData || quizData.status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-fg-muted py-4">
        <Loader2 className="h-5 w-5 animate-spin" />
        AI генерирует вопрос…
      </div>
    );
  }

  if (quizData.status === "passed") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-success font-medium py-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>Модуль пройден!</span>
        </div>
        {quizData.attempt && (
          <p className="text-xs text-fg-muted">
            Попыток: {quizData.attempt.total} · Верно: {quizData.attempt.correct} · Неверно: {quizData.attempt.wrong}
          </p>
        )}
      </div>
    );
  }

  const { question, selectedIndex, status, correctCount, nextQuestion, attempt } = quizData;
  const shownFeedback = status === "correct" || status === "wrong";
  const userChoice = selectedIndex;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Проверьте понимание
        </h4>
        <div className="text-right">
          <span className="text-xs text-fg-muted block">
            {correctCount}/{QUESTIONS_TO_PASS} верно
          </span>
          {attempt && (
            <span className="text-[11px] text-fg-subtle">
              Всего: {attempt.total} · {attempt.correct}✓ {attempt.wrong}✗
            </span>
          )}
        </div>
      </div>

      <p className="font-medium">{question.question}</p>

      {/* OPTIONS */}
      <div className="space-y-2">
        {question.options.map((opt, j) => {
          const isSelected = userChoice === j;
          let borderClass = "border-border hover:border-accent/50 cursor-pointer";
          if (shownFeedback) {
            if (j === question.correctIndex) {
              borderClass = "border-success bg-success/5 cursor-default";
            } else if (isSelected) {
              borderClass = "border-danger bg-danger/10 cursor-default";
            } else {
              borderClass = "border-border opacity-60 cursor-default";
            }
          } else if (isSelected) {
            borderClass = "border-accent bg-accent/5 cursor-pointer";
          }
          return (
            <label key={j} className={cn("flex items-center gap-3 p-3.5 rounded-xl border transition-colors", borderClass)}>
              <input
                type="radio"
                name={`quiz-${question.question}`}
                checked={isSelected}
                onChange={() => !shownFeedback && onSelect(j)}
                disabled={shownFeedback}
                className="accent-accent h-4 w-4"
              />
              <span className="text-sm">{opt}</span>
              {shownFeedback && j === question.correctIndex && (
                <CheckCircle2 className="h-4 w-4 text-success ml-auto shrink-0" />
              )}
              {shownFeedback && isSelected && j !== question.correctIndex && (
                <XCircle className="h-4 w-4 text-danger ml-auto shrink-0" />
              )}
            </label>
          );
        })}
      </div>

      {/* SUBMIT BUTTON */}
      {!shownFeedback && (
        <Button onClick={onSubmit} disabled={userChoice === null} size="sm">
          Ответить
        </Button>
      )}

      {/* FEEDBACK BELOW */}
      {status === "correct" && (
        <div className="animate-fade-in space-y-3 rounded-xl border border-success/20 bg-success/[0.03] p-4">
          <div className="flex items-center gap-2 text-success font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            <span>Верно!</span>
          </div>
          {(question.explanations?.[question.correctIndex] || question.explanation) && (
            <div className="rounded-lg bg-success/5 border border-success/15 p-3 text-fg">
              <Markdown text={question.explanations?.[question.correctIndex] || question.explanation} />
            </div>
          )}
          {nextQuestion && (
            <Button size="sm" onClick={onContinue}>
              Следующий вопрос →
            </Button>
          )}
        </div>
      )}

      {status === "wrong" && (
        <div className="animate-fade-in space-y-3 rounded-xl border border-danger/20 bg-danger/[0.03] p-4">
          <div className="flex items-center gap-2 text-danger font-semibold">
            <XCircle className="h-5 w-5" />
            <span>Неправильно</span>
          </div>

          <div className="rounded-lg bg-danger/5 border border-danger/15 p-3 space-y-1.5">
            <div className="flex items-start gap-2 text-sm">
              <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
              <span><span className="font-medium text-danger">Ваш ответ:</span> {userChoice !== null ? question.options[userChoice] : "—"}</span>
            </div>
            {question.explanations?.[userChoice!] && (
              <div className="pl-6 text-fg-muted text-sm">
                <Markdown text={question.explanations[userChoice!]} />
              </div>
            )}
          </div>

          <div className="rounded-lg bg-success/5 border border-success/15 p-3 space-y-1.5">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span><span className="font-medium text-success">Правильный ответ:</span> {question.options[question.correctIndex]}</span>
            </div>
            {(question.explanations?.[question.correctIndex] || question.explanation) && (
              <div className="pl-6 text-fg text-sm">
                <Markdown text={question.explanations?.[question.correctIndex] || question.explanation} />
              </div>
            )}
          </div>

          {nextQuestion && (
            <Button size="sm" onClick={onContinue}>
              Попробовать новый вопрос →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

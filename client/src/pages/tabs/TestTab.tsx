import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, RotateCcw, Loader2, ChevronRight } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { api, extractErrorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Algorithm, Question, QuestionType, Option } from "@/types/api";
import toast from "react-hot-toast";
import { useProgress } from "@/stores/progress";

interface TestDetail {
  test_id: number;
  title: string;
  description?: string | null;
  passing_score: number;
  questions: (Question & { options: Option[] })[];
  algorithm?: { algorithm_id: number; name: string; slug: string };
}

interface CheckResult {
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
}

interface HistoryItem {
  question_text: string;
  userAnswer: string;
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
}

// Нужно набрать 3 правильных ответа — неверные не считаются, вопросы генерируются до победы
const CORRECT_TO_PASS = 3;

type Phase = "intro" | "question" | "checking" | "feedback" | "generating" | "result";

export default function TestTab() {
  const { algo } = useOutletContext<{ algo: Algorithm }>();
  const { t } = useTranslation();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<(Question & { options: Option[] })[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState<unknown>(undefined);
  const [feedback, setFeedback] = useState<CheckResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Только правильные ответы считаются
  const [correctCount, setCorrectCount] = useState(0);

  const load = (id: number) =>
    api.get<{ data: TestDetail }>(`/tests/${id}`)
      .then(({ data }) => { setTest(data.data); setLoading(false); return data.data; })
      .catch((e) => { toast.error(extractErrorMessage(e, t("common.error"))); setLoading(false); return null; });

  useEffect(() => {
    if (!algo.tests || algo.tests.length === 0) { setLoading(false); return; }
    load(algo.tests[0].test_id);
  }, [algo.tests]);

  const start = async () => {
    if (!test || test.questions.length === 0) return;
    setQuestions([test.questions[0]]);
    setQIdx(0);
    setCurrentAnswer(undefined);
    setFeedback(null);
    setHistory([]);
    setCorrectCount(0);
    setPhase("question");
  };

  const checkAnswer = async () => {
    if (!test || currentAnswer === undefined) {
      toast.error("Выберите ответ");
      return;
    }
    const q = questions[qIdx];
    const answerText = serializeAnswer(q.question_type, currentAnswer);
    setPhase("checking");
    try {
      const { data } = await api.post<{ data: CheckResult }>(`/tests/${test.test_id}/check-answer`, {
        question_id: q.question_id,
        answer_text: answerText,
      });
      const res = data.data;
      const item: HistoryItem = {
        question_text: q.question_text,
        userAnswer: answerText,
        correct: res.correct,
        correct_answer: res.correct_answer,
        explanation: res.explanation,
      };
      setHistory((h) => [...h, item]);
      if (res.correct) {
        setCorrectCount((c) => c + 1);
      }
      setFeedback(res);
      setPhase("feedback");
    } catch (e) {
      toast.error(extractErrorMessage(e, "Ошибка проверки ответа"));
      setPhase("question");
    }
  };

  // Генерируем следующий вопрос, передавая всю историю Q&A
  const generateNext = async (currentHistory: HistoryItem[]) => {
    if (!test) return;
    setPhase("generating");
    try {
      await api.post(`/tests/${test.test_id}/generate-questions`, {
        count: 1,
        difficulty: "medium",
        topic: algo.name,
        previousQA: currentHistory.map((h) => ({
          question: h.question_text,
          userAnswer: h.userAnswer,
          correct: h.correct,
        })),
      });
      const updated = await load(test.test_id);
      if (updated) {
        const newQ = updated.questions[updated.questions.length - 1];
        setQuestions((prev) => [...prev, newQ]);
        setQIdx((i) => i + 1);
        setCurrentAnswer(undefined);
        setFeedback(null);
        setPhase("question");
      }
    } catch (e) {
      toast.error(extractErrorMessage(e, "Не удалось сгенерировать вопрос"));
      setPhase("feedback");
    }
  };

  const handleNext = (latestHistory: HistoryItem[], latestCorrect: number) => {
    // Если набрали 3 правильных — завершаем
    if (latestCorrect >= CORRECT_TO_PASS) {
      finishTest();
      return;
    }
    // Иначе генерируем следующий вопрос
    generateNext(latestHistory);
  };

  const finishTest = () => {
    useProgress.getState().markSection(algo.slug, "test", correctCount);
    api.put(`/progress/${algo.algorithm_id}`, { test_completed: true, score_percent: 100 }).catch(() => {});
    toast.success("Тест пройден! 3 правильных ответа 🎉");
    setPhase("result");
  };

  const retry = () => {
    setPhase("intro");
    setCorrectCount(0);
    setHistory([]);
    setQuestions([]);
    setQIdx(0);
  };

  if (loading) return <PageLoader label={t("common.loading")} />;
  if (!test || !test.questions || test.questions.length === 0) {
    return (
      <EmptyState
        title="Тест для этого алгоритма пока не создан"
        description="Обратитесь к администратору для добавления вопросов"
      />
    );
  }

  const currentQ = questions[qIdx];

  return (
    <div className="space-y-4">
      {/* Интро */}
      {phase === "intro" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>{test.title}</span>
              <Badge tone="info">Цель: {CORRECT_TO_PASS} правильных ответа</Badge>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {test.description && <p className="text-fg-muted">{test.description}</p>}
            <p className="text-sm text-fg-muted">
              Ответь на {CORRECT_TO_PASS} вопроса правильно. При неверном ответе система выдаёт новый вопрос — и так до победы.
            </p>
            <Button size="lg" onClick={start}>{t("test.start")}</Button>
          </CardBody>
        </Card>
      )}

      {/* Вопрос */}
      {(phase === "question" || phase === "checking") && currentQ && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Вопрос {qIdx + 1}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge tone="default">{labelForType(currentQ.question_type)}</Badge>
                <Badge tone="success">Верно: {correctCount}/{CORRECT_TO_PASS}</Badge>
              </div>
            </div>
            {/* Прогресс правильных ответов */}
            <div className="flex gap-1 mt-2">
              {Array.from({ length: CORRECT_TO_PASS }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < correctCount ? "bg-success" : "bg-bg-subtle"
                  )}
                />
              ))}
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-lg">{currentQ.question_text}</p>
            <QuestionInput
              key={currentQ.question_id}
              question={currentQ}
              value={currentAnswer}
              onChange={setCurrentAnswer}
              disabled={phase === "checking"}
            />
            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                onClick={checkAnswer}
                loading={phase === "checking"}
                disabled={currentAnswer === undefined}
              >
                Проверить
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Фидбек */}
      {phase === "feedback" && feedback && currentQ && (() => {
        const latestHistory = history;
        const latestCorrect = correctCount;
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  {feedback.correct
                    ? <><CheckCircle2 className="h-5 w-5 text-success" />Верно!</>
                    : <><XCircle className="h-5 w-5 text-danger" />Неверно — попробуем следующий</>}
                </CardTitle>
                <Badge tone={feedback.correct ? "success" : "warning"}>
                  Верно: {latestCorrect}/{CORRECT_TO_PASS}
                </Badge>
              </div>
              <div className="flex gap-1 mt-2">
                {Array.from({ length: CORRECT_TO_PASS }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      i < latestCorrect ? "bg-success" : "bg-bg-subtle"
                    )}
                  />
                ))}
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {!feedback.correct && feedback.correct_answer && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                  <p className="text-sm text-success font-medium">
                    Правильный ответ: {feedback.correct_answer}
                  </p>
                </div>
              )}
              {feedback.explanation && (
                <p className="text-sm text-fg-muted italic">{feedback.explanation}</p>
              )}
              <div className="flex justify-end pt-2 border-t border-border">
                <Button onClick={() => handleNext(latestHistory, latestCorrect)}>
                  {latestCorrect >= CORRECT_TO_PASS
                    ? "Завершить тест"
                    : "Следующий вопрос"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        );
      })()}

      {/* Генерация */}
      {phase === "generating" && (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-fg-muted">Генерируем новый вопрос…</p>
            <p className="text-xs text-fg-subtle">Верно: {correctCount}/{CORRECT_TO_PASS}</p>
          </CardBody>
        </Card>
      )}

      {/* Результат */}
      {phase === "result" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Тест пройден!
              <Badge tone="success" className="ml-2">{correctCount}/{CORRECT_TO_PASS}</Badge>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-lg">
              Вы дали <strong>{correctCount}</strong> правильных ответа из {history.length} попыток.
            </p>
            {history.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">{t("test.review")}</h4>
                {history.map((h, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <div className="flex items-start gap-2">
                      {h.correct
                        ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-1" />
                        : <XCircle className="h-4 w-4 text-danger flex-shrink-0 mt-1" />}
                      <div className="flex-1">
                        <p className="font-medium">{i + 1}. {h.question_text}</p>
                        <p className="text-sm text-fg-muted mt-1">
                          <span className="font-medium">{t("test.your_answer")}:</span> {h.userAnswer || "—"}
                        </p>
                        {!h.correct && h.correct_answer && (
                          <p className="text-sm text-success mt-1">
                            <span className="font-medium">{t("test.correct_answer")}:</span> {h.correct_answer}
                          </p>
                        )}
                        {h.explanation && (
                          <p className="text-xs text-fg-muted mt-2 italic">{h.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={retry}>
              <RotateCcw className="h-4 w-4" />{t("common.retry")}
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function labelForType(t: QuestionType): string {
  return t === "single_choice" ? "Один ответ"
    : t === "multiple_choice" ? "Несколько ответов"
    : t === "short_answer" ? "Короткий ответ"
    : "Сопоставление";
}

function QuestionInput({
  question, value, onChange, disabled,
}: {
  question: Question & { options?: Option[] };
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const t = question.question_type;
  if (t === "single_choice") {
    return (
      <div className="space-y-2">
        {question.options?.map((o) => (
          <label
            key={o.option_id}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border transition-colors",
              disabled ? "cursor-default opacity-70" : "cursor-pointer hover:border-accent/50",
              value === o.option_id ? "border-accent bg-accent/5" : "border-border"
            )}
          >
            <input
              type="radio"
              name={`q-${question.question_id}`}
              checked={value === o.option_id}
              onChange={() => !disabled && onChange(o.option_id)}
              disabled={disabled}
              className="accent-accent"
            />
            <span>{o.option_text}</span>
          </label>
        ))}
      </div>
    );
  }
  if (t === "multiple_choice") {
    const arr: number[] = Array.isArray(value) ? (value as number[]) : [];
    const toggle = (id: number) =>
      !disabled && onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
    return (
      <div className="space-y-2">
        {question.options?.map((o) => (
          <label
            key={o.option_id}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border transition-colors",
              disabled ? "cursor-default opacity-70" : "cursor-pointer hover:border-accent/50",
              arr.includes(o.option_id) ? "border-accent bg-accent/5" : "border-border"
            )}
          >
            <input
              type="checkbox"
              checked={arr.includes(o.option_id)}
              onChange={() => toggle(o.option_id)}
              disabled={disabled}
              className="accent-accent"
            />
            <span>{o.option_text}</span>
          </label>
        ))}
      </div>
    );
  }
  if (t === "short_answer") {
    return (
      <input
        className="input"
        value={(value as string) ?? ""}
        onChange={(e) => !disabled && onChange(e.target.value)}
        placeholder="Введите ответ"
        disabled={disabled}
      />
    );
  }
  return null;
}

function serializeAnswer(type: QuestionType, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (type === "single_choice") return String(value);
  if (type === "multiple_choice") return Array.isArray(value) ? (value as number[]).join(",") : "";
  return String(value);
}

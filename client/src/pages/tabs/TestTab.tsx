import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, RotateCcw, ChevronRight } from "lucide-react";
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

interface ReviewItem {
  question_id: number;
  question_text: string;
  user_answer: string;
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
}

interface SubmitResult {
  score: number;
  max_score: number;
  percent: number;
  passed: boolean;
  passing_score: number;
  review: ReviewItem[];
}

type Phase = "intro" | "question" | "submitting" | "result";

export default function TestTab() {
  const { algo } = useOutletContext<{ algo: Algorithm }>();
  const { t } = useTranslation();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState<Phase>("intro");
  const [qIdx, setQIdx] = useState(0);
  // answers[question_id] = serialized answer string
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    if (!algo.tests || algo.tests.length === 0) { setLoading(false); return; }
    api.get<{ data: TestDetail }>(`/tests/${algo.tests[0].test_id}`)
      .then(({ data }) => { setTest(data.data); setLoading(false); })
      .catch((e) => { toast.error(extractErrorMessage(e, t("common.error"))); setLoading(false); });
  }, [algo.tests]);

  const start = () => {
    setQIdx(0);
    setAnswers({});
    setResult(null);
    setPhase("question");
  };

  const currentQ = test?.questions[qIdx];
  const totalQ = test?.questions.length ?? 0;
  const isLast = qIdx === totalQ - 1;

  const handleNext = () => {
    if (!currentQ) return;
    if (answers[currentQ.question_id] === undefined) {
      toast.error("Выберите ответ");
      return;
    }
    if (isLast) {
      submitTest();
    } else {
      setQIdx((i) => i + 1);
    }
  };

  const submitTest = async () => {
    if (!test) return;
    setPhase("submitting");
    const payload = test.questions.map((q) => ({
      question_id: q.question_id,
      answer_text: serializeAnswer(q.question_type, answers[q.question_id]),
    }));
    try {
      const { data } = await api.post<{ data: SubmitResult }>(`/tests/${test.test_id}/submit`, { answers: payload });
      setResult(data.data);
      if (data.data.passed) {
        useProgress.getState().markSection(algo.slug, "test", data.data.percent);
        api.put(`/progress/${algo.algorithm_id}`, { test_completed: true, score_percent: data.data.percent }).catch(() => {});
        toast.success(`Тест пройден! ${data.data.percent}% — отличная работа!`);
      }
      setPhase("result");
    } catch (e) {
      toast.error(extractErrorMessage(e, "Ошибка при сдаче теста"));
      setPhase("question");
    }
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

  return (
    <div className="space-y-4">
      {/* Интро */}
      {phase === "intro" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>{test.title}</span>
              <Badge tone="info">Порог: {test.passing_score}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {test.description && <p className="text-fg-muted">{test.description}</p>}
            <p className="text-sm text-fg-muted">
              {totalQ} вопросов. Наберите не менее {test.passing_score}% правильных ответов, чтобы пройти тест.
              Ответы принимаются за один раз в конце — без промежуточных подсказок.
            </p>
            <Button size="lg" onClick={start}>{t("test.start")}</Button>
          </CardBody>
        </Card>
      )}

      {/* Вопрос */}
      {(phase === "question" || phase === "submitting") && currentQ && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Вопрос {qIdx + 1} / {totalQ}</CardTitle>
              <Badge tone="default">{labelForType(currentQ.question_type)}</Badge>
            </div>
            {/* Прогресс-бар */}
            <div className="flex gap-0.5 mt-3">
              {test.questions.map((q, i) => (
                <div
                  key={q.question_id}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < qIdx ? "bg-accent" : i === qIdx ? "bg-accent/50" : "bg-bg-subtle"
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
              value={answers[currentQ.question_id]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [currentQ.question_id]: v }))}
              disabled={phase === "submitting"}
            />
            <div className="flex justify-between items-center pt-2 border-t border-border">
              {qIdx > 0 ? (
                <Button variant="ghost" onClick={() => setQIdx((i) => i - 1)} disabled={phase === "submitting"}>
                  Назад
                </Button>
              ) : <div />}
              <Button
                onClick={handleNext}
                loading={phase === "submitting" && isLast}
                disabled={answers[currentQ.question_id] === undefined}
              >
                {isLast ? "Сдать тест" : "Следующий"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Результат */}
      {phase === "result" && result && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                {result.passed
                  ? <><CheckCircle2 className="h-5 w-5 text-success" />Тест пройден!</>
                  : <><XCircle className="h-5 w-5 text-danger" />Тест не пройден</>}
                <Badge tone={result.passed ? "success" : "error"} className="ml-2">
                  {result.score}/{result.max_score} ({result.percent}%)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-bg-subtle overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", result.passed ? "bg-success" : "bg-danger")}
                    style={{ width: `${result.percent}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{result.percent}%</span>
              </div>
              <p className="text-sm text-fg-muted">
                {result.passed
                  ? `Отлично! Вы набрали ${result.percent}% при пороге ${result.passing_score}%.`
                  : `Нужно ${result.passing_score}%, у вас ${result.percent}%. Попробуйте ещё раз.`}
              </p>
              <Button variant="outline" onClick={start}>
                <RotateCcw className="h-4 w-4" />{t("common.retry")}
              </Button>
            </CardBody>
          </Card>

          {/* Детальный разбор */}
          <Card>
            <CardHeader><CardTitle>{t("test.review")}</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              {result.review.map((item, i) => (
                <div key={i} className={cn("p-3 rounded-lg border", item.correct ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5")}>
                  <div className="flex items-start gap-2">
                    {item.correct
                      ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      : <XCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{i + 1}. {item.question_text}</p>
                      <p className="text-xs text-fg-muted mt-1">
                        <span className="font-medium">{t("test.your_answer")}:</span> {item.user_answer || "—"}
                      </p>
                      {!item.correct && item.correct_answer && (
                        <p className="text-xs text-success mt-1">
                          <span className="font-medium">{t("test.correct_answer")}:</span> {item.correct_answer}
                        </p>
                      )}
                      {item.explanation && (
                        <p className="text-xs text-fg-subtle mt-1 italic">{item.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
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
  if (type === "multiple_choice") return Array.isArray(value) ? (value as number[]).join(",") : "";
  return String(value);
}

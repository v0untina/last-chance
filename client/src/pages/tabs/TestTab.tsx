import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, ArrowLeft, ArrowRight, RotateCcw, Sparkles, Loader2 } from "lucide-react";
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

interface SubmitResult {
  test_id: number;
  title: string;
  score: number;
  max_score: number;
  percent: number;
  passed: boolean;
  passing_score: number;
  review: Array<{
    question_id: number;
    question_text: string;
    user_answer: string;
    correct: boolean;
    correct_answer: string;
    explanation: string | null;
  }>;
}

export default function TestTab() {
  const { algo } = useOutletContext<{ algo: Algorithm }>();
  const { t } = useTranslation();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"intro" | "running" | "result">("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = (id: number) => {
    setLoading(true);
    api.get<{ data: TestDetail }>(`/tests/${id}`)
      .then(({ data }) => { setTest(data.data); setLoading(false); })
      .catch((e) => { toast.error(extractErrorMessage(e, t("common.error"))); setLoading(false); });
  };

  useEffect(() => {
    if (!algo.tests || algo.tests.length === 0) { setLoading(false); return; }
    load(algo.tests[0].test_id);
  }, [algo.tests, t]);

  const generateMore = async () => {
    if (!test || generating) return;
    setGenerating(true);
    try {
      const { data } = await api.post<{ data: { created: { question_id: number; question_text: string }[]; count: number } }>(`/tests/${test.test_id}/generate-questions`, {
        count: 3,
        difficulty: "medium",
        topic: algo.name,
      });
      if (data.data.count > 0) {
        toast.success(`AI создал ${data.data.count} новых вопросов!`);
        load(test.test_id);
      } else {
        toast.error("AI не смог сгенерировать вопросы (проверьте API-ключи)");
      }
    } catch (e) {
      toast.error(extractErrorMessage(e, "Не удалось сгенерировать вопросы"));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <PageLoader label={t("common.loading")} />;
  if (!test || !test.questions || test.questions.length === 0) {
    return (
      <EmptyState
        title="Тест для этого алгоритма пока не создан"
        description="Нажмите кнопку, чтобы AI сгенерировал вопросы"
        action={<Button onClick={generateMore} loading={generating}><Sparkles className="h-4 w-4" />Сгенерировать вопросы</Button>}
      />
    );
  }

  const q = test.questions[idx];
  const total = test.questions.length;

  const start = () => { setPhase("running"); setIdx(0); setAnswers({}); };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = test.questions.map((qq) => ({
        question_id: qq.question_id,
        answer_text: serializeAnswer(qq.question_type, answers[qq.question_id]),
      }));
      const { data } = await api.post<{ data: SubmitResult }>(`/tests/${test.test_id}/submit`, { answers: payload });
      setResult(data.data);
      setPhase("result");
      if (data.data.passed) {
        useProgress.getState().markSection(algo.slug, "test", data.data.score);
        api.put(`/progress/${algo.algorithm_id}`, { test_completed: true, score_percent: data.data.percent }).catch(() => {});
        toast.success(t("test.passed"));
      }
    } catch (e) {
      toast.error(extractErrorMessage(e, t("common.error")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {phase === "intro" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>{test.title}</span>
              <div className="flex items-center gap-2">
                <Badge tone="info">{total} {total === 1 ? "вопрос" : "вопросов"}</Badge>
                <Badge tone="warning">Проходной: {test.passing_score}%</Badge>
                <Button size="sm" variant="outline" onClick={generateMore} loading={generating}>
                  <Sparkles className="h-3.5 w-3.5" />Добавить AI-вопросы
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {test.description && <p className="text-fg-muted">{test.description}</p>}
            <Button size="lg" onClick={start}>{t("test.start")}</Button>
          </CardBody>
        </Card>
      )}

      {phase === "running" && q && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>{t("test.question_of", { current: idx + 1, total })}</CardTitle>
              <Badge tone="default">{labelForType(q.question_type)}</Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-lg">{q.question_text}</p>
            <QuestionInput
              key={q.question_id}
              question={q}
              value={answers[q.question_id]}
              onChange={(v) => setAnswers((p) => ({ ...p, [q.question_id]: v }))}
            />
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
                <ArrowLeft className="h-4 w-4" />{t("test.prev")}
              </Button>
              {idx < total - 1 ? (
                <Button onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}>
                  {t("test.next")}<ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submit} loading={submitting}>{t("test.submit")}</Button>
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              {test.questions.map((qq, i) => (
                <button
                  key={qq.question_id}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "h-8 w-8 rounded text-xs font-medium transition-colors",
                    i === idx ? "bg-accent text-white" : answers[qq.question_id] !== undefined ? "bg-accent/20 text-accent" : "bg-bg-subtle text-fg-muted hover:bg-bg-elev"
                  )}
                  aria-label={`Вопрос ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {phase === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              {result.passed ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}
              {t("test.result_title")} — {result.passed ? t("test.passed") : t("test.failed")}
              <Badge tone={result.passed ? "success" : "warning"} className="ml-2">{result.percent}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-lg">{t("test.score", { score: result.score, max: result.max_score, percent: result.percent })}</p>
            {result.review && result.review.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">{t("test.review")}</h4>
                {result.review.map((r, i) => (
                  <div key={r.question_id} className="p-3 rounded-lg border border-border">
                    <div className="flex items-start gap-2">
                      {r.correct ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-1" /> : <XCircle className="h-4 w-4 text-danger flex-shrink-0 mt-1" />}
                      <div className="flex-1">
                        <p className="font-medium">{i + 1}. {r.question_text}</p>
                        <p className="text-sm text-fg-muted mt-1"><span className="font-medium">{t("test.your_answer")}:</span> {r.user_answer || "—"}</p>
                        {!r.correct && r.correct_answer && (
                          <p className="text-sm text-success mt-1"><span className="font-medium">{t("test.correct_answer")}:</span> {r.correct_answer}</p>
                        )}
                        {r.explanation && <p className="text-xs text-fg-muted mt-2 italic">{r.explanation}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => { setPhase("intro"); setResult(null); }}><RotateCcw className="h-4 w-4" />{t("common.retry")}</Button>
              <Button variant="outline" onClick={generateMore} loading={generating}><Sparkles className="h-4 w-4" />Сгенерировать ещё вопросы</Button>
            </div>
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

function QuestionInput({ question, value, onChange }: { question: Question & { options?: Option[] }; value: unknown; onChange: (v: unknown) => void }) {
  const t = question.question_type;
  if (t === "single_choice") {
    return (
      <div className="space-y-2">
        {question.options?.map((o) => (
          <label key={o.option_id} className={cn("flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors", value === o.option_id ? "border-accent bg-accent/5" : "border-border hover:border-accent/50")}>
            <input type="radio" name={`q-${question.question_id}`} checked={value === o.option_id} onChange={() => onChange(o.option_id)} className="accent-accent" />
            <span>{o.option_text}</span>
          </label>
        ))}
      </div>
    );
  }
  if (t === "multiple_choice") {
    const arr: number[] = Array.isArray(value) ? (value as number[]) : [];
    const toggle = (id: number) => onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
    return (
      <div className="space-y-2">
        {question.options?.map((o) => (
          <label key={o.option_id} className={cn("flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors", arr.includes(o.option_id) ? "border-accent bg-accent/5" : "border-border hover:border-accent/50")}>
            <input type="checkbox" checked={arr.includes(o.option_id)} onChange={() => toggle(o.option_id)} className="accent-accent" />
            <span>{o.option_text}</span>
          </label>
        ))}
      </div>
    );
  }
  if (t === "short_answer") {
    return <input className="input" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Введите ответ" />;
  }
  if (t === "matching") {
    return <p className="text-sm text-fg-muted italic">Matching вопрос: введите пары в формате a-1, b-2</p>;
  }
  return null;
}

function serializeAnswer(type: QuestionType, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (type === "single_choice") return String(value);
  if (type === "multiple_choice") return Array.isArray(value) ? value.join(",") : "";
  if (type === "matching") return typeof value === "string" ? value : JSON.stringify(value);
  return String(value);
}

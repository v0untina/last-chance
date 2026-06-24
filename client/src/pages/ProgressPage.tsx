import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  Trophy, CheckCircle2, Clock, BookOpen, Code2, FlaskConical,
  ChevronRight, Lock, Star, Zap, Target
} from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth";
import { api } from "@/lib/api";
import type { Algorithm, UserProgress } from "@/types/api";

interface ProgressItem {
  algorithm: Algorithm;
  progress: UserProgress | null;
  quizStats: { total: number; correct: number };
  theoryModules: number;
  completedModules: number;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-success",
  medium: "text-warning",
  hard: "text-danger",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Лёгкий",
  medium: "Средний",
  hard: "Сложный",
};

function sectionsDone(p: UserProgress | null) {
  if (!p) return 0;
  return (p.theory_completed ? 1 : 0) + (p.test_completed ? 1 : 0) + (p.practice_completed ? 1 : 0);
}

function overallPercent(item: ProgressItem): number {
  const done = sectionsDone(item.progress);
  // Theory: count completed modules out of total
  const theoryPct = item.theoryModules > 0
    ? Math.round((item.completedModules / item.theoryModules) * 100)
    : (item.progress?.theory_completed ? 100 : 0);
  const testPct = item.progress?.test_completed ? (item.progress.score_percent ?? 100) : 0;
  const practicePct = item.progress?.practice_completed ? 100 : 0;
  return Math.round((theoryPct + testPct + practicePct) / 3);
}

export default function ProgressPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    api.get<{ data: ProgressItem[] }>("/progress")
      .then(({ data }) => setItems(data.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (authLoading || loading) return <PageLoader label={t("common.loading")} />;

  const started = items.filter((i) => i.progress !== null);
  const fullyDone = items.filter((i) =>
    i.progress?.theory_completed && i.progress?.test_completed && i.progress?.practice_completed
  );
  const totalModules = items.reduce((s, i) => s + i.theoryModules, 0);
  const doneModules = items.reduce((s, i) => s + i.completedModules, 0);
  const avgTestScore = started.length > 0
    ? Math.round(
        started
          .filter((i) => i.progress?.test_completed)
          .reduce((s, i) => s + (i.progress?.score_percent ?? 0), 0) /
        Math.max(1, started.filter((i) => i.progress?.test_completed).length)
      )
    : 0;

  const radialData = [
    { name: "Прогресс", value: items.length > 0 ? Math.round((fullyDone.length / items.length) * 100) : 0, fill: "var(--accent)" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Мой прогресс</h1>
        <p className="text-fg-muted mt-1">Детальный обзор вашего обучения</p>
      </div>

      {started.length === 0 ? (
        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="Вы ещё не начали обучение"
          description="Откройте каталог и выберите первый алгоритм"
          action={<Link to="/catalog"><Button>Перейти в каталог</Button></Link>}
        />
      ) : (
        <>
          {/* Верхняя строка — ключевые метрики */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              icon={<Zap className="h-5 w-5 text-accent" />}
              label="Начато алгоритмов"
              value={`${started.length} / ${items.length}`}
              sub="из каталога"
            />
            <MetricCard
              icon={<Trophy className="h-5 w-5 text-warning" />}
              label="Завершено полностью"
              value={fullyDone.length}
              sub={fullyDone.length === 1 ? "алгоритм" : fullyDone.length < 5 ? "алгоритма" : "алгоритмов"}
              highlight={fullyDone.length > 0}
            />
            <MetricCard
              icon={<BookOpen className="h-5 w-5 text-info" />}
              label="Модулей теории"
              value={`${doneModules} / ${totalModules}`}
              sub="пройдено"
            />
            <MetricCard
              icon={<Star className="h-5 w-5 text-success" />}
              label="Средний балл тестов"
              value={avgTestScore > 0 ? `${avgTestScore}%` : "—"}
              sub={avgTestScore > 0 ? "по пройденным тестам" : "тесты не пройдены"}
              highlight={avgTestScore >= 70}
            />
          </div>

          {/* Радиальный прогресс + список алгоритмов */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Радиальный индикатор завершённости */}
            <Card className="flex flex-col">
              <CardHeader><CardTitle>Общая завершённость</CardTitle></CardHeader>
              <CardBody className="flex flex-col items-center justify-center flex-1 gap-2">
                <div className="relative h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="70%"
                      outerRadius="100%"
                      data={radialData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <RadialBar dataKey="value" background={{ fill: "var(--bg-subtle)" }} cornerRadius={8} />
                      <Tooltip formatter={(v) => [`${v}%`, "Завершено"]} contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold">{radialData[0].value}%</span>
                    <span className="text-xs text-fg-muted">завершено</span>
                  </div>
                </div>
                <p className="text-sm text-fg-muted text-center">
                  {fullyDone.length} из {items.length} алгоритмов пройдены полностью
                </p>
              </CardBody>
            </Card>

            {/* Секции теория/тест/практика по алгоритмам */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Разбивка по секциям</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {items.map((item) => {
                  const p = item.progress;
                  const pct = overallPercent(item);
                  return (
                    <div key={item.algorithm.algorithm_id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{item.algorithm.name}</span>
                          <span className={cn("text-xs", DIFFICULTY_COLOR[item.algorithm.difficulty ?? "medium"])}>
                            {DIFFICULTY_LABEL[item.algorithm.difficulty ?? "medium"]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <SectionDot done={!!p?.theory_completed} icon={<BookOpen className="h-3 w-3" />} label="Теория" />
                          <SectionDot done={!!p?.test_completed} icon={<FlaskConical className="h-3 w-3" />} label="Тест" />
                          <SectionDot done={!!p?.practice_completed} icon={<Code2 className="h-3 w-3" />} label="Практика" />
                        </div>
                      </div>
                      <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-success" : pct > 0 ? "bg-accent" : "bg-transparent")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          </div>

          {/* Детальные карточки алгоритмов */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Детали по алгоритмам</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((item) => (
                <AlgoCard key={item.algorithm.algorithm_id} item={item} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, sub, highlight }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; highlight?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 text-fg-muted mb-1">{icon}<span className="text-xs">{label}</span></div>
        <p className={cn("text-2xl font-bold", highlight && "text-success")}>{value}</p>
        {sub && <p className="text-xs text-fg-muted mt-0.5">{sub}</p>}
      </CardBody>
    </Card>
  );
}

function SectionDot({ done, icon, label }: { done: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div title={label} className={cn("h-6 w-6 rounded-full flex items-center justify-center", done ? "bg-success/20 text-success" : "bg-bg-subtle text-fg-subtle")}>
      {done ? icon : <Lock className="h-3 w-3" />}
    </div>
  );
}

function AlgoCard({ item }: { item: ProgressItem }) {
  const { algorithm, progress, quizStats, theoryModules, completedModules } = item;
  const p = progress;
  const notStarted = !p;
  const testScore = p?.test_completed ? (p.score_percent ?? 0) : null;
  const theoryPct = theoryModules > 0 ? Math.round((completedModules / theoryModules) * 100) : 0;

  return (
    <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", p?.theory_completed && p.test_completed && p.practice_completed && "ring-1 ring-success/40")}>
      {p?.theory_completed && p.test_completed && p.practice_completed && (
        <div className="absolute top-2 right-2">
          <Badge tone="success" className="text-xs">Завершён</Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-base pr-16">{algorithm.name}</CardTitle>
        <span className={cn("text-xs", DIFFICULTY_COLOR[algorithm.difficulty ?? "medium"])}>
          {DIFFICULTY_LABEL[algorithm.difficulty ?? "medium"]}
        </span>
      </CardHeader>
      <CardBody className="space-y-3 pt-0">
        {notStarted ? (
          <p className="text-sm text-fg-muted flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Не начат
          </p>
        ) : (
          <>
            {/* Теория */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />Теория</span>
                <span>{completedModules}/{theoryModules} модулей</span>
              </div>
              <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                <div className="h-full bg-info/70 rounded-full" style={{ width: `${theoryPct}%` }} />
              </div>
            </div>

            {/* Тест */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-fg-muted"><FlaskConical className="h-3 w-3" />Тест</span>
              {testScore !== null ? (
                <Badge tone={testScore >= 70 ? "success" : "error"} className="text-xs">
                  {testScore}%
                </Badge>
              ) : (
                <span className="text-xs text-fg-subtle">не пройден</span>
              )}
            </div>

            {/* Практика */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-fg-muted"><Code2 className="h-3 w-3" />Практика</span>
              {p?.practice_completed ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <span className="text-xs text-fg-subtle">не пройдена</span>
              )}
            </div>

            {/* Кол-во правильных ответов в теории */}
            {quizStats.total > 0 && (
              <div className="pt-1 border-t border-border flex items-center justify-between text-xs text-fg-muted">
                <span>Ответы в теории</span>
                <span className="font-medium">{quizStats.correct}/{quizStats.total} верных</span>
              </div>
            )}
          </>
        )}

        <Link to={`/algorithms/${algorithm.slug}`} className="block">
          <Button variant="outline" size="sm" className="w-full">
            {notStarted ? "Начать" : "Продолжить"}
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}

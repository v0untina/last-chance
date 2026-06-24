import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/stores/auth";
import { useProgress } from "@/stores/progress";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/PageLoader";
import { 
  User, Trophy, BarChart3, Code, LogOut, BookOpen, 
  CheckCircle2, XCircle, Clock, Target, TrendingUp,
  Binary, Filter, Shuffle, Search, ArrowRight,
  GraduationCap, Lightbulb, PlayCircle, RotateCcw
} from "lucide-react";
import type { Algorithm, UserProgress, UserSolution } from "@/types/api";

const ALGO_ICONS: Record<string, typeof Binary> = {
  "bubble-sort": Filter,
  "insertion-sort": Shuffle,
  "selection-sort": Filter,
  "binary-search": Search,
};

function getAlgoIcon(slug: string) {
  const Icon = ALGO_ICONS[slug] || Binary;
  return <Icon className="h-5 w-5" />;
}

interface QuizStats {
  total: number;
  correct: number;
}

interface ProgressItem {
  algorithm: Algorithm;
  progress: UserProgress | null;
  quizStats: QuizStats;
  theoryModules: number;
  completedModules: number;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const localProgress = useProgress((s) => s.bySlug);

  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [serverProgress, setServerProgress] = useState<UserProgress[]>([]);
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);
  const [solutions, setSolutions] = useState<UserSolution[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    let cancelled = false;
    Promise.all([
      api.get<{ data: Algorithm[] }>("/algorithms", { params: { limit: 100 } }),
      api.get<{ data: UserSolution[] }>("/solutions/my"),
      api.get<{ data: ProgressItem[] }>("/progress"),
    ])
      .then(([algoRes, solRes, progRes]) => {
        if (cancelled) return;
        setAlgorithms(algoRes.data.data ?? []);
        setSolutions(solRes.data.data ?? []);
        setProgressData(progRes.data.data ?? []);
        setServerProgress(progRes.data.data.map((d) => d.progress).filter(Boolean) as UserProgress[]);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDataLoading(false); });

    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  const handleLogout = () => { logout(); navigate("/"); };

  if (authLoading || dataLoading) return <PageLoader label="Загрузка…" />;
  if (!user) return null;

  const mergedProgress = algorithms.map((a) => {
    const pi = progressData.find((p) => p.algorithm.algorithm_id === a.algorithm_id);
    const server = pi?.progress ?? null;
    const local = localProgress[a.slug];
    const theoryModules = pi?.theoryModules ?? 0;
    // Читаем пройденные модули из localStorage (там хранится реальное прохождение)
    const localModulesRaw = localStorage.getItem(`algo.modules.${a.algorithm_id}`);
    const localCompletedModules: number[] = localModulesRaw ? (() => { try { return JSON.parse(localModulesRaw); } catch { return []; } })() : [];
    const completedModules = Math.max(localCompletedModules.length, pi?.completedModules ?? 0);
    const theoryPct = theoryModules > 0 ? Math.round((completedModules / theoryModules) * 100) : 0;
    const theory_done = server?.theory_completed ?? local?.theory_completed ?? false;
    const test_done = server?.test_completed ?? local?.test_completed ?? false;
    const practice_done = server?.practice_completed ?? local?.practice_completed ?? false;
    // Процент = сколько из 3 разделов пройдено (теория/тест/практика)
    const sectionsDone = [theory_done, test_done, practice_done].filter(Boolean).length;
    const combinedScore = Math.round((sectionsDone / 3) * 100);

    return {
      algorithm: a,
      theory_done,
      test_done,
      practice_done,
      theoryPct,
      theoryModules,
      completedModules,
      score: combinedScore,
      quizStats: pi?.quizStats ?? { total: 0, correct: 0 },
      server,
      local,
    };
  });

  const completed = mergedProgress.filter((m) => m.theory_done && m.test_done && m.practice_done);
  const inProgress = mergedProgress.filter(
    (m) => !(m.theory_done && m.test_done && m.practice_done) && (m.theory_done || m.test_done || m.practice_done)
  );
  const notStarted = mergedProgress.filter(
    (m) => !m.theory_done && !m.test_done && !m.practice_done
  );
  const avgScore = mergedProgress.length > 0
    ? Math.round(mergedProgress.reduce((s, m) => s + m.score, 0) / mergedProgress.length)
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* === PROFILE HEADER === */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border border-accent/20 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-accent to-accent/70 text-white grid place-items-center text-3xl font-bold shadow-lg shadow-accent/20 shrink-0">
            {(user.username?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-fg">{user.username}</h1>
                <p className="text-fg-muted mt-0.5">{user.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1.5" />
                Выйти
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-fg-muted">
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                Студент
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Зарегистрирован {formatDate(user.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* === STATS GRID === */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard
          icon={<Binary className="h-5 w-5" />}
          label="Всего алгоритмов"
          value={algorithms.length}
          color="accent"
        />
        <StatsCard
          icon={<Trophy className="h-5 w-5" />}
          label="Пройдено"
          value={completed.length}
          color="success"
        />
        <StatsCard
          icon={<Clock className="h-5 w-5" />}
          label="В процессе"
          value={inProgress.length}
          color="warning"
        />
        <StatsCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Средний балл"
          value={`${avgScore}%`}
          color="accent"
        />
      </div>

      {/* === CONTINUE LEARNING === */}
      {inProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-accent" />
              Продолжить обучение
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inProgress.slice(0, 3).map((m) => (
                <Link
                  key={m.algorithm.algorithm_id}
                  to={`/algorithms/${m.algorithm.algorithm_id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors group"
                >
                  <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent grid place-items-center shrink-0">
                    {getAlgoIcon(m.algorithm.slug)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.algorithm.name}</p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {[m.theory_done && "Теория", m.test_done && "Тест", m.practice_done && "Практика"]
                        .filter(Boolean)
                        .join(" • ") || "Начать"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-fg-subtle group-hover:text-accent transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* === PROGRESS BY ALGORITHM === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            Прогресс по алгоритмам
            <Badge tone="default" className="ml-auto text-xs">{completed.length}/{algorithms.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0 sm:p-0">
          {mergedProgress.length === 0 ? (
            <div className="px-5 py-8 text-center text-fg-muted text-sm">
              Данных пока нет. Перейдите в <Link to="/catalog" className="text-accent hover:underline">каталог</Link>.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {mergedProgress.map((m) => {
                const doneCount = [m.theory_done, m.test_done, m.practice_done].filter(Boolean).length;
                const sections: Array<{ key: string; label: string; done: boolean; sub?: string }> = [
                  { key: "theory", label: "Теория", done: m.theory_done, sub: m.theoryModules > 0 ? `${m.theoryPct}%` : undefined },
                  { key: "test", label: "Тест", done: m.test_done },
                  { key: "practice", label: "Практика", done: m.practice_done },
                ];

                return (
                  <div key={m.algorithm.algorithm_id} className="px-5 py-4 hover:bg-bg-subtle/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${
                          doneCount === 3 ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                        }`}>
                          {getAlgoIcon(m.algorithm.slug)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/algorithms/${m.algorithm.algorithm_id}`}
                            className="font-medium text-sm hover:text-accent transition-colors truncate block"
                          >
                            {m.algorithm.name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {sections.map((s) => (
                              <span
                                key={s.key}
                                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                  s.done
                                    ? "bg-success/10 text-success"
                                    : "bg-bg-subtle text-fg-muted"
                                }`}
                              >
                                {s.done ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3 opacity-50" />}
                                {s.label}{s.sub ? ` ${s.sub}` : ""}
                              </span>
                            ))}
                              {m.quizStats.total > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-accent/5 text-accent">
                                {m.quizStats.correct}✓ {m.quizStats.total - m.quizStats.correct}✗
                              </span>
                            )}
                          </div>
                          {m.theoryModules > 0 && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="h-1 rounded-full bg-bg-subtle overflow-hidden flex-1 max-w-[120px]">
                                <div
                                  className="h-full rounded-full bg-accent transition-all"
                                  style={{ width: `${Math.min(100, m.theoryPct)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-fg-muted">
                                {m.completedModules}/{m.theoryModules} модулей
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:block w-20">
                            <div className="h-1.5 rounded-full bg-bg-subtle overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  m.score >= 80 ? "bg-success" : m.score >= 50 ? "bg-warning" : "bg-accent"
                                }`}
                                style={{ width: `${m.score}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold leading-none ${
                              m.score >= 80 ? "text-success" : m.score >= 50 ? "text-warning" : "text-fg"
                            }`}>
                              {m.score}%
                            </p>
                            <p className="text-[11px] text-fg-muted mt-0.5">{doneCount}/3</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* === NOT STARTED === */}
      {notStarted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-fg-muted" />
              Ещё не начаты
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {notStarted.map((m) => (
                <Link
                  key={m.algorithm.algorithm_id}
                  to={`/algorithms/${m.algorithm.algorithm_id}`}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-accent/30 hover:bg-accent/5 transition-colors"
                >
                  <div className="h-8 w-8 rounded-md bg-bg-subtle text-fg-muted grid place-items-center shrink-0">
                    {getAlgoIcon(m.algorithm.slug)}
                  </div>
                  <span className="text-xs font-medium truncate">{m.algorithm.name}</span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* === SOLUTIONS === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-accent" />
            Мои решения
            <Badge tone="default" className="ml-auto text-xs">{solutions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0 sm:p-0">
          {solutions.length === 0 ? (
            <div className="px-5 py-8 text-center text-fg-muted text-sm">
              Решений пока нет. Попробуйте выполнить практическое задание в любом алгоритме.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {solutions.slice(0, 15).map((s) => (
                <div key={s.solution_id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-bg-subtle/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                      s.is_correct ? "bg-success/10" : "bg-danger/10"
                    }`}>
                      {s.is_correct
                        ? <CheckCircle2 className="h-4 w-4 text-success" />
                        : <XCircle className="h-4 w-4 text-danger" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        Задача #{s.task_id}
                        <span className="text-xs text-fg-muted ml-2 font-normal">{s.language}</span>
                      </p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {formatDateTime(s.submission_date)}
                        {s.execution_time != null && ` · ${s.execution_time} мс`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {s.score > 0 && (
                      <span className={`text-sm font-bold ${s.score >= 80 ? "text-success" : s.score >= 50 ? "text-warning" : "text-danger"}`}>
                        {s.score}%
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      s.is_correct
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}>
                      {s.is_correct ? "Пройдено" : "Не пройдено"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* === COMPLETED ALGORITHMS === */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-success" />
              Пройденные алгоритмы
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {completed.map((m) => (
                <Link
                  key={m.algorithm.algorithm_id}
                  to={`/algorithms/${m.algorithm.algorithm_id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-success/20 bg-success/[0.03] hover:bg-success/[0.06] transition-colors group"
                >
                  <div className="h-10 w-10 rounded-lg bg-success/10 text-success grid place-items-center shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.algorithm.name}</p>
                    <p className="text-xs text-success/70 mt-0.5">
                      {m.score}% · {m.server?.completed_at ? formatDate(m.server.completed_at) : "Завершено"}
                    </p>
                  </div>
                  <RotateCcw className="h-4 w-4 text-fg-subtle group-hover:text-accent transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function StatsCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    accent: "from-accent/20 to-accent/5 text-accent border-accent/20",
    success: "from-success/20 to-success/5 text-success border-success/20",
    warning: "from-warning/20 to-warning/5 text-warning border-warning/20",
  };

  return (
    <div className={`rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.accent} border p-4`}>
      <div className="flex items-center gap-2 text-current opacity-70 mb-2">
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-current opacity-60 mt-0.5">{label}</p>
    </div>
  );
}
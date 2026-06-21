import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, CheckCircle2, Clock, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";
import type { Algorithm } from "@/types/api";
import { pluralRu } from "@/lib/format";
import { useProgress, type AlgorithmProgress } from "@/stores/progress";
import { api } from "@/lib/api";

interface ProgressEntry { algorithm: Algorithm; progress: AlgorithmProgress; }

export default function ProgressPage() {
  const { t } = useTranslation();
  const bySlug = useProgress((s) => s.bySlug);
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get<{ data: Algorithm[] }>("/algorithms", { params: { limit: 100 } })
      .then(({ data }) => { if (!cancelled) setAlgorithms(data.data ?? []); })
      .catch(() => { if (!cancelled) setAlgorithms([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageLoader label={t("common.loading")} />;

  const data: ProgressEntry[] = algorithms
    .map((algorithm) => {
      const progress = bySlug[algorithm.slug];
      return progress ? { algorithm, progress } : null;
    })
    .filter((x): x is ProgressEntry => x !== null);

  const completed = data.filter((d) => d.progress.theory_completed && d.progress.test_completed && d.progress.practice_completed);
  const inProgress = data.filter((d) => !(d.progress.theory_completed && d.progress.test_completed && d.progress.practice_completed) && (d.progress.theory_completed || d.progress.test_completed || d.progress.practice_completed));
  const avgScore = data.length > 0
    ? Math.round(data.reduce((s, d) => s + (d.progress.best_score_percent ?? 0), 0) / data.length)
    : 0;

  const pieData = [
    { name: t("progress.stats.completed"), value: completed.length, color: "var(--success)" },
    { name: t("progress.stats.in_progress"), value: inProgress.length, color: "var(--warning)" },
    { name: "Не начато", value: Math.max(0, data.length - completed.length - inProgress.length), color: "var(--fg-subtle)" },
  ];
  const barData = data.map((d) => ({
    name: d.algorithm.name.length > 12 ? d.algorithm.name.slice(0, 12) + "…" : d.algorithm.name,
    score: d.progress.best_score_percent ?? 0,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">{t("progress.title")}</h1>
        <p className="text-fg-muted mt-1">{t("progress.subtitle")}</p>
      </header>

      {data.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-12 w-12" />}
          title={t("progress.empty")}
          action={<Link to="/catalog"><Button>{t("nav.catalog")}</Button></Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Target className="h-5 w-5" />} label={t("progress.stats.total")} value={data.length} suffix={pluralRu(data.length, ["алгоритм", "алгоритма", "алгоритмов"])} />
            <StatCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} label={t("progress.stats.completed")} value={completed.length} />
            <StatCard icon={<Clock className="h-5 w-5 text-warning" />} label={t("progress.stats.in_progress")} value={inProgress.length} />
            <StatCard icon={<Trophy className="h-5 w-5 text-accent" />} label={t("progress.stats.avg_score")} value={`${avgScore}%`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Распределение</CardTitle></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Баллы по алгоритмам</CardTitle></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--fg-muted)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="var(--fg-muted)" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }} />
                    <Bar dataKey="score" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number | string; suffix?: string }) {
  return (
    <Card><CardBody>
      <div className="flex items-center gap-2 text-fg-muted">{icon}<span className="text-xs">{label}</span></div>
      <p className="text-2xl font-bold mt-1">{value}{suffix && <span className="text-sm text-fg-muted ml-1.5 font-normal">{suffix}</span>}</p>
    </CardBody></Card>
  );
}

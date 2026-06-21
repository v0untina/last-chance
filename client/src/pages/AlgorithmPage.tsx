import { useEffect, useState, useMemo } from "react";
import { useParams, NavLink, Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Code2, ClipboardCheck, PlayCircle, ArrowLeft } from "lucide-react";
import { api, extractErrorMessage } from "@/lib/api";
import { PageLoader } from "@/components/ui/PageLoader";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { Algorithm } from "@/types/api";
import { useProgress } from "@/stores/progress";

type Tab = "theory" | "visualization" | "test" | "practice";

export default function AlgorithmPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [algo, setAlgo] = useState<Algorithm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<{ data: Algorithm }>(`/algorithms/${id}`)
      .then(({ data }) => { if (!cancelled) setAlgo(data.data); })
      .catch((e) => { if (!cancelled) setError(extractErrorMessage(e, "Ошибка загрузки алгоритма")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const tabs = useMemo(
    () => [
      { id: "theory" as Tab, label: t("algorithm.tabs.theory"), icon: <BookOpen className="h-4 w-4" /> },
      { id: "visualization" as Tab, label: t("algorithm.tabs.visualization"), icon: <PlayCircle className="h-4 w-4" /> },
      { id: "test" as Tab, label: t("algorithm.tabs.test"), icon: <ClipboardCheck className="h-4 w-4" /> },
      { id: "practice" as Tab, label: t("algorithm.tabs.practice"), icon: <Code2 className="h-4 w-4" /> },
    ],
    [t]
  );

  if (loading) return <PageLoader label={t("common.loading")} />;
  if (error || !algo) {
    return <div className="card p-6 text-center text-danger">{error || t("common.error")}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">{algo.name}</h1>
          <Badge tone={algo.difficulty}>{t(`difficulty.${algo.difficulty}`)}</Badge>
          <Badge tone="default">{algo.category}</Badge>
        </div>
        {algo.description && <p className="text-fg-muted max-w-3xl">{algo.description}</p>}
        <ProgressBar algo={algo} />
      </header>

      <nav className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" aria-label="Разделы алгоритма">
        <div className="flex gap-1 min-w-max border-b border-border">
          {tabs.map((tab) => (
            <NavLink
              key={tab.id}
              to={tab.id === "theory" ? `/algorithms/${algo.algorithm_id}` : `/algorithms/${algo.algorithm_id}/${tab.id}`}
              end={tab.id === "theory"}
              className={({ isActive }) => cn(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive ? "border-accent text-accent" : "border-transparent text-fg-muted hover:text-fg"
              )}
            >
              {tab.icon}
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="min-h-[400px]">
        <Outlet context={{ algo }} />
      </div>
    </div>
  );
}

function ProgressBar({ algo }: { algo: Algorithm }) {
  const { t } = useTranslation();
  const p = useProgress((s) => s.bySlug[algo.slug]);
  const items = [
    { done: p?.theory_completed, label: t("algorithm.theory_completed") },
    { done: p?.test_completed, label: t("algorithm.test_completed") },
    { done: p?.practice_completed, label: t("algorithm.practice_completed") },
  ];
  const completed = items.filter((i) => i.done).length;
  const percent = Math.round((completed / items.length) * 100);
  return (
    <div className="pt-1">
      <div className="flex items-center justify-between text-xs text-fg-muted mb-1.5">
        <span>{t("algorithm.progress_label")}</span>
        <span className="font-medium text-fg">{percent}%</span>
      </div>
      <div className="h-2 w-full bg-bg-subtle rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Clock, MemoryStick, CheckCircle2, BookOpen, ClipboardCheck, Code2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Algorithm } from "@/types/api";
import { useProgress } from "@/stores/progress";

export function AlgorithmCard({ algo, className }: { algo: Algorithm; className?: string }) {
  const { t } = useTranslation();
  const stored = useProgress((s) => s.bySlug[algo.slug]);
  const completed = !!stored && stored.theory_completed && stored.test_completed && stored.practice_completed;
  const partial = !!stored && !completed;

  return (
    <Link to={`/algorithms/${algo.algorithm_id}`} className={cn("group block", className)}>
      <Card className="h-full transition-all hover:border-accent hover:shadow-md">
        <CardBody>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-fg group-hover:text-accent transition-colors line-clamp-1">
              {algo.name}
            </h3>
            {(completed || partial) && (
              <CheckCircle2 className={cn("h-5 w-5 flex-shrink-0", completed ? "text-success" : "text-warning")} />
            )}
          </div>
          <p className="text-sm text-fg-muted line-clamp-2 min-h-[2.5rem]">
            {algo.description || "—"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <Badge tone={algo.difficulty}>{t(`difficulty.${algo.difficulty}`)}</Badge>
            <span className="text-fg-subtle">·</span>
            <span>{algo.category}</span>
          </div>
          {(algo.time_complexity || algo.space_complexity) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
              {algo.time_complexity && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{algo.time_complexity}</span>
              )}
              {algo.space_complexity && (
                <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{algo.space_complexity}</span>
              )}
            </div>
          )}

          {stored && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded", stored.theory_completed ? "bg-success/15 text-success" : "bg-bg-subtle text-fg-subtle")}>
                <BookOpen className="h-3 w-3" />Теория
              </span>
              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded", stored.test_completed ? "bg-success/15 text-success" : "bg-bg-subtle text-fg-subtle")}>
                <ClipboardCheck className="h-3 w-3" />Тест
              </span>
              <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded", stored.practice_completed ? "bg-success/15 text-success" : "bg-bg-subtle text-fg-subtle")}>
                <Code2 className="h-3 w-3" />Практика
              </span>
            </div>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}

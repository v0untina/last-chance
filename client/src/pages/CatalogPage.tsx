import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { AlgorithmCard } from "@/components/algorithms/AlgorithmCard";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search, X, SearchX } from "lucide-react";
import { api } from "@/lib/api";
import type { Algorithm, Difficulty, Paginated } from "@/types/api";
import { useProgress } from "@/stores/progress";

export default function CatalogPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [debounced, setDebounced] = useState(search);
  const [category, setCategory] = useState<string>(params.get("category") ?? "");
  const [difficulty, setDifficulty] = useState<string>(params.get("difficulty") ?? "");
  const [completed, setCompleted] = useState<string>(params.get("completed") ?? "");
  const [data, setData] = useState<Algorithm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (debounced) p.set("q", debounced);
    if (category) p.set("category", category);
    if (difficulty) p.set("difficulty", difficulty);
    if (completed === "1") p.set("completed", "1");
    setParams(p, { replace: true });
  }, [debounced, category, difficulty, completed, setParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<Paginated<Algorithm>>("/algorithms", { params: { limit: 100 } })
      .then(({ data }) => { if (!cancelled) setData(data.data ?? []); })
      .catch((e) => { if (!cancelled) setError(e.message ?? "Ошибка загрузки"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(data.map((a) => a.category).filter(Boolean));
    return [
      { value: "", label: t("catalog.filter_all") },
      ...Array.from(set).sort().map((c) => ({ value: c, label: t(`category.${c}`, { defaultValue: c }) })),
    ];
  }, [data, t]);

  const fuse = useMemo(
    () => new Fuse(data, { keys: ["name", "description", "category"], threshold: 0.35, ignoreLocation: true }),
    [data]
  );

  const progressBySlug = useProgress((s) => s.bySlug);
  const filtered = useMemo(() => {
    let list = debounced ? fuse.search(debounced).map((r) => r.item) : data;
    if (category) list = list.filter((a) => a.category === category);
    if (difficulty) list = list.filter((a) => a.difficulty === (difficulty as Difficulty));
    if (completed === "1") {
      list = list.filter((a) => {
        const p = progressBySlug[a.slug];
        return !!p && p.theory_completed && p.test_completed;
      });
    }
    return list;
  }, [data, debounced, fuse, category, difficulty, completed, progressBySlug]);

  const reset = () => {
    setSearch(""); setDebounced(""); setCategory(""); setDifficulty(""); setCompleted("");
  };

  const hasFilters = debounced || category || difficulty || completed;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">{t("catalog.title")}</h1>
        <p className="text-fg-muted mt-1">{t("catalog.subtitle")}</p>
      </header>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <label className="label">{t("catalog.search_label")}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle pointer-events-none" />
              <Input
                placeholder={t("catalog.search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg" aria-label="Очистить">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="w-44"><Select label={t("catalog.filter_category")} value={category} onChange={(e) => setCategory(e.target.value)} options={categories} /></div>
          <div className="w-36">
            <Select
              label={t("catalog.filter_difficulty")}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              options={[
                { value: "", label: t("catalog.filter_all") },
                { value: "easy", label: t("difficulty.easy") },
                { value: "medium", label: t("difficulty.medium") },
                { value: "hard", label: t("difficulty.hard") },
              ]}
            />
          </div>
          <div className="flex items-center gap-3 h-10">
            <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={completed === "1"}
                onChange={(e) => setCompleted(e.target.checked ? "1" : "")}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              {t("catalog.filter_completed")}
            </label>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={reset}>{t("catalog.filter_reset")}</Button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoader label={t("common.loading")} />
      ) : error ? (
        <EmptyState title={t("common.error")} description={error} action={<Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<SearchX className="h-12 w-12" />} title={t("catalog.empty")} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => <AlgorithmCard key={a.algorithm_id} algo={a} />)}
        </div>
      )}
    </div>
  );
}

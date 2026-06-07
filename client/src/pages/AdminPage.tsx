import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Edit2, Trash2, Users, BookOpen, Download } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { PageLoader } from "@/components/ui/PageLoader";
import { api, extractErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import toast from "react-hot-toast";
import type { Algorithm, User, Difficulty } from "@/types/api";

type AdminTab = "algorithms" | "users";

export default function AdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminTab>("algorithms");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">{t("admin.title")}</h1>
        <Button variant="outline" onClick={() => exportCsv()}><Download className="h-4 w-4" />{t("admin.export_csv")}</Button>
      </header>
      <Tabs<AdminTab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "algorithms", label: t("admin.algorithms_tab"), icon: <BookOpen className="h-4 w-4" /> },
          { id: "users", label: t("admin.users_tab"), icon: <Users className="h-4 w-4" /> },
        ]}
      />
      {tab === "algorithms" ? <AlgorithmsAdmin /> : <UsersAdmin />}
    </div>
  );
}

function AlgorithmsAdmin() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Algorithm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Algorithm | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = () => {
    setLoading(true);
    api.get<{ data: Algorithm[] }>("/admin/algorithms", { params: { limit: 100 } })
      .then(({ data }) => setItems(data.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const onDelete = async (a: Algorithm) => {
    if (!confirm(t("common.confirm_delete"))) return;
    try { await api.delete(`/admin/algorithms/${a.algorithm_id}`); toast.success("Удалено"); reload(); }
    catch (e) { toast.error(extractErrorMessage(e)); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Алгоритмы ({items.length})</span>
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />{t("admin.create")}</Button>
        </CardTitle>
      </CardHeader>
      <CardBody className="p-0">
        {loading ? <PageLoader /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-fg-muted border-b border-border bg-bg-subtle">
                <tr>
                  <th className="px-4 py-2 font-medium">ID</th>
                  <th className="px-4 py-2 font-medium">Название</th>
                  <th className="px-4 py-2 font-medium">Slug</th>
                  <th className="px-4 py-2 font-medium">Категория</th>
                  <th className="px-4 py-2 font-medium">Сложность</th>
                  <th className="px-4 py-2 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.algorithm_id} className="border-b border-border last:border-0 hover:bg-bg-subtle">
                    <td className="px-4 py-3 text-fg-muted">{a.algorithm_id}</td>
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.slug}</td>
                    <td className="px-4 py-3">{a.category}</td>
                    <td className="px-4 py-3"><Badge tone={a.difficulty}>{t(`difficulty.${a.difficulty}`)}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(a)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(a)}><Trash2 className="h-3.5 w-3.5 text-danger" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-fg-muted">Нет данных</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
      <AlgorithmForm open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} algo={editing} onSaved={reload} />
    </Card>
  );
}

function AlgorithmForm({ open, onClose, algo, onSaved }: { open: boolean; onClose: () => void; algo: Algorithm | null; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: algo?.name ?? "", slug: algo?.slug ?? "", category: algo?.category ?? "Sorting",
    difficulty: (algo?.difficulty ?? "easy") as Difficulty,
    description: algo?.description ?? "", time_complexity: algo?.time_complexity ?? "", space_complexity: algo?.space_complexity ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({
      name: algo?.name ?? "", slug: algo?.slug ?? "", category: algo?.category ?? "Sorting",
      difficulty: (algo?.difficulty ?? "easy") as Difficulty, description: algo?.description ?? "",
      time_complexity: algo?.time_complexity ?? "", space_complexity: algo?.space_complexity ?? "",
    });
  }, [algo, open]);

  const save = async () => {
    setSaving(true);
    try {
      if (algo) await api.put(`/admin/algorithms/${algo.algorithm_id}`, form);
      else await api.post("/admin/algorithms", form);
      toast.success(t("common.save"));
      onSaved(); onClose();
    } catch (e) { toast.error(extractErrorMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={algo ? t("admin.edit") : t("admin.create")}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={save} loading={saving}>{t("common.save")}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label={t("admin.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label={t("admin.slug")} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <Input label={t("admin.category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <Select label={t("admin.difficulty")} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })} options={[
          { value: "easy", label: t("difficulty.easy") }, { value: "medium", label: t("difficulty.medium") }, { value: "hard", label: t("difficulty.hard") },
        ]} />
        <Input label={t("admin.time_complexity")} value={form.time_complexity} onChange={(e) => setForm({ ...form, time_complexity: e.target.value })} />
        <Input label={t("admin.space_complexity")} value={form.space_complexity} onChange={(e) => setForm({ ...form, space_complexity: e.target.value })} />
        <div className="sm:col-span-2"><Textarea label={t("admin.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
      </div>
    </Modal>
  );
}

function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<{ data: User[] }>("/admin/users", { params: { limit: 100 } })
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <PageLoader />;
  return (
    <Card>
      <CardHeader><CardTitle>Пользователи ({users.length})</CardTitle></CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-fg-muted border-b border-border bg-bg-subtle">
              <tr><th className="px-4 py-2 font-medium">ID</th><th className="px-4 py-2 font-medium">Username</th><th className="px-4 py-2 font-medium">Email</th><th className="px-4 py-2 font-medium">Роль</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-bg-subtle">
                  <td className="px-4 py-3 text-fg-muted">{u.user_id}</td>
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3"><Badge tone={u.role === "admin" ? "danger" : u.role === "teacher" ? "info" : "default"}>{u.role}</Badge></td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-fg-muted">Нет пользователей</td></tr>}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function exportCsv() {
  api.get<{ data: Algorithm[] }>("/admin/algorithms", { params: { limit: 1000 } })
    .then(({ data }) => {
      const rows = [["id", "name", "slug", "category", "difficulty", "time", "space"].join(","), ...data.data.map((a) =>
        [a.algorithm_id, JSON.stringify(a.name), a.slug, a.category, a.difficulty, a.time_complexity ?? "", a.space_complexity ?? ""].join(",")
      )].join("\n");
      const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "algorithms.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV экспортирован");
    })
    .catch(() => toast.error("Ошибка экспорта"));
}

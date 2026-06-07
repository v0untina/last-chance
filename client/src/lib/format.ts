export function formatDate(input: string | Date | null | undefined, locale = "ru-RU"): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function formatDateTime(input: string | Date | null | undefined, locale = "ru-RU"): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(d);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} мс`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} с`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m} мин ${s} с`;
}

export function pluralRu(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

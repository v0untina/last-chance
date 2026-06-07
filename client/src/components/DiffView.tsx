import { useMemo } from "react";
import { cn } from "@/lib/cn";

interface DiffLine {
  type: "same" | "add" | "rem";
  lineA: number | null;
  lineB: number | null;
  text: string;
}

function computeDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split("\n");
  const linesB = b.split("\n");
  const m = linesA.length, n = linesB.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = linesA[i - 1] === linesB[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = m, j = n;
  const reversed: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      reversed.push({ type: "same", lineA: i, lineB: j, text: linesA[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ type: "add", lineA: null, lineB: j, text: linesB[j - 1] });
      j--;
    } else {
      reversed.push({ type: "rem", lineA: i, lineB: null, text: linesA[i - 1] });
      i--;
    }
  }
  for (let k = reversed.length - 1; k >= 0; k--) result.push(reversed[k]);
  return result;
}

export function DiffView({ leftLabel = "Ваш код", rightLabel = "Эталон", leftCode, rightCode }: {
  leftLabel?: string;
  rightLabel?: string;
  leftCode: string;
  rightCode: string;
}) {
  const diff = useMemo(() => computeDiff(leftCode, rightCode), [leftCode, rightCode]);

  const stats = useMemo(() => {
    const same = diff.filter((d) => d.type === "same").length;
    const add = diff.filter((d) => d.type === "add").length;
    const rem = diff.filter((d) => d.type === "rem").length;
    return { same, add, rem };
  }, [diff]);

  return (
    <div className="text-xs font-mono border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-1.5 bg-bg-subtle border-b border-border text-fg-muted">
        <span className="font-medium text-fg">{leftLabel}</span>
        <span className="text-success">{stats.rem} строк изменено</span>
        <span className="text-danger">{stats.add} строк добавлено</span>
        <span className="ml-auto text-fg-subtle">{stats.same} строк совпадает</span>
      </div>
      <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
        {diff.map((line, i) => (
          <div
            key={i}
            className={cn(
              "flex border-b border-border/30 leading-5",
              line.type === "add" ? "bg-success/5" : line.type === "rem" ? "bg-danger/5" : ""
            )}
          >
            <span className={cn(
              "w-8 text-right pr-2 select-none shrink-0",
              line.type === "add" ? "text-success" : line.type === "rem" ? "text-danger" : "text-fg-subtle"
            )}>
              {line.type === "add" ? "+" : line.type === "rem" ? "-" : " "}
            </span>
            <span className="w-10 text-right pr-2 select-none shrink-0 text-fg-subtle">
              {line.lineA ?? ""}
            </span>
            <span className="w-10 text-right pr-2 select-none shrink-0 text-fg-subtle">
              {line.lineB ?? ""}
            </span>
            <span className={cn(
              "whitespace-pre shrink-0",
              line.type === "add" ? "text-success" : line.type === "rem" ? "text-danger" : "text-fg"
            )}>
              {line.text || " "}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

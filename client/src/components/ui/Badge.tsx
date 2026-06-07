import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "easy" | "medium" | "hard" | "default" | "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  easy: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  hard: "bg-danger/10 text-danger",
  default: "bg-bg-subtle text-fg-muted",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export function Badge({ tone = "default", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}

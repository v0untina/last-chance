import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Tab<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ tabs, active, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn("border-b border-border", className)} role="tablist">
      <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Tabs">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive ? "border-accent text-accent" : "border-transparent text-fg-muted hover:text-fg hover:border-border"
              )}
            >
              {t.icon}
              {t.label}
              {t.badge}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

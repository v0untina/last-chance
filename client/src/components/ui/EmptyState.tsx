import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      {icon && <div className="mb-3 text-fg-subtle">{icon}</div>}
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description && <p className="text-sm text-fg-muted mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

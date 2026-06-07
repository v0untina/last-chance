import { Spinner } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function PageLoader({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 gap-3", className)} role="status" aria-live="polite">
      <Spinner size="lg" />
      {label && <p className="text-sm text-fg-muted">{label}</p>}
    </div>
  );
}

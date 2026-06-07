import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  outline: "border border-border hover:bg-bg-subtle",
  ghost: "hover:bg-bg-subtle",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "btn",
        sizes[size],
        variants[variant],
        className
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
});

export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = size === "sm" ? "h-4 w-4 border-2" : size === "lg" ? "h-8 w-8 border-[3px]" : "h-5 w-5 border-2";
  return (
    <span
      className={cn("inline-block rounded-full border-current border-t-transparent animate-spin", s, className)}
      aria-label="Загрузка"
    />
  );
}

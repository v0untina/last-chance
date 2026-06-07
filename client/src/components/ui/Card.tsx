import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...rest}>{children}</div>;
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-border", className)} {...rest}>{children}</div>;
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...rest}>{children}</div>;
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-t border-border", className)} {...rest}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-base font-semibold text-fg", className)}>{children}</h3>;
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm text-fg-muted mt-1", className)}>{children}</p>;
}

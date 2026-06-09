import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? `input-${autoId}`;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <input
        ref={ref}
        id={inputId}
        className={cn("input", error && "border-danger focus:border-danger", className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {error && <p id={`${inputId}-err`} className="text-xs text-danger mt-1">{error}</p>}
      {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-fg-muted mt-1">{hint}</p>}
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? `ta-${autoId}`;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <textarea
        ref={ref}
        id={inputId}
        className={cn("input h-auto min-h-[80px] py-2", error && "border-danger", className)}
        {...rest}
      />
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
});

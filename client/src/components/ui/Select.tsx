import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, className, id, ...rest },
  ref
) {
  const inputId = id ?? `sel-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <select
        ref={ref}
        id={inputId}
        className={cn("input pr-8 appearance-none bg-no-repeat bg-[length:14px] bg-[right_0.6rem_center] cursor-pointer", error && "border-danger", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        }}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
});

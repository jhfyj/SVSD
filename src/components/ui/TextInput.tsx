import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "./cn";

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function TextInput({ label, className, id, ...props }: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-bold uppercase text-label/80">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className="h-11 rounded-token border border-border-input bg-transparent px-3 text-sm uppercase text-foreground placeholder:text-foreground/50 focus:border-foreground focus:outline-none"
        {...props}
      />
    </div>
  );
}

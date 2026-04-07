import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "secondary";
}

export function Badge({ className, variant = "secondary", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        variant === "secondary" &&
          "border-[#C782FF]/25 bg-[#C782FF]/[0.12] text-[#e8d4ff]",
        className,
      )}
      {...props}
    />
  );
}

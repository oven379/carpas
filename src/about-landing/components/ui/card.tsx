import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-white/[0.08] bg-white/[0.03] text-white shadow-sm backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";

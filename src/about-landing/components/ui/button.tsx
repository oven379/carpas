import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C782FF]/45 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            "bg-[#C782FF] text-white shadow-[0_0_24px_rgba(199,130,255,0.28)] hover:brightness-110 hover:shadow-[0_0_32px_rgba(199,130,255,0.4)]",
          variant === "outline" &&
            "border border-white/20 bg-white/[0.04] text-white backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.08]",
          variant === "ghost" && "text-white/85 hover:bg-white/10 hover:text-white",
          variant === "secondary" &&
            "border border-[#C782FF]/25 bg-[#C782FF]/15 text-[#f0e0ff] hover:bg-[#C782FF]/22",
          size === "sm" && "h-9 rounded-[12px] px-4 text-sm",
          size === "default" && "h-10 rounded-[12px] px-5 text-sm",
          size === "lg" && "h-16 rounded-[15px] px-6 text-[15px] leading-none sm:px-7",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

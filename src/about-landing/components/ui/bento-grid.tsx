import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BentoItem {
  title: string;
  description: string;
  icon: ReactNode;
  /** Номер шага, напр. «01» */
  step?: string;
  status?: string;
  tags?: string[];
  meta?: string;
  cta?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
}

interface BentoGridProps {
  items: BentoItem[];
  className?: string;
}

export function BentoGrid({ items, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-3 p-4 md:grid-cols-3",
        className,
      )}
    >
      {items.map((item, index) => {
        const badge = item.step ?? item.status;
        const showFooter = Boolean(item.tags?.length || item.cta);

        return (
          <div
            key={index}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300",
              "hover:-translate-y-0.5 hover:shadow-[0_2px_24px_rgba(199,130,255,0.08)] will-change-transform",
              item.colSpan === 2 ? "md:col-span-2" : "md:col-span-1",
              {
                "shadow-[0_2px_20px_rgba(199,130,255,0.06)] -translate-y-0.5": item.hasPersistentHover,
              },
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 transition-opacity duration-300",
                item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              <div
                className="absolute inset-0 bg-[length:4px_4px] bg-[radial-gradient(circle_at_center,rgba(199,130,255,0.04)_1px,transparent_1px)]"
                aria-hidden
              />
            </div>

            <div
              className={cn(
                "pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-transparent via-[#C782FF]/[0.07] to-transparent p-px transition-opacity duration-300",
                item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              aria-hidden
            />

            <div className="relative flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] transition-all duration-300 group-hover:bg-[#C782FF]/15">
                  {item.icon}
                </div>
                {badge ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold tracking-wider backdrop-blur-sm",
                      item.step
                        ? "bg-[#C782FF]/15 text-[#C782FF]"
                        : "bg-white/10 text-white/70",
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                <h3 className="text-[15px] font-medium tracking-tight text-white">
                  {item.title}
                  {item.meta ? (
                    <span className="ml-2 text-xs font-normal text-white/40">{item.meta}</span>
                  ) : null}
                </h3>
                <p className="text-sm leading-relaxed text-white/65">{item.description}</p>
              </div>

              {showFooter ? (
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.tags?.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {item.cta ? (
                    <span className="text-xs text-white/40 opacity-0 transition-opacity group-hover:opacity-100">
                      {item.cta}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

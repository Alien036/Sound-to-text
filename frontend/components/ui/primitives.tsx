"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  dark?: boolean;
}

export function Card({ className, hover, dark, onPointerMove, ...props }: CardProps) {
  const isDark = dark || className?.includes("bg-ink-900");

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    onPointerMove?.(e);
  }

  return (
    <div
      onPointerMove={handlePointerMove}
      className={cn(
        "card-spotlight rounded-2xl border border-ink-200/60 bg-white shadow-[0_1px_2px_rgba(22,22,63,0.03),0_8px_24px_-12px_rgba(22,22,63,0.05)] transition-[transform,box-shadow,border-color] duration-300",
        isDark &&
          "card-spotlight-dark border-0 bg-ink-900 text-white shadow-xl shadow-ink-900/15 ring-1 ring-inset ring-white/10",
        hover &&
          (isDark
            ? "hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-ink-900/20"
            : "hover:-translate-y-0.5 hover:border-ink-300/70 hover:shadow-[0_12px_32px_-12px_rgba(22,22,63,0.1)]"),
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-4 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold tracking-tight text-ink-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-ink-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative p-5", className)} {...props} />;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-ink-200/80 bg-white px-3.5 text-sm text-ink-900 shadow-[0_1px_2px_rgba(22,22,63,0.02)] placeholder:text-ink-400 transition-all duration-200 hover:border-ink-300 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-20 w-full rounded-xl border border-ink-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-[0_1px_2px_rgba(22,22,63,0.02)] placeholder:text-ink-400 transition-all duration-200 hover:border-ink-300 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full appearance-none rounded-xl border border-ink-200/80 bg-white bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%235f5f80' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[right_0.75rem_center] bg-no-repeat pl-3.5 pr-9 text-sm text-ink-900 shadow-[0_1px_2px_rgba(22,22,63,0.02)] transition-all duration-200 hover:border-ink-300 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink-700", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-xl bg-[linear-gradient(90deg,var(--color-ink-100)_0%,var(--color-ink-50)_50%,var(--color-ink-100)_100%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

export function Progress({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "accent";
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          tone === "brand" ? "bg-brand-500" : "bg-accent-500",
        )}
        style={{ width: `${clamped}%` }}
      >
        {clamped > 0 && clamped < 100 && (
          <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.35)_50%,transparent_100%)] bg-[length:200%_100%]" />
        )}
      </div>
    </div>
  );
}

const badgeTones = {
  neutral: "bg-ink-100/80 text-ink-700 ring-1 ring-inset ring-ink-200/50",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/60",
  solid: "bg-brand-500 text-white shadow-xs shadow-brand-500/20",
  accent: "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200/60",
  dark: "bg-ink-900 text-white",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors [&_svg]:size-3",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-ink-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-ink-100/60 px-5 py-3.5 text-ink-700", className)} {...props} />;
}

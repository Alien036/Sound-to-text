"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type HTMLMotionProps,
  type Transition,
} from "motion/react";
import * as React from "react";
import { cn, formatCredits } from "@/lib/utils";

export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 0.9,
};

export function FadeIn({
  children,
  delay = 0,
  y = 12,
  inView = false,
  className,
  ...props
}: HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
  inView?: boolean;
}) {
  // Hareketi azaltma tercihi providers'taki MotionConfig ile uygulanır; burada dallanmak sunucu
  // çıktısıyla uyuşmazlık (hydration hatası) yaratır, çünkü sunucu tercihi bilemez
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      {...(inView
        ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" } }
        : { animate: { opacity: 1, y: 0 } })}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({
  children,
  inView = false,
  stagger = 0.06,
  className,
  ...props
}: HTMLMotionProps<"div"> & {
  inView?: boolean;
  stagger?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      {...(inView
        ? { whileInView: "show", viewport: { once: true, margin: "-40px" } }
        : { animate: "show" })}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14, scale: 0.985 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Sayı değiştiğinde veya ilk yüklendiğinde yay fiziğiyle hedef değere akar. */
export function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const isInteger = Number.isInteger(value);
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 140, damping: 24, mass: 0.8 });
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  React.useEffect(() => {
    if (reduced) {
      if (ref.current) ref.current.textContent = formatCredits(value);
      return;
    }
    return spring.on("change", (latest) => {
      if (!ref.current) return;
      const rounded = isInteger ? Math.round(latest) : Math.round(latest * 10) / 10;
      ref.current.textContent = formatCredits(rounded);
    });
  }, [spring, value, isInteger, reduced]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {formatCredits(value)}
    </span>
  );
}

/** Canlı ses / işleniyor durumları için minimal ekolayzır çubukları. */
export function SoundWave({
  bars = 5,
  className,
  barClassName,
}: {
  bars?: number;
  className?: string;
  barClassName?: string;
}) {
  const heights = [45, 90, 60, 100, 50, 80, 65, 95, 55];
  return (
    <span className={cn("inline-flex items-end gap-0.5", className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn("w-1 origin-bottom animate-wave rounded-full bg-brand-500", barClassName)}
          style={{
            height: `${heights[i % heights.length]}%`,
            animationDelay: `${(i % 5) * -0.22}s`,
          }}
        />
      ))}
    </span>
  );
}

/** Yay fiziğiyle kayan aktif sekmeli kontrol bileşeni. */
export function SlidingTabs<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  variant = "dark",
  className,
}: {
  options: readonly { value: T; label: React.ReactNode; tone?: "default" | "accent" }[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  variant?: "dark" | "surface";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl p-1",
        variant === "dark"
          ? "bg-white ring-1 ring-ink-200/70 shadow-xs"
          : "bg-ink-100/70 ring-1 ring-ink-200/50",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const isAccent = opt.tone === "accent";
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200",
              active
                ? variant === "dark"
                  ? "text-white"
                  : isAccent
                    ? "text-accent-600"
                    : "text-brand-700"
                : "text-ink-500 hover:text-ink-900",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING_SNAPPY}
                className={cn(
                  "absolute inset-0 -z-10 rounded-lg",
                  variant === "dark"
                    ? "bg-ink-900 shadow-sm"
                    : "bg-white shadow-xs ring-1 ring-ink-200/60",
                )}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export { AnimatePresence, motion };

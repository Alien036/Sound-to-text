import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-500 text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 hover:shadow-md hover:shadow-brand-500/30",
        dark: "bg-ink-900 text-white shadow-sm shadow-ink-900/15 hover:bg-ink-800 hover:shadow-md hover:shadow-ink-900/20",
        accent:
          "bg-accent-500 text-white shadow-sm shadow-accent-500/25 hover:bg-accent-600 hover:shadow-md hover:shadow-accent-500/30",
        outline:
          "border border-ink-200/80 bg-white text-ink-900 shadow-[0_1px_2px_rgba(22,22,63,0.03)] hover:border-ink-300 hover:bg-ink-50/70 hover:shadow-sm",
        ghost: "text-ink-600 hover:translate-y-0 hover:bg-ink-100/80 hover:text-ink-900",
        danger: "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200/60 hover:bg-accent-100",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "size-9 hover:translate-y-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };

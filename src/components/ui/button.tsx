"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * One primary, and it is black.
 *
 * With colour reserved entirely for hyperlinks, emphasis has to come from
 * weight and contrast instead — a solid black button against white is the
 * loudest thing the palette allows, which is why there is only ever one of
 * them on a screen.
 */
const button = cva(
  "inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-100 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "bg-text text-canvas shadow-[0_1px_2px_rgba(0,0,0,0.16)] hover:bg-text/88",
        secondary:
          "border border-line bg-canvas text-text shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-line-strong hover:bg-surface",
        ghost: "text-muted hover:bg-surface hover:text-text",
        link: "text-muted underline-offset-4 hover:text-text hover:underline",
      },
      size: {
        sm: "h-7 rounded-[var(--radius-control)] px-2.5 text-xs",
        md: "h-9 rounded-[var(--radius-control)] px-3.5 text-[0.8125rem]",
        lg: "h-11 rounded-[var(--radius-control)] px-5 text-sm",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component className={cn(button({ variant, size }), className)} {...props} />
  );
}

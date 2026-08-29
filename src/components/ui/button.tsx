"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The flat variants (`primary`, `secondary`, `ghost`) are for controls inside
 * dense UI, where anything louder would be noise. `play` is the bold outlined
 * treatment reserved for the one thing on a screen that is its whole point:
 * starting a run.
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
        play:
          "border-2 border-black bg-[var(--color-play-button)] text-black shadow-none hover:bg-[var(--color-play-button)]",
      },
      size: {
        sm: "h-7 rounded-[var(--radius-control)] px-2.5 text-xs",
        md: "h-9 rounded-[var(--radius-control)] px-3.5 text-[0.8125rem]",
        lg: "h-11 rounded-[var(--radius-control)] px-5 text-sm",
        // Height comes from the content: the mode buttons stack a title over a
        // line of description rather than sitting on a single baseline. Rounder
        // and chunkier than the utility sizes — these are the two things on the
        // page you are meant to want to press.
        xl: "min-h-[6rem] rounded-[16px] px-6 py-5 text-[0.9375rem]",
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

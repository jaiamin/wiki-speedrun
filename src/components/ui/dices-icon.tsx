import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom Dices icon with both top and front dice filled with white.
 * Layered correctly so the front die sits cleanly over the back die.
 */
export function DicesIcon({ className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 stroke-[2.5]", className)}
      {...props}
    >
      {/* Top / back die */}
      <path
        d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6z"
        fill="white"
      />
      <path d="M15 6h.01" />
      <path d="M18 9h.01" />

      {/* Bottom / front die */}
      <rect
        width="12"
        height="12"
        x="2"
        y="10"
        rx="2"
        ry="2"
        fill="white"
      />
      <path d="M6 18h.01" />
      <path d="M10 14h.01" />
    </svg>
  );
}

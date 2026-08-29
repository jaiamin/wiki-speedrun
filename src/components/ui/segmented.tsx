"use client";

import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

/** A small set of visible game-mode choices. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      className="grid w-full grid-cols-2 gap-2.5"
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-[3.25rem] rounded-2xl border-2 px-3 py-2.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-play)]",
              active
                ? "border-black bg-[var(--color-play-button)] text-black"
                : "border-black/35 bg-white text-black hover:border-black/70 hover:bg-[#eef3ff]",
            )}
          >
            <span className="font-display block text-base font-bold leading-tight">
              {option.label}
            </span>
            {option.hint && (
              <span className="mt-1 block text-[0.7rem] leading-tight text-[var(--color-backdrop-ink)]/70">
                {option.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

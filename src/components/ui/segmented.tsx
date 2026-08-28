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

/**
 * A segmented control rather than a dropdown.
 *
 * There are only ever three or four choices here, and they are the settings a
 * player changes most often. Laying them out flat makes the whole option space
 * visible at a glance and turns changing difficulty into one click instead of
 * three.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      className="inline-flex rounded-[var(--radius-control)] border border-line bg-surface p-0.5"
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
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[4px] px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
              active
                ? "bg-canvas text-text shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                : "text-muted hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

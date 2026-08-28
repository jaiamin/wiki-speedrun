"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface ArticleSearchProps {
  label: string;
  value: string;
  onChange: (title: string) => void;
  placeholder?: string;
  /** The label is still rendered for screen readers when the row supplies one. */
  hideLabel?: boolean;
}

interface Suggestion {
  title: string;
  description: string | null;
}

/**
 * Typeahead over article titles, for building a custom run.
 *
 * Debounced because every keystroke would otherwise be a request to Wikipedia,
 * and choosing from real suggestions rather than accepting free text means a
 * custom run can never start on an article that does not exist.
 */
export function ArticleSearch({
  label,
  value,
  onChange,
  placeholder,
  hideLabel = false,
}: ArticleSearchProps) {
  /**
   * `draft` is null while the field is simply showing the confirmed `value`,
   * and holds in-progress text otherwise. Deriving the displayed string this
   * way — rather than mirroring `value` into state with an effect — keeps the
   * two in sync without a render pass to reconcile them.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ query: string; items: Suggestion[] }>({
    query: "",
    items: [],
  });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = draft ?? value;
  // Results carry the query that produced them, so a slow response for an
  // earlier query can never be shown against a newer one.
  const results = loaded.query === query ? loaded.items : [];

  useEffect(() => {
    const term = query.trim();
    if (!term || term === value) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(term)}`,
        );
        const body = (await response.json()) as { results: Suggestion[] };
        setLoaded({ query, items: body.results ?? [] });
      } catch {
        setLoaded({ query, items: [] });
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, value]);

  const choose = (title: string) => {
    onChange(title);
    setDraft(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className={hideLabel ? "sr-only" : "label mb-2 block"}
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Let a click on a suggestion land before the list unmounts.
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          className="h-10 w-full rounded-[var(--radius-control)] border border-line bg-canvas px-3 text-sm outline-none placeholder:text-faint focus:border-text"
        />
        {loading && (
          <Loader2
            className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-faint"
            aria-hidden
          />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-[var(--radius-card)] border border-line bg-canvas py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          {results.map((result) => (
            <li key={result.title}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  choose(result.title);
                }}
                className="block w-full px-3 py-1.5 text-left hover:bg-surface"
              >
                <span className="block truncate text-[0.8125rem]">
                  {result.title}
                </span>
                {result.description && (
                  <span className="block truncate text-xs text-muted">
                    {result.description}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

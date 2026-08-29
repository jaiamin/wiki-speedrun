"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

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
 * The confirmed value is only ever set by choosing a suggestion, and typing
 * clears it again. That is what guarantees a custom run points at an article
 * that actually exists: free text like "banananana" leaves the value empty, so
 * the start button stays disabled rather than sending the player to a 404.
 *
 * Debounced, because every keystroke would otherwise be a request to Wikipedia.
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
        className={
          hideLabel
            ? "sr-only"
            : "font-display mb-2 block text-xs font-bold tracking-[0.12em] text-[var(--color-backdrop-ink)] uppercase"
        }
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
            // Editing invalidates a previous pick — the text no longer names
            // the article the caller thinks it has.
            if (value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Let a click on a suggestion land before the list unmounts.
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          className="font-display h-12 w-full rounded-xl border-2 border-black bg-white px-4 text-[0.9375rem] font-semibold text-[var(--color-backdrop-ink)] caret-[var(--color-play)] outline-none transition-colors placeholder:font-medium placeholder:text-[var(--color-backdrop-ink)]/40 focus:bg-[#eef3ff]"
        />
        {loading ? (
          <Loader2
            className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-faint"
            aria-hidden
          />
        ) : (
          value && (
            <Check
              className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-good"
              aria-label="Article selected"
            />
          )
        )}
      </div>

      {!value && query.trim() && !loading && results.length === 0 && (
        <p className="font-display mt-1.5 text-xs font-medium text-[var(--color-backdrop-ink)]/70">
          No article matches that. Pick one from the list.
        </p>
      )}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border-2 border-black bg-white py-1 shadow-[0_8px_24px_rgba(11,26,74,0.14)]">
          {results.map((result) => (
            <li key={result.title}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  choose(result.title);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-[#eef3ff]"
              >
                <span className="font-display block truncate text-[0.8125rem] font-semibold text-[var(--color-backdrop-ink)]">
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

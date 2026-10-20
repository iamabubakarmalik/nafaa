'use client';

/**
 * In-page search for long lists (glossary, blog, docs, tools). The list is
 * already in the HTML; this island only hides the items that do not match,
 * so it costs about 1 KB, needs no data request and works the same for every
 * locale. Items carry `data-filter-item` and `data-filter-text`; groups (an
 * A-Z letter, a month) carry `data-filter-group` and hide when empty.
 *
 * Without JavaScript the full list simply stays visible.
 */
import { useEffect, useId, useRef, useState } from 'react';

export interface ListFilterProps {
  /** id of the element that holds the list. */
  target: string;
  label: string;
  placeholder?: string;
  /** Text for "{n} results", with {n} replaced. */
  countLabel?: string;
  emptyLabel?: string;
}

export function ListFilter({ target, label, placeholder, countLabel = '{n} results', emptyLabel = 'Nothing matches. Try a shorter word.' }: ListFilterProps) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = document.getElementById(target);
    if (!root) return;
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    root.querySelectorAll<HTMLElement>('[data-filter-item]').forEach((item) => {
      const text = item.dataset.filterText ?? item.textContent?.toLowerCase() ?? '';
      const match = words.every((word) => text.includes(word));
      // `hidden` alone loses to display utilities such as `flex`, so set display too.
      item.hidden = !match;
      item.style.display = match ? '' : 'none';
      if (match) shown += 1;
    });
    root.querySelectorAll<HTMLElement>('[data-filter-group]').forEach((group) => {
      const empty = !group.querySelector('[data-filter-item]:not([hidden])');
      group.hidden = empty;
      group.style.display = empty ? 'none' : '';
    });
    setCount(words.length ? shown : null);
  }, [query, target]);

  // "/" focuses the field, as on most documentation sites.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.defaultPrevented) return;
      const el = event.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div role="search" className="w-full">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex h-12 items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3.5 shadow-e1 transition-[border-color,box-shadow] duration-fast focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20 ink:shadow-none">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="shrink-0 text-fg-subtle">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={input}
          id={id}
          type="search"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          className="h-full w-full min-w-0 bg-transparent text-body text-fg-strong outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query ? (
          <button type="button" onClick={() => setQuery('')} className="rounded px-1.5 text-small text-fg-subtle hover:text-fg-strong">
            Clear
          </button>
        ) : (
          <kbd className="hidden rounded border border-line-strong px-1.5 font-sans text-xs text-fg-subtle sm:inline-block">/</kbd>
        )}
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-small text-fg-subtle">
        {count === null ? '' : count === 0 ? emptyLabel : countLabel.replace('{n}', String(count))}
      </p>
    </div>
  );
}

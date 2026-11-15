'use client';

/**
 * Site search panel: the field and grouped results. Used inside the header
 * dialog (SearchDialog, its own chunk) and on /search. The index is
 * fetched on first use (lib/search/match), so pages that never search pay
 * nothing for it.
 *
 * Keys: ↓ and ↑ move between the field and the results, Enter in the field
 * opens the top result, Escape closes the dialog (native <dialog>).
 */
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { track } from '@/lib/analytics/track';
import { pathIn, type SiteLocale } from '@/lib/i18n/shell';
import { searchStrings } from '@/lib/i18n/search';
import { searchGroupLabels, SEARCH_GROUPS } from '@/lib/search/groups';
import { groupHits, loadIndex, search, type SearchHit } from '@/lib/search/match';
import styles from './search.module.css';

/** Shown before typing, when the page exists in this language (the first six). */
const POPULAR = ['/pricing', '/tour', '/product', '/industries', '/help', '/faq', '/blog'];

type Index = Awaited<ReturnType<typeof loadIndex>>;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The title with the query words marked. */
function marked(title: string, query: string): ReactNode {
  const words = query
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
  if (!words.length) return title;
  const parts = title.split(new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi'));
  return parts.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

export function SearchPanel({
  locale,
  variant,
  initialQuery = '',
  onNavigate,
}: {
  locale: SiteLocale;
  variant: 'dialog' | 'page';
  initialQuery?: string;
  onNavigate?: () => void;
}) {
  const t = searchStrings(locale);
  const labels = searchGroupLabels(locale);
  const id = useId();
  const [query, setQuery] = useState(initialQuery);
  const [index, setIndex] = useState<Index | null>(null);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    loadIndex(locale)
      .then((rows) => live && setIndex(rows))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [locale]);

  // /search: start from ?q= and keep the address in step with the field.
  useEffect(() => {
    if (variant !== 'page') return;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
  }, [variant]);
  useEffect(() => {
    if (variant !== 'page') return;
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (query.trim()) url.searchParams.set('q', query.trim());
      else url.searchParams.delete('q');
      window.history.replaceState(window.history.state, '', url.pathname + url.search);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, variant]);

  const hits = useMemo(() => (index ? search(index, query, variant === 'page' ? 80 : 40) : []), [index, query, variant]);
  const groups = useMemo(() => groupHits(hits, variant === 'page' ? 20 : 5), [hits, variant]);
  const shown = groups.reduce((n, g) => n + g.hits.length, 0);
  const q = query.trim();

  // One event per settled query.
  useEffect(() => {
    if (q.length < 2 || !index) return;
    const timer = window.setTimeout(() => track('site_search', { label: q.slice(0, 60), results: hits.length, location: variant }), 1200);
    return () => window.clearTimeout(timer);
  }, [q, hits.length, index, variant]);

  const popular = useMemo(() => {
    if (!index) return [];
    const byPath = new Map(index.map((item) => [item.row[2], item.row]));
    return POPULAR.map((p) => byPath.get(pathIn(locale, p)))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .slice(0, 6);
  }, [index, locale]);

  const items = () => Array.from(list.current?.querySelectorAll<HTMLAnchorElement>('a[data-hit]') ?? []);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const all = items();
    if (!all.length) return;
    event.preventDefault();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'ArrowDown') (all[at + 1] ?? all[0])!.focus();
    else if (at <= 0) input.current?.focus();
    else all[at - 1]!.focus();
  };

  const hitLink = (hit: Pick<SearchHit, 'title' | 'summary' | 'path'>, extra?: ReactNode) => (
    <Link href={hit.path} prefetch={false} data-hit="" onClick={onNavigate} className={styles.hit} data-track-label={`Search result: ${hit.path}`}>
      <span className={styles.hitTitle}>{marked(hit.title, q)}</span>
      {hit.summary ? <span className={styles.hitText}>{hit.summary}</span> : null}
      {extra}
    </Link>
  );

  return (
    <div className={styles.panel} data-variant={variant} onKeyDown={onKeyDown}>
      <form
        role="search"
        action={pathIn(locale, '/search')}
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const first = items()[0];
          if (first) first.click();
        }}
      >
        <label htmlFor={`${id}-q`} className="sr-only">
          {t.label}
        </label>
        <svg className={styles.glass} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={input}
          id={`${id}-q`}
          name="q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.placeholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={variant === 'dialog'}
          className={styles.input}
          aria-describedby={`${id}-status`}
        />
        {variant === 'dialog' ? (
          <kbd className={styles.esc} aria-hidden="true">
            Esc
          </kbd>
        ) : (
          <button type="submit" className={styles.submit}>
            {t.submit}
          </button>
        )}
      </form>

      <p id={`${id}-status`} className="sr-only" aria-live="polite">
        {q && index ? (hits.length ? fill(t.count, { n: hits.length, q }) : fill(t.none, { q })) : ''}
      </p>

      <div ref={list} className={styles.results}>
        {!index && !failed ? <p className={styles.note}>{t.loading}</p> : null}
        {index && !q && popular.length ? (
          <section aria-labelledby={`${id}-popular`}>
            <h2 id={`${id}-popular`} className={styles.group}>
              {t.popular}
            </h2>
            <ul className={styles.popular}>
              {popular.map((row) => (
                <li key={row[2]}>
                  <Link href={row[2]} prefetch={false} data-hit="" onClick={onNavigate} className={styles.chip}>
                    {row[0]}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {index && q && hits.length ? (
          <>
            {variant === 'page' ? <p className={styles.count}>{fill(t.count, { n: hits.length, q })}</p> : null}
            {groups.map((g) => (
              <section key={g.group} aria-labelledby={`${id}-g${g.group}`}>
                <h2 id={`${id}-g${g.group}`} className={styles.group}>
                  {labels[SEARCH_GROUPS[g.group]!]}
                </h2>
                <ul className={styles.list}>
                  {g.hits.map((hit) => (
                    <li key={hit.path}>{hitLink(hit)}</li>
                  ))}
                </ul>
              </section>
            ))}
            {variant === 'dialog' && shown < hits.length ? (
              <Link href={`${pathIn(locale, '/search')}?q=${encodeURIComponent(q)}`} prefetch={false} data-hit="" onClick={onNavigate} className={styles.all}>
                {t.seeAll} ({hits.length})
              </Link>
            ) : null}
          </>
        ) : null}
        {(index && q && !hits.length) || failed ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>{fill(t.none, { q: q || '…' })}</p>
            <p>{t.noneHelp}</p>
            <p className={styles.emptyLinks}>
              <Link href={pathIn(locale, locale === 'ur' ? '/faq' : '/help')} prefetch={false} data-hit="" onClick={onNavigate}>
                {t.helpLink}
              </Link>
              <Link href={pathIn(locale, '/contact')} prefetch={false} data-hit="" onClick={onNavigate}>
                {t.contactLink}
              </Link>
            </p>
          </div>
        ) : null}
      </div>

      {variant === 'dialog' ? (
        <p className={styles.keys} aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t.hintMove}
          </span>
          <span>
            <kbd>Enter</kbd> {t.hintOpen}
          </span>
          <span>
            <kbd>Esc</kbd> {t.hintClose}
          </span>
        </p>
      ) : null}
    </div>
  );
}


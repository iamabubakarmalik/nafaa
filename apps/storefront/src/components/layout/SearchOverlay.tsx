'use client';

/** Instant search: results as you type (from /search/suggest), Enter opens the full results page. */
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Suggest } from '@/lib/api';
import { sf } from '@/lib/client/sf';
import { track } from '@/lib/client/track';
import { useStore } from '../providers/StoreProvider';

export function SearchOverlay() {
  const { search, setSearch, t, href, money } = useStore();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (search) setTimeout(() => input.current?.focus(), 30);
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setSearch(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [search, setSearch]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        setRes(await sf<Suggest>('suggest', { q: term }));
      } catch {
        setRes(null);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [q]);

  if (!search) return null;
  const close = () => setSearch(false);
  const submit = () => {
    const term = q.trim();
    if (!term) return;
    track('search', { query: term });
    close();
    router.push(href(`/search?q=${encodeURIComponent(term)}`));
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={t('search.title')}>
      <button type="button" aria-label={t('nav.close')} className="absolute inset-0 animate-fade-in bg-black/45" onClick={close} />
      <div className="relative animate-rise bg-bg text-fg shadow-pop">
        <div className="page py-4">
          <form
            className="flex items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Search size={22} className="shrink-0 text-muted" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search.placeholder')}
              className="h-12 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted/70"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
            />
            {loading && <Loader2 size={20} className="animate-spin text-muted" />}
            <button type="button" className="icon-btn" aria-label={t('nav.close')} onClick={close}>
              <X size={22} />
            </button>
          </form>
          {res && (
            <div className="max-h-[70vh] overflow-y-auto border-t border-line pb-2 pt-4">
              {res.products.length === 0 && res.collections.length === 0 ? (
                <p className="py-6 text-center text-muted">{t('search.none', { q })}</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-[1fr_240px]">
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {res.products.map((p) => (
                      <li key={p.id}>
                        <Link href={href(p.url)} onClick={close} className="flex items-center gap-3 rounded-card p-2 hover:bg-surface">
                          <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[8px] bg-surface">
                            {p.image && <Image src={p.image.url} alt="" fill sizes="56px" className="object-cover" />}
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-[14px] font-medium">{p.title}</span>
                            <span className={`text-[13.5px] font-semibold ${p.compareAtPrice ? 'text-sale' : ''}`}>{money(p.price)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {res.collections.length > 0 && (
                    <div>
                      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">{t('collection.allCollections')}</p>
                      {res.collections.map((c) => (
                        <Link key={c.id} href={href(c.url)} onClick={close} className="block py-1.5 text-[15px] hover:underline">
                          {c.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button type="button" onClick={submit} className="mt-3 flex items-center gap-1.5 text-[14px] font-semibold text-primary">
                {t('search.viewAll')} <ArrowRight size={15} className="rtl:rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

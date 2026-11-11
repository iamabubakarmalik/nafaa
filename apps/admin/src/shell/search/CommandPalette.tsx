/**
 * Global search (Ctrl/⌘+K or "/"): pages from every workspace, plus shops and
 * users from the server once two or more characters are typed.
 * ↑ ↓ move, Enter opens, Esc closes.
 */

import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { Building2, CornerDownLeft, Loader2, Search, User } from 'lucide-react';
import { Kbd } from '@/design-system/components';
import { isTyping } from '@core/lib/shortcuts';
import { cn } from '@/lib/cn';
import { adminTenantsApi } from '@/api/admin-tenants.api';
import { adminUsersApi } from '@/api/admin-users.api';
import { ALL_ITEMS } from '../navigation/nav-config';
import { WorkspaceMark } from '../sidebar/WorkspaceMark';

type IconType = ComponentType<{ className?: string; style?: CSSProperties }>;

export const useCommandPalette = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

interface Result {
  key: string;
  section: string;
  title: string;
  subtitle?: string;
  to: string;
  icon: IconType;
  mark?: (typeof ALL_ITEMS)[number]['workspace'];
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}

/** Opens the palette with Ctrl/⌘+K anywhere, or "/" when not typing. */
export function useCommandPaletteKeys() {
  const setOpen = useCommandPalette((s) => s.setOpen);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!useCommandPalette.getState().open); }
      else if (e.key === '/' && !isTyping() && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);
}

export function SearchTrigger() {
  const setOpen = useCommandPalette((s) => s.setOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-start text-[0.8125rem] text-slate-500 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-ink-white/[0.04]"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">Search pages, shops, users…</span>
      <Kbd>Ctrl K</Kbd>
    </button>
  );
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [index, setIndex] = useState(0);
  const term = useDebounced(q.trim(), 250);
  const remote = term.length >= 2;

  const tenants = useQuery({
    queryKey: ['palette', 'tenants', term],
    queryFn: () => adminTenantsApi.list({ search: term, limit: 5 }),
    enabled: open && remote,
    staleTime: 30_000,
  });
  const users = useQuery({
    queryKey: ['palette', 'users', term],
    queryFn: () => adminUsersApi.list({ search: term, limit: 5 }),
    enabled: open && remote,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (open) { setQ(''); setIndex(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const needle = q.trim().toLowerCase();
    // Best first: page name starts with the text, then a word in the name, then keywords, then the workspace name.
    const score = (it: (typeof ALL_ITEMS)[number]) => {
      const label = it.label.toLowerCase();
      if (label.startsWith(needle)) return 4;
      if (label.split(/[\s&/·-]+/).some((w) => w.startsWith(needle))) return 3;
      if (label.includes(needle) || (it.keywords ?? '').toLowerCase().split(' ').some((w) => w.startsWith(needle))) return 2;
      if (it.workspace.label.toLowerCase().split(' ').some((w) => w.startsWith(needle))) return 1;
      return 0;
    };
    const pages = (needle
      ? ALL_ITEMS.map((it) => ({ it, s: score(it) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.it)
      : ALL_ITEMS.filter((it) => it.group.items[0] === it))
      .slice(0, needle ? (remote ? 5 : 8) : 10)
      .map<Result>((it) => ({ key: `p:${it.workspace.id}:${it.to}`, section: needle ? 'Pages' : 'Jump to', title: it.label, subtitle: it.workspace.label, to: it.to, icon: it.icon as IconType, mark: it.workspace }));
    const shops = (remote ? tenants.data?.items ?? [] : []).map<Result>((t) => ({
      key: `t:${t.id}`, section: 'Shops', title: t.name, subtitle: [`@${t.slug}`, t.phone, t.status.toLowerCase()].filter(Boolean).join(' · '), to: `/tenants/${t.id}`, icon: Building2,
    }));
    const people = (remote ? users.data?.items ?? [] : []).map<Result>((u) => ({
      key: `u:${u.id}`, section: 'Users', title: u.fullName || u.email, subtitle: [u.email, u.tenant?.name].filter(Boolean).join(' · '), to: u.tenant?.id ? `/tenants/${u.tenant.id}` : `/users?search=${encodeURIComponent(u.email ?? '')}`, icon: User,
    }));
    return [...pages, ...shops, ...people];
  }, [q, remote, tenants.data, users.data]);

  useEffect(() => { setIndex(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open) return null;

  const go = (r: Result | undefined) => { if (!r) return; setOpen(false); navigate(r.to); };
  const loading = remote && (tenants.isFetching || users.isFetching);
  let lastSection = '';

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-3 pt-[10vh] sm:p-6 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-slate-950/50 animate-in fade-in duration-150" onClick={() => setOpen(false)} aria-hidden />
      <div className="relative flex max-h-[75dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-4">
          {loading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-slate-400" /> : <Search className="h-5 w-5 shrink-0 text-slate-400" />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(results.length - 1, i + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); go(results[index]); }
            }}
            placeholder="Search pages, shops, users…"
            aria-label="Search"
            className="h-14 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <Kbd className="hidden sm:inline-flex">Esc</Kbd>
        </div>
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2" role="listbox">
          {results.length === 0 && (
            <div className="px-4 py-10 text-center text-[0.875rem] text-slate-500">{loading ? 'Searching…' : `Nothing found for “${q}”`}</div>
          )}
          {results.map((r, i) => {
            const header = r.section !== lastSection ? r.section : null;
            lastSection = r.section;
            const Icon = r.icon;
            return (
              <div key={r.key}>
                {header && <div className="px-2.5 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{header}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  data-index={i}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => go(r)}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition', i === index ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-slate-50')}
                >
                  {r.mark ? <WorkspaceMark workspace={r.mark} size="sm" /> : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-medium text-slate-900">{r.title}</span>
                    {r.subtitle && <span className="block truncate text-[0.75rem] text-slate-500">{r.subtitle}</span>}
                  </span>
                  {i === index && <CornerDownLeft className="h-4 w-4 shrink-0 text-slate-400" />}
                </button>
              </div>
            );
          })}
          {!remote && q.trim().length === 1 && <div className="px-2.5 pt-2 text-[0.75rem] text-slate-400">Type one more letter to search shops and users.</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

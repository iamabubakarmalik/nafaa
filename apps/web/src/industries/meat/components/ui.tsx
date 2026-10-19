/** Small layout pieces shared by the meat pages: list frame, empty and error states, pager, status pill, keys, confirm. */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, Modal, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';

export type Tone = 'slate' | 'amber' | 'emerald' | 'rose' | 'violet' | 'sky';

const TONES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700', amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200', sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
};

export function Pill({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', TONES[tone], className)}>{children}</span>;
}

/** Loading, error and empty states around a white list frame. */
export function ListFrame({ loading, error, onRetry, empty, children }: {
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty?: { icon: LucideIcon; title: string; text?: string; actions?: ReactNode } | null;
  children: ReactNode;
}) {
  if (loading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (error) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">Load nahi hua</p>
        {onRetry && <Button className="mt-3" variant="secondary" onClick={onRetry}>Dobara koshish</Button>}
      </div>
    );
  }
  if (empty) {
    const Icon = empty.icon;
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Icon className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{empty.title}</p>
        {empty.text && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{empty.text}</p>}
        {empty.actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{empty.actions}</div>}
      </div>
    );
  }
  return <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">{children}</ul>;
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Pichla</Button>
      <span className="text-sm text-slate-600">Safha {page} / {pages}</span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Agla</Button>
    </div>
  );
}

/** Page keys: letters and digits map to actions; `/` focuses search. Ignored while typing or in a dialog. */
export function usePageKeys(map: Record<string, (() => void) | undefined | false>, search?: React.RefObject<HTMLInputElement | null>) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/' && search?.current) { e.preventDefault(); search.current.focus(); return; }
      const fn = ref.current[e.key.toLowerCase()];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [search]);
}

/** Ctrl+S (or Cmd+S) runs `save` while the form is open. */
export function useSaveKey(save: () => void) {
  const ref = useRef(save);
  ref.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); ref.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

interface Ask { title: string; text?: string; yes?: string; danger?: boolean }

/** Yes/no question in the design-system dialog. */
export function useConfirm(): [(q: Ask) => Promise<boolean>, ReactNode] {
  const [q, setQ] = useState<Ask | null>(null);
  const done = useRef<((v: boolean) => void) | null>(null);
  const ask = useCallback((next: Ask) => new Promise<boolean>((resolve) => { done.current = resolve; setQ(next); }), []);
  const close = (v: boolean) => { done.current?.(v); done.current = null; setQ(null); };
  const dialog = q && (
    <Modal open onClose={() => close(false)} size="sm" title={q.title} description={q.text}
      footer={<>
        <Button variant="secondary" onClick={() => close(false)}>Rehne dein</Button>
        <Button data-autofocus variant={q.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{q.yes ?? 'Haan'}</Button>
      </>}>{null}</Modal>
  );
  return [ask, dialog];
}

/** Label + control row used by the meat forms. */
export function FormRow({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[0.75rem] font-medium text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-[0.75rem] text-slate-500">{hint}</span> : null}
    </label>
  );
}

export const inputBox = 'h-11 w-full rounded-xl border-0 bg-slate-100 px-3.5 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500 aria-[invalid=true]:ring-rose-400';

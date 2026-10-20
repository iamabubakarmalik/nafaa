/** Small pieces shared by the toy shop pages: page keys, a confirm dialog, an empty state and card action styles. */

import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';

/** "/" focuses search; single letters run the given actions. Ignored while typing or in a dialog. */
export function usePageKeys(search: RefObject<HTMLInputElement | null> | null, keys: Record<string, () => void> = {}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/' && search) { e.preventDefault(); search.current?.focus(); return; }
      const run = keys[e.key.toLowerCase()];
      if (run) { e.preventDefault(); run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
}

/** Ctrl+S (or Cmd+S) saves a form, even while typing in it. */
export function useSaveKey(save: () => void, on = true) {
  useEffect(() => {
    if (!on) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
}

/** Value that follows `value` after `ms` of no change (for server search). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const cardAction = 'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-100';
export const cardLink = 'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50';
export const cardDanger = 'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium text-rose-700 hover:bg-rose-50';

export function EmptyBox({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
      <Icon className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ConfirmModal({ title, text, confirm, danger, pending, onConfirm, onClose }: {
  title: string; text: ReactNode; confirm: string; danger?: boolean; pending?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} size="sm" title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant={danger ? 'danger' : 'primary'} loading={pending} onClick={onConfirm}>{confirm}</Button></>}>
      <div className="text-[0.875rem] text-slate-700">{text}</div>
    </Modal>
  );
}

/**
 * Batch on a bill line: shows the batch and expiry being sold (earliest
 * expiry by default) and lets the cashier pick another one. Expired stock
 * is flagged in red, stock close to expiry in amber.
 */

import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Layers } from 'lucide-react';
import { Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatDate } from '@core/lib/format';
import type { PosBatch } from '../api/batches.api';
import { batchDaysLeft, defaultBatch, isBatchExpired, type PosLineBatch } from '../hooks/usePosBatches';

/** Days before expiry when a batch is shown as close to expiry. */
const SOON_DAYS = 30;

function expiryText(b: PosBatch) {
  if (!b.expiryDate) return 'Expiry nahi';
  const left = batchDaysLeft(b) ?? 0;
  if (isBatchExpired(b)) return `Expired ${formatDate(b.expiryDate)}`;
  return left <= SOON_DAYS ? `Exp ${formatDate(b.expiryDate)} · ${left} din` : `Exp ${formatDate(b.expiryDate)}`;
}

function tone(b: PosBatch) {
  if (isBatchExpired(b)) return 'danger';
  const left = batchDaysLeft(b);
  return left !== null && left <= SOON_DAYS ? 'warn' : 'ok';
}

const TONES = {
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  warn: 'bg-amber-50 text-amber-800 ring-amber-200',
  ok: 'bg-slate-100 text-slate-600 ring-slate-200',
} as const;

export function PosBatchChip({ info, baseQuantity, unit, onPick }: {
  info: PosLineBatch;
  /** Line quantity in the base unit, to say when one batch will not cover it. */
  baseQuantity: number;
  unit: string;
  onPick: (batch: PosBatch | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const b = info.current;
  if (!b) return null;
  const t = tone(b);
  const short = baseQuantity > b.quantity + 0.0001;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Batch badlein"
        className={cn('mt-1 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium ring-1 transition hover:brightness-95', TONES[t])}>
        {t === 'danger' ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <Layers className="h-3 w-3 shrink-0" />}
        <span className="truncate">
          Batch {b.batchNumber}{info.picked ? '' : ' (auto)'} · {expiryText(b)}{short ? ' · baqi agle Batch se' : ''}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      {open && (
        <PosBatchPickerModal list={info.list} currentId={info.picked ? b.id : undefined} unit={unit}
          onPick={(x) => { onPick(x); setOpen(false); }} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function PosBatchPickerModal({ list, currentId, unit, onPick, onClose }: {
  list: PosBatch[];
  currentId?: string;
  unit: string;
  onPick: (batch: PosBatch | null) => void;
  onClose: () => void;
}) {
  const auto = defaultBatch(list);
  return (
    <Modal open onClose={onClose} size="sm" title="Batch chunein"
      description="Pehle wohi Batch bikta hai jis ki Expiry sab se qareeb ho. Koi aur Batch bechna ho to yahan chunein.">
      <ul className="space-y-2">
        <li>
          <button type="button" onClick={() => onPick(null)}
            className={cn('flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left ring-1 transition',
              !currentId ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
            <span>
              <span className="block text-[0.875rem] font-semibold text-slate-900">Auto (sab se qareeb Expiry)</span>
              {auto && <span className="block text-[0.75rem] text-slate-500">Abhi: Batch {auto.batchNumber} · {expiryText(auto)}</span>}
            </span>
            {!currentId && <Check className="h-4 w-4 text-brand-700" />}
          </button>
        </li>
        {list.map((b) => {
          const t = tone(b);
          const on = b.id === currentId;
          return (
            <li key={b.id}>
              <button type="button" onClick={() => onPick(b)}
                className={cn('flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left ring-1 transition',
                  on ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                <span className="min-w-0">
                  <span className="block truncate text-[0.875rem] font-semibold text-slate-900">Batch {b.batchNumber}</span>
                  <span className={cn('mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.6875rem] font-medium', TONES[t])}>
                    {t === 'danger' && <AlertTriangle className="h-3 w-3" />}{expiryText(b)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[0.8125rem] tabular-nums text-slate-600">
                  {Number(b.quantity.toFixed(3))} {unit}
                  {on && <Check className="h-4 w-4 text-brand-700" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {list.some(isBatchExpired) && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[0.75rem] text-rose-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Expired maal na bechein. Auto me expired Batch tabhi lagta hai jab theek Batch khatam ho jaye.
        </p>
      )}
    </Modal>
  );
}

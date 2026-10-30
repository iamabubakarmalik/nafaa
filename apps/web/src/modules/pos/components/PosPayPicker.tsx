/**
 * F8: pick how the customer pays with one number key (1–5), then checkout
 * opens with that method, ready for the amount.
 */

import { useEffect } from 'react';
import { Banknote, BookOpen, CreditCard, Smartphone, Split, Zap } from 'lucide-react';
import { Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { t } from '@core/i18n';

export type PosPayChoice = { method: PaymentMethod } | { mode: 'credit' } | { split: true };

const OPTIONS: Array<{ key: string; label: string; icon: typeof Banknote; color: string; choice: PosPayChoice }> = [
  { key: '1', label: t('Cash'), icon: Banknote, color: '#16a34a', choice: { method: 'CASH' } },
  { key: '2', label: t('Card'), icon: CreditCard, color: '#2563eb', choice: { method: 'CARD' } },
  { key: '3', label: t('JazzCash'), icon: Smartphone, color: '#ea580c', choice: { method: 'JAZZCASH' } },
  { key: '4', label: t('Easypaisa'), icon: Zap, color: '#22c55e', choice: { method: 'EASYPAISA' } },
  { key: '5', label: t('Udhaar'), icon: BookOpen, color: '#d97706', choice: { mode: 'credit' } },
  { key: '6', label: t('Split'), icon: Split, color: '#7c3aed', choice: { split: true } },
];

export function PosPayPicker({ total, hasCustomer, allowCredit, onPick, onClose }: {
  total: number;
  hasCustomer: boolean;
  allowCredit: boolean;
  onPick: (c: PosPayChoice) => void;
  onClose: () => void;
}) {
  const disabled = (c: PosPayChoice) => 'mode' in c && (!hasCustomer || !allowCredit);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const o = OPTIONS.find((x) => x.key === e.key);
      if (!o) return;
      e.preventDefault();
      if (!disabled(o.choice)) onPick(o.choice);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Modal open onClose={onClose} size="sm" title={t('Payment kaise?')} description={t('Bill {{total}} · number dabayein', { total: formatPKR(total) })}>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((o) => {
          const off = disabled(o.choice);
          return (
            <button key={o.key} type="button" disabled={off} onClick={() => onPick(o.choice)}
              title={off ? (allowCredit ? t('Udhaar ke liye pehle customer chunein (F2)') : t('Udhaar Settings me band hai')) : undefined}
              className={cn('flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-start transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40')}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[0.875rem] font-bold text-white" style={{ backgroundColor: o.color }}>{o.key}</span>
              <o.icon className="h-4 w-4 shrink-0" style={{ color: o.color }} />
              <span className="text-[0.875rem] font-semibold text-slate-800">{o.label}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/** Asks for a cancel reason before an order is cancelled or rejected. */

import { useState } from 'react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';

const CANCEL_REASONS = ['Stock khatam', 'Customer ne mana kiya', 'Address/number ghalat', 'Fake order', 'Delivery nahi ho sakti'];

export function CancelOrderModal({ open, hasBill, loading, title = 'Order cancel karein?', onClose, onConfirm }: {
  open: boolean; hasBill: boolean; loading: boolean; title?: string; onClose: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={hasBill ? 'Bill void ho jayega aur saara stock wapas inventory me aa jayega.' : 'Order cancel list me chala jayega.'}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Nahi</Button>
          <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>Haan, cancel</Button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {CANCEL_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-semibold', reason === r
              ? 'border-rose-400 bg-rose-50 text-rose-700'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50')}
          >{r}</button>
        ))}
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Wajah likhein…"
        rows={2}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
      />
    </Modal>
  );
}

/** Bills put on hold, to resume when the customer comes back to the counter. */

import { useEffect } from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import { Button, EmptyState, IconButton, Kbd, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { PosHeldCart } from '../lib/posCart';

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000);
  return m < 1 ? 'abhi' : m < 60 ? `${m} min pehle` : `${Math.round(m / 60)} ghante pehle`;
};

export function PosHoldCartsModal({ heldCarts, onResume, onDelete, onClose }: {
  heldCarts: PosHeldCart[];
  onResume: (cart: PosHeldCart) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  // 1–9 resumes that bill.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 9 && heldCarts[n - 1] && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); onResume(heldCarts[n - 1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [heldCarts, onResume]);
  return (
    <Modal open onClose={onClose} size="md" title="Hold kiye hue bill" description="Customer wapas aaye to wahin se shuru karein — number dabayein">
      {heldCarts.length === 0 ? (
        <EmptyState icon={<Pause className="h-6 w-6" />} title="Koi bill hold par nahi" />
      ) : (
        <ul className="-mx-1 divide-y divide-slate-100">
          {heldCarts.map((h, i) => (
            <li key={h.id} className="flex items-center gap-3 px-1 py-3">
              {i < 9 && <Kbd>{i + 1}</Kbd>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-medium text-slate-900">{h.lines.slice(0, 3).map((l) => l.name).join(', ')}{h.lines.length > 3 ? ` +${h.lines.length - 3}` : ''}</p>
                <p className="text-[0.75rem] text-slate-500">{h.lines.length} cheezein · {ago(h.heldAt)}</p>
              </div>
              <span className="text-[0.9375rem] font-semibold tabular-nums text-slate-900">{formatPKR(h.total)}</span>
              <Button size="sm" leftIcon={<Play className="h-4 w-4" />} onClick={() => onResume(h)}>Resume</Button>
              <IconButton label="Mitayein" size="sm" onClick={() => onDelete(h.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></IconButton>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/**
 * Approve or reject one or more damage reports with an optional note.
 * Approving takes the goods out of the branch stock and records a stock
 * adjustment; rejecting moves nothing.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { STOCK_KEYS } from '@modules/inventory/stock-adjustments/components/meta';
import { damageApi, type DamageLog } from '../api/damage.api';
import { DAMAGE_KEY, apiError, itemLabel, qtyLabel } from './meta';

const REJECT_CHIPS = ['Maal theek hai', 'Ghalat quantity', 'Photo saaf nahi', 'Dobara report karein'];

export function DecideModal({ mode, rows, onClose, onDone }: {
  mode: 'approve' | 'reject';
  rows: DamageLog[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const { cost: money } = useMasked();
  const [note, setNote] = useState('');
  const approve = mode === 'approve';
  const total = rows.reduce((s, r) => s + r.netLoss, 0);

  const run = useMutation({
    mutationFn: async () => {
      const n = note.trim() || undefined;
      if (approve) {
        if (rows.length === 1) { await damageApi.approve(rows[0].id, n); return { ok: 1, failed: [] as string[] }; }
        const r = await damageApi.approveMany(rows.map((x) => x.id), n);
        return { ok: r.approved, failed: r.failed.map((f) => f.message) };
      }
      let ok = 0;
      const failed: string[] = [];
      for (const r of rows) {
        try { await damageApi.reject(r.id, n); ok++; } catch (e) { failed.push(apiError(e, 'Rad nahi hua')); }
      }
      return { ok, failed };
    },
    onSuccess: ({ ok, failed }) => {
      if (ok) toast.success(approve ? `${ok} report approve — stock se nikal gaya` : `${ok} report rad`);
      if (failed.length) toast.error(`${failed.length} nahi hue: ${failed[0]}`);
      qc.invalidateQueries({ queryKey: [DAMAGE_KEY] });
      if (approve && ok) STOCK_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onDone?.();
      onClose();
    },
    onError: (e) => toast.error(apiError(e, approve ? 'Approve nahi hua' : 'Rad nahi hua')),
  });

  return (
    <Modal open onClose={onClose} size="md"
      title={approve ? (rows.length > 1 ? `${rows.length} report approve karein` : 'Report approve karein') : (rows.length > 1 ? `${rows.length} report rad karein` : 'Report rad karein')}
      description={approve ? 'Approval par maal branch ke stock se nikal jayega aur Stock adjustments me "Kharab" ya "Gum" ban kar dikhega.' : 'Rad karne se stock nahi badalta. Report record me "Rad" likhi rahegi.'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant={approve ? 'primary' : 'danger'} loading={run.isPending} onClick={() => run.mutate()}
          leftIcon={approve ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}>
          {approve ? 'Approve karein' : 'Rad karein'}
        </Button>
      </>}>
      <div className="space-y-3">
        <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-2xl ring-1 ring-slate-200">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]">
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">{itemLabel(r)}</span>
                <span className="block text-[0.75rem] text-slate-500">{r.damageNumber} · {qtyLabel(r)}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-rose-700">−{money(r.netLoss)}</span>
            </li>
          ))}
        </ul>
        {approve && rows.length > 1 && (
          <p className="flex justify-between rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
            <span>Kul nuqsan</span><b className="tabular-nums">−{money(total)}</b>
          </p>
        )}
        <div>
          <label htmlFor="decide-note" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{approve ? 'Note' : 'Rad karne ki wajah'}</label>
          <textarea id="decide-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} data-autofocus
            placeholder={approve ? 'Marzi hai — maslan: Supplier ko wapas bhejna hai' : 'Staff ko pata chale kyun rad hua'}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
          {!approve && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REJECT_CHIPS.map((c) => (
                <button key={c} type="button" onClick={() => setNote(c)}
                  className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">{c}</button>
              ))}
            </div>
          )}
          <p className="mt-1 text-[0.6875rem] text-slate-500">{approve ? 'Report ke sath save hota hai.' : 'Report karne wala record me yeh wajah dekhega.'}</p>
        </div>
      </div>
    </Modal>
  );
}

/**
 * True profit of one online order: goods sold, product cost, delivery
 * collected and every selling cost (courier, COD fee, gateway fee,
 * packaging, return leg), with where each cost came from. Costs can be
 * corrected by hand; an empty box goes back to the shop's rate card. The
 * profit lines show only to users who may see cost (the API leaves them out
 * otherwise); the selling costs show to everyone who handles the order.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, type OnlineOrderDetail } from '../../api/online-orders.api';
import { COST_KINDS, COST_LABEL, orderMoneyApi, type CostKind, type CostSource } from '../../api/order-money.api';
import { rs, whenText } from '../../lib/labels';

const SOURCE_TEXT: Record<CostSource, string> = {
  API: 'courier se', STATEMENT: 'statement se', MANUAL: 'aap ne likha', POSTED: 'likha hua', ESTIMATE: 'andaza', NONE: '',
};

export function OrderProfitCard({ order: o, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const c = o.sellingCosts;
  // Profit needs the bill (goods and their cost); before it only the expected selling costs show.
  const p = o.nafaaSaleId ? o.profit : undefined;
  if (!c) return null;
  const closed = ['CANCELLED', 'REJECTED'].includes(o.orderStatus) && !o.dispatchedAt;
  if (closed) return null;
  const done = ['DELIVERED', 'RETURNED'].includes(o.orderStatus);
  const shown = COST_KINDS.filter((k) => c[k].value > 0 || c[k].source !== 'NONE');

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80">
      <div className="flex items-center gap-2">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">{p ? 'Asli profit' : 'Selling costs'}</span>
        {!done && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-slate-500">abhi andaza</span>}
        <span className="flex-1" />
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">
          <Pencil className="h-3 w-3" /> Cost theek karein
        </button>
      </div>

      {p && (
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className={cn('flex items-center gap-1.5 text-2xl font-bold tabular-nums', p.profit >= 0 ? 'text-success-700' : 'text-rose-600')}>
            {p.profit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            {p.profit < 0 ? '− ' : ''}{rs(Math.abs(p.profit))}
          </div>
          {p.margin !== null && <div className="text-right text-xs text-slate-500">Margin <span className={cn('font-bold', p.margin >= 0 ? 'text-slate-800' : 'text-rose-600')}>{p.margin}%</span></div>}
        </div>
      )}

      <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[0.8125rem]">
        {p && <>
          <Row label="Sale (maal)" value={rs(p.sale)} hint={o.orderStatus === 'RETURNED' ? 'Parcel wapas — bill void' : undefined} />
          <Row label="Product cost" value={`− ${rs(p.cost)}`} />
          {p.deliveryCollected > 0 && <Row label="Delivery customer se mili" value={`+ ${rs(p.deliveryCollected)}`} tone="text-success-700" />}
        </>}
        {shown.map((k) => (
          <Row key={k} label={COST_LABEL[k]} value={`− ${rs(c[k].value)}`} hint={SOURCE_TEXT[c[k].source]}
            tone={c[k].source === 'ESTIMATE' ? 'text-slate-500' : undefined} />
        ))}
        {!shown.length && <p className="text-xs text-slate-500">Is order par abhi koi selling cost nahi.</p>}
        <Row label="Selling costs total" value={`− ${rs(c.total)}`} strong />
      </dl>

      {c.courierMissing && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[0.75rem] text-amber-900">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{o.courierLabel ?? 'Is courier'} ka rate likha nahi — <Link to="/online-store/costs" className="font-semibold underline">Selling costs</Link> me rate likhein, profit khud ban jayega.</span>
        </p>
      )}
      {o.costPosting?.on && (
        <p className="mt-2 text-[0.6875rem] text-slate-500">
          {o.costPosting.postedAt
            ? `Expense ${o.costPosting.expenseNumber ?? ''} me likha gaya · ${whenText(o.costPosting.postedAt)} — P&L me shamil`
            : done
              ? 'Ye order setting chalu hone se pehle band hua — is ke costs Expenses me nahi likhe gaye. Statement milane ya cost theek karne par likh diye jayenge.'
              : 'Deliver ya wapas hote hi ye costs Expenses me khud likhe jayenge (P&L).'}
        </p>
      )}

      {editing && <EditCosts order={o} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />}
    </section>
  );
}

function Row({ label, value, hint, tone, strong }: { label: string; value: string; hint?: string; tone?: string; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', strong && 'border-t border-slate-100 pt-1.5')}>
      <dt className={cn(strong ? 'font-bold text-slate-900' : 'text-slate-600')}>
        {label}{hint && <span className="ml-1.5 text-[0.6875rem] text-slate-400">{hint}</span>}
      </dt>
      <dd className={cn('tabular-nums', strong ? 'font-bold text-slate-900' : 'font-semibold text-slate-700', tone)}>{value}</dd>
    </div>
  );
}

function EditCosts({ order: o, onClose, onSaved }: { order: OnlineOrderDetail; onClose: () => void; onSaved: () => void }) {
  const c = o.sellingCosts!;
  const saved = (k: CostKind) => c[k].source !== 'ESTIMATE' && c[k].source !== 'NONE';
  const [vals, setVals] = useState<Record<CostKind, string>>(() =>
    Object.fromEntries(COST_KINDS.map((k) => [k, saved(k) ? String(c[k].value) : ''])) as Record<CostKind, string>);
  const save = useMutation({
    mutationFn: () => orderMoneyApi.setCosts(o.id, Object.fromEntries(COST_KINDS.map((k) => [k, vals[k].trim() === '' ? null : Number(vals[k])])) as Record<CostKind, number | null>),
    onSuccess: () => { toast.success('Costs save ho gayi'); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const bad = COST_KINDS.some((k) => vals[k].trim() !== '' && !(Number(vals[k]) >= 0));
  return (
    <Modal open onClose={onClose} size="sm" title={`Order #${o.externalOrderNumber ?? o.externalOrderId} — costs`}
      description="Courier ki asli raseed ya statement se amount likhein. Khali chhorein to rate card wala andaza lagega."
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={bad} onClick={() => save.mutate()}>Save</Button></div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {COST_KINDS.map((k) => (
          <Input key={k} size="sm" type="number" min={0} label={`${COST_LABEL[k]} (Rs)`} value={vals[k]} placeholder={c[k].value ? `Andaza ${Math.round(c[k].value)}` : 'Khali'}
            onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
        ))}
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, CreditCard, MessageCircle } from 'lucide-react';
import { Button } from '@core/ui/Button';
import { apiErrorMessage, paymentsApi, type OnlineOrderDetail, type OrderPaymentLink } from '../api/online-orders.api';
import { rs, waNumber, whenText } from '../lib/labels';
import { inputCls } from './ui/kit';
import { cn } from '@core/lib/cn';

const STATUS: Record<OrderPaymentLink['status'], { label: string; tone: string }> = {
  PENDING: { label: 'Intezar', tone: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Mil gaya ✓', tone: 'bg-emerald-100 text-emerald-800' },
  FAILED: { label: 'Nahi hua', tone: 'bg-rose-100 text-rose-700' },
  EXPIRED: { label: 'Khatam', tone: 'bg-slate-100 text-slate-600' },
};

/**
 * Order par online payment link — poori baqi raqam, ya sirf advance (jaise
 * delivery charges) — RTO khatra wale customer se pehle paisa.
 */
export function PaymentLinkSection({ order: o, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const { data: gws } = useQuery({ queryKey: ['payment-accounts'], queryFn: paymentsApi.accounts, staleTime: 5 * 60_000 });
  const ready = (gws ?? []).filter((g) => g.connected && g.active);
  const links = ((o.metadata as any)?.payments ?? []) as OrderPaymentLink[];
  const advance = links.filter((l) => l.status === 'PAID').reduce((s, l) => s + l.amount, 0);
  const due = Math.max(0, Math.round(o.total - advance));
  const [mode, setMode] = useState<'full' | 'delivery' | 'custom'>(o.risk?.level === 'HIGH' || o.risk?.level === 'WATCH' ? 'delivery' : 'full');
  const [custom, setCustom] = useState('');
  const [last, setLast] = useState<(OrderPaymentLink & { url: string }) | null>(null);
  const [gw, setGw] = useState('');
  const provider = ready.find((g) => g.code === gw) ?? ready[0];
  const amount = mode === 'full' ? due : mode === 'delivery' ? Math.min(due, Math.round(o.deliveryFee) || 0) : Number(custom) || 0;

  const make = useMutation({
    mutationFn: () => paymentsApi.createLink(o.id, { provider: provider.code, amount }),
    onSuccess: (r) => { setLast(r); onChanged(); toast.success('Payment link ban gaya — customer ko bhejein'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const closed = ['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus);
  if (closed || (o.paymentStatus === 'PAID' && !links.length)) return null;

  const wa = waNumber(o.customerPhone);
  const msg = last ? encodeURIComponent(`Assalam o Alaikum ${o.customerName.split(' ')[0]}! Order #${o.externalOrderNumber ?? o.externalOrderId} ke ${last.kind === 'ADVANCE' ? 'advance' : ''} Rs ${last.amount.toLocaleString('en-PK')} yahan se pay karein (card / wallet): ${last.url}`) : '';

  return (
    <section className="rounded-2xl border border-slate-200 p-4 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-slate-400" />
        <div className="flex-1 text-sm font-black text-slate-900 dark:text-white">Online payment</div>
        {advance > 0 && <span className="text-xs font-bold text-emerald-700">{rs(advance)} mil chuka</span>}
      </div>

      {links.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {links.slice().reverse().map((l) => (
            <li key={l.ref} className="flex items-center gap-2">
              <span className={cn('rounded px-1.5 py-0.5 font-bold', STATUS[l.status].tone)}>{STATUS[l.status].label}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{rs(l.amount)} {l.kind === 'ADVANCE' ? 'advance' : ''}</span>
              <span className="text-slate-400">· {whenText(l.paidAt ?? l.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {o.paymentStatus !== 'PAID' && due > 0 && (
        !ready.length ? (
          <p className="mt-2 text-xs text-slate-500">Customer se card / JazzCash / Easypaisa se advance lein — pehle <Link to="/online-store/payments" className="font-bold text-emerald-700 hover:underline">payment gateway jorein</Link>.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {(o.risk?.level === 'HIGH' || o.risk?.level === 'WATCH') && (
              <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">⚠ Is customer ka RTO khatra — bhejne se pehle advance le lein</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {([['full', `Poori · ${rs(due)}`], ...(o.deliveryFee > 0 ? [['delivery', `Delivery · ${rs(Math.min(due, o.deliveryFee))}`]] : []), ['custom', 'Apni raqam']] as [typeof mode, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setMode(k)}
                  className={cn('rounded-lg border px-2.5 py-1 text-xs font-bold', mode === k ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-700 dark:border-neutral-700 dark:text-slate-200')}>
                  {label}
                </button>
              ))}
            </div>
            {ready.length > 1 && (
              <select value={provider.code} onChange={(e) => setGw(e.target.value)} className={cn(inputCls, 'h-8 w-48')}>
                {ready.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
              </select>
            )}
            {mode === 'custom' && <input type="number" min={1} max={due} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={`1 se ${due} tak`} className={cn(inputCls, 'h-8 w-40')} />}
            <Button size="xs" variant="primary" loading={make.isPending} disabled={!(amount >= 1 && amount <= due)} onClick={() => make.mutate()} leftIcon={<CreditCard className="h-3.5 w-3.5" />}>
              {rs(amount || 0)} ka link banayein ({provider.name})
            </Button>
          </div>
        )
      )}

      {last && (
        <div className="mt-3 flex flex-wrap gap-2">
          {wa && (
            <a href={`https://wa.me/${wa}?text=${msg}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp par bhejein
            </a>
          )}
          <Button size="xs" variant="outline" onClick={() => navigator.clipboard?.writeText(last.url).then(() => toast.success('Link copy ho gaya'))} leftIcon={<Copy className="h-3.5 w-3.5" />}>Link copy</Button>
        </div>
      )}
    </section>
  );
}

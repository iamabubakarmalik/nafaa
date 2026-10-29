import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, CreditCard, MessageCircle } from 'lucide-react';
import { Alert, Badge, Button, Card, controlClass, Segmented, type BadgeVariant } from '@/design-system/components';
import { apiErrorMessage, paymentsApi, type OnlineOrderDetail, type OrderPaymentLink } from '../api/online-orders.api';
import { rs, waNumber, whenText } from '../lib/labels';
import { cn } from '@core/lib/cn';
import { BrandLogo, brandForPayment } from '@/assets/brands/BrandLogo';

const STATUS: Record<OrderPaymentLink['status'], { label: string; tone: BadgeVariant }> = {
  PENDING: { label: 'Intezar', tone: 'warning' },
  PAID: { label: 'Mil gaya ✓', tone: 'success' },
  FAILED: { label: 'Nahi hua', tone: 'danger' },
  EXPIRED: { label: 'Khatam', tone: 'default' },
};

/**
 * Online payment link on an order: the full amount due, or only an advance
 * (such as the delivery charges), so a risky customer pays before dispatch.
 */
export function PaymentLinkSection({ order: o, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const { data: gws } = useQuery({ queryKey: ['payment-accounts'], queryFn: paymentsApi.accounts, staleTime: 5 * 60_000 });
  const ready = (gws ?? []).filter((g) => g.connected && g.active);
  const links = ((o.metadata as any)?.payments ?? []) as OrderPaymentLink[];
  const open = links.filter((l) => l.provider !== 'MANUAL' && l.status !== 'PAID');
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
  if (closed || (o.paymentStatus === 'PAID' && !open.length)) return null;

  const wa = waNumber(o.customerPhone);
  const msg = last ? encodeURIComponent(`Assalam o Alaikum ${o.customerName.split(' ')[0]}! Order #${o.externalOrderNumber ?? o.externalOrderId} ke ${last.kind === 'ADVANCE' ? 'advance' : ''} Rs ${last.amount.toLocaleString('en-PK')} yahan se pay karein (card / wallet): ${last.url}`) : '';

  return (
    <Card>
      <div className="flex items-center gap-2">
        {ready.length === 1
          ? <BrandLogo name={brandForPayment(ready[0].code)} size={28} title={ready[0].name} />
          : <CreditCard className="h-5 w-5 text-slate-400" />}
        <div className="flex-1 text-sm font-bold text-slate-900">Online payment</div>
        {advance > 0 && <span className="text-xs font-bold text-success-700">{rs(advance)} mil chuka</span>}
      </div>

      {/* Paid links and hand-recorded advances are listed in the money card above. */}
      {open.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {open.slice().reverse().map((l) => (
            <li key={l.ref} className="flex flex-wrap items-center gap-2">
              <BrandLogo name={brandForPayment(l.provider)} size={18} title={l.provider} />
              <Badge size="xs" variant={STATUS[l.status].tone}>{STATUS[l.status].label}</Badge>
              <span className="font-semibold text-slate-700">{rs(l.amount)} {l.kind === 'ADVANCE' ? 'advance' : ''}</span>
              <span className="text-slate-400">· {whenText(l.paidAt ?? l.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {o.paymentStatus !== 'PAID' && due > 0 && (
        !ready.length ? (
          <p className="mt-2 text-xs text-slate-500">Customer se card, JazzCash ya Easypaisa se advance lein — pehle <Link to="/online-store/payments" className="font-bold text-brand-700 hover:underline">payment gateway jorein</Link>.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {(o.risk?.level === 'HIGH' || o.risk?.level === 'WATCH') && (
              <Alert tone="warning" title="Is customer ka RTO khatra — bhejne se pehle advance le lein" />
            )}
            <Segmented label="Kitni amount" value={mode} onChange={setMode} className="flex-wrap"
              items={([['full', `Poori · ${rs(due)}`], ...(o.deliveryFee > 0 ? [['delivery', `Delivery · ${rs(Math.min(due, o.deliveryFee))}`]] : []), ['custom', 'Apni amount']] as [typeof mode, string][]).map(([k, label]) => ({ value: k, label }))} />
            {ready.length > 1 && (
              <Segmented label="Gateway" value={provider.code} onChange={setGw} className="flex-wrap"
                items={ready.map((g) => ({ value: g.code, label: <><BrandLogo name={brandForPayment(g.code)} size={18} />{g.name}</> }))} />
            )}
            {mode === 'custom' && <input type="number" min={1} max={due} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={`1 se ${due} tak`} aria-label="Amount" className={cn(controlClass(), 'h-8 w-40 px-3 text-[0.8125rem]')} />}
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
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-600 px-2.5 text-xs font-semibold text-brand-fg shadow-sm hover:bg-brand-700">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp par bhejein
            </a>
          )}
          <Button size="xs" variant="outline" onClick={() => navigator.clipboard?.writeText(last.url).then(() => toast.success('Link copy ho gaya'))} leftIcon={<Copy className="h-3.5 w-3.5" />}>Link copy</Button>
        </div>
      )}
    </Card>
  );
}

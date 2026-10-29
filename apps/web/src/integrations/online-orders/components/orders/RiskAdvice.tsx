/**
 * The shop's risky-order rule on one order: a HIGH-risk COD customer is asked
 * for an advance (the shop's %) before the parcel goes out. One tap sends
 * the request on WhatsApp, makes a payment link when a gateway is connected,
 * or blocks the number.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CreditCard, HandCoins, MessageCircle } from 'lucide-react';
import { Button } from '@/design-system/components';
import { apiErrorMessage, onlineOrdersApi, paymentsApi, type OnlineOrderDetail } from '../../api/online-orders.api';
import { rs, waNumber } from '../../lib/labels';

export function RiskAdvice({ order: o, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const qc = useQueryClient();
  const a = o.riskAdvice;
  const { data: gws } = useQuery({ queryKey: ['payment-accounts'], queryFn: paymentsApi.accounts, staleTime: 5 * 60_000, enabled: !!a });
  const gateway = (gws ?? []).find((g) => g.connected && g.active);
  const link = useMutation({
    mutationFn: () => paymentsApi.createLink(o.id, { provider: gateway!.code, amount: a!.amount }),
    onSuccess: (r) => {
      onChanged();
      const wa = waNumber(o.customerPhone);
      const text = encodeURIComponent(`Assalam o Alaikum ${o.customerName.split(' ')[0]}! Order #${o.externalOrderNumber ?? o.externalOrderId} bhejne se pehle ${rs(r.amount)} advance yahan se pay karein: ${r.url}\nBaqi paisa delivery par. Shukriya!`);
      if (wa) window.open(`https://wa.me/${wa}?text=${text}`, '_blank', 'noopener');
      toast.success('Advance ka link ban gaya');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const block = useMutation({
    mutationFn: () => onlineOrdersApi.block({ phone: o.customerPhone ?? '', name: o.customerName, reason: (o.risk?.reasons ?? [o.risk?.reason]).filter(Boolean).join(' · ').slice(0, 200) }),
    onSuccess: () => { toast.success('Number block ho gaya'); onChanged(); qc.invalidateQueries({ queryKey: ['blocklist'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  if (!a) return null;
  const wa = waNumber(o.customerPhone);
  const ask = encodeURIComponent(
    `Assalam o Alaikum ${o.customerName.split(' ')[0]}! Aap ka order #${o.externalOrderNumber ?? o.externalOrderId} (${rs(o.total)}) tayyar hai. ` +
    `Bhejne se pehle ${rs(a.amount)} advance JazzCash / Easypaisa / bank se bhej dein — baqi paisa delivery par. Shukriya!`,
  );
  return (
    <div className="mt-3 rounded-xl border border-rose-200 bg-white p-3">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <HandCoins className="h-4 w-4 text-rose-600" /> Pehle advance maangein: {rs(a.amount)} <span className="font-semibold text-slate-500">({a.pct}%)</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-600">Aap ki setting: RTO khatre wale customer se bhejne se pehle advance. Paisa aaye to "Advance likhein" me likh dein — COD utna kam ho jayega.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {wa && (
          <a href={`https://wa.me/${wa}?text=${ask}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-success-700">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp par maangein
          </a>
        )}
        {gateway && (
          <Button size="xs" variant="outline" loading={link.isPending} onClick={() => link.mutate()} leftIcon={<CreditCard className="h-3.5 w-3.5" />}>Payment link</Button>
        )}
        {o.customerPhone && o.risk?.level !== 'BLOCKED' && (
          <Button size="xs" variant="critical" loading={block.isPending} onClick={() => block.mutate()} leftIcon={<Ban className="h-3.5 w-3.5" />}>Number block</Button>
        )}
      </div>
    </div>
  );
}

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, MessageCircle, Phone, PhoneMissed, XCircle } from 'lucide-react';
import { Button } from '@/design-system/components';
import { apiErrorMessage, onlineOrdersApi, type OnlineOrderDetail } from '../api/online-orders.api';
import { rs, waNumber, whenText } from '../lib/labels';
import { cn } from '@core/lib/cn';
import { moneyOf } from './orders/OrderMoneyCard';

/**
 * COD confirmation — bhejne se pehle customer se "haan" le lo. Fake / ghalat
 * number wale order yahin pakre jaate hain (RTO ka kharcha bachta hai).
 */
export function ConfirmCard({ order: o, onChanged, onRefused }: { order: OnlineOrderDetail; onChanged: () => void; onRefused: () => void }) {
  const set = useMutation({
    mutationFn: (result: 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED') => onlineOrdersApi.setConfirmation(o.id, result),
    onSuccess: (_r, result) => {
      onChanged();
      if (result === 'CONFIRMED') toast.success('Customer ne confirm kar diya ✓');
      else if (result === 'NO_ANSWER') toast('Jawab nahi — thori der baad dobara koshish karein');
      else { toast('Customer ne mana kiya — order cancel kar dein'); onRefused(); }
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const closed = ['CANCELLED', 'REJECTED', 'RETURNED', 'DELIVERED'].includes(o.orderStatus);
  if (!o.isCod || o.paymentStatus === 'PAID' || closed || o.dispatchedAt) return null;

  const c = o.confirmation;
  const num = o.externalOrderNumber ?? o.externalOrderId;
  const wa = waNumber(o.customerPhone);
  const items = o.lines.map((l) => `${l.name}${l.variant ? ` (${l.variant})` : ''} x${l.quantity}`).join(', ');
  const cod = moneyOf(o).codDue;
  const text = encodeURIComponent(
    `Assalam o Alaikum ${o.customerName}! 🙏\n` +
    `Aap ka order #${num} mila hai:\n${items}\n` +
    `Total: ${rs(o.total)}\n` +
    (cod > 0 ? `Delivery par dena hai (COD): ${rs(cod)}\n` : 'Paisa mil chuka hai — delivery par kuch nahi dena\n') +
    `Address: ${[o.customerAddress, o.customerCity].filter(Boolean).join(', ')}\n\n` +
    `Order confirm karne ke liye "Haan" likh kar confirm karein. Shukriya!`,
  );

  if (c?.result === 'CONFIRMED') {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-success-200 bg-success-50/60 p-3">
        <CheckCircle2 className="h-5 w-5 text-success-600" />
        <div className="flex-1 text-sm">
          <div className="font-bold text-slate-900">Customer ne confirm kiya</div>
          <div className="text-xs text-slate-500">{whenText(c.at)}{c.attempts > 1 ? ` · ${c.attempts} koshish` : ''}</div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('rounded-2xl border p-4',
      c?.result === 'REFUSED' ? 'border-rose-200 bg-rose-50/60'
        : 'border-amber-200 bg-amber-50/50')}>
      <div className="text-sm font-bold text-slate-900">
        {c?.result === 'REFUSED' ? 'Customer ne mana kiya' : 'COD — bhejne se pehle customer se confirm karein'}
      </div>
      <div className="mt-0.5 text-xs text-slate-600">
        {c?.result === 'NO_ANSWER'
          ? `${c.attempts} dafa jawab nahi mila · aakhri ${whenText(c.at)}`
          : c?.result === 'REFUSED' ? 'Order cancel kar dein — stock wapas aa jayega'
            : 'Fake ya ghalat number wala order yahin pakra jata hai — courier ka expense bachta hai'}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {wa && (
          <a href={`https://wa.me/${wa}?text=${text}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-success-700">
            <MessageCircle className="h-3.5 w-3.5" /> Confirm karwayein
          </a>
        )}
        {o.customerPhone && (
          <a href={`tel:${o.customerPhone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white">
            <Phone className="h-3.5 w-3.5" /> Call
          </a>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button size="xs" variant="success" loading={set.isPending && set.variables === 'CONFIRMED'} onClick={() => set.mutate('CONFIRMED')} leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}>Haan, confirm</Button>
        <Button size="xs" variant="outline" loading={set.isPending && set.variables === 'NO_ANSWER'} onClick={() => set.mutate('NO_ANSWER')} leftIcon={<PhoneMissed className="h-3.5 w-3.5" />}>Jawab nahi</Button>
        <Button size="xs" variant="outline" className="text-rose-600" loading={set.isPending && set.variables === 'REFUSED'} onClick={() => set.mutate('REFUSED')} leftIcon={<XCircle className="h-3.5 w-3.5" />}>Mana kiya</Button>
      </div>
    </section>
  );
}

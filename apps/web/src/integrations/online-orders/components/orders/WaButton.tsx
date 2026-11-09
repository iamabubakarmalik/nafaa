/**
 * The board's WhatsApp button: opens a small menu with the shop's message
 * templates (the one that fits the order first) and, for COD orders not yet
 * sent, the confirmation result buttons. Sending a message adds the
 * "Texted" tag.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, MessageCircle, PhoneMissed, Settings2, XCircle } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Menu } from '@/design-system/components';
import { t } from '@core/i18n';
import { apiErrorMessage, onlineOrdersApi, type OnlineOrder } from '../../api/online-orders.api';
import { scanApi } from '../../api/order-money.api';
import { waNumber } from '../../lib/labels';
import { WA_TEMPLATES, fillTemplate, orderValues, suggestTemplate, templateText, useWaTemplates, usePlatformWaTemplates } from '../../lib/waTemplates';
import { useBoardRefresh } from './useMoveOrder';

type Result = 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED';

export function WaButton({ order: o, shopName, money, onTexted }: {
  order: OnlineOrder;
  shopName?: string;
  money: (n: number) => string;
  onTexted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const refresh = useBoardRefresh();
  const saved = useWaTemplates().data?.templates;
  const platformWa = usePlatformWaTemplates();
  const risk = useQuery({ queryKey: ['risk-settings'], queryFn: scanApi.riskSettings, staleTime: 10 * 60_000, enabled: open });
  const set = useMutation({
    mutationFn: (r: Result) => onlineOrdersApi.setConfirmation(o.id, r),
    onSuccess: (_d, r) => {
      refresh(o.id);
      setOpen(false);
      toast.success(r === 'CONFIRMED' ? t('Customer ne confirm kar diya') : r === 'NO_ANSWER' ? t('Jawab nahi — baad me dobara') : t('Customer ne mana kiya — order cancel kar dein'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const wa = waNumber(o.customerPhone);
  if (!wa) return null;
  const best = suggestTemplate(o);
  const values = orderValues(o, shopName, money, risk.data?.advancePct ?? 30);
  const list = [...WA_TEMPLATES.filter((x) => x.key !== 'cart')].sort((a, b) => (a.key === best ? -1 : b.key === best ? 1 : 0));
  const askResult = o.isCod && !o.dispatchedAt && !['CANCELLED', 'REJECTED', 'RETURNED', 'DELIVERED'].includes(o.orderStatus);
  const send = (key: (typeof list)[number]['key']) => {
    const text = fillTemplate(templateText(key, saved, platformWa), values);
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    onTexted();
    if (!askResult) setOpen(false);
  };
  const conf = o.confirmation?.result;
  const btn = 'flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 text-[0.6875rem] font-semibold ring-1 transition disabled:opacity-60';

  return (
    <div>
      <button ref={ref} type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}
        title={t('WhatsApp message')} className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-95">
        <MessageCircle className="h-3.5 w-3.5" />
      </button>
      <Menu open={open} onClose={() => setOpen(false)} anchorRef={ref} align="start" width="w-64" label={t('WhatsApp par bhejein')} className="p-1.5 text-start">
        <div>
          <p className="px-2 pb-1 pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{t('WhatsApp par bhejein')}</p>
          {list.map((x) => (
            <button key={x.key} type="button" role="menuitem" onClick={() => send(x.key)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start hover:bg-slate-50">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${x.color}17`, color: x.color }}><x.icon className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-900">
                  {x.label}
                  {x.key === best && <span className="rounded-full bg-emerald-50 px-1.5 text-[0.625rem] font-semibold text-emerald-700">{t('Behtar')}</span>}
                </span>
                <span className="block truncate text-[0.6875rem] text-slate-500">{x.hint}</span>
              </span>
            </button>
          ))}
          {askResult && (
            <div className="mt-1 border-t border-slate-100 px-1 pt-2">
              <p className="mb-1.5 px-1 text-[0.6875rem] font-semibold text-slate-500">{t('Customer ka jawab')}</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button type="button" disabled={set.isPending} onClick={() => set.mutate('CONFIRMED')}
                  className={cn(btn, conf === 'CONFIRMED' ? 'bg-success-50 text-success-700 ring-success-300' : 'text-success-700 ring-slate-200 hover:bg-success-50')}>
                  <CheckCircle2 className="h-4 w-4" />{t('Haan')}
                </button>
                <button type="button" disabled={set.isPending} onClick={() => set.mutate('NO_ANSWER')}
                  className={cn(btn, conf === 'NO_ANSWER' ? 'bg-amber-50 text-amber-800 ring-amber-300' : 'text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                  <PhoneMissed className="h-4 w-4" />{t('Jawab nahi')}
                </button>
                <button type="button" disabled={set.isPending} onClick={() => set.mutate('REFUSED')}
                  className={cn(btn, conf === 'REFUSED' ? 'bg-rose-50 text-rose-700 ring-rose-300' : 'text-rose-700 ring-slate-200 hover:bg-rose-50')}>
                  <XCircle className="h-4 w-4" />{t('Mana kiya')}
                </button>
              </div>
            </div>
          )}
          <Link to="/online-store/whatsapp-templates" onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.75rem] font-medium text-brand-700 hover:bg-slate-50">
            <Settings2 className="h-3.5 w-3.5" />{t('Messages badlein')}
          </Link>
        </div>
      </Menu>
    </div>
  );
}

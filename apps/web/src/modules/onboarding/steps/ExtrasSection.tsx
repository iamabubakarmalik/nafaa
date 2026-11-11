/**
 * Optional part of the finish screen: "Aap aur kya karte hain?". Each switch
 * turns an add-on on (free during the trial) so its pages appear in the menu;
 * switching it off removes it again. All start off and can be left alone.
 * Shown only during the trial, and only to users who may manage billing.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Globe, Megaphone, ShoppingBag, Truck, type LucideIcon } from 'lucide-react';
import { Switch } from '@/design-system/components';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';
import { t } from '@core/i18n';
import { errorText, useAddOnActions, useCanManageBilling, useEntitlements } from '@modules/billing/pricing/hooks/usePricing';
import { fmtDate } from '@modules/billing/pricing/lib/catalog-meta';

const EXTRAS: Array<{ key: string; title: string; description: string; icon: LucideIcon; brand?: BrandName }> = [
  { key: 'online_store', title: t('Online orders / website'), description: t('WhatsApp, Instagram aur website ke orders ek jagah'), icon: Globe },
  { key: 'shopify', title: t('Shopify store'), description: t('Shopify ke orders aur stock Nafaa se jude rahein'), icon: ShoppingBag, brand: 'shopify' },
  { key: 'daraz', title: t('Daraz'), description: t('Daraz ke orders aur stock'), icon: ShoppingBag, brand: 'daraz' },
  { key: 'distribution', title: t('Distribution / wholesale'), description: t('Dukaanon ko maal: booker, routes, recovery'), icon: Truck },
  { key: 'meta', title: t('Facebook / Instagram'), description: t('Catalog, inbox aur ads ki tracking'), icon: Megaphone, brand: 'meta' },
];

export function ExtrasSection() {
  const { data: ent } = useEntitlements();
  const canManage = useCanManageBilling();
  const { turnOn, turnOff } = useAddOnActions();
  const [busy, setBusy] = useState<string | null>(null);
  if (!ent || ent.state !== 'trial' || !canManage) return null;

  const isOn = (key: string) => ent.apps.includes(key) || ent.addOns.some((a) => a.key === key && a.status !== 'CANCELLED');
  const flip = (key: string, on: boolean) => {
    setBusy(key);
    const done = { onSettled: () => setBusy(null), onError: (e: unknown) => toast.error(errorText(e, t('Badal nahi saka'))) };
    if (on) turnOn.mutate({ key }, done);
    else turnOff.mutate(key, done);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{t('Aap aur kya karte hain?')}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {t('Jo karte hain woh chalu karein — menu me aa jayega. Trial me free ({{date}} tak). Zaroori nahi, baad me "Apps & add-ons" se bhi.', { date: fmtDate(ent.trialEndsAt) })}
      </p>
      <ul className="mt-3 divide-y divide-slate-100">
        {EXTRAS.map((x) => (
          <li key={x.key} className="flex items-center gap-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              {x.brand ? <BrandLogo name={x.brand} size={18} /> : <x.icon className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900">{x.title}</span>
              <span className="block text-xs text-slate-500">{x.description}</span>
            </span>
            <Switch checked={isOn(x.key)} disabled={busy === x.key} aria-label={x.title} onChange={(e) => flip(x.key, e.target.checked)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

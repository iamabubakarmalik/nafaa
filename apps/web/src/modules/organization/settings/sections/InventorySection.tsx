/**
 * Stock rules: the low-stock line new products start with, whether the
 * counter may sell more than the stock on record, and the manufacturing
 * switch (recipes and production). Links to the stock pages where the
 * day-to-day work happens.
 */

import { AlertTriangle, ArrowRightLeft, ClipboardCheck, Factory, FlaskConical, PackageX, TrendingDown } from 'lucide-react';
import { Field, NumberInput, PageLink, SectionCard, Toggle } from '../components/SettingsBlocks';
import { Badge, Alert } from '@/design-system/components';
import { SyncedBadge } from '../components/SyncedBadge';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';
import { t } from '@core/i18n';

export function InventorySection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const low = Number(draft.defaultLowStockAlert) || 0;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={t('Kam stock')} desc={t('Kab product \'kam\' dikhe aur alert aaye')} icon={TrendingDown} color="amber"
          badge={<Badge size="xs" variant="warning"><span className="opacity-70">{t('Had')}</span>{low}</Badge>}>
          <Field label={t('Kam stock ki had')} badge={<SyncedBadge />}
            hint={t('Naye products isi had se shuru hote hain; har product me alag had bhi rakh sakte hain. 0 = alert band.')}>
            <NumberInput value={draft.defaultLowStockAlert} onChange={(v) => set('defaultLowStockAlert', v)} min={0} suffix="units" />
          </Field>
          <p className="mt-3 text-xs text-slate-500">
            {low > 0 ? t('Jab kisi naye product ka stock {{low}} ya kam ho, woh \'Low stock\' list me aata hai.', { low }) : t('Naye products par kam stock ka alert nahi aayega.')}
          </p>
        </SectionCard>

        <SectionCard title={t('Minus stock')} desc={t('Jab system me stock khatam ho magar shelf par maal ho')} icon={PackageX} color="rose"
          badge={<Badge size="xs" variant={draft.allowNegativeStock ? 'warning' : 'default'}>{draft.allowNegativeStock ? t('Chalu') : t('Band')}</Badge>}>
          <Toggle checked={draft.allowNegativeStock} onChange={(v) => set('allowNegativeStock', v)} icon={PackageX}
            label={t('Stock khatam hone par bhi bechein')}
            desc={t('Stock minus me chala jayega; baad me Purchase ya stock adjust se theek karein')} />
          {draft.allowNegativeStock && (
            <Alert className="mt-3" tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>
              {t('Har branch ka stock minus ho sakta hai. Minus stock wale products ko jaldi Purchase ya stock adjust se theek karein.')}
            </Alert>
          )}
        </SectionCard>
      </div>

      <SectionCard title={t('Banayein (Manufacturing)')} desc={t('2–3 raw items mila kar apna maal banayein — Cost khud nikalti hai')} icon={Factory} color="emerald"
        badge={<Badge size="xs" variant={draft.manufacturingEnabled ? 'success' : 'default'}>{draft.manufacturingEnabled ? t('Chalu') : t('Band')}</Badge>}>
        <Toggle checked={!!draft.manufacturingEnabled} onChange={(v) => set('manufacturingEnabled', v)} icon={Factory}
          label={t('Recipe aur Production chalu karein')}
          desc={t('Mix daal, dry fruit pack, cake, attar — Recipe banayein, maal banayein, raw maal khud stock se kam ho')} />
        {draft.manufacturingEnabled && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <PageLink to="/manufacturing" icon={Factory} title={t('Banayein')} desc={t('Aaj ki production aur kam raw maal')} />
            <PageLink to="/manufacturing/recipes" icon={FlaskConical} title={t('Recipes')} desc={t('Har product ka raw maal aur Cost')} />
          </div>
        )}
      </SectionCard>

      <SectionCard title={t('Stock ke kaam')} desc={t('Rozana ka stock kaam in pages par hota hai')} icon={ClipboardCheck} color="slate">
        <div className="grid gap-2 sm:grid-cols-3">
          <PageLink to="/low-stock" icon={TrendingDown} title={t('Low stock')} desc={t('Kam aur khatam maal ki list')} />
          <PageLink to="/stock-adjustments" icon={ClipboardCheck} title={t('Stock adjust')} desc={t('Ginti ke baad stock theek karein')} />
          <PageLink to="/transfers" icon={ArrowRightLeft} title={t('Transfers')} desc={t('Branch se branch maal')} />
        </div>
      </SectionCard>
    </div>
  );
}

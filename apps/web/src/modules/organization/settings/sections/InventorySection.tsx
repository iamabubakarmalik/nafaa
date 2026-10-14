/**
 * Stock rules: the low-stock line new products start with, and whether the
 * counter may sell more than the stock on record. Links to the stock pages
 * where the day-to-day work happens.
 */

import { AlertTriangle, ArrowRightLeft, ClipboardCheck, PackageX, TrendingDown } from 'lucide-react';
import { Alert, Field, NumberInput, PageLink, SectionCard, StatPill, Toggle } from '../components/UI';
import { SyncedBadge } from '../components/SyncedBadge';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function InventorySection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const low = Number(draft.defaultLowStockAlert) || 0;

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Kam stock" desc="Kab product 'kam' dikhe aur alert aaye" icon={TrendingDown} color="amber"
          badge={<StatPill label="Had" value={low} tone="amber" />}>
          <Field label="Kam stock ki had" badge={<SyncedBadge />}
            hint="Naye products isi had se shuru hote hain; har product me alag had bhi rakh sakte hain. 0 = alert band.">
            <NumberInput value={draft.defaultLowStockAlert} onChange={(v) => set('defaultLowStockAlert', v)} min={0} suffix="units" />
          </Field>
          <p className="mt-3 text-xs text-slate-500">
            {low > 0 ? `Jab kisi naye product ka stock ${low} ya kam ho, woh 'Low stock' list me aata hai.` : 'Naye products par kam stock ka alert nahi aayega.'}
          </p>
        </SectionCard>

        <SectionCard title="Minus stock" desc="Jab system me stock khatam ho magar shelf par maal ho" icon={PackageX} color="rose"
          badge={<StatPill label="" value={draft.allowNegativeStock ? 'Chalu' : 'Band'} tone={draft.allowNegativeStock ? 'amber' : 'slate'} />}>
          <Toggle checked={draft.allowNegativeStock} onChange={(v) => set('allowNegativeStock', v)} icon={PackageX}
            label="Stock khatam hone par bhi bechein"
            desc="Stock minus me chala jayega; baad me Purchase ya stock adjust se theek karein" />
          {draft.allowNegativeStock && (
            <Alert tone="amber" icon={AlertTriangle}>
              Har branch ka stock minus ho sakta hai. Minus stock wale products ko jaldi Purchase ya stock adjust se theek karein.
            </Alert>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Stock ke kaam" desc="Rozana ka stock kaam in pages par hota hai" icon={ClipboardCheck} color="slate">
        <div className="grid gap-2 sm:grid-cols-3">
          <PageLink to="/low-stock" icon={TrendingDown} title="Low stock" desc="Kam aur khatam maal ki list" />
          <PageLink to="/stock-adjustments" icon={ClipboardCheck} title="Stock adjust" desc="Ginti ke baad stock theek karein" />
          <PageLink to="/transfers" icon={ArrowRightLeft} title="Transfers" desc="Branch se branch maal" />
        </div>
      </SectionCard>
    </div>
  );
}

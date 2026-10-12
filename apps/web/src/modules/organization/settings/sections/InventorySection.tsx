/**
 * Stock rules: the low-stock line new products start with, and whether the
 * counter may sell more than the stock on record.
 */

import { AlertTriangle, PackageX, TrendingDown } from 'lucide-react';
import { Alert, Field, NumberInput, SectionCard, Toggle } from '../components/UI';
import { SyncedBadge } from '../components/SyncedBadge';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function InventorySection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title="Kam stock" desc="Kab product 'kam' dikhe aur alert aaye" icon={TrendingDown} color="amber">
        <Field label="Kam stock ki had" hint="Naye products isi had se shuru hote hain; har product me alag bhi rakh sakte hain" badge={<SyncedBadge />}>
          <NumberInput value={draft.defaultLowStockAlert} onChange={(v) => set('defaultLowStockAlert', v)} min={0} suffix="units" />
        </Field>
      </SectionCard>

      <SectionCard title="Minus stock" desc="Jab system me stock khatam ho magar shelf par maal ho" icon={PackageX} color="rose">
        <Toggle checked={draft.allowNegativeStock} onChange={(v) => set('allowNegativeStock', v)} icon={PackageX}
          label="Stock khatam hone par bhi bechein"
          desc="Stock minus me chala jayega; baad me purchase ya stock adjust se theek karein" />
        {draft.allowNegativeStock && (
          <Alert tone="amber" icon={AlertTriangle}>
            Har branch ka stock minus ho sakta hai. Minus stock wale products ko jaldi purchase ya stock adjust se theek karein.
          </Alert>
        )}
      </SectionCard>
    </div>
  );
}

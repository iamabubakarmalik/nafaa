import {
  Package, TrendingDown, Calendar, RotateCw, Layers, AlertTriangle,
} from 'lucide-react';
import { ChoiceGroup, Field, NumberInput, Toggle, SectionCard, Alert, Divider } from '../components/UI';
import { SyncedBadge } from '../components/SyncedBadge';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function InventorySection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      <SectionCard title="Stock Alerts" desc="Low stock warnings" icon={AlertTriangle} color="amber">
        <Field
          label="Default Low Stock Alert"
          hint="Naye products is se kam stock par 'KAM' dikhaen ge"
          badge={<SyncedBadge />}
        >
          <NumberInput
            value={draft.defaultLowStockAlert}
            onChange={(v) => set('defaultLowStockAlert', v)}
            min={0}
            suffix="units"
          />
        </Field>

        <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex items-start gap-2">
          <TrendingDown className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Individual products ke liye <strong>alag alert</strong> product page pe set kar sakte ho — ye default hai.
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Expiry Tracking" desc="Products ki expiry dates track karo" icon={Calendar} color="rose">
        <Toggle
          checked={draft.trackExpiry}
          onChange={(v) => set('trackExpiry', v)}
          label="Track Expiry Dates"
          desc="Har product me expiry field enable ho — pharmacy, dairy, food ke liye zaroori"
          icon={Calendar}
        />

        {draft.trackExpiry && (
          <>
            <Divider />
            <Field label="Expiry Warning Days" hint="Expiry se kitne din pehle warning dikhaen">
              <NumberInput
                value={draft.expiryWarningDays}
                onChange={(v) => set('expiryWarningDays', v)}
                min={1}
                max={365}
                suffix="days"
              />
            </Field>

            <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 text-xs font-semibold text-rose-900 dark:text-rose-200">
              Aaj ki date se <strong>{draft.expiryWarningDays} din</strong> ke andar expire hone wale products ki warning report me alag section me dikhegi.
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Costing Method" desc="Stock valuation formula" icon={Layers} color="violet">
        <Field label="Stock Costing Method">
          <ChoiceGroup
            value={draft.stockMethod}
            onChange={(v) => set('stockMethod', v)}
            columns={3}
            options={[
              { value: 'AVERAGE', label: 'Average', desc: 'Weighted average (recommended)', emoji: '📊' },
              { value: 'FIFO', label: 'FIFO', desc: 'Pehla aya, pehla gaya', emoji: '➡️' },
              { value: 'LIFO', label: 'LIFO', desc: 'Aakhri aya, pehla gaya', emoji: '⬅️' },
            ]}
          />
        </Field>

        <Alert tone="violet" icon={Layers} title="Kaunsa method chunein?">
          <strong>Average</strong> — sab ke liye best. <strong>FIFO</strong> — perishable (dairy/food) ke liye.
          <strong>LIFO</strong> — inflation me tax bachane ke liye (Pakistan me generally allowed nahi).
        </Alert>
      </SectionCard>

      <SectionCard title="Auto Reorder" desc="Low stock par automatic reorder suggestion" icon={RotateCw} color="emerald">
        <Toggle
          checked={draft.autoReorder}
          onChange={(v) => set('autoReorder', v)}
          label="Auto-Suggest Reorder"
          desc="Stock reorder point pe pahonchte hi supplier ko order suggest karo"
          icon={RotateCw}
        />

        {draft.autoReorder && (
          <>
            <Divider />
            <Field label="Reorder Point" hint="Stock is level pe pahonche to reorder trigger ho">
              <NumberInput
                value={draft.reorderPoint}
                onChange={(v) => set('reorderPoint', v)}
                min={0}
                suffix="units"
              />
            </Field>
          </>
        )}
      </SectionCard>
    </div>
  );
}

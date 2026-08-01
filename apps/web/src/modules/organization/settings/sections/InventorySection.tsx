import { Package, TrendingDown, Calendar } from 'lucide-react';
import { ChoiceGroup, Field, NumberInput, Toggle, SectionCard, SyncedBadge } from '../components/UI';

export default function InventorySection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <SectionCard title="Stock Alerts" desc="Low stock warnings" icon={TrendingDown} color="cyan">
        <Field label="Default Low Stock Alert" hint="New products is se kam par alert ho" badge={<SyncedBadge />}>
          <NumberInput value={s.defaultLowStockAlert} onChange={(v: number) => set('defaultLowStockAlert', v)} min={0} />
        </Field>
      </SectionCard>

      <SectionCard title="Expiry Tracking" desc="Product expiry management" icon={Calendar} color="cyan">
        <Toggle checked={s.trackExpiry} onChange={(v: boolean) => set('trackExpiry', v)} label="Track expiry dates" desc="Products ki expiry track karein" />
        {s.trackExpiry && (
          <div className="mt-4">
            <Field label="Expiry Warning Days" hint="Expiry se kitne din pehle warning">
              <NumberInput value={s.expiryWarningDays} onChange={(v: number) => set('expiryWarningDays', v)} min={1} max={365} />
            </Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Costing Method" desc="Stock valuation formula" icon={Package} color="cyan">
        <Field label="Stock Method">
          <ChoiceGroup value={s.stockMethod} onChange={(v: number) => set('stockMethod', v)} columns={3} options={[
            { value: 'AVERAGE', label: 'Average', desc: 'Weighted avg (recommended)', emoji: '📊' },
            { value: 'FIFO', label: 'FIFO', desc: 'First In First Out', emoji: '➡️' },
            { value: 'LIFO', label: 'LIFO', desc: 'Last In First Out', emoji: '⬅️' },
          ]} />
        </Field>
      </SectionCard>

      <SectionCard title="Auto Reorder" desc="Automatic reorder suggestions" icon={Package} color="cyan">
        <Toggle checked={s.autoReorder} onChange={(v: boolean) => set('autoReorder', v)} label="Auto-suggest reorder" desc="Low stock par supplier ko notify karein" />
        {s.autoReorder && (
          <div className="mt-4">
            <Field label="Reorder Point"><NumberInput value={s.reorderPoint} onChange={(v: number) => set('reorderPoint', v)} min={0} /></Field>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

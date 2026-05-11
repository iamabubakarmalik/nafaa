import { ChoiceGroup, Field, NumberInput, Toggle } from './_shared';

export default function InventorySection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <Field label="Default Low Stock Alert" hint="New products is se kam stock par alert ho">
        <NumberInput value={s.defaultLowStockAlert} onChange={(v: number) => set('defaultLowStockAlert', v)} min={0} />
      </Field>

      <div className="border-t border-slate-100 pt-3">
        <h4 className="font-bold text-slate-800 mb-2">Expiry Tracking</h4>
        <Toggle checked={s.trackExpiry} onChange={(v) => set('trackExpiry', v)} label="Track expiry dates" desc="Products ki expiry track karein" />
        {s.trackExpiry && (
          <Field label="Expiry Warning Days" hint="Expiry se kitne din pehle warning">
            <NumberInput value={s.expiryWarningDays} onChange={(v: number) => set('expiryWarningDays', v)} min={1} max={365} />
          </Field>
        )}
      </div>

      <Field label="Stock Method" hint="Cost calculation method">
        <ChoiceGroup
          value={s.stockMethod}
          onChange={(v) => set('stockMethod', v)}
          options={[
            { value: 'AVERAGE', label: 'Average', desc: 'Average cost (recommended)' },
            { value: 'FIFO', label: 'FIFO', desc: 'First In First Out' },
            { value: 'LIFO', label: 'LIFO', desc: 'Last In First Out' },
          ]}
        />
      </Field>

      <div className="border-t border-slate-100 pt-3">
        <h4 className="font-bold text-slate-800 mb-2">Auto Reorder</h4>
        <Toggle checked={s.autoReorder} onChange={(v) => set('autoReorder', v)} label="Auto-suggest reorder" desc="Low stock par supplier ko notify karein" />
        {s.autoReorder && (
          <Field label="Reorder Point">
            <NumberInput value={s.reorderPoint} onChange={(v: number) => set('reorderPoint', v)} min={0} />
          </Field>
        )}
      </div>
    </div>
  );
}

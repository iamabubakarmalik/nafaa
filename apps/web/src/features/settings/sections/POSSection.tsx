import { ChoiceGroup, Field, NumberInput, Toggle } from './_shared';

export default function POSSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <Field label="Default Payment Method">
        <ChoiceGroup
          value={s.defaultPaymentMethod}
          onChange={(v) => set('defaultPaymentMethod', v)}
          options={[
            { value: 'CASH', label: '💵 Cash' },
            { value: 'CARD', label: '💳 Card' },
            { value: 'JAZZCASH', label: '📱 JazzCash' },
            { value: 'EASYPAISA', label: '💚 EasyPaisa' },
            { value: 'BANK_TRANSFER', label: '🏦 Bank Transfer' },
          ]}
        />
      </Field>

      <div className="border-t border-slate-100 pt-3">
        <h4 className="font-bold text-slate-800 mb-2">Sale Flow</h4>
        <Toggle checked={s.confirmBeforeCheckout} onChange={(v) => set('confirmBeforeCheckout', v)} label="Confirm before checkout" desc="Sale complete karne se pehle dialog show ho" />
        <Toggle checked={s.requireCustomerForSale} onChange={(v) => set('requireCustomerForSale', v)} label="Require customer" desc="Har sale ke liye customer select karna zaroori ho" />
        <Toggle checked={s.allowNegativeStock} onChange={(v) => set('allowNegativeStock', v)} label="Allow negative stock" desc="Stock zero hone ke baad bhi sale allow ho" />
        <Toggle checked={s.roundTotal} onChange={(v) => set('roundTotal', v)} label="Round total" desc="Final total automatically round ho" />
      </div>

      <div className="border-t border-slate-100 pt-3">
        <h4 className="font-bold text-slate-800 mb-2">Discounts</h4>
        <Toggle checked={s.allowDiscount} onChange={(v) => set('allowDiscount', v)} label="Allow discounts" />
        {s.allowDiscount && (
          <Field label="Max Discount %" hint="Cashier kitni max discount de sakta hai">
            <NumberInput value={s.maxDiscountPercent} onChange={(v: number) => set('maxDiscountPercent', v)} min={0} max={100} />
          </Field>
        )}
      </div>

      <div className="border-t border-slate-100 pt-3">
        <h4 className="font-bold text-slate-800 mb-2">Interface</h4>
        <Toggle checked={s.showProductImages} onChange={(v) => set('showProductImages', v)} label="Show product images" desc="POS mein product photos dikhayein" />
        <Toggle checked={s.enableBarcodeScanner} onChange={(v) => set('enableBarcodeScanner', v)} label="Enable barcode scanner" />
        <Toggle checked={s.enableQuickKeys} onChange={(v) => set('enableQuickKeys', v)} label="Quick keys" desc="Keyboard shortcuts" />
      </div>
    </div>
  );
}

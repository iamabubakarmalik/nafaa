import { ShoppingCart, CreditCard, Scan } from 'lucide-react';
import { ChoiceGroup, Field, NumberInput, Toggle, SectionCard } from '../components/UI';

export default function POSSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <SectionCard title="Default Payment" desc="POS ka default payment method" icon={CreditCard} color="pink">
        <ChoiceGroup value={s.defaultPaymentMethod} onChange={(v) => set('defaultPaymentMethod', v)} columns={2} options={[
          { value: 'CASH', label: 'Cash', emoji: '💵' },
          { value: 'CARD', label: 'Card', emoji: '💳' },
          { value: 'JAZZCASH', label: 'JazzCash', emoji: '📱' },
          { value: 'EASYPAISA', label: 'EasyPaisa', emoji: '💚' },
          { value: 'BANK_TRANSFER', label: 'Bank Transfer', emoji: '🏦' },
          { value: 'RAAST', label: 'Raast', emoji: '⚡' },
        ]} />
      </SectionCard>

      <SectionCard title="Sale Flow" desc="Sale workflow ke rules" icon={ShoppingCart} color="pink">
        <Toggle checked={s.confirmBeforeCheckout} onChange={(v) => set('confirmBeforeCheckout', v)} label="Confirm before checkout" desc="Sale complete karne se pehle dialog show ho" />
        <Toggle checked={s.requireCustomerForSale} onChange={(v) => set('requireCustomerForSale', v)} label="Require customer" desc="Har sale ke liye customer select karna zaroori" />
        <Toggle checked={s.allowNegativeStock} onChange={(v) => set('allowNegativeStock', v)} label="Allow negative stock" desc="Stock zero hone ke baad bhi sale allow ho" />
        <Toggle checked={s.roundTotal} onChange={(v) => set('roundTotal', v)} label="Round total" desc="Final total automatically round ho" />
      </SectionCard>

      <SectionCard title="Discounts" desc="Discount rules" icon={ShoppingCart} color="pink">
        <Toggle checked={s.allowDiscount} onChange={(v) => set('allowDiscount', v)} label="Allow discounts on sales" />
        {s.allowDiscount && (
          <div className="mt-4">
            <Field label="Max Discount %" hint="Cashier kitni max discount de sakta hai">
              <NumberInput value={s.maxDiscountPercent} onChange={(v: number) => set('maxDiscountPercent', v)} min={0} max={100} />
            </Field>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Interface" desc="POS UI options" icon={Scan} color="pink">
        <Toggle checked={s.showProductImages} onChange={(v) => set('showProductImages', v)} label="Show product images" desc="POS mein product photos dikhayein" />
        <Toggle checked={s.enableBarcodeScanner} onChange={(v) => set('enableBarcodeScanner', v)} label="Enable barcode scanner" desc="Physical scanner support" />
        <Toggle checked={s.enableQuickKeys} onChange={(v) => set('enableQuickKeys', v)} label="Quick keys" desc="F1-F12 keyboard shortcuts" />
      </SectionCard>
    </div>
  );
}

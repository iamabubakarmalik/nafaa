import {
  ShoppingCart, CreditCard, Scan, Percent, Users, PackageX,
  Calculator, Image as ImageIcon, Keyboard, CheckCircle2,
} from 'lucide-react';
import { ChoiceGroup, Field, NumberInput, Toggle, SectionCard, Alert, Divider } from '../components/UI';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function POSSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      {/* Default payment */}
      <SectionCard title="Default Payment" desc="POS ka default payment method" icon={CreditCard} color="emerald">
        <ChoiceGroup
          value={draft.defaultPaymentMethod}
          onChange={(v) => set('defaultPaymentMethod', v)}
          columns={3}
          options={[
            { value: 'CASH', label: 'Cash', desc: 'Naqad', emoji: '💵' },
            { value: 'CARD', label: 'Card', desc: 'Debit/Credit', emoji: '💳' },
            { value: 'JAZZCASH', label: 'JazzCash', desc: 'Mobile wallet', emoji: '📱' },
            { value: 'EASYPAISA', label: 'EasyPaisa', desc: 'Mobile wallet', emoji: '💚' },
            { value: 'BANK_TRANSFER', label: 'Bank', desc: 'IBFT / Transfer', emoji: '🏦' },
            { value: 'RAAST', label: 'Raast', desc: 'SBP instant', emoji: '⚡' },
          ]}
        />
      </SectionCard>

      {/* Sale flow */}
      <SectionCard title="Sale Flow" desc="Checkout ke rules aur behavior" icon={ShoppingCart} color="blue">
        <Toggle
          checked={draft.confirmBeforeCheckout}
          onChange={(v) => set('confirmBeforeCheckout', v)}
          label="Confirm Before Checkout"
          desc="Sale complete karne se pehle dialog dikhaen (galat sale se bachne ke liye)"
          icon={CheckCircle2}
        />
        <Toggle
          checked={draft.requireCustomerForSale}
          onChange={(v) => set('requireCustomerForSale', v)}
          label="Require Customer for Sale"
          desc="Walk-in nahi — har sale me customer chuno"
          icon={Users}
        />
        <Toggle
          checked={draft.allowNegativeStock}
          onChange={(v) => set('allowNegativeStock', v)}
          label="Allow Negative Stock"
          desc="Stock zero hone ke baad bhi sale allow (careful — physical stock verify karo)"
          icon={PackageX}
        />
        <Toggle
          checked={draft.roundTotal}
          onChange={(v) => set('roundTotal', v)}
          label="Round Final Total"
          desc="Final amount ko nearest rupee pe round karo — paisay hata do"
          icon={Calculator}
        />
      </SectionCard>

      {/* Discounts */}
      <SectionCard title="Discounts" desc="Cashier ki discount limits" icon={Percent} color="amber">
        <Toggle
          checked={draft.allowDiscount}
          onChange={(v) => set('allowDiscount', v)}
          label="Allow Discounts"
          desc="Cashier sales pe discount de sake"
          icon={Percent}
        />

        {draft.allowDiscount && (
          <>
            <Divider />
            <Field label="Max Discount Per Sale" hint="Cashier is se zyada discount nahi de sakta (Manager PIN se allow ho sakta hai)">
              <NumberInput
                value={draft.maxDiscountPercent}
                onChange={(v) => set('maxDiscountPercent', v)}
                min={0}
                max={100}
                suffix="%"
              />
            </Field>

            <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200">
              Rs 1,000 sale par max discount: <strong>Rs {((1000 * draft.maxDiscountPercent) / 100).toFixed(0)}</strong>
            </div>
          </>
        )}
      </SectionCard>

      {/* Interface */}
      <SectionCard title="Interface" desc="POS ka look aur feature toggles" icon={Scan} color="violet">
        <Toggle
          checked={draft.showProductImages}
          onChange={(v) => set('showProductImages', v)}
          label="Show Product Images"
          desc="Tiles me product photos dikhaen (visual POS)"
          icon={ImageIcon}
        />
        <Toggle
          checked={draft.enableBarcodeScanner}
          onChange={(v) => set('enableBarcodeScanner', v)}
          label="Enable Barcode Scanner"
          desc="USB/Bluetooth scanner ka support"
          icon={Scan}
        />
        <Toggle
          checked={draft.enableQuickKeys}
          onChange={(v) => set('enableQuickKeys', v)}
          label="Quick Keys (F1–F12)"
          desc="Keyboard shortcuts se fast checkout"
          icon={Keyboard}
        />
      </SectionCard>

      <Alert tone="blue" icon={Keyboard}>
        Shortcuts: <strong>F2</strong> Scanner • <strong>F9</strong> Paisay lein • <strong>F7/F8/F10</strong> Products/Combos/Quick tabs
      </Alert>
    </div>
  );
}

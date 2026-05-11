import { ChoiceGroup, Field, NumberInput, TextInput, Toggle } from './_shared';

export default function ReceiptSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <Field label="Receipt Size">
        <ChoiceGroup
          value={s.receiptSize}
          onChange={(v) => set('receiptSize', v)}
          options={[
            { value: 'THERMAL_58MM', label: '58mm Thermal', desc: 'Choti receipt printer (2.3")' },
            { value: 'THERMAL_80MM', label: '80mm Thermal', desc: 'Standard thermal (3.1")' },
            { value: 'A4_BASIC', label: 'A4 Basic', desc: 'A4 paper plain' },
            { value: 'A4_DETAILED', label: 'A4 Detailed', desc: 'A4 with logo + footer' },
          ]}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Invoice Prefix">
          <TextInput value={s.invoicePrefix} onChange={(v: string) => set('invoicePrefix', v)} placeholder="INV-" />
        </Field>
        <Field label="Starting Invoice #">
          <NumberInput value={s.invoiceStartNumber} onChange={(v: number) => set('invoiceStartNumber', v)} min={1} />
        </Field>
      </div>

      <Field label="Receipt Header" hint="Receipt ke upar dikhega">
        <TextInput value={s.receiptHeader} onChange={(v: string) => set('receiptHeader', v)} placeholder="Welcome to our store" />
      </Field>

      <Field label="Receipt Footer" hint="Receipt ke neeche dikhega">
        <TextInput value={s.receiptFooter} onChange={(v: string) => set('receiptFooter', v)} placeholder="Shukriya! Phir tashreef laaiye" />
      </Field>

      <div className="border-t border-slate-100 pt-5">
        <h4 className="font-bold text-slate-800 mb-2">Display Options</h4>
        <Toggle checked={s.receiptShowLogo} onChange={(v) => set('receiptShowLogo', v)} label="Show Logo" desc="Receipt par shop ka logo dikhayein" />
        <Toggle checked={s.receiptShowTax} onChange={(v) => set('receiptShowTax', v)} label="Show Tax Breakdown" />
        <Toggle checked={s.receiptShowCustomer} onChange={(v) => set('receiptShowCustomer', v)} label="Show Customer Info" />
        <Toggle checked={s.receiptShowBarcode} onChange={(v) => set('receiptShowBarcode', v)} label="Show Invoice Barcode" />
        <Toggle checked={s.receiptShowQrCode} onChange={(v) => set('receiptShowQrCode', v)} label="Show QR Code" />
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h4 className="font-bold text-slate-800 mb-2">Printing</h4>
        <Toggle checked={s.autoPrintReceipt} onChange={(v) => set('autoPrintReceipt', v)} label="Auto-print" desc="Sale ke baad receipt automatically print ho" />
        <Field label="Copies Count" hint="Kitni copies print ho">
          <NumberInput value={s.printCopiesCount} onChange={(v: number) => set('printCopiesCount', v)} min={1} max={5} />
        </Field>
      </div>
    </div>
  );
}

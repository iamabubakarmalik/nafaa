import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Receipt, Printer, Sparkles } from 'lucide-react';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { ChoiceGroup, Field, NumberInput, TextInput, Toggle, SectionCard } from '../components/UI';
import { getReceiptTemplate } from '../constants/industry-receipt';

export default function ReceiptSection({ s, set }: any) {
  const qc = useQueryClient();
  const { data: receiptConfig } = useQuery({ queryKey: ['receipt-config'], queryFn: settingsApi.getReceiptConfig });

  const industryTemplate = useMemo(() => getReceiptTemplate(s.businessType), [s.businessType]);

  const updateReceiptConfig = useMutation({
    mutationFn: (dto: any) => settingsApi.updateReceiptConfig(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipt-config'] }); toast.success('Receipt config saved'); },
  });

  const toggleReceiptField = (key: string, val: boolean) => {
    updateReceiptConfig.mutate({ ...(receiptConfig || {}), [key]: val });
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Paper & Format" desc="Receipt size aur invoice numbering" icon={Receipt} color="violet">
        <Field label="Receipt Size">
          <ChoiceGroup value={s.receiptSize} onChange={(v: boolean) => set('receiptSize', v)} options={[
            { value: 'THERMAL_58MM', label: '58mm Thermal', desc: 'Small (2.3")', emoji: '🧾' },
            { value: 'THERMAL_80MM', label: '80mm Thermal', desc: 'Standard (3.1")', emoji: '🧾' },
            { value: 'A4_BASIC', label: 'A4 Basic', desc: 'Plain paper', emoji: '📄' },
            { value: 'A4_DETAILED', label: 'A4 Detailed', desc: 'With logo + footer', emoji: '📃' },
          ]} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <Field label="Invoice Prefix"><TextInput value={s.invoicePrefix} onChange={(v: string) => set('invoicePrefix', v)} placeholder="INV-" maxLength={20} /></Field>
          <Field label="Starting Invoice #"><NumberInput value={s.invoiceStartNumber} onChange={(v: number) => set('invoiceStartNumber', v)} min={1} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Custom Text" desc="Header aur footer" icon={Receipt} color="violet">
        <div className="space-y-4">
          <Field label="Header Text" hint="Receipt ke upar dikhega"><TextInput value={s.receiptHeader} onChange={(v: string) => set('receiptHeader', v)} placeholder="Welcome to our store" maxLength={500} /></Field>
          <Field label="Footer Text" hint="Receipt ke neeche"><TextInput value={s.receiptFooter} onChange={(v: string) => set('receiptFooter', v)} placeholder="Shukriya! Phir tashreef laaiye" maxLength={500} /></Field>
        </div>
      </SectionCard>

      <SectionCard title="Common Display Options" icon={Receipt} color="violet">
        <Toggle checked={s.receiptShowLogo} onChange={(v: boolean) => set('receiptShowLogo', v)} label="Show Logo" desc="Shop ka logo print ho" />
        <Toggle checked={s.receiptShowTax} onChange={(v: boolean) => set('receiptShowTax', v)} label="Show Tax Breakdown" />
        <Toggle checked={s.receiptShowCustomer} onChange={(v: boolean) => set('receiptShowCustomer', v)} label="Show Customer Info" />
        <Toggle checked={s.receiptShowBarcode} onChange={(v: boolean) => set('receiptShowBarcode', v)} label="Show Invoice Barcode" />
        <Toggle checked={s.receiptShowQrCode} onChange={(v: boolean) => set('receiptShowQrCode', v)} label="Show QR Code" />
      </SectionCard>

      {industryTemplate.fields.length > 0 && (
        <SectionCard title={`${industryTemplate.emoji} ${industryTemplate.label} Fields`} desc="Industry-specific receipt options" icon={Sparkles} color="pink">
          <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 mb-3 text-xs text-violet-900 font-medium">
            ✨ Aap ke business type ke liye specific fields — ye receipt pe print honge
          </div>
          {industryTemplate.fields.map((f) => (
            <Toggle
              key={f.key}
              checked={(receiptConfig?.[f.key] ?? f.defaultValue) as boolean}
              onChange={(v: boolean) => toggleReceiptField(f.key, v)}
              label={f.label}
              desc={f.desc}
            />
          ))}
        </SectionCard>
      )}

      <SectionCard title="Printing" desc="Auto-print settings" icon={Printer} color="violet">
        <Toggle checked={s.autoPrintReceipt} onChange={(v: boolean) => set('autoPrintReceipt', v)} label="Auto-print after sale" />
        <div className="mt-4">
          <Field label="Copies Count" hint="Kitni copies print ho"><NumberInput value={s.printCopiesCount} onChange={(v: number) => set('printCopiesCount', v)} min={1} max={5} /></Field>
        </div>
      </SectionCard>
    </div>
  );
}

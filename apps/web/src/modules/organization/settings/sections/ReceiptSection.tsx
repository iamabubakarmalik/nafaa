import { Receipt, Printer, FileText, QrCode, Barcode, User, Building2 } from 'lucide-react';
import { ChoiceGroup, Field, Toggle, SectionCard, Alert, TextArea } from '../components/UI';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function ReceiptSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      {/* Paper size */}
      <SectionCard title="Paper & Format" desc="Receipt size chunein — thermal ya A4" icon={FileText} color="sky">
        <Field label="Receipt Size">
          <ChoiceGroup
            value={draft.receiptSize}
            onChange={(v) => set('receiptSize', v)}
            columns={2}
            options={[
              { value: 'THERMAL_58MM', label: '58mm Thermal', desc: 'Small • 2.3" width', emoji: '🧾' },
              { value: 'THERMAL_80MM', label: '80mm Thermal', desc: 'Standard • 3.1" width', emoji: '🧾' },
              { value: 'A4_BASIC', label: 'A4 Basic', desc: 'Plain paper • printer', emoji: '📄' },
              { value: 'A4_DETAILED', label: 'A4 Detailed', desc: 'Full invoice • logo + footer', emoji: '📃' },
            ]}
          />
        </Field>

      </SectionCard>

      {/* Header / footer */}
      <SectionCard title="Custom Text" desc="Header aur footer messages" icon={Receipt} color="violet">
        <div className="space-y-4">
          <Field label="Header Text" hint="Receipt ke upar dikhega — welcome message">
            <TextArea
              value={draft.receiptHeader}
              onChange={(v: string) => set('receiptHeader', v)}
              placeholder="Welcome to our store!"
              rows={2}
              maxLength={500}
            />
          </Field>
          <Field label="Footer Text" hint="Receipt ke neeche — thank you note">
            <TextArea
              value={draft.receiptFooter}
              onChange={(v: string) => set('receiptFooter', v)}
              placeholder="Shukriya! Phir tashreef laaiye 🙏"
              rows={2}
              maxLength={500}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Display options */}
      <SectionCard title="Display Options" desc="Receipt me kya-kya print ho" icon={Receipt} color="emerald">
        <Toggle
          checked={draft.receiptShowLogo}
          onChange={(v) => set('receiptShowLogo', v)}
          label="Show Logo"
          desc="Shop ka logo top pe print ho"
          icon={Building2}
        />
        <Toggle
          checked={draft.receiptShowTax}
          onChange={(v) => set('receiptShowTax', v)}
          label="Show Tax Breakdown"
          desc="Tax amount alag se dikhaen"
          icon={Receipt}
        />
        <Toggle
          checked={draft.receiptShowCustomer}
          onChange={(v) => set('receiptShowCustomer', v)}
          label="Show Customer Info"
          desc="Customer ka naam + phone print ho"
          icon={User}
        />
        <Toggle
          checked={draft.receiptShowBarcode}
          onChange={(v) => set('receiptShowBarcode', v)}
          label="Show Invoice Barcode"
          desc="Return/verify ke liye barcode print"
          icon={Barcode}
        />
        <Toggle
          checked={draft.receiptShowQrCode}
          onChange={(v) => set('receiptShowQrCode', v)}
          label="Show QR Code"
          desc="FBR compliance ya digital receipt link"
          icon={QrCode}
        />
      </SectionCard>

      {/* Printing */}
      <SectionCard title="Printing Behavior" desc="Bill ke baad khud print" icon={Printer} color="blue">
        <Toggle
          checked={draft.autoPrintReceipt}
          onChange={(v) => set('autoPrintReceipt', v)}
          label="Auto-Print After Sale"
          desc="Sale complete hote hi receipt khud print ho jaye"
          icon={Printer}
        />

      </SectionCard>

      <Alert tone="blue" icon={Printer}>
        Print quality ke liye <strong>Integrations</strong> me <strong>Cloud Printer (PrintNode)</strong> setup karo — thermal aur A4 dono ke liye alag printers configure ho sakti hain.
      </Alert>
    </div>
  );
}

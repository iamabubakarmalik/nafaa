import { Store, MapPin, Phone, Mail, Globe, MessageCircle, Building2, Image as ImageIcon } from 'lucide-react';
import { Field, TextInput, SectionCard, Divider, Alert } from '../components/UI';
import { SyncedBadge } from '../components/SyncedBadge';
import LogoUploader from '../components/LogoUploader';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

export function BusinessProfileSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      {/* Brand assets */}
      <SectionCard
        title="Brand Assets"
        desc="Logo aur banner receipts aur dashboard pe dikhenge"
        icon={ImageIcon}
        color="emerald"
      >
        <div className="grid sm:grid-cols-2 gap-6">
          <Field label="Shop Logo" hint="Square • 512×512 recommended • Transparent PNG best">
            <LogoUploader
              value={draft.logoUrl}
              onChange={(url) => set('logoUrl', url)}
              purpose="logo"
              size={112}
              shape="square"
            />
          </Field>
          <Field label="Banner (Optional)" hint="Wide banner for headers • 1200×400 recommended">
            <LogoUploader
              value={draft.bannerUrl}
              onChange={(url) => set('bannerUrl', url)}
              purpose="banner"
              size={80}
              shape="wide"
              label="Banner"
            />
          </Field>
        </div>
      </SectionCard>

      {/* Business details */}
      <SectionCard
        title="Business Details"
        desc="Ye info receipts aur invoices pe print hoti hai"
        icon={Store}
        color="blue"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Shop Name" required badge={<SyncedBadge />}>
            <TextInput
              value={draft.shopName}
              onChange={(v: string) => set('shopName', v)}
              placeholder="Ahmad Bakery"
              maxLength={80}
            />
          </Field>
          <Field label="Legal Name" hint="FBR registered / trade license name">
            <TextInput
              value={draft.legalName}
              onChange={(v: string) => set('legalName', v)}
              placeholder="Ahmad Foods (Pvt) Ltd"
            />
          </Field>
          <Field label="Business Type">
            <TextInput
              value={draft.businessType}
              onChange={(v: string) => set('businessType', v)}
              placeholder="Retail / Restaurant / Pharmacy..."
              disabled
            />
          </Field>
          <Field label="Established Date" hint="Optional">
            <TextInput
              type="date"
              value={draft.establishedDate?.slice(0, 10) || ''}
              onChange={(v: string) => set('establishedDate', v)}
            />
          </Field>
        </div>

        <Divider label="Contact" />

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone" badge={<SyncedBadge />}>
            <TextInput
              value={draft.shopPhone}
              onChange={(v: string) => set('shopPhone', v)}
              placeholder="+92 300 1234567"
              prefix={<Phone className="h-4 w-4" />}
            />
          </Field>
          <Field label="WhatsApp" hint="Customers ko receipt bhejne ke liye">
            <TextInput
              value={draft.shopWhatsapp}
              onChange={(v: string) => set('shopWhatsapp', v)}
              placeholder="+92 300 1234567"
              prefix={<MessageCircle className="h-4 w-4" />}
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={draft.shopEmail}
              onChange={(v: string) => set('shopEmail', v)}
              placeholder="shop@nafaa.pk"
              prefix={<Mail className="h-4 w-4" />}
            />
          </Field>
          <Field label="Website">
            <TextInput
              value={draft.shopWebsite}
              onChange={(v: string) => set('shopWebsite', v)}
              placeholder="https://mystore.pk"
              prefix={<Globe className="h-4 w-4" />}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Address */}
      <SectionCard
        title="Address"
        desc="Complete shop address — receipts aur delivery ke liye"
        icon={MapPin}
        color="violet"
      >
        <div className="space-y-4">
          <Field label="Street Address" badge={<SyncedBadge />}>
            <TextInput
              value={draft.shopAddress}
              onChange={(v: string) => set('shopAddress', v)}
              placeholder="Main Bazaar, Anarkali"
            />
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="City">
              <TextInput
                value={draft.shopCity}
                onChange={(v: string) => set('shopCity', v)}
                placeholder="Lahore"
              />
            </Field>
            <Field label="Province">
              <TextInput
                value={draft.shopProvince}
                onChange={(v: string) => set('shopProvince', v)}
                placeholder="Punjab"
              />
            </Field>
            <Field label="Postal Code">
              <TextInput
                value={draft.shopPostalCode}
                onChange={(v: string) => set('shopPostalCode', v)}
                placeholder="54000"
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <Alert tone="blue" icon={Building2} title="Live Preview">
        Ye details har receipt, invoice, aur customer WhatsApp message pe use hoti hain. Sahi likho — badalne pe purani receipts affect nahi hongi.
      </Alert>
    </div>
  );
}

import { Field, TextInput } from './_shared';
import LogoUploader from './LogoUploader';

export default function BusinessProfileSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      {/* Logo upload */}
      <Field label="Shop Logo" hint="Receipt aur dashboard pe dikhega">
        <LogoUploader
          value={s.logoUrl}
          onChange={(url) => set('logoUrl', url)}
          purpose="logo"
          size={96}
        />
      </Field>

      {/* Banner (optional) */}
      <Field label="Banner Image (Optional)" hint="Wider image for receipt header">
        <LogoUploader
          value={s.bannerUrl}
          onChange={(url) => set('bannerUrl', url)}
          purpose="banner"
          size={80}
          label="Banner"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Shop Name" required>
          <TextInput value={s.shopName} onChange={(v: string) => set('shopName', v)} placeholder="Ahmad Bakery" />
        </Field>
        <Field label="Legal Name" hint="As registered with FBR">
          <TextInput value={s.legalName} onChange={(v: string) => set('legalName', v)} placeholder="Ahmad Foods (Pvt) Ltd" />
        </Field>
        <Field label="Phone">
          <TextInput value={s.shopPhone} onChange={(v: string) => set('shopPhone', v)} placeholder="+92 300 1234567" />
        </Field>
        <Field label="WhatsApp">
          <TextInput value={s.shopWhatsapp} onChange={(v: string) => set('shopWhatsapp', v)} placeholder="+92 300 1234567" />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={s.shopEmail} onChange={(v: string) => set('shopEmail', v)} placeholder="shop@nafaa.pk" />
        </Field>
        <Field label="Website">
          <TextInput value={s.shopWebsite} onChange={(v: string) => set('shopWebsite', v)} placeholder="https://" />
        </Field>
      </div>

      <Field label="Address">
        <TextInput value={s.shopAddress} onChange={(v: string) => set('shopAddress', v)} placeholder="Main Bazaar, Lahore" />
      </Field>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="City">
          <TextInput value={s.shopCity} onChange={(v: string) => set('shopCity', v)} placeholder="Lahore" />
        </Field>
        <Field label="Province">
          <TextInput value={s.shopProvince} onChange={(v: string) => set('shopProvince', v)} placeholder="Punjab" />
        </Field>
        <Field label="Postal Code">
          <TextInput value={s.shopPostalCode} onChange={(v: string) => set('shopPostalCode', v)} placeholder="54000" />
        </Field>
      </div>
    </div>
  );
}

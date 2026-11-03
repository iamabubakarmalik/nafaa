/**
 * Settings → Store details: logo and banner, names, contact and address.
 * They print on every bill and invoice; a small preview shows the bill header
 * (web BusinessProfileSection). Changes save by themselves.
 */

import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Card, DatePicker, Input, SettingsTemplate, Text, useTheme } from '@/design';
import { useAutoSave, useSettings, useSettingsOnline } from '../hooks/useSettings';
import { LogoUploader } from '../components/LogoUploader';
import { Note, OfflineNote, SaveStatus, Section, ownerOnly } from '../components/SettingsParts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email saves only once it looks like an address, so half-typed text never reaches the server. */
function EmailField({ value, onSave, disabled }: { value: string; onSave: (v: string) => void; disabled?: boolean }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const bad = !!text && !EMAIL.test(text.trim());
  return (
    <Input label={t('Email')} icon={Mail} ltr keyboardType="email-address" autoCapitalize="none" disabled={disabled} value={text} placeholder="store@gmail.com"
      error={bad ? t('Email sahi likhein, jaise store@gmail.com') : undefined} hint={t('Rozana report aur zaroori khabrein is email par aati hain.')}
      onChangeText={(v) => { setText(v); if (EMAIL.test(v.trim())) onSave(v.trim()); }} />
  );
}

function BusinessProfile() {
  const th = useTheme();
  const q = useSettings();
  const online = useSettingsOnline();
  const { draft: d, set, saving, dirty, failed } = useAutoSave(q.data?.settings);
  const place = d ? [d.shopAddress, d.shopCity].filter(Boolean).join(', ') : '';

  return (
    <SettingsTemplate title={t('Store details')} description={t('Naam, logo, pata, phone — har bill par chhapte hain')} loading={!d && q.isLoading} error={!d && q.error} onRetry={q.refetch}
      actions={<SaveStatus saving={saving} dirty={dirty} failed={failed} />}>
      {!online && <OfflineNote />}
      {d && (
        <>
          <Card tone="muted" title={t('Bill par aisa dikhega')}>
            <View style={{ alignItems: 'center', gap: 2, backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), padding: th.space(4) }}>
              {d.logoUrl ? <Image source={{ uri: d.logoUrl }} style={{ width: 56, height: 56 }} contentFit="contain" /> : null}
              <Text size="lg" weight="heavy" align="center">{d.shopName || t('Store ka naam')}</Text>
              {!!d.legalName && <Text size="xs" tone="muted" align="center">{d.legalName}</Text>}
              <Text size="xs" tone="muted" align="center">{place || t('Pata yahan aayega')}</Text>
              {!!(d.shopPhone || d.shopWhatsapp) && <Text size="xs" tone="muted" ltr>{[d.shopPhone, d.shopWhatsapp && d.shopWhatsapp !== d.shopPhone ? `WA ${d.shopWhatsapp}` : ''].filter(Boolean).join(' · ')}</Text>}
            </View>
          </Card>

          <Section title={t('Logo aur banner')} description={t('Logo har bill, invoice aur online store par dikhta hai')}>
            <LogoUploader label={t('Store logo')} purpose="logo" value={d.logoUrl} onChange={(url) => set('logoUrl', url, { now: true })} hint={t('Chokor (square) tasveer, 512×512 behtar hai. Saaf background wala PNG sab se acha chhapta hai.')} />
            <LogoUploader label={t('Banner')} purpose="banner" wide value={d.bannerUrl} onChange={(url) => set('bannerUrl', url, { now: true })} hint={t('Chaura banner (1200×400) — online store aur bari screens ke upar. Zaroori nahi.')} />
          </Section>

          <Section title={t('Business ki pehchaan')} description={t('Naam jo customer bill par parhta hai, aur kaghazi naam')}>
            <Input label={t('Store ka naam')} hint={t('Bill ke upar sab se bara yahi likha jata hai.')} value={d.shopName ?? ''} onChangeText={(v) => set('shopName', v)} placeholder={t('Ahmad Bakery')} maxLength={80} disabled={!online} />
            <Input label={t('Legal naam')} hint={t('FBR ya trade license wala naam — A4 invoice par chhapta hai.')} value={d.legalName ?? ''} onChangeText={(v) => set('legalName', v)} placeholder={t('Ahmad Foods (Pvt) Ltd')} maxLength={200} disabled={!online} />
            <Input label={t('Business type')} hint={t('Badalne ke liye \'Business type\' page kholein.')} value={d.businessType ?? ''} disabled
              trailing={<Button size="sm" variant="link" onPress={() => router.push('/settings/business-config' as never)}>{t('Badlein')}</Button>} />
            <DatePicker label={t('Kab shuru hua')} hint={t('Zaroori nahi. Store ki saalgirah aur profile ke liye.')} value={d.establishedDate ? new Date(d.establishedDate) : null}
              onChange={(v) => set('establishedDate', v.toISOString().slice(0, 10), { now: true })} maximumDate={new Date()} disabled={!online} />
          </Section>

          <Section title={t('Contact')} description={t('Customer aap se kaise rabta kare — bill aur WhatsApp par jata hai')}>
            <Input label={t('Phone')} hint={t('Bill par chhapta hai. Misaal: 0300 1234567')} icon={Phone} ltr keyboardType="phone-pad" value={d.shopPhone ?? ''} onChangeText={(v) => set('shopPhone', v)} maxLength={30} disabled={!online} />
            <Input label={t('WhatsApp number')} hint={t('Customer ko bill aur rozana report isi number se khulti hai.')} icon={MessageCircle} ltr keyboardType="phone-pad" value={d.shopWhatsapp ?? ''} onChangeText={(v) => set('shopWhatsapp', v)} maxLength={30} disabled={!online} />
            <EmailField value={d.shopEmail ?? ''} onSave={(v) => set('shopEmail', v)} disabled={!online} />
            <Input label={t('Website')} hint={t('Website ya Facebook page ka link — A4 invoice par chhapta hai.')} ltr autoCapitalize="none" keyboardType="url" value={d.shopWebsite ?? ''} onChangeText={(v) => set('shopWebsite', v)} placeholder="https://meristore.pk" disabled={!online} />
          </Section>

          <Section title={t('Pata')} description={t('Store ka poora address — bill, invoice aur delivery ke liye')}>
            <Input label={t('Gali / bazaar')} hint={t('Dukaan number, bazaar aur ilaqa. Misaal: Shop 12, Main Bazaar, Anarkali')} icon={MapPin} value={d.shopAddress ?? ''} onChangeText={(v) => set('shopAddress', v)} placeholder={t('Shop 12, Main Bazaar, Anarkali')} maxLength={500} disabled={!online} />
            <Input label={t('Shehar')} hint={t('Misaal: Lahore')} value={d.shopCity ?? ''} onChangeText={(v) => set('shopCity', v)} placeholder={t('Lahore')} maxLength={100} disabled={!online} />
            <Input label={t('Province')} hint={t('Punjab, Sindh, KP, Balochistan…')} value={d.shopProvince ?? ''} onChangeText={(v) => set('shopProvince', v)} placeholder={t('Punjab')} maxLength={100} disabled={!online} />
            <Input label={t('Postal code')} hint={t('Zaroori nahi')} ltr keyboardType="number-pad" value={d.shopPostalCode ?? ''} onChangeText={(v) => set('shopPostalCode', v)} placeholder="54000" maxLength={20} disabled={!online} />
          </Section>
          <Note tone="muted">{t('Yeh details naye bills par lagti hain. Purane bill waise hi rehte hain jaise bane the.')}</Note>
        </>
      )}
    </SettingsTemplate>
  );
}

export const BusinessProfileScreen = ownerOnly(BusinessProfile, 'Store details');

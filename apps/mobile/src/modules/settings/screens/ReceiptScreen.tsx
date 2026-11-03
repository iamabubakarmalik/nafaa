/**
 * Settings → Receipt: paper, style, colours, what each bill shows, the shop's
 * own words, payment accounts, A4 invoice, the back of the bill, copies and
 * the printer (web ReceiptSection). Every bill in the app comes from the one
 * receipt engine (core/receipt), so a change here shows on the next bill;
 * the preview and the test print use the same engine.
 */

import { Eye, Plus, Printer, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import {
  NAFAA, PAY_KIND_LABEL, currentPrinter, devicePaper, printReceipt, setDevicePaper, useBillLanguage,
  type PayAccount, type ReceiptDesign, type ReceiptPaper,
} from '@/core/receipt';
import { Button, Chip, IconButton, Input, PressableScale, Select, SettingLink, SettingSwitch, SettingsGroup, SettingsTemplate, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { ReceiptView } from '@/modules/pos/components/ReceiptView';
import { useSettingsOnline } from '../hooks/useSettings';
import { sampleBill } from '../lib/sampleBill';
import { useReceiptDesign } from '../lib/useReceiptDesign';
import { ChoiceCards, NumberField, Note, OfflineNote, SaveStatus, Section, ownerOnly } from '../components/SettingsParts';

const ACCENTS = ['#0f766e', '#15803d', '#1d4ed8', '#7c3aed', '#be123c', '#c2410c', '#b45309', '#0f172a'];

function Receipt() {
  const th = useTheme();
  const online = useSettingsOnline();
  const lang = useBillLanguage();
  const r = useReceiptDesign();
  const { draft: d, setup, set } = r;
  const [preview, setPreview] = useState(false);
  const [phonePaper, setPhonePaper] = useState<ReceiptPaper | null>(() => devicePaper());
  const accounts = d?.payAccounts ?? [];
  const setAccount = (i: number, patch: Partial<PayAccount>) => set('payAccounts', accounts.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const fullSetup = d && setup ? { shop: setup.shop, design: d } : null;
  const off = !online;

  const testPrint = async () => {
    if (!fullSetup) return;
    try { await printReceipt(sampleBill(), { setup: fullSetup, lang, paper: phonePaper ?? d?.paper }); } catch { toast.error(t('Print nahi hua')); }
  };
  const sw = (key: keyof ReceiptDesign, label: string, description?: string) => (
    <SettingSwitch key={String(key)} label={label} description={description} value={!!d?.[key]} disabled={off} onChange={(v) => set(key, v as never, { now: true })} />
  );

  return (
    <SettingsTemplate title={t('Receipt')} description={t('Bill ka design, kaghaz, apni likhai, live preview')} loading={r.loading} error={!d && r.error} onRetry={undefined}
      actions={(
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
          <SaveStatus saving={r.saving} dirty={r.waiting} failed={r.failed} />
          <IconButton icon={Eye} label={t('Preview')} variant="soft" onPress={() => setPreview(true)} />
        </View>
      )}>
      {off && <OfflineNote />}
      {d && setup && (
        <>
          <Section title={t('Kaghaz aur shakal')} description={t('Printer ka kaghaz, bill ka andaaz aur harf ka size')}>
            <ChoiceCards value={d.paper} disabled={off} onChange={(v) => set('paper', v, { now: true })}
              options={[{ value: '58', label: t('58mm'), desc: t('Chhota thermal') }, { value: '80', label: t('80mm'), desc: t('Bara thermal') }, { value: 'A4', label: t('A4'), desc: t('Invoice / PDF') }]} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Andaaz')}</Text>
            <ChoiceCards value={d.style} disabled={off} onChange={(v) => set('style', v, { now: true })}
              options={[{ value: 'classic', label: t('Saada'), desc: t('Lakeeron wala bill') }, { value: 'modern', label: t('Modern'), desc: t('Upar kaali patti me naam') }, { value: 'bold', label: t('Mota'), desc: t('Bara naam, kaala total') }]} />
            <Select label={t('Harf ka size')} hint={t('Bare harf door se parhne me aasaan, magar bill lamba hota hai.')} value={d.font} disabled={off} onChange={(v) => set('font', v, { now: true })}
              options={[{ value: 'small', label: t('Chhota') }, { value: 'normal', label: t('Normal') }, { value: 'large', label: t('Bara (saaf parhne ke liye)') }]} />
            <Select label={t('Background par naam')} hint={t('A4 / PDF par halka naam; thermal kaghaz halka rang nahi chhaapta')} value={d.watermark} disabled={off} onChange={(v) => set('watermark', v, { now: true })}
              options={[{ value: 'both', label: t('Dukaan + Nafaa') }, { value: 'shop', label: t('Sirf dukaan') }, { value: 'nafaa', label: t('Sirf Nafaa') }, { value: 'none', label: t('Kuch nahi (saada safed)') }]} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Rang (A4 / PDF)')}</Text>
            <Text size="xs" tone="muted">{t('Thermal printer sirf kaala chhaapta hai; rang A4 aur PDF par aata hai.')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2.5) }}>
              {ACCENTS.map((c) => (
                <PressableScale key={c} accessibilityRole="button" accessibilityLabel={c} disabled={off} haptic="select" onPress={() => set('accent', c, { now: true })}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: d.accent === c ? 3 : 0, borderColor: th.colors.text }} />
              ))}
            </View>
          </Section>

          <Section title={t('Upar ka hissa')} description={t('Store ka naam, logo aur pata \'Store details\' se aate hain')}>
            <Input label={t('Naam ke neeche chhoti line')} hint={t('Misaal: Taaza aur asli maal · 1985 se')} value={d.tagline ?? ''} onChangeText={(v) => set('tagline', v)} maxLength={80} placeholder={t('Apni dukaan ki pehchaan')} disabled={off} />
          </Section>
          <SettingsGroup>
            {sw('showLogo', t('Logo'), setup.shop.logoUrl ? t('Thermal par kaala-safed chhapta hai') : t('Pehle Store details me logo lagayein'))}
            {sw('showAddress', t('Pata'), t('Branch ka pata ho to woh'))}
            {sw('showPhone', t('Phone aur WhatsApp'), t('Store details wale numbers'))}
            {sw('showTaxNumber', t('Tax number (NTN)'), t('Sirf jab Tax chalu ho'))}
          </SettingsGroup>

          <SettingsGroup title={t('Bill me kya dikhe')}>
            {sw('showCustomer', t('Customer ka naam aur phone'), t('Jab bill par customer chuna ho'))}
            {sw('showCashier', t('Cashier ka naam'), t('Jis ne bill banaya'))}
            {sw('showItemNumbers', t('Cheezon par number (1, 2, 3)'), t('Lambe bill ginne me aasaan'))}
            {sw('showItemDetails', t('Details: IMEI, serial, warranty, size'), t('Har cheez ke neeche chhoti line me'))}
            {sw('showSavings', t('\'Aap ne itne bachaye\''), t('Discount wale bill par'))}
            {sw('showKhata', t('Khata ka hisaab'), t('Pichla udhaar + is bill ka = kul'))}
            {sw('showAmountInWords', t('Amount in words (A4)'), t('Misaal: Five thousand rupees only'))}
            {sw('showSignature', t('Dastkhat ki jagah (A4)'), t('Neeche dastkhat aur mohar ke liye khaali jagah'))}
          </SettingsGroup>

          <Section title={t('Neeche ka hissa')} description={t('Aap ke apne alfaaz — har bill ke neeche')}>
            <TextArea label={t('Neeche apna message')} hint={t('Misaal: Eid par 10% Discount · Home delivery free · {{count}}/300', { count: (d.footer ?? '').length })} value={d.footer ?? ''} onChangeText={(v) => set('footer', v)} maxLength={300} disabled={off} />
            <TextArea label={t('Return ke usool')} hint={t('Har line alag usool ban kar chhapti hai · {{count}}/600', { count: (d.terms ?? '').length })} value={d.terms ?? ''} onChangeText={(v) => set('terms', v)} maxLength={600} placeholder={t('3 din me return, bill ke saath\nIstemal shuda maal wapas nahi')} disabled={off} />
            <Input label={t('Shukriya ki line')} hint={t('Bill ki aakhri line')} value={d.thanks ?? ''} onChangeText={(v) => set('thanks', v)} maxLength={80} disabled={off} />
            <Input label={t('Facebook / Instagram / website')} hint={t('Customer aap ko online dhoond sake')} ltr autoCapitalize="none" value={d.social ?? ''} onChangeText={(v) => set('social', v)} maxLength={100} placeholder={t('fb.com/meridukaan')} disabled={off} />
          </Section>
          <SettingsGroup>
            {sw('showBarcode', t('Bill ka barcode'), t('Scan karke wahi bill khulta hai (return me kaam)'))}
            {sw('showPayQr', t('Udhaar par payment QR'), t('Settings → Payment QR laga ho to'))}
            {sw('showReviewQr', t('Google review QR'), t('Settings → Google me link ho to'))}
          </SettingsGroup>
          <Note tone="brand">{t('Har bill ke bilkul neeche {{name}} ki chhoti si line aati hai ({{phone}}).', { name: NAFAA.name, phone: NAFAA.phone })}</Note>

          <Section title={t('Paise kaise bhejein')} description={t('Udhaar ya online order wale bill par aap ke account chhapte hain, taake customer seedha bhej sake')}>
            {accounts.map((a, i) => (
              <View key={i} style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border }}>
                <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <Select value={a.kind} disabled={off} onChange={(v) => setAccount(i, { kind: v })} options={Object.entries(PAY_KIND_LABEL).map(([value, label]) => ({ value: value as PayAccount['kind'], label }))} />
                  </View>
                  <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" disabled={off} onPress={() => set('payAccounts', accounts.filter((_, j) => j !== i), { now: true })} />
                </View>
                <Input ltr value={a.number ?? ''} onChangeText={(v) => setAccount(i, { number: v })} maxLength={40} placeholder={a.kind === 'BANK' ? t('Account number') : a.kind === 'RAAST' ? t('Raast ID / number') : '03xx-xxxxxxx'} disabled={off} />
                <Input value={a.title ?? ''} onChangeText={(v) => setAccount(i, { title: v })} maxLength={80} placeholder={t('Account title (naam)')} disabled={off} />
                {a.kind === 'BANK' && (
                  <>
                    <Input value={a.bank ?? ''} onChangeText={(v) => setAccount(i, { bank: v })} maxLength={60} placeholder={t('Bank ka naam (Meezan, HBL…)')} disabled={off} />
                    <Input ltr autoCapitalize="characters" value={a.iban ?? ''} onChangeText={(v) => setAccount(i, { iban: v.toUpperCase().replace(/\s/g, '') })} maxLength={40} placeholder={t('IBAN (PK..)')} disabled={off} />
                  </>
                )}
              </View>
            ))}
            {accounts.length < 6 && <Button variant="secondary" icon={Plus} disabled={off} onPress={() => set('payAccounts', [...accounts, { kind: 'JAZZCASH', title: setup.shop.name, number: '' }])}>{t('Account jorein')}</Button>}
            <Text size="xs" tone="muted">{t('Number aur title bilkul waise likhein jaise account me hai. 6 accounts tak; khaali number wala account save nahi hota.')}</Text>
            <Text size="sm" weight="semibold" tone="secondary">{t('Kab chhapein')}</Text>
            <ChoiceCards value={d.payWhen} disabled={off} onChange={(v) => set('payWhen', v, { now: true })}
              options={[{ value: 'due', label: t('Jab paise baqi hon'), desc: t('Udhaar / online order') }, { value: 'always', label: t('Har bill par') }, { value: 'never', label: t('Kabhi nahi') }]} />
            <Input label={t('Saath ki hidayat')} hint={t('Misaal: Paise bhej kar screenshot 0321-xxxxxxx par WhatsApp karein')} value={d.payNote ?? ''} onChangeText={(v) => set('payNote', v)} maxLength={120} disabled={off} />
          </Section>

          <Section title={t('A4 invoice')} description={t('Bari companies jaisa invoice — PDF, online order aur wholesale ke liye')}>
            <Input label={t('Upar ka unwaan')} hint={t('INVOICE, TAX INVOICE, BILL, CASH MEMO…')} autoCapitalize="characters" value={d.a4Title ?? ''} onChangeText={(v) => set('a4Title', v.toUpperCase())} maxLength={30} disabled={off} />
            <NumberField label={t('Paise dene ki period')} hint={t('Baqi wale bill par aakhri date (0 = nahi)')} value={d.dueDays} onChange={(v) => set('dueDays', v)} min={0} max={365} suffix={t('din')} disabled={off} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Header')}</Text>
            <ChoiceCards value={d.a4Layout} disabled={off} onChange={(v) => set('a4Layout', v, { now: true })}
              options={[{ value: 'band', label: t('Rangeen patti'), desc: t('Upar poori rangeen patti') }, { value: 'split', label: t('Do taraf'), desc: t('Naam baayen, invoice daayen') }, { value: 'minimal', label: t('Saada'), desc: t('Beech me, kam rang') }]} />
          </Section>
          <SettingsGroup>
            {sw('showStatus', t('PAID / UNPAID ka nishan'), t('Invoice ke kone par mohar jaisa'))}
            {sw('showCustomerDetails', t('Customer ka pata aur NTN / CNIC'), t('Wholesale aur company customers ke liye'))}
            {sw('showSku', t('SKU / code ka khana'), t('Har line par product ka code'))}
          </SettingsGroup>

          <Section title={t('Peeche ka hissa')} description={t('Bill ke baad aap ki shartein aur hidayat, dukaan aur Nafaa ki pehchaan ke saath')}>
            <TextArea label={t('Shartein / hidayat')} hint={t('Har line alag number ban kar chhapti hai · {{count}}/2000', { count: (d.backText ?? '').length })} value={d.backText ?? ''} onChangeText={(v) => set('backText', v)} maxLength={2000} disabled={off} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Kahan chhapein')}</Text>
            <ChoiceCards value={d.backPrint} disabled={off} onChange={(v) => set('backPrint', v, { now: true })}
              options={[{ value: 'none', label: t('Nahi') }, { value: 'a4', label: t('Sirf A4'), desc: t('Doosra safha') }, { value: 'all', label: t('Har bill'), desc: t('Thermal par ✂ ke baad') }]} />
          </Section>
          <SettingsGroup>
            {sw('thermalPattern', t('Thermal bill ke peeche halka naam'), t('Dukaan aur Nafaa ka naam halke nuqton me. Kuch printers par dhabbe aa sakte hain — test print kar ke dekhein.'))}
          </SettingsGroup>

          <Section title={t('Print')} description={t('Kitni copies aur kab')}>
            <ChoiceCards value={String(d.copies) as '1'} disabled={off} onChange={(v) => set('copies', Number(v), { now: true })}
              options={[{ value: '1', label: '1', desc: t('Customer') }, { value: '2', label: '2', desc: t('Customer + dukaan') }, { value: '3', label: '3' }]} />
          </Section>
          <SettingsGroup footnote={t('Sale ke baad bill ka safha khule to khud print.')}>
            {sw('autoPrint', t('Bill khulte hi print'))}
          </SettingsGroup>

          <Section title={t('Printer')} description={t('Ye settings sirf is phone ke liye hain')}>
            <SettingLink icon={Printer} label={t('Printer')} value={currentPrinter().name === 'System printer' ? t('Phone ka printer (AirPrint)') : currentPrinter().name} onPress={() => void testPrint()} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Is phone ka kaghaz')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              <Chip label={t('Dukaan wala')} selected={phonePaper === null} onPress={() => { setDevicePaper(null); setPhonePaper(null); }} />
              {(['58', '80', 'A4'] as const).map((p) => <Chip key={p} label={p === 'A4' ? 'A4' : `${p}mm`} selected={phonePaper === p} onPress={() => { setDevicePaper(p); setPhonePaper(p); }} />)}
            </View>
            <Button icon={Printer} variant="secondary" onPress={() => void testPrint()}>{t('Test print')}</Button>
          </Section>
        </>
      )}

      <Sheet open={preview} onClose={() => setPreview(false)} title={t('Bill par aisa dikhega')} height={0.9}>
        {fullSetup && <ReceiptView doc={sampleBill()} setup={fullSetup} lang={lang} />}
      </Sheet>
    </SettingsTemplate>
  );
}

export const ReceiptScreen = ownerOnly(Receipt, 'Receipt');

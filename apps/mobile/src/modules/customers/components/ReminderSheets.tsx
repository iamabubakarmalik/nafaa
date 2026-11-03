/**
 * Khata reminders on WhatsApp: step through customers one by one, pick the
 * tone and greeting, edit the text, then send or skip. The wording follows
 * the shop's bill language (Settings → Language). A second sheet edits the
 * shop's own wording per tone.
 */

import { MessageCircle, SkipForward } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { DEFAULT_REMINDERS, reminderText, toneFor, type MessageLang, type ReminderTone, type Salutation } from '@nafaa/core/customers';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, ChipGroup, ProgressBar, Row, Sheet, Text, TextArea, useTheme } from '@/design';
import type { DirectoryCustomer } from '../api/customers';
import { openWhatsApp } from '../lib/contact';
import { loadReminder, saveReminder } from '../lib/reminders';

const TONES: Array<{ value: ReminderTone; label: string }> = [
  { value: 'polite', label: 'Narm' }, { value: 'firm', label: 'Sakht' }, { value: 'final', label: 'Aakhri' },
];
const SALUTATIONS: Array<{ value: Salutation; label: string }> = [
  { value: 'auto', label: 'Khud' }, { value: 'bhai', label: 'Bhai' }, { value: 'baji', label: 'Baji' }, { value: 'uncle', label: 'Uncle' },
  { value: 'aunty', label: 'Aunty' }, { value: 'sahib', label: 'Sahib' }, { value: 'none', label: 'Kuch nahi' },
];

export function ReminderWizard({ open, customers, shop, lang, onClose }: {
  open: boolean; customers: DirectoryCustomer[]; shop: string; lang: MessageLang; onClose: () => void;
}) {
  const th = useTheme();
  const list = useMemo(() => customers.filter((c) => c.phone && c.balance > 0.009), [customers]);
  const [i, setI] = useState(0);
  const [sent, setSent] = useState(0);
  const [sal, setSal] = useState<Salutation>('auto');
  const [tone, setTone] = useState<ReminderTone>('polite');
  const [text, setText] = useState('');
  const c = list[i];
  useEffect(() => { if (open) { setI(0); setSent(0); } }, [open]);
  const build = (cu: DirectoryCustomer, tn: ReminderTone, s: Salutation) =>
    reminderText(loadReminder(lang, tn), { name: cu.name, gender: cu.gender, phone: cu.phone, amount: formatMoney(cu.balance), dueDays: cu.dueDays }, shop, lang, s);
  useEffect(() => { if (c) { const tn = toneFor(c.dueDays); setTone(tn); setText(build(c, tn, sal)); } }, [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => setI((x) => x + 1);

  const body = !list.length ? (
    <Text tone="secondary">{t('Is list mein kisi udhaar wale ka phone nahi.')}</Text>
  ) : !c ? (
    <Text>{t('{{sent}} customers ko yaad-dihani bheji, {{value}} chhor diye.', { sent, value: list.length - sent })}</Text>
  ) : (
    <View style={{ gap: th.space(3) }}>
      <ProgressBar value={i / list.length} />
      <Text size="sm" tone="secondary">{t('{{name}} · {{balance}} baqi{{value}}', { name: c.name, balance: formatMoney(c.balance), value: c.dueDays != null ? t(' · {{days}} din', { days: c.dueDays }) : '' })}</Text>
      <ChipGroup value={tone} onChange={(v) => { setTone(v as ReminderTone); setText(build(c, v as ReminderTone, sal)); }} options={TONES.map((x) => ({ value: x.value, label: t(x.label) }))} />
      {lang !== 'en' && (
        <ChipGroup value={sal} onChange={(v) => { setSal(v as Salutation); setText(build(c, tone, v as Salutation)); }} options={SALUTATIONS.map((x) => ({ value: x.value, label: t(x.label) }))} />
      )}
      <TextArea value={text} onChangeText={setText} numberOfLines={9} />
    </View>
  );

  return (
    <Sheet open={open} onClose={onClose} title={c ? t('Yaad-dihani {{value}} / {{count}}', { value: i + 1, count: list.length }) : t('Yaad-dihani')}
      footer={c ? (
        <Row gap={2}>
          <Button variant="secondary" icon={SkipForward} style={{ flex: 1 }} onPress={next}>{t('Chhor dein')}</Button>
          <Button variant="success" icon={MessageCircle} style={{ flex: 1.4 }} onPress={() => { if (openWhatsApp(c.phone, text)) setSent((s) => s + 1); next(); }}>{t('WhatsApp par bhejein')}</Button>
        </Row>
      ) : <Button fullWidth onPress={onClose}>{t('Band karein')}</Button>}>
      {body}
    </Sheet>
  );
}

export function ReminderTemplatesSheet({ open, lang, onClose }: { open: boolean; lang: MessageLang; onClose: () => void }) {
  const th = useTheme();
  const [tone, setTone] = useState<ReminderTone>('polite');
  const [drafts, setDrafts] = useState<Record<ReminderTone, string>>(DEFAULT_REMINDERS[lang]);
  useEffect(() => { if (open) setDrafts({ polite: loadReminder(lang, 'polite'), firm: loadReminder(lang, 'firm'), final: loadReminder(lang, 'final') }); }, [open, lang]);
  return (
    <Sheet open={open} onClose={onClose} title={t('Yaad-dihani ke messages')} description={t('{name} {sal} {amount} {days} {shop} khud bhar jate hain')}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={() => setDrafts({ ...DEFAULT_REMINDERS[lang] })}>{t('Pehle jaisa')}</Button>
        <Button style={{ flex: 1 }} onPress={() => { (Object.keys(drafts) as ReminderTone[]).forEach((k) => saveReminder(lang, k, drafts[k])); onClose(); }}>{t('Save karein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup value={tone} onChange={(v) => setTone(v as ReminderTone)} options={TONES.map((x) => ({ value: x.value, label: t(x.label) }))} />
        <TextArea value={drafts[tone]} onChangeText={(v) => setDrafts({ ...drafts, [tone]: v })} numberOfLines={10} />
      </View>
    </Sheet>
  );
}

/**
 * Settings → WhatsApp messages: the ready texts for a bill, a credit reminder
 * and a thank-you in the owner's own words (web WhatsappSection). No API: when
 * staff send, WhatsApp opens with the text filled in. The preview fills the
 * placeholders with sample values; a test opens WhatsApp on the owner's number.
 */

import { Copy, RotateCcw, Send } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { Button, Card, Chip, IconButton, Input, SettingsTemplate, Text, TextArea, toast, useTheme } from '@/design';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import { useSettings, useSettingsOnline, SETTINGS_KEY } from '../hooks/useSettings';
import { DEFAULT_TEMPLATES, FIELD_HELP, TEMPLATE_META, fillTemplate, resolveTemplates, waLink, type TemplateKey } from '../lib/whatsapp';
import { Note, OfflineNote, Section, ownerOnly } from '../components/SettingsParts';

function Whatsapp() {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useSettingsOnline();
  const q = useSettings();
  const s = q.data?.settings;
  const saved = s?.whatsappTemplates ?? undefined;
  const base = useMemo(() => resolveTemplates(saved), [saved]);
  const [edits, setEdits] = useState<Partial<Record<TemplateKey, string>>>({});
  const [active, setActive] = useState<TemplateKey>('receipt');
  const [testPhone, setTestPhone] = useState('');
  const shop = useAuthStore((a) => a.tenant?.name) || s?.shopName || 'Meri Dukaan';
  const drafts = { ...base, ...edits } as Record<TemplateKey, string>;
  const dirty = (Object.keys(edits) as TemplateKey[]).some((k) => edits[k] !== base[k]);
  const meta = TEMPLATE_META.find((m) => m.key === active)!;

  const save = useMutation({
    mutationFn: () => settingsApi.update({ whatsappTemplates: drafts }),
    onSuccess: () => { toast.success(t('Messages save ho gaye')); setEdits({}); void qc.invalidateQueries({ queryKey: SETTINGS_KEY }); },
    onError: () => toast.error(t('Save nahi hua')),
  });

  const sample = { customer: 'Aslam Sahib', shop, phone: s?.shopPhone ?? '', bill: 'INV-1043', total: 'Rs 4,250', paid: 'Rs 3,000', baqi: 'Rs 1,250', tareekh: new Date().toLocaleDateString('en-PK', { dateStyle: 'medium' }), cheezein: '• Dalda 5L × 1\n• Surf Excel 1kg × 2' };
  const preview = fillTemplate(drafts[active], sample);
  const link = waLink(testPhone, preview);

  return (
    <SettingsTemplate title={t('WhatsApp messages')} description={t('Bhejte waqt WhatsApp khud khulta hai aur message pehle se likha hota hai — bas Send dabana hai.')} loading={!s && q.isLoading} error={!s && q.error} onRetry={q.refetch}
      footer={dirty ? (
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => setEdits({})}>{t('Cancel')}</Button>
          <Button style={{ flex: 2 }} loading={save.isPending} disabled={!online} onPress={() => save.mutate()}>{t('Save')}</Button>
        </View>
      ) : undefined}>
      {!online && <OfflineNote />}
      {s && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {TEMPLATE_META.map((m) => <Chip key={m.key} label={`${m.emoji} ${t(m.label)}`} selected={active === m.key} onPress={() => setActive(m.key)} />)}
          </View>
          <Text size="xs" tone="muted">{t(meta.hint)}</Text>

          <Section title={t('{{label}} ka message', { label: t(meta.label) })} description={t('Apne alfaaz me likhein; {{khane}} me har customer ki asal maloomat aati hai')}
            action={<IconButton icon={RotateCcw} label={t('Tayyar message')} onPress={() => setEdits((e) => ({ ...e, [active]: DEFAULT_TEMPLATES[active] }))} />}>
            <TextArea value={drafts[active]} onChangeText={(v) => setEdits((e) => ({ ...e, [active]: v }))} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Khane — dabayein to message me jur jata hai')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              {meta.fields.map((f) => <Chip key={f} label={`{{${f}}}`} onPress={() => setEdits((e) => ({ ...e, [active]: `${drafts[active]}{{${f}}}` }))} />)}
            </View>
            <Text size="xs" tone="muted">{meta.fields.map((f) => `{{${f}}} = ${t(FIELD_HELP[f])}`).join(' · ')}</Text>
          </Section>

          <Card title={t('Customer ko aisa jayega')} description={t('Misaal ki maloomat ke saath — asal me har customer ka naam aur Amount aata hai')}>
            <View style={{ backgroundColor: th.colors.success.soft, borderRadius: th.radius('lg'), padding: th.space(3) }}>
              <Text size="sm">{preview || t('Message khaali hai…')}</Text>
            </View>
            <View style={{ gap: th.space(2), marginTop: th.space(3) }}>
              <Input label={t('Khud par test karein')} hint={t('Apna number likhein — WhatsApp yahi message le kar khulega.')} ltr keyboardType="phone-pad" value={testPhone} onChangeText={setTestPhone} placeholder="0300 1234567" />
              <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                <Button icon={Send} variant="success" style={{ flex: 1 }} disabled={!link} onPress={() => link && void Linking.openURL(link)}>{t('Bhejein')}</Button>
                <Button icon={Copy} variant="secondary" onPress={() => { void Clipboard.setStringAsync(preview); toast.success(t('Copy ho gaya')); }}>{t('Copy')}</Button>
              </View>
            </View>
          </Card>
          {dirty && <Note tone="warning">{t('Tabdeeli abhi save nahi hui.')}</Note>}
        </>
      )}
    </SettingsTemplate>
  );
}

export const WhatsappScreen = ownerOnly(Whatsapp, 'WhatsApp messages');

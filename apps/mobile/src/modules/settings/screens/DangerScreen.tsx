/**
 * Settings → Danger zone: ownership transfer (through support for now) and
 * deleting the store. Deleting needs the exact confirmation text and the
 * password, and starts a 7-day grace period that can be cancelled here
 * (web DangerZoneSection). Nothing is removed during the grace period.
 */

import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Database, Trash2, UserCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Card, Input, ListRow, PasswordInput, SettingsGroup, SettingsTemplate, Sheet, Text, confirm, toast, useTheme } from '@/design';
import { settingsApi } from '../api/settings';
import { useSettingsOnline } from '../hooks/useSettings';
import { Note, OfflineNote, ownerOnly } from '../components/SettingsParts';

/** The server compares this exact text; it is never translated. */
const CONFIRM_TEXT = 'DELETE MY SHOP';

function Danger() {
  const th = useTheme();
  const online = useSettingsOnline();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const reset = () => { setOpen(false); setText(''); setPassword(''); };

  const del = useMutation({
    mutationFn: () => settingsApi.deleteTenant(text, password),
    onSuccess: (r) => { toast.success(r?.message || t('Delete ki darkhwast lag gayi — 7 din me cancel kar sakte hain')); reset(); },
    onError: (e) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('Delete nahi hua')),
  });
  const cancel = useMutation({
    mutationFn: settingsApi.cancelDeletion,
    onSuccess: () => toast.success(t('Delete cancel ho gaya')),
    onError: (e) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('Cancel nahi hua')),
  });

  const ready = text === CONFIRM_TEXT && password.length >= 4;
  return (
    <SettingsTemplate title={t('Danger zone')}>
      {!online && <OfflineNote />}
      <Note tone="danger">{t('Yahan ke kaam wapas nahi hote. Sirf tab karein jab poora yaqeen ho — pehle Backup le lein.')}</Note>
      <SettingsGroup>
        <ListRow icon={Database} title={t('Backup')} subtitle={t('Poore data ki ek file — mehfooz rakhein')} chevron onPress={() => router.push('/backup' as never)} />
      </SettingsGroup>

      <Card title={t('Ownership transfer')} description={t('Store ka malikana kisi doosre user ko dein')}>
        <View style={{ gap: th.space(3) }}>
          <Note tone="warning">{t('Transfer ke baad aap Manager ban jayenge — billing aur Danger zone jaisi permissions chali jayengi. Naya malik poora control le leta hai.')}</Note>
          <Button icon={UserCheck} variant="secondary" onPress={() => toast.info(t('Support se rabta karein — transfer abhi support team karti hai'))}>{t('Transfer ki darkhwast')}</Button>
          <Text size="xs" tone="muted">{t('Abhi transfer support team ke zariye hota hai.')}</Text>
        </View>
      </Card>

      <Card title={t('Store delete')} description={t('Poora store aur us ka data delete karein')}>
        <View style={{ gap: th.space(3) }}>
          <Note tone="danger">
            {[t('Products, Sales, customers, receipts — sab delete ho jayenge'), t('7 din ki mohlat milti hai — us dauran cancel kar sakte hain'), t('7 din baad wapas nahi aata — koi recovery nahi'), t('Subscription cancel ho jayegi, refund policy ke mutabiq')].map((l) => `• ${l}`).join('\n')}
          </Note>
          <Button icon={Trash2} variant="danger" disabled={!online} onPress={() => setOpen(true)}>{t('Store delete karein')}</Button>
          <Button variant="secondary" loading={cancel.isPending} disabled={!online} onPress={async () => { if (await confirm({ title: t('Delete ki darkhwast cancel karein?'), confirmLabel: t('Cancel karein') })) cancel.mutate(); }}>{t('Delete ki darkhwast cancel karein')}</Button>
        </View>
      </Card>

      <Sheet open={open} onClose={reset} title={t('Aakhri tasdeeq')}
        footer={(
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={reset}>{t('Wapas')}</Button>
            <Button variant="danger" style={{ flex: 1 }} disabled={!ready} loading={del.isPending} onPress={() => del.mutate()}>{t('Pakka delete karein')}</Button>
          </View>
        )}>
        <View style={{ gap: th.space(3) }}>
          <Input label={t('Tasdeeq ke liye "{{CONFIRM_TEXT}}" likhein', { CONFIRM_TEXT })} hint={t('Bilkul isi tarah, bare harfon me')} ltr autoCapitalize="characters" autoCorrect={false} value={text} onChangeText={setText} placeholder={CONFIRM_TEXT} />
          <PasswordInput label={t('Abhi ka password')} hint={t('Wohi password jis se aap login karte hain')} value={password} onChangeText={setPassword} />
        </View>
      </Sheet>
    </SettingsTemplate>
  );
}

export const DangerScreen = ownerOnly(Danger, 'Danger zone');

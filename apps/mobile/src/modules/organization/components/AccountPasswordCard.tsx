/**
 * Account password. The password signs in to the app; the PIN only opens
 * cost and locked pages, and a forgotten PIN is reset with this password, so
 * it should be strong. People who sign in with Google and have no password
 * yet create one here.
 */

import { KeyRound } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { Button, Card, PasswordInput, ProgressBar, Text, toast, useTheme } from '@/design';
import { securityApi } from '../api/organization';

/** A simple strength measure: length, mixed case, digits, symbols. */
function strengthOf(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (!pw) return { score: 0, label: '', tone: 'muted' as const };
  if (s <= 1) return { score: 1, label: t('Bohat kamzor'), tone: 'danger' as const };
  if (s === 2) return { score: 2, label: t('Kamzor'), tone: 'warning' as const };
  if (s === 3) return { score: 3, label: t('Theek hai'), tone: 'warning' as const };
  return { score: s, label: s === 4 ? t('Mazboot') : t('Bohat mazboot'), tone: 'success' as const };
}

export function AccountPasswordCard() {
  const th = useTheme();
  const user = useAuthStore((s) => s.user);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const googleOnly = !!user?.googleId && user?.hasPassword === false;
  const str = strengthOf(next);

  const change = useMutation({
    mutationFn: () => (googleOnly ? securityApi.setPassword(next) : securityApi.changePassword(current, next)),
    meta: { silentError: true },
    onSuccess: () => {
      toast.success(googleOnly ? t('Password ban gaya') : t('Password badal gaya'));
      setCurrent(''); setNext(''); setConfirm(''); setError('');
      if (googleOnly) useAuthStore.getState().updateUser({ hasPassword: true });
    },
    onError: (e) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('Password badal nahi saka')),
  });
  const forgot = useMutation({
    mutationFn: () => securityApi.forgotPassword(user?.email ?? ''),
    onSuccess: () => toast.success(t('Reset link {{email}} par bhej diya', { email: user?.email })),
  });

  const submit = () => {
    setError('');
    if (!googleOnly && !current) return setError(t('Purana password likhein'));
    if (next.length < 8) return setError(t('Naya password kam se kam 8 harf ka ho'));
    if (next !== confirm) return setError(t('Dono password ek jaise nahi hain'));
    if (!googleOnly && next === current) return setError(t('Naya password purane se alag hona chahiye'));
    change.mutate();
  };

  return (
    <Card title={t('Account password')} description={t('Is se aap app me login karte hain — PIN se alag cheez hai')}>
      <View style={{ gap: th.space(3) }}>
        {googleOnly && <Text size="sm" tone="warning">{t('Aap Google se login karte hain. Ek password bana lein — Google na chale to bhi login ho sakega, aur PIN bhool jane par kaam aayega.')}</Text>}
        {!googleOnly && <PasswordInput label={t('Purana password')} value={current} onChangeText={(v) => { setCurrent(v); setError(''); }} autoComplete="current-password" />}
        <PasswordInput label={t('Naya password')} value={next} onChangeText={(v) => { setNext(v); setError(''); }} autoComplete="new-password" hint={t('Kam se kam 8 harf — bare/chhote harf aur number mila kar')} />
        {!!next && (
          <View style={{ gap: 4 }}>
            <ProgressBar value={str.score / 5} tone={str.tone === 'muted' ? 'neutral' : str.tone} />
            <Text size="xs" weight="semibold" tone={str.tone}>{str.label}</Text>
          </View>
        )}
        <PasswordInput label={t('Naya password dobara')} value={confirm} onChangeText={(v) => { setConfirm(v); setError(''); }} autoComplete="new-password" onSubmitEditing={submit} />
        {!!error && <Text size="sm" tone="danger">{error}</Text>}
        <Button icon={KeyRound} loading={change.isPending} disabled={next.length < 8 || next !== confirm} onPress={submit}>{googleOnly ? t('Password banayein') : t('Password badlein')}</Button>
        {!googleOnly && <Button variant="ghost" loading={forgot.isPending} disabled={!user?.email} onPress={() => forgot.mutate()}>{t('Purana yaad nahi — email par link')}</Button>}
        <Text size="xs" tone="muted">{t('Password badalne par doosre devices ka login chalta rehta hai. Kisi device ko nikalna ho to neeche "Active devices" se logout karein.')}</Text>
      </View>
    </Card>
  );
}

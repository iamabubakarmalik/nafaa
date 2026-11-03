/** Owner PIN: set, change, remove, or reset with the account password (same flow as the web). */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { Button, Input, PasswordInput, Row, Sheet, Text, toast, useTheme } from '@/design';
import { securityApi } from '../api/organization';
import { onlyDigits } from '../lib/meta';

type Step = 'menu' | 'set' | 'remove' | 'forgot';

export function PinSheet({ open, hasPin, onClose }: { open: boolean; hasPin: boolean; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('set');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep(hasPin ? 'menu' : 'set'); setPin(''); setPin2(''); setCurrent(''); setPassword(''); setError('');
  }, [open, hasPin]);

  const done = (message: string) => {
    toast.success(message);
    ['pin-status', 'security-score'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    qc.invalidateQueries({ queryKey: ['settings', 'counter'] });
    onClose();
  };
  const fail = (e: unknown, fallback: string) => {
    const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    setError(typeof m === 'string' ? m : fallback);
  };

  const savePin = useMutation({
    mutationFn: () => securityApi.setPin(pin, hasPin ? current : undefined),
    meta: { silentError: true },
    onSuccess: () => done(hasPin ? t('PIN badal gaya') : t('PIN set ho gaya — ab cost chhupi hai')),
    onError: (e) => fail(e, t('PIN save nahi hua')),
  });
  const removePin = useMutation({
    mutationFn: () => securityApi.removePin({ currentPin: current }),
    meta: { silentError: true },
    onSuccess: () => done(t('PIN hata diya — ab cost sab ko dikhegi')),
    onError: () => setError(t('Ghalat PIN')),
  });
  const resetPin = useMutation({
    mutationFn: () => securityApi.resetPin(password, pin),
    meta: { silentError: true },
    onSuccess: () => done(t('Naya PIN lag gaya')),
    onError: (e) => fail(e, t('Password ghalat hai')),
  });

  const submitSet = () => {
    if (pin.length < 4) return setError(t('PIN kam se kam 4 hindson ka ho'));
    if (pin !== pin2) return setError(t('Dono PIN aik jaise nahi hain'));
    if (hasPin && current.length < 4) return setError(t('Purana PIN bhi likhein'));
    setError(''); savePin.mutate();
  };
  const submitForgot = () => {
    if (!password) return setError(t('Account ka password likhein'));
    if (pin.length < 4) return setError(t('PIN kam se kam 4 hindson ka ho'));
    if (pin !== pin2) return setError(t('Dono PIN aik jaise nahi hain'));
    setError(''); resetPin.mutate();
  };

  const title = step === 'set' ? (hasPin ? t('PIN badlein') : t('PIN set karein')) : step === 'remove' ? t('PIN hatayein') : step === 'forgot' ? t('PIN bhool gaye') : t('PIN Settings');
  const pinField = (label: string, value: string, set: (v: string) => void) => (
    <Input label={label} value={value} onChangeText={(v) => { set(onlyDigits(v)); setError(''); }} keyboardType="number-pad" secureTextEntry maxLength={8} ltr />
  );

  return (
    <Sheet open={open} onClose={onClose} title={title}
      footer={step === 'menu' ? undefined : (
        <Row gap={2}>
          {hasPin && step !== 'forgot' && <Button variant="ghost" onPress={() => { setStep('forgot'); setError(''); }}>{t('PIN bhool gaye?')}</Button>}
          <Button style={{ flex: 1 }} variant={step === 'remove' ? 'danger' : 'primary'} loading={savePin.isPending || removePin.isPending || resetPin.isPending}
            onPress={step === 'set' ? submitSet : step === 'forgot' ? submitForgot : () => (current.length < 4 ? setError(t('Purana PIN likhein')) : removePin.mutate())}>
            {step === 'remove' ? t('PIN hatayein') : t('Save')}
          </Button>
        </Row>
      )}>
      <View style={{ gap: th.space(3) }}>
        {step === 'menu' && (
          <View style={{ gap: th.space(2) }}>
            <Button variant="secondary" fullWidth onPress={() => setStep('set')}>{t('PIN badlein')}</Button>
            <Button variant="secondary" fullWidth onPress={() => setStep('forgot')}>{t('PIN bhool gaye')}</Button>
            <Button variant="danger" fullWidth onPress={() => setStep('remove')}>{t('PIN hatayein')}</Button>
          </View>
        )}
        {step === 'set' && (
          <>
            {hasPin && pinField(t('Purana PIN'), current, setCurrent)}
            {pinField(t('Naya PIN (4 se 8 hindsay)'), pin, setPin)}
            {pinField(t('Naya PIN dobara'), pin2, setPin2)}
          </>
        )}
        {step === 'remove' && (
          <>
            <Text size="sm" tone="muted">{t('PIN hatane ke baad maal ki Cost aur Profit har us bande ko dikhegi jo app khole.')}</Text>
            {pinField(t('Purana PIN'), current, setCurrent)}
          </>
        )}
        {step === 'forgot' && (
          <>
            <Text size="sm" tone="muted">{t('Account ke password se naya PIN lagayein.')}</Text>
            <PasswordInput label={t('Account password')} value={password} onChangeText={(v) => { setPassword(v); setError(''); }} />
            {pinField(t('Naya PIN (4 se 8 hindsay)'), pin, setPin)}
            {pinField(t('Naya PIN dobara'), pin2, setPin2)}
          </>
        )}
        {!!error && <Text size="sm" tone="danger">{error}</Text>}
      </View>
    </Sheet>
  );
}

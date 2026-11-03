/**
 * New password from the emailed link. Opens from the link
 * (https://nafaa.pk/reset-password?token=… or nafaa://reset-password?token=…);
 * the code can also be pasted by hand.
 */

import { KeyRound } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { authApi } from '@/core/auth/api';
import { Button, Card, Input, PasswordInput, Text, toast } from '@/design';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordStrength } from '../components/PasswordStrength';
import { authErrorMessage } from '../lib/auth-errors';

export function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [errors, setErrors] = useState<{ token?: string; password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = useMutation({
    meta: { silentError: true },
    mutationFn: () => authApi.resetPassword(token.trim(), password),
    onSuccess: () => {
      toast.success(t('Naya password ban gaya'), { message: t('Ab naye password se login karein') });
      router.replace('/login');
    },
    onError: (err) => setFormError(authErrorMessage(err, t('Password nahi badla. Dobara koshish karein.'))),
  });

  const submit = () => {
    const e: typeof errors = {};
    if (!token.trim()) e.token = t('Email wala link ya code likhein');
    if (password.length < 8) e.password = t('Password kam se kam 8 huroof ka rakhein');
    if (confirmPw !== password) e.confirm = t('Dono password ek jaise nahi');
    setErrors(e);
    setFormError(null);
    if (!Object.keys(e).length) reset.mutate();
  };

  return (
    <AuthLayout back title={t('Naya password banayein')} subtitle={t('Mazboot password rakhein jo yaad bhi rahe.')}>
      {formError && <Card tone="danger"><Text size="sm" tone="danger">{formError}</Text></Card>}
      {!params.token && <Input label={t('Reset code')} value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} icon={KeyRound} ltr hint={t('Email wale link ka code yahan paste karein')} error={errors.token} />}
      <PasswordInput label={t('Naya password')} value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" placeholder={t('Kam se kam 8 huroof')} error={errors.password} />
      {!!password && <PasswordStrength value={password} />}
      <PasswordInput label={t('Password dobara likhein')} value={confirmPw} onChangeText={setConfirmPw} autoComplete="new-password" error={errors.confirm} returnKeyType="go" onSubmitEditing={submit} />
      <Button size="xl" fullWidth loading={reset.isPending} onPress={submit}>{t('Password save karein')}</Button>
    </AuthLayout>
  );
}

/** Change (or, for Google-only accounts, set) the account password. */

import { router } from 'expo-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { authApi } from '@/core/auth/api';
import { useAuthStore } from '@/core/auth/store';
import { Card, FormSection, FormTemplate, PasswordInput, Text, toast } from '@/design';
import { PasswordStrength } from '../components/PasswordStrength';
import { authErrorMessage } from '../lib/auth-errors';

export function ChangePasswordScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const hasPassword = user?.hasPassword !== false;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; again?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    meta: { silentError: true },
    mutationFn: () => (hasPassword ? authApi.changePassword(current, next) : authApi.setPassword(next)),
    onSuccess: () => {
      updateUser({ hasPassword: true });
      toast.success(t('Password badal gaya'));
      router.back();
    },
    onError: (err) => setFormError(authErrorMessage(err, t('Password nahi badla. Dobara koshish karein.'))),
  });

  const submit = () => {
    const e: typeof errors = {};
    if (hasPassword && !current) e.current = t('Abhi wala password likhein');
    if (next.length < 8) e.next = t('Password kam se kam 8 huroof ka rakhein');
    if (again !== next) e.again = t('Dono password ek jaise nahi');
    setErrors(e);
    setFormError(null);
    if (!Object.keys(e).length) save.mutate();
  };

  return (
    <FormTemplate title={hasPassword ? t('Password badlein') : t('Password banayein')} onSave={submit} saving={save.isPending} dirty={!!(current || next || again) && !save.isSuccess}>
      {formError && <Card tone="danger"><Text size="sm" tone="danger">{formError}</Text></Card>}
      {!hasPassword && <Card tone="info"><Text size="sm" tone="info">{t('Aap ne Google se account banaya tha. Password bana lein to email se bhi login ho sakega.')}</Text></Card>}
      <FormSection>
      {hasPassword && <PasswordInput label={t('Abhi wala password')} value={current} onChangeText={setCurrent} autoComplete="current-password" error={errors.current} />}
      <PasswordInput label={t('Naya password')} value={next} onChangeText={setNext} autoComplete="new-password" textContentType="newPassword" error={errors.next} />
      {!!next && <PasswordStrength value={next} />}
      <PasswordInput label={t('Password dobara likhein')} value={again} onChangeText={setAgain} autoComplete="new-password" error={errors.again} />
      </FormSection>
    </FormTemplate>
  );
}

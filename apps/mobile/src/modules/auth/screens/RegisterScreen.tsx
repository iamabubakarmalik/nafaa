/**
 * Sign-up in two short parts (same as the web RegisterPage): the shop (name,
 * how it sells, industry), then the owner's account. After the account
 * exists the picks are applied (trial first, see setUpNewAccount) and the
 * email code screen opens.
 */

import { ArrowLeft, ArrowRight, Gift, Mail, Phone, Store, User } from 'lucide-react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { t, Trans, currentLocale } from '@/core/i18n';
import { authApi } from '@/core/auth/api';
import { useAuthStore } from '@/core/auth/store';
import { DEFAULT_MODELS, type BusinessModel } from '@/core/business-models';
import { Button, Card, IconButton, Input, PasswordInput, Text, toast, useTheme } from '@/design';
import { AuthLayout, OrDivider } from '../components/AuthLayout';
import { GoogleButton } from '../components/GoogleButton';
import { BusinessModelPicker } from '../components/BusinessModelPicker';
import { IndustryPicker } from '../components/IndustryPicker';
import { PasswordStrength } from '../components/PasswordStrength';
import { authErrorMessage } from '../lib/auth-errors';
import { industryChoices, rememberSignupPicks, setUpNewAccount } from '../lib/industry-choices';
import { useGoogleSignIn } from '../lib/useGoogleSignIn';
import { cleanPakistanPhone, isValidPakistanPhone } from '../lib/phone';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PartSteps({ part }: { part: 1 | 2 }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), marginBottom: th.space(2) }}>
      {[t('Dukaan'), t('Account')].map((label, i) => {
        const n = i + 1;
        const active = n === part;
        const done = n < part;
        return (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            {i > 0 && <View style={{ width: 22, height: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' }} />}
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: active ? '#ffffff' : done ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Text size="xs" weight="bold" color={active ? th.colors.brandScale[700] : '#ffffff'} ltr>{String(n)}</Text>
            </View>
            <Text size="sm" weight="semibold" color={active ? '#ffffff' : 'rgba(255,255,255,0.7)'}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function RegisterScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ ref?: string }>();
  const setSession = useAuthStore((s) => s.setSession);
  const [part, setPart] = useState<1 | 2>(1);
  const [models, setModels] = useState<BusinessModel[]>(DEFAULT_MODELS);
  const choices = useMemo(() => industryChoices(models), [models]);
  const [f, setF] = useState({ shopName: '', businessType: '', fullName: '', email: '', phone: '', password: '', referralCode: params.ref ?? '' });
  const [showReferral, setShowReferral] = useState(!!params.ref);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof f, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF((v) => ({ ...v, ...patch }));
  const google = useGoogleSignIn(setFormError);

  const register = useMutation({
    meta: { silentError: true },
    mutationFn: () => authApi.register({
      shopName: f.shopName.trim(),
      fullName: f.fullName.trim(),
      email: f.email.trim(),
      phone: f.phone ? cleanPakistanPhone(f.phone) : undefined,
      password: f.password,
      referralCode: f.referralCode.trim() || undefined,
      language: currentLocale(),
    }),
    onSuccess: async (data) => {
      rememberSignupPicks({ businessType: f.businessType, models });
      await setSession(data);
      await setUpNewAccount(f.businessType, models);
      toast.success(t('Mubarak ho! Aap ka account ban gaya'), { message: t('Email par 6 number ka code bheja gaya hai') });
      router.replace({ pathname: '/verify-email', params: { sent: '1' } });
    },
    onError: (err) => {
      const msgText = authErrorMessage(err, t('Account nahi ban saka. Dobara koshish karein.'));
      const raw = String((err as { response?: { data?: { message?: unknown } } }).response?.data?.message ?? '');
      if (/phone|mobile/i.test(raw)) setErrors({ phone: msgText });
      else if (/referral/i.test(raw)) setErrors({ referralCode: msgText });
      else if (/shop|dukaan/i.test(raw)) { setPart(1); setErrors({ shopName: msgText }); }
      else setFormError(msgText);
    },
  });

  const next = () => {
    const e: typeof errors = {};
    if (f.shopName.trim().length < 2) e.shopName = t('Dukaan ka naam likhein (kam se kam 2 huroof)');
    if (!f.businessType) e.businessType = t('Apna kaam chunein — is se app aap ke hisaab se set hoti hai');
    setErrors(e);
    if (!Object.keys(e).length) {
      setFormError(null);
      setPart(2);
    }
  };

  const submit = () => {
    const e: typeof errors = {};
    if (f.fullName.trim().length < 2) e.fullName = t('Apna naam likhein');
    if (!f.email.trim()) e.email = t('Email likhein');
    else if (!EMAIL_RE.test(f.email.trim())) e.email = t('Email sahi nahi lag raha. Misaal: ahmad@gmail.com');
    if (f.phone && !isValidPakistanPhone(cleanPakistanPhone(f.phone))) e.phone = t('Mobile number 03 se shuru aur 11 number ka hota hai. Misaal: 03001234567');
    if (f.password.length < 8) e.password = t('Password kam se kam 8 huroof ka rakhein');
    setErrors(e);
    setFormError(null);
    if (!Object.keys(e).length) register.mutate();
  };

  const footer = (
    <Text tone="secondary" align="center">
      {t('Pehle se account hai?')}{' '}
      <Link href="/login" asChild><Text weight="bold" tone="brand" suppressHighlighting>{t('Login karein')}</Text></Link>
    </Text>
  );

  if (part === 1) {
    return (
      <AuthLayout title={t('Apni dukaan banayein')} subtitle={t('7 din free · card ki zaroorat nahi · jab chahein band karein')} steps={<PartSteps part={1} />} footer={footer}>
        {!!params.ref && <Card tone="success"><Text size="sm" tone="success">{t('Referral code lag gaya. Aap ke dost ko reward milega jab aap plan lenge.')}</Text></Card>}
        <Input
          label={t('Dukaan / business ka naam')}
          placeholder={t('Misaal: Ahmad Medical Store')}
          icon={Store}
          value={f.shopName}
          onChangeText={(v) => set({ shopName: v })}
          hint={t('Bill aur receipt par yahi naam chhapega. Baad me badal sakte hain.')}
          error={errors.shopName}
          autoCapitalize="words"
        />
        <BusinessModelPicker value={models} onChange={setModels} />
        <IndustryPicker
          label={models.length === 1 && models[0] === 'RETAIL' ? t('Aap ka kaam kya hai?') : t('Aap kis cheez ka kaam karte hain?')}
          choices={choices}
          value={f.businessType}
          onChange={(v) => { set({ businessType: v }); setErrors((x) => ({ ...x, businessType: undefined })); }}
          error={errors.businessType}
        />
        <Button size="xl" fullWidth onPress={next} iconEnd={ArrowRight} iconEndFlip>{t('Next')}</Button>
        <OrDivider />
        <GoogleButton label={t('Google se account banayein')} onPress={() => { rememberSignupPicks({ businessType: f.businessType || null, models }); google.start(); }} loading={google.busy} disabled={!google.ready} />
        <Text size="xs" tone="muted" align="center">{t('Google ke baad sirf dukaan ka naam poochenge.')}</Text>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('Aap ka account')}
      subtitle={<Text color="rgba(255,255,255,0.85)"><Trans text="Is se aap {{shop}} me login karenge." values={{ shop: <Text weight="bold" color="#ffffff">{f.shopName}</Text> }} /></Text>}
      steps={<PartSteps part={2} />}
      footer={footer}
    >
      {formError && <Card tone="danger"><Text size="sm" tone="danger">{formError}</Text></Card>}
      <Input label={t('Aap ka naam')} placeholder={t('Ahmad Ali')} icon={User} value={f.fullName} onChangeText={(v) => set({ fullName: v })} autoComplete="name" textContentType="name" autoCapitalize="words" error={errors.fullName} />
      <Input label={t('Email')} placeholder="ahmad@gmail.com" icon={Mail} value={f.email} onChangeText={(v) => set({ email: v })} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" hint={t('Login aur password reset isi email se hoga.')} error={errors.email} />
      <Input label={t('Mobile')} labelHint={t('(zaroori nahi)')} placeholder="03001234567" icon={Phone} value={f.phone} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={errors.phone} />
      <View style={{ gap: th.space(2) }}>
        <PasswordInput label={t('Password')} placeholder={t('Kam se kam 8 huroof')} value={f.password} onChangeText={(v) => set({ password: v })} autoComplete="new-password" textContentType="newPassword" hint={f.password ? undefined : t('Number aur nishaan (@, #) mila kar mazboot banayein.')} error={errors.password} />
        {!!f.password && <PasswordStrength value={f.password} />}
      </View>
      {showReferral ? (
        <Input label={t('Referral code')} placeholder={t('NAFAA-XXXX')} icon={Gift} value={f.referralCode} onChangeText={(v) => set({ referralCode: v })} autoCapitalize="characters" ltr error={errors.referralCode} />
      ) : (
        <Button variant="link" onPress={() => setShowReferral(true)} style={{ alignSelf: 'flex-start' }}>{t('Referral code hai?')}</Button>
      )}
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <IconButton icon={ArrowLeft} label={t('Wapas')} variant="secondary" size="xl" flip onPress={() => setPart(1)} style={{ width: 56, height: 56 }} />
        <Button size="xl" onPress={submit} loading={register.isPending} iconEnd={ArrowRight} iconEndFlip style={{ flex: 1 }}>{t('Create account')}</Button>
      </View>
      <Text size="xs" tone="muted" align="center">
        <Trans text="Account bana kar aap Nafaa ki {{terms}} aur {{privacy}} se mutafiq hain." values={{
          terms: <Text size="xs" weight="bold" tone="brand" onPress={() => router.push('/legal')}>{t('Terms')}</Text>,
          privacy: <Text size="xs" weight="bold" tone="brand" onPress={() => router.push('/legal')}>{t('Privacy Policy')}</Text>,
        }} />
      </Text>
    </AuthLayout>
  );
}

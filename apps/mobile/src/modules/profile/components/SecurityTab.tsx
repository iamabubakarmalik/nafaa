/** Security: a short checklist, password, email, Google link, owner PIN and app lock. */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, Circle, Fingerprint, KeyRound, Lock, Mail, Sparkles, Unlink } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { biometricAvailable, useBiometric } from '@/core/auth/biometric';
import type { AuthUser } from '@/core/auth/types';
import { t } from '@/core/i18n';
import { isOwner } from '@/core/permissions';
import { Badge, Button, Card, Icon, ListGroup, ListRow, ProgressBar, Row, Switch, Text, toast, useTheme } from '@/design';
import { profileApi } from '../api/profile';

export function SecurityTab({ user }: { user: AuthUser }) {
  const th = useTheme();
  const qc = useQueryClient();
  const bio = useBiometric();
  const [canBio, setCanBio] = useState<{ available: boolean; face: boolean }>({ available: false, face: false });
  useEffect(() => { void biometricAvailable().then(setCanBio); }, []);

  const hasPassword = user.hasPassword !== false;
  const hasGoogle = !!user.googleId;
  const owner = isOwner(user.role);
  const checks = [
    { label: t('Email verify hai'), done: !!user.emailVerified },
    { label: t('Password laga hai'), done: hasPassword },
    { label: t('Google se login jura hai'), done: hasGoogle },
  ];
  const score = checks.filter((c) => c.done).length;

  const disconnect = useMutation({
    mutationFn: profileApi.disconnectGoogle,
    onSuccess: () => { toast.success(t('Google login hata diya')); void qc.invalidateQueries({ queryKey: ['auth-me'] }); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Google nahi hata'))),
  });

  return (
    <View style={{ gap: th.space(4) }}>
      <Card title={t('Hifazat ka haal')} description={t('{{score}} / {{count}} mukammal', { score, count: checks.length })}>
        <ProgressBar value={score / checks.length} tone={score === checks.length ? 'success' : score >= checks.length / 2 ? 'warning' : 'danger'} />
        <View style={{ gap: th.space(2), marginTop: th.space(3) }}>
          {checks.map((c) => (
            <Row key={c.label} gap={2}>
              <Icon icon={c.done ? Check : Circle} size={16} tone={c.done ? 'success' : 'subtle'} />
              <Text size="sm" tone={c.done ? 'default' : 'muted'}>{c.label}</Text>
            </Row>
          ))}
        </View>
      </Card>

      <ListGroup>
        <ListRow icon={Lock} title={t('Password')}
          subtitle={hasPassword ? t('Kam se kam 8 huroof. Kisi ko na batayein.') : t('Abhi sirf Google se login hota hai. Password bana lein taake dono chalein.')}
          trailing={<Text size="sm" tone="brand" weight="semibold">{hasPassword ? t('Badlein') : t('Password banayein')}</Text>}
          chevron onPress={() => router.push('/change-password' as never)} />
        <ListRow icon={Mail} title={t('Email')}
          subtitle={user.emailVerified ? user.email : t('{{email}} abhi verify nahi', { email: user.email })}
          trailing={user.emailVerified ? <Badge tone="success">{t('Verified')}</Badge> : <Badge tone="warning">{t('Baqi')}</Badge>}
          chevron={!user.emailVerified} onPress={user.emailVerified ? undefined : () => router.push('/verify-email' as never)} />
        <ListRow icon={Sparkles} title={t('Google se login')}
          subtitle={hasGoogle ? t('Google account jura hai — ek click me login.') : t('Google account jor lein to password ke baghair bhi login ho sakta hai.')}
          trailing={hasGoogle ? (
            <Button size="sm" variant="critical" icon={Unlink} disabled={!hasPassword} loading={disconnect.isPending} onPress={() => disconnect.mutate()}>{t('Hatayein')}</Button>
          ) : undefined} />
        {owner && (
          <ListRow icon={KeyRound} title={t('Malik ka PIN')} subtitle={t('PIN lagayein taake counter par cost aur profit chhupa rahe.')} chevron onPress={() => router.push('/settings/security' as never)} />
        )}
        {canBio.available && (
          <ListRow icon={Fingerprint} title={canBio.face ? t('Face ID se kholein') : t('Fingerprint se kholein')}
            subtitle={t('App kholne se pehle tasdeeq maangi jayegi')}
            trailing={<Switch value={bio.enabled} onChange={(v) => void bio.setEnabled(v)} />} />
        )}
      </ListGroup>
    </View>
  );
}

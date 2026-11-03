/** Personal details (name, phone, photo) and the account facts. */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, ImagePlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import type { AuthUser } from '@/core/auth/types';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { Avatar, Button, Card, DetailRow, Input, Row, Sheet, StatusPill, Text, toast, useTheme } from '@/design';
import { cleanPakistanPhone, isValidPakistanPhone } from '@/modules/auth/lib/phone';
import { profileApi } from '../api/profile';
import { ROLE, day } from '../lib/meta';
import { pickAndUpload } from '../lib/upload';

export function ProfileTab({ user, tenantName }: { user: AuthUser; tenantName?: string }) {
  const th = useTheme();
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.updateUser);
  const [fullName, setFullName] = useState(user.fullName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(user.fullName ?? ''); setPhone(user.phone ?? ''); setAvatarUrl(user.avatarUrl ?? null);
  }, [user.fullName, user.phone, user.avatarUrl]);

  const phoneError = phone.trim() && !isValidPakistanPhone(cleanPakistanPhone(phone)) ? t('Phone number sahi nahi') : undefined;
  const dirty = fullName.trim() !== (user.fullName ?? '') || phone.trim() !== (user.phone ?? '') || (avatarUrl ?? null) !== (user.avatarUrl ?? null);

  const save = useMutation({
    mutationFn: () => profileApi.updateProfile({ fullName: fullName.trim(), phone: phone.trim() ? cleanPakistanPhone(phone.trim()) : '', avatarUrl: avatarUrl ?? '' }),
    onSuccess: (data) => {
      toast.success(t('Profile save ho gaya'));
      if (data) setSession({ fullName: data.fullName, phone: data.phone, avatarUrl: data.avatarUrl });
      void qc.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });

  const submit = () => {
    if (!fullName.trim()) return toast.error(t('Naam zaroori hai'));
    if (phoneError) return toast.error(phoneError);
    save.mutate();
  };

  const pick = async (source: 'camera' | 'gallery') => {
    setPhotoSheet(false);
    setBusy(true);
    try {
      const r = await pickAndUpload(source, 'avatar', { square: true });
      if (r) setAvatarUrl(r.url);
    } finally { setBusy(false); }
  };

  const role = ROLE[user.role] ?? ROLE.STAFF;
  return (
    <View style={{ gap: th.space(4) }}>
      <Card title={t('Aap ki details')} description={t('Ye naam bill, report aur team list me nazar aata hai')}>
        <View style={{ gap: th.space(4) }}>
          <Row gap={4}>
            <Avatar name={fullName || user.email} url={avatarUrl} size={72} />
            <View style={{ flex: 1, gap: th.space(2) }}>
              <Button size="sm" variant="secondary" icon={Camera} loading={busy} onPress={() => setPhotoSheet(true)}>{t('Tasveer badlein')}</Button>
              {avatarUrl ? <Button size="sm" variant="ghost" onPress={() => setAvatarUrl(null)}>{t('Hatayein')}</Button> : null}
            </View>
          </Row>
          <Input label={t('Poora naam')} value={fullName} onChangeText={setFullName} maxLength={80} autoCapitalize="words" />
          <Input label={t('Phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0300-1234567" error={phoneError} hint={t('Login aur khabar ke liye — kisi aur account par na ho')} />
          <Input label={t('Email')} value={user.email} disabled ltr hint={t('Email badalne ke liye support se rabta karein')} />
          <Button loading={save.isPending} disabled={!dirty} onPress={submit}>{t('Save karein')}</Button>
        </View>
      </Card>

      <Card title={t('Account')} flush>
        <DetailRow label={t('Role')} value={<StatusPill tone={role.tone}>{t(role.label)}</StatusPill>} />
        <DetailRow label={t('Karobar')} value={<Text size="sm" weight="semibold">{tenantName ?? '—'}</Text>} />
        <DetailRow label={t('Branch')} value={<Text size="sm" weight="semibold">{user.assignedShop?.name ?? t('Sab branches')}</Text>} />
        <DetailRow label={t('Kab se')} value={<Text size="sm" weight="semibold">{day((user as { createdAt?: string }).createdAt)}</Text>} last />
      </Card>

      <Sheet open={photoSheet} onClose={() => setPhotoSheet(false)} title={t('Tasveer badlein')}>
        <View style={{ gap: th.space(3) }}>
          <Button icon={Camera} onPress={() => void pick('camera')}>{t('Camera')}</Button>
          <Button variant="secondary" icon={ImagePlus} onPress={() => void pick('gallery')}>{t('Gallery')}</Button>
        </View>
      </Sheet>
    </View>
  );
}

/** Logo / banner: shows the current image, camera or gallery to replace it, remove to clear (web LogoUploader). */

import { createUploadsApi } from '@nafaa/api-client';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { apiClient } from '@/core/api/client';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { Button, Field, Icon, Text, toast, useTheme } from '@/design';

const uploads = createUploadsApi(apiClient);

export function LogoUploader({ value, onChange, purpose, label, hint, wide }: {
  value?: string | null; onChange: (url: string) => void; purpose: 'logo' | 'banner'; label: string; hint?: string; wide?: boolean;
}) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);

  const pick = async (camera: boolean) => {
    if (!online) { toast.warning(onlineNeededText('imageUpload')); return; }
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.warning(camera ? t('Camera ki ijazat chahiye') : t('Gallery ki ijazat chahiye')); return; }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: wide ? [3, 1] : [1, 1] };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setBusy(true);
    try {
      const rec = await uploads.single({ uri: a.uri, name: a.fileName || `${purpose}-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' }, { purpose: purpose === 'logo' ? 'shop-logo' : 'other' });
      onChange(rec.url);
      toast.success(t('{{label}} upload ho gaya', { label }));
    } catch {
      toast.error(t('Tasveer upload nahi hui'));
    } finally {
      setBusy(false);
    }
  };

  const box = { width: wide ? '100%' : 96, height: wide ? 96 : 96, borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted, borderWidth: 1, borderColor: th.colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } as const;
  return (
    <Field label={label} hint={hint}>
      <View style={{ gap: th.space(3), flexDirection: wide ? 'column' : 'row', alignItems: wide ? 'stretch' : 'center' }}>
        <View style={box}>
          {busy ? <ActivityIndicator /> : value ? <Image source={{ uri: value }} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : <Icon icon={ImagePlus} tone="subtle" size={28} />}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), flex: wide ? undefined : 1 }}>
          <Button size="sm" variant="secondary" icon={ImagePlus} disabled={busy} onPress={() => void pick(false)}>{t('Gallery')}</Button>
          <Button size="sm" variant="secondary" icon={Camera} disabled={busy} onPress={() => void pick(true)}>{t('Camera')}</Button>
          {!!value && <Button size="sm" variant="ghost" icon={Trash2} disabled={busy} onPress={() => onChange('')}>{t('Hatayein')}</Button>}
        </View>
        {!online && <Text size="xs" tone="muted">{onlineNeededText('imageUpload')}</Text>}
      </View>
    </Field>
  );
}

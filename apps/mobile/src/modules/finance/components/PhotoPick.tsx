/** One photo of a bill: camera or gallery, uploaded when there is internet. */

import { createUploadsApi } from '@nafaa/api-client';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { apiClient } from '@/core/api/client';
import { useOnlineStatus } from '@/core/net';
import { t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import { Field, Icon, PressableScale, Text, toast, useTheme } from '@/design';

const uploads = createUploadsApi(apiClient);

export function PhotoPick({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);

  const pick = async (camera: boolean) => {
    if (!online) { toast.warning(onlineNeededText('imageUpload')); return; }
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.warning(camera ? t('Camera ki ijazat chahiye') : t('Gallery ki ijazat chahiye')); return; }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setBusy(true);
    try {
      const rec = await uploads.single({ uri: a.uri, name: a.fileName || `bill-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' }, { purpose: 'document' });
      onChange(rec.url);
    } catch {
      toast.error(t('Tasveer upload nahi hui'));
    } finally {
      setBusy(false);
    }
  };

  const box = { width: 84, height: 84, borderRadius: th.radius('lg') };
  return (
    <Field label={label} hint={online ? undefined : onlineNeededText('imageUpload')}>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        {value ? (
          <View>
            <Image source={{ uri: value }} style={[box, { backgroundColor: th.colors.surfaceMuted }]} contentFit="cover" />
            <PressableScale onPress={() => onChange('')} accessibilityLabel={t('Hatayein')} hitSlop={8}
              style={{ position: 'absolute', top: 4, end: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: th.colors.overlay, alignItems: 'center', justifyContent: 'center' }}>
              <Icon icon={X} size={14} color={th.colors.neutral.onSolid} />
            </PressableScale>
          </View>
        ) : busy ? (
          <View style={[box, { backgroundColor: th.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator /></View>
        ) : (
          <>
            <PressableScale onPress={() => void pick(true)} haptic="tap" accessibilityLabel={t('Camera')}
              style={[box, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: th.colors.brand.border, backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: online ? 1 : 0.5 }]}>
              <Icon icon={Camera} color={th.colors.brand.text} />
              <Text size="2xs" weight="semibold" tone="brand">{t('Camera')}</Text>
            </PressableScale>
            <PressableScale onPress={() => void pick(false)} haptic="tap" accessibilityLabel={t('Gallery')}
              style={[box, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: th.colors.borderStrong, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: online ? 1 : 0.5 }]}>
              <Icon icon={ImagePlus} tone="muted" />
              <Text size="2xs" weight="semibold" tone="muted">{t('Gallery')}</Text>
            </PressableScale>
          </>
        )}
      </View>
    </Field>
  );
}

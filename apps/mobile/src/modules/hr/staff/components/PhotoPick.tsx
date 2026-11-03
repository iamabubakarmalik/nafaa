/** One photo (profile picture or an ID card side): camera or gallery, uploaded on pick. Needs internet. */

import { createUploadsApi } from '@nafaa/api-client';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { apiClient } from '@/core/api/client';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { Icon, PressableScale, Text, alert, toast, useTheme } from '@/design';

const uploads = createUploadsApi(apiClient);

export function PhotoPick({ label, value, onChange, purpose = 'document', size = 88, round }: {
  label?: string; value: string; onChange: (url: string) => void; purpose?: 'avatar' | 'document'; size?: number; round?: boolean;
}) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const radius = round ? size / 2 : th.radius('lg');

  const pick = async (camera: boolean) => {
    if (!online) { toast.warning(onlineNeededText('imageUpload')); return; }
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      await alert({ title: camera ? t('Camera ki ijazat chahiye') : t('Gallery ki ijazat chahiye'), message: t('Settings mein ja kar ijazat dein.') });
      if (!perm.canAskAgain) void Linking.openSettings();
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: purpose === 'avatar', aspect: [1, 1] };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets.length) return;
    const a = res.assets[0];
    setBusy(true);
    try {
      const rec = await uploads.single({ uri: a.uri, name: a.fileName || `staff-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' }, { purpose });
      onChange(rec.url);
    } catch {
      toast.error(t('Tasveer upload nahi hui'));
    } finally { setBusy(false); }
  };

  const box = { width: size, height: size, borderRadius: radius };
  return (
    <View style={{ gap: 6, alignItems: 'center' }}>
      {value ? (
        <View>
          <Image source={{ uri: value }} style={[box, { backgroundColor: th.colors.surfaceMuted }]} contentFit="cover" />
          <PressableScale onPress={() => onChange('')} accessibilityLabel={t('Hatayein')} hitSlop={8}
            style={{ position: 'absolute', top: 4, end: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: th.colors.overlay, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={X} size={14} color={th.colors.neutral.onSolid} />
          </PressableScale>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <PressableScale onPress={() => void pick(true)} accessibilityLabel={t('Photo khinchein')} haptic="tap"
            style={[box, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: th.colors.brand.border, backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: online ? 1 : 0.5 }]}>
            {busy ? <ActivityIndicator /> : <Icon icon={Camera} color={th.colors.brand.text} />}
            <Text size="2xs" weight="semibold" tone="brand">{t('Camera')}</Text>
          </PressableScale>
          <PressableScale onPress={() => void pick(false)} accessibilityLabel={t('Gallery se')} haptic="tap"
            style={[box, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: th.colors.borderStrong, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: online ? 1 : 0.5 }]}>
            <Icon icon={ImagePlus} tone="muted" />
            <Text size="2xs" weight="semibold" tone="muted">{t('Gallery')}</Text>
          </PressableScale>
        </View>
      )}
      {!!label && <Text size="xs" tone="muted">{label}</Text>}
    </View>
  );
}

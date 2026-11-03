/**
 * Product photos: take one with the camera or choose from the gallery, then
 * upload. The first photo is the main one (POS and online store); long-press
 * a photo to make it the main one, tap the cross to remove it. Uploading
 * needs internet; offline the field says so and keeps the saved photos.
 */

import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera, ImagePlus, Star, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, View } from 'react-native';
import { t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import { Field, Icon, PressableScale, Text, alert, toast, useTheme } from '@/design';
import { uploadsApi } from '../api/products';
import { useOnline } from '../lib/shared';

export interface ImageDraft { id?: string; url: string }

export function PhotoField({ value, onChange, max = 8, hint }: { value: ImageDraft[]; onChange: (v: ImageDraft[]) => void; max?: number; hint?: string }) {
  const th = useTheme();
  const online = useOnline();
  const [busy, setBusy] = useState(0);

  const upload = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setBusy(assets.length);
    const added: ImageDraft[] = [];
    for (const a of assets) {
      try {
        const rec = await uploadsApi.single({ uri: a.uri, name: a.fileName || `product-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' }, { purpose: 'product-image' });
        added.push({ url: rec.url });
      } catch {
        toast.error(t('Tasveer upload nahi hui'));
      }
      setBusy((n) => n - 1);
    }
    if (added.length) onChange([...value, ...added].slice(0, max));
  };

  const ask = async (fromCamera: boolean) => {
    if (!online) { toast.warning(onlineNeededText('imageUpload')); return; }
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      await alert({ title: fromCamera ? t('Camera ki ijazat chahiye') : t('Gallery ki ijazat chahiye'), message: t('Settings mein ja kar ijazat dein.') });
      if (!perm.canAskAgain) void Linking.openSettings();
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: fromCamera, aspect: [1, 1] };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: Math.max(1, max - value.length) });
    if (!res.canceled && res.assets.length) await upload(res.assets);
  };

  const tile = { width: 84, height: 84, borderRadius: th.radius('lg') };
  const full = value.length + busy >= max;
  return (
    <Field label={t('Tasveerein')} hint={online ? (hint ?? t('POS aur online store par yahi dikhegi')) : onlineNeededText('imageUpload')}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }}>
        {value.map((img, i) => (
          <PressableScale key={img.id ?? img.url} onLongPress={() => { if (i) onChange([img, ...value.filter((_, x) => x !== i)]); }}
            accessibilityLabel={t('Tasveer {{n}}', { n: i + 1 })}>
            <Image source={{ uri: img.url }} style={[tile, { backgroundColor: th.colors.surfaceMuted }]} contentFit="cover" />
            {i === 0 && (
              <View style={{ position: 'absolute', bottom: 4, start: 4, backgroundColor: th.colors.warning.solid, borderRadius: 6, padding: 2 }}>
                <Icon icon={Star} size={12} color={th.colors.warning.onSolid} />
              </View>
            )}
            <PressableScale onPress={() => onChange(value.filter((_, x) => x !== i))} accessibilityLabel={t('Hatayein')} hitSlop={8}
              style={{ position: 'absolute', top: 4, end: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: th.colors.overlay, alignItems: 'center', justifyContent: 'center' }}>
              <Icon icon={X} size={14} color={th.colors.neutral.onSolid} />
            </PressableScale>
          </PressableScale>
        ))}
        {Array.from({ length: busy }, (_, i) => (
          <View key={`b${i}`} style={[tile, { backgroundColor: th.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator /></View>
        ))}
        {!full && (
          <>
            <PressableScale onPress={() => void ask(true)} haptic="tap" accessibilityLabel={t('Photo khinchein')}
              style={[tile, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: th.colors.brand.border, backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: online ? 1 : 0.5 }]}>
              <Icon icon={Camera} color={th.colors.brand.text} />
              <Text size="2xs" weight="semibold" tone="brand">{t('Camera')}</Text>
            </PressableScale>
            <PressableScale onPress={() => void ask(false)} haptic="tap" accessibilityLabel={t('Gallery se')}
              style={[tile, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: th.colors.borderStrong, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: online ? 1 : 0.5 }]}>
              <Icon icon={ImagePlus} tone="muted" />
              <Text size="2xs" weight="semibold" tone="muted">{t('Gallery')}</Text>
            </PressableScale>
          </>
        )}
      </ScrollView>
    </Field>
  );
}

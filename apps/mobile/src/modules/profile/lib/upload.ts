/** Pick a photo (camera or gallery) and upload it. Needs internet. */

import { createUploadsApi, type UploadPurpose } from '@nafaa/api-client';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/core/api/client';
import { t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { toast } from '@/design';

const uploads = createUploadsApi(apiClient);

export interface PickedUpload { id: string; url: string; uri: string }

/** Returns the upload, or null when cancelled or it failed (the person is told why). */
export async function pickAndUpload(source: 'camera' | 'gallery', purpose: UploadPurpose, opts: { square?: boolean } = {}): Promise<PickedUpload | null> {
  if (!isOnline()) { toast.warning(onlineNeededText('imageUpload')); return null; }
  const camera = source === 'camera';
  const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { toast.warning(camera ? t('Camera ki ijazat chahiye') : t('Gallery ki ijazat chahiye')); return null; }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, ...(opts.square ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}) };
  const res = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  if (a.fileSize && a.fileSize > 10 * 1024 * 1024) { toast.error(t('File 10MB se bari nahi ho sakti')); return null; }
  try {
    const rec = await uploads.single({ uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' }, { purpose });
    return { id: rec.id, url: rec.url, uri: a.uri };
  } catch {
    toast.error(t('Tasveer upload nahi hui'));
    return null;
  }
}

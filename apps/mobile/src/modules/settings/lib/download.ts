/** Downloads a file from the API (with the signed-in token) and opens the share sheet. */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_URL } from '@/core/api/client';
import { SHOP_HEADER } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';

export async function downloadAndShare(path: string, fileName: string, mimeType: string, dialogTitle = fileName): Promise<{ bytes: number }> {
  const { accessToken, currentShopId } = useAuthStore.getState();
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  const res = await FileSystem.createDownloadResumable(`${API_URL}${path}`, uri, {
    headers: { Authorization: `Bearer ${accessToken ?? ''}`, ...(currentShopId ? { [SHOP_HEADER]: currentShopId } : {}) },
  }).downloadAsync();
  if (!res || res.status >= 400) throw new Error('download failed');
  const info = await FileSystem.getInfoAsync(res.uri);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri, { mimeType, dialogTitle });
  return { bytes: info.exists ? info.size : 0 };
}

/** Writes text (JSON, CSV) to a file and opens the share sheet. */
export async function shareText(fileName: string, text: string, mimeType: string) {
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType, dialogTitle: fileName });
}

import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/api/client';

export interface UploadedImageResult {
  url: string;
  uploadId?: string;
  thumbnail?: string | null;
}

function guessMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

function extractUploadRecords(payload: any): UploadedImageResult[] {
  const body = payload?.data ?? payload;

  const candidates = [
    body,
    body?.data,
    body?.item,
    body?.file,
    body?.record,
    body?.upload,
  ];

  const listCandidates = [
    ...(Array.isArray(body) ? [body] : []),
    ...(Array.isArray(body?.items) ? [body.items] : []),
    ...(Array.isArray(body?.files) ? [body.files] : []),
    ...(Array.isArray(body?.records) ? [body.records] : []),
    ...(Array.isArray(body?.data) ? [body.data] : []),
  ];

  const normalizedOne = (obj: any): UploadedImageResult | null => {
    if (!obj) return null;
    const url = obj.url || obj.fileUrl || obj.location || obj.secure_url;
    if (!url) return null;
    return {
      url,
      uploadId: obj.uploadId || obj.id || obj.fileId,
      thumbnail: obj.thumbnail || obj.thumbUrl || null,
    };
  };

  for (const c of candidates) {
    const one = normalizedOne(c);
    if (one) return [one];
  }

  for (const arr of listCandidates) {
    const items = arr
      .map(normalizedOne)
      .filter(Boolean) as UploadedImageResult[];
    if (items.length > 0) return items;
  }

  return [];
}

async function uploadSingle(uri: string): Promise<UploadedImageResult> {
  const fileName = uri.split('/').pop() || `product-${Date.now()}.jpg`;
  const mimeType = guessMimeType(uri);

  const form = new FormData();
  form.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as any);
  form.append('purpose', 'product-image');

  const res = await apiClient.post('/uploads', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const files = extractUploadRecords(res?.data);
  if (!files.length) {
    throw new Error('Upload response mein image URL nahi mili');
  }

  return files[0];
}

export async function pickAndUploadProductImages(
  maxSelection = 5,
): Promise<UploadedImageResult[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Gallery permission required');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: true,
    selectionLimit: maxSelection,
  });

  if (result.canceled) return [];

  const assets = result.assets || [];
  const uploaded: UploadedImageResult[] = [];

  for (const asset of assets) {
    if (!asset.uri) continue;
    const one = await uploadSingle(asset.uri);
    uploaded.push(one);
  }

  return uploaded;
}

'use client';
/**
 * Prescription photos per shop, kept in sessionStorage between the cart and
 * checkout. Upload: presigned URL from the bridge (marketplace/storage), then
 * a direct PUT to storage; the public URL goes in place-order attachments.
 */
import { m } from '@/lib/client';
import type { Upload } from '@/lib/types';

const KEY = 'nm-rx';

export function readRx(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveRx(shopId: string, url: string | null) {
  const all = readRx();
  if (url) all[shopId] = url;
  else delete all[shopId];
  try {
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage blocked: the photo must be added again at checkout.
  }
}

export async function uploadPrescription(file: File): Promise<string> {
  const up = await m<Upload>('upload/presign', { body: { fileName: file.name, contentType: file.type || 'image/jpeg', fileSize: file.size } });
  if (up.uploadUrl) {
    const res = await fetch(up.uploadUrl, { method: 'PUT', headers: up.headers, body: file });
    if (!res.ok) throw new Error('upload');
  }
  return up.publicUrl;
}

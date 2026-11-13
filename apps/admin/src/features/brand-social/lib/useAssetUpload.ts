/**
 * Uploads images and videos to the Nafaa Social media library through the
 * API (assets/upload), one progress row per file. Several files upload at
 * the same time.
 */

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { brandSocialApi, type SocialAsset } from '@/api/admin-brand-social.api';
import { apiError } from '@/lib/errors';

export const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm';
const IMAGE_MAX = 15 * 1024 * 1024;
const VIDEO_MAX = 200 * 1024 * 1024;

export interface UploadItem {
  id: string;
  name: string;
  preview: string;
  kind: 'image' | 'video';
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  asset?: SocialAsset;
}

export function useAssetUpload(opts: { folder?: string | null; onUploaded?: (assets: SocialAsset[]) => void } = {}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const busy = items.some((i) => i.status === 'uploading');
  const patch = (id: string, p: Partial<UploadItem>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const upload = useCallback(async (files: File[] | FileList) => {
    const done: SocialAsset[] = [];
    await Promise.all(Array.from(files).map(async (file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const preview = URL.createObjectURL(file);
      const kind = file.type.startsWith('video/') ? 'video' : 'image';
      const base: UploadItem = { id, name: file.name, preview, kind, progress: 0, status: 'uploading' };
      if (!ACCEPT.split(',').includes(file.type)) {
        setItems((prev) => [...prev, { ...base, status: 'error', error: 'Use JPG, PNG, WebP, GIF, MP4, MOV or WebM.' }]);
        return;
      }
      if (file.size > (kind === 'video' ? VIDEO_MAX : IMAGE_MAX)) {
        setItems((prev) => [...prev, { ...base, status: 'error', error: `Too big. Up to ${kind === 'video' ? 200 : 15} MB.` }]);
        return;
      }
      setItems((prev) => [...prev, base]);
      try {
        const asset = await brandSocialApi.uploadAsset(file, { title: file.name.replace(/\.[^.]+$/, ''), folder: optsRef.current.folder }, (p) => patch(id, { progress: Math.min(96, p) }));
        done.push(asset);
        patch(id, { status: 'done', progress: 100, asset });
      } catch (e) {
        patch(id, { status: 'error', error: apiError(e, 'Upload failed.') });
      }
    }));
    if (done.length) {
      toast.success(`${done.length} file${done.length === 1 ? '' : 's'} added to the library`);
      optsRef.current.onUploaded?.(done);
    }
  }, []);

  const dismiss = (id: string) => setItems((prev) => {
    const it = prev.find((i) => i.id === id);
    if (it) URL.revokeObjectURL(it.preview);
    return prev.filter((i) => i.id !== id);
  });
  const clearDone = () => setItems((prev) => prev.filter((i) => i.status !== 'done'));

  return { items, busy, upload, dismiss, clearDone };
}

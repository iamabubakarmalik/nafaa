import { useState, useCallback } from 'react';
import { uploadsApi } from '@/api/uploads.api';
import type { UploadPurpose, UploadRecord } from '@/api/uploads.api';
import { toast } from 'sonner';

export interface UploadingItem {
  id: string;
  name: string;
  size: number;
  preview: string;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: UploadRecord;
}

interface UseImageUploadOptions {
  purpose?: UploadPurpose;
  maxSizeMB?: number;
  maxFiles?: number;
  onUploaded?: (records: UploadRecord[]) => void;
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function useImageUpload(opts: UseImageUploadOptions = {}) {
  const { purpose = 'product-image', maxSizeMB = 10, maxFiles = 10, onUploaded } = opts;
  const [items, setItems] = useState<UploadingItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const validate = useCallback(
    (file: File): string | null => {
      if (!ALLOWED.includes(file.type)) return 'Only JPG, PNG, WebP, GIF allowed';
      if (file.size > maxSizeMB * 1024 * 1024) return `Max size is ${maxSizeMB} MB`;
      return null;
    },
    [maxSizeMB],
  );

  const upload = useCallback(
    async (files: File[]) => {
      const remaining = maxFiles - items.filter((i) => i.status === 'done').length;
      if (remaining <= 0) {
        toast.error(`Maximum ${maxFiles} files reached`);
        return;
      }

      const accepted: { item: UploadingItem; file: File }[] = [];

      for (const file of files.slice(0, remaining)) {
        const err = validate(file);
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const preview = URL.createObjectURL(file);

        const item: UploadingItem = {
          id,
          name: file.name,
          size: file.size,
          preview,
          progress: 0,
          status: err ? 'error' : 'queued',
          error: err ?? undefined,
        };

        if (!err) accepted.push({ item, file });
        setItems((prev) => [...prev, item]);
      }

      if (!accepted.length) return;

      setUploading(true);
      const successful: UploadRecord[] = [];

      for (const { item, file } of accepted) {
        try {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i)),
          );

          const result = await uploadsApi.single(
            { file, name: file.name, type: file.type },
            {
              purpose,
              onProgress: ({ percent }) => {
                setItems((prev) =>
                  prev.map((i) => (i.id === item.id ? { ...i, progress: percent } : i)),
                );
              },
            },
          );

          successful.push(result);
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, status: 'done', progress: 100, result } : i,
            ),
          );
        } catch (e: any) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: 'error',
                    error: e?.response?.data?.message || e.message || 'Upload failed',
                  }
                : i,
            ),
          );
        }
      }

      setUploading(false);
      if (successful.length && onUploaded) onUploaded(successful);
      if (successful.length) {
        toast.success(`${successful.length} image${successful.length > 1 ? 's' : ''} uploaded`);
      }
    },
    [items, maxFiles, onUploaded, purpose, validate],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    items.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    setItems([]);
  }, [items]);

  return { items, uploading, upload, remove, clear };
}

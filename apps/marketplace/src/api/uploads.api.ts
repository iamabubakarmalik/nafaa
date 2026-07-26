import { marketplaceClient } from './client';

export type UploadPurpose = 'avatar' | 'product-image' | 'product-video' | 'shop-logo' | 'shop-cover' | 'review-photo' | 'chat-attachment';

export interface UploadRecord {
  id: string;
  url: string;
  thumbnail?: string | null;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

export const uploadsApi = {
  /**
   * Single file upload with progress
   */
  single: async (
    file: File,
    purpose: UploadPurpose,
    onProgress?: (pct: number) => void,
  ): Promise<UploadRecord> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);

    const res = await marketplaceClient.post('/uploads/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total && onProgress) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });

    return res.data?.data ?? res.data;
  },

  /**
   * Multiple files upload
   */
  multiple: async (
    files: File[],
    purpose: UploadPurpose,
    onProgress?: (pct: number) => void,
  ): Promise<UploadRecord[]> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('purpose', purpose);

    const res = await marketplaceClient.post('/uploads/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total && onProgress) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });

    return res.data?.data ?? res.data;
  },
};

export interface UploadRecord {
  id: string;
  tenantId?: string | null;
  uploaderId?: string | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  purpose?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type UploadPurpose =
  | 'product-image'
  | 'product-gallery'
  | 'brand-logo'
  | 'category-icon'
  | 'shop-logo'
  | 'payment-proof'
  | 'avatar'
  | 'receipt'
  | 'document'
  | 'other';

export interface UploadOptions {
  purpose?: UploadPurpose;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

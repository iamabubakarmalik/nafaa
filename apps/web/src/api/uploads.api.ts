import { createUploadsApi } from '@nafaa/api-client';
import { apiClient } from './client';

export const uploadsApi = createUploadsApi(apiClient);

export type {
  UploadRecord,
  UploadProgress,
  UploadPurpose,
  UploadOptions,
} from '@nafaa/api-client';

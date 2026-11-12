/**
 * Image uploads for the website editors. Uses the shared upload service, so
 * files land in the same storage as product photos and shop logos.
 */

import { uploadsApi } from '@modules/organization/settings/api/uploads.api';

export async function uploadImage(file: File): Promise<string> {
  const rec = await uploadsApi.single({ file, name: file.name, type: file.type }, { purpose: 'other' });
  if (!rec?.url) throw new Error('upload');
  return rec.url;
}

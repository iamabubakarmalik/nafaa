/**
 * Media library calls (API-CONTRACT 8.4).
 */
import type { AdminMedia, CmsMediaKind, MediaUsage, Paginated, PatchMediaBody } from '../contract/cms-contract';
import { CMS_BASE, cleanParams, cmsHttp, unwrap } from '../dashboard/shared/cms-http';

export interface MediaListParams {
  kind?: CmsMediaKind | '';
  tag?: string;
  q?: string;
  unused?: boolean;
  page?: number;
  limit?: number;
}

export interface MediaUploadInput {
  file: File;
  alt: string;
  kind?: CmsMediaKind;
  caption?: string;
  credit?: string;
  sourceUrl?: string;
  tags?: string[];
  folder?: string;
}

export const mediaApi = {
  list: (params: MediaListParams) =>
    cmsHttp
      .get(`${CMS_BASE}/media`, { params: cleanParams({ ...params, unused: params.unused ? 'true' : undefined }) })
      .then((r) => unwrap<Paginated<AdminMedia>>(r)),

  upload: (input: MediaUploadInput, onProgress?: (pct: number) => void) => {
    const fd = new FormData();
    fd.append('file', input.file);
    fd.append('alt', input.alt.trim());
    if (input.kind) fd.append('kind', input.kind);
    if (input.caption?.trim()) fd.append('caption', input.caption.trim());
    if (input.credit?.trim()) fd.append('credit', input.credit.trim());
    if (input.sourceUrl?.trim()) fd.append('sourceUrl', input.sourceUrl.trim());
    if (input.tags?.length) fd.append('tags', input.tags.join(','));
    if (input.folder) fd.append('folder', input.folder);
    return cmsHttp
      .post(`${CMS_BASE}/media`, fd, {
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => unwrap<AdminMedia>(r));
  },

  update: (id: string, body: PatchMediaBody) => cmsHttp.patch(`${CMS_BASE}/media/${id}`, body).then((r) => unwrap<AdminMedia>(r)),

  replace: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return cmsHttp.post(`${CMS_BASE}/media/${id}/replace`, fd).then((r) => unwrap<AdminMedia>(r));
  },

  usage: (id: string) => cmsHttp.get(`${CMS_BASE}/media/${id}/usage`).then((r) => unwrap<MediaUsage>(r)),

  remove: (id: string) => cmsHttp.delete(`${CMS_BASE}/media/${id}`).then(() => undefined),
};

/** Splits "a, b,c" into clean tags (lowercase, no blanks). */
export function parseTags(text: string): string[] {
  return Array.from(new Set(text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)));
}

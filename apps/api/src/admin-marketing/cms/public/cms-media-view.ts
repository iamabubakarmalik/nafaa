/**
 * CmsMedia rows as `PublicMedia` / `AdminMedia`, and the media ids a piece
 * of content references (so responses carry only media that is used).
 */
import type { CmsMedia } from '@prisma/client';
import {
  DEFAULT_LOCALE,
  MARKDOWN_MEDIA_REGEX,
  MEDIA_LINK_PATTERN,
  type AdminMedia,
  type PublicMedia,
} from '../contract/cms-contract';
import { isRecord } from './cms-http';

/** Keys whose string value is a CmsMedia id. */
export const MEDIA_ID_KEYS: ReadonlySet<string> = new Set([
  'mediaId', 'darkMediaId', 'logoMediaId', 'photoMediaId', 'staticMapMediaId', 'fileMediaId', 'imageId', 'ogImageId',
  'logoId', 'photoId', 'defaultOgMediaId',
]);

/** Selected columns for public media. */
export const PUBLIC_MEDIA_SELECT = {
  id: true, kind: true, publicId: true, url: true, width: true, height: true, alt: true, altTranslations: true,
  caption: true, credit: true, sourceUrl: true, blurDataUrl: true, dominantColor: true, focalX: true, focalY: true,
  mimeType: true, bytes: true,
} as const;

export type PublicMediaRow = Pick<CmsMedia, keyof typeof PUBLIC_MEDIA_SELECT>;

function altFor(row: Pick<CmsMedia, 'alt' | 'altTranslations'>, locale: string): string {
  if (locale !== DEFAULT_LOCALE && isRecord(row.altTranslations)) {
    const translated = row.altTranslations[locale];
    if (typeof translated === 'string' && translated.trim()) return translated;
  }
  return row.alt;
}

export function toPublicMedia(row: PublicMediaRow, locale: string = DEFAULT_LOCALE): PublicMedia {
  const media: PublicMedia = {
    id: row.id,
    kind: row.kind,
    publicId: row.publicId,
    url: row.url,
    width: row.width,
    height: row.height,
    alt: altFor(row, locale),
    mimeType: row.mimeType,
    bytes: row.bytes,
  };
  if (row.caption) media.caption = row.caption;
  if (row.credit) media.credit = row.credit;
  if (row.sourceUrl) media.sourceUrl = row.sourceUrl;
  if (row.blurDataUrl) media.blurDataUrl = row.blurDataUrl;
  if (row.dominantColor) media.dominantColor = row.dominantColor;
  if (row.focalX !== null) media.focalX = row.focalX;
  if (row.focalY !== null) media.focalY = row.focalY;
  return media;
}

export function toAdminMedia(row: CmsMedia): AdminMedia {
  return {
    ...toPublicMedia(row),
    tags: row.tags,
    folder: row.folder,
    checksum: row.checksum,
    createdAt: row.createdAt.toISOString(),
    altTranslations: isRecord(row.altTranslations) ? (row.altTranslations as Record<string, string>) : null,
    fileName: row.fileName,
  };
}

/** Every media id referenced in a value: id fields, `media:<id>` hrefs and Markdown images. */
export function collectMediaIds(value: unknown, into: Set<string> = new Set()): Set<string> {
  const visit = (v: unknown, key: string | null): void => {
    if (typeof v === 'string') {
      if (key !== null && MEDIA_ID_KEYS.has(key) && v) {
        into.add(v);
        return;
      }
      const whole = MEDIA_LINK_PATTERN.exec(v.trim());
      if (whole?.[1]) {
        into.add(whole[1]);
        return;
      }
      if (v.includes('media:')) {
        for (const m of v.matchAll(MARKDOWN_MEDIA_REGEX)) if (m[2]) into.add(m[2]);
      }
    } else if (Array.isArray(v)) {
      for (const item of v) visit(item, key);
    } else if (isRecord(v)) {
      for (const [k, child] of Object.entries(v)) visit(child, k);
    }
  };
  visit(value, null);
  return into;
}

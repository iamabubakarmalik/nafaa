/**
 * OG image rendering used by every `opengraph-image.tsx` route.
 *
 * A typed route only fetches its entry (S1's fetcher, which tags the request
 * `page:<locale>:<path>`, so the card revalidates with the page) and hands it
 * here:
 *
 *   // src/app/industries/[slug]/opengraph-image.tsx
 *   import { OG_SIZE, OG_CONTENT_TYPE, renderEntryOgImage } from '@/lib/og';
 *   export const size = OG_SIZE;
 *   export const contentType = OG_CONTENT_TYPE;
 *   export const alt = 'Nafaa';
 *   export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
 *     const { slug } = await params;
 *     return renderEntryOgImage(await getEntry(`/industries/${slug}`));
 *   }
 *
 * The root `opengraph-image.tsx` calls `renderOgCard()` with site-level text.
 * Routes keep the default Node runtime (the fonts are read from disk).
 */
import { ImageResponse } from 'next/og';
import {
  ENTRY_TYPE_META,
  isAllowedIcon,
  type CmsEntryType,
  type IconName,
  type PublicEntry,
  type PublicMedia,
} from '@/lib/cms/contract/cms-contract';
import { cloudinaryUrl, isTransformable } from '@/lib/media';
import { OgCard, OG_HEIGHT, OG_WIDTH, PHOTO_SIZE, SCREENSHOT_BOX, type OgCardModel } from './card';
import { loadOgFonts } from './fonts';

export const OG_SIZE = { width: OG_WIDTH, height: OG_HEIGHT } as const;
export const OG_CONTENT_TYPE = 'image/png';

/** Plain inputs for a card that is not tied to one entry (root, 404, hubs without an entry). */
export interface OgCardInput {
  eyebrow?: string | null;
  title: string;
  summary?: string | null;
  /** Absolute URL of the page; shown without the protocol. */
  url?: string | null;
  accent?: string | null;
  icon?: string | null;
  /** Framed on the right. Must be IMAGE or SCREENSHOT media. */
  screenshot?: { media: PublicMedia; addressBar?: string | null } | null;
  /** Round photo on the right (PERSON pages). */
  photo?: PublicMedia | null;
  /** Editor-chosen OG image: used full-bleed instead of the drawn card. */
  ogImage?: PublicMedia | null;
}

/** Eyebrow text per entry type. PAGE is resolved from its template below. */
const TYPE_EYEBROW: Record<CmsEntryType, string | null> = {
  PAGE: null,
  PRODUCT: 'Product',
  INDUSTRY: 'Industry',
  SOLUTION: 'Solution',
  SERVICE: 'Service',
  INTEGRATION: 'Integration',
  COMPLIANCE: 'Compliance',
  CITY: 'POS software by city',
  CITY_INDUSTRY: 'POS software by city',
  BEST_OF: 'Best of',
  COMPARE: 'Compare',
  ALTERNATIVE: 'Alternatives',
  BLOG_POST: 'Blog',
  BLOG_CATEGORY: 'Blog',
  GUIDE: 'Guide',
  GLOSSARY_TERM: 'Glossary',
  TOOL: 'Tool',
  TEMPLATE: 'Template',
  CASE_STUDY: 'Customer story',
  PERSON: 'Team',
  DOC: 'Developers',
  CHANGELOG: 'Changelog',
};

const IMAGE_FETCH_TIMEOUT_MS = 5000;
const IMAGE_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Fetches an image and returns it as a data URI, or null on any failure, so
 * the card falls back to the icon visual instead of erroring.
 */
async function fetchDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS), cache: 'force-cache' });
    if (!response.ok) return null;
    const type = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    if (type !== 'image/png' && type !== 'image/jpeg') return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > IMAGE_MAX_BYTES) return null;
    return `data:${type};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

function displayUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const text = `${parsed.host.replace(/^www\./, '')}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    return text.length > 52 ? `${text.slice(0, 51)}…` : text;
  } catch {
    return null;
  }
}

function usableImage(media: PublicMedia | null | undefined): media is PublicMedia {
  return Boolean(media && (media.kind === 'IMAGE' || media.kind === 'SCREENSHOT' || media.kind === 'ILLUSTRATION') && isTransformable(media));
}

async function buildModel(input: OgCardInput): Promise<OgCardModel> {
  const icon: IconName | null = input.icon && isAllowedIcon(input.icon) ? input.icon : null;
  const base = {
    eyebrow: input.eyebrow ?? null,
    title: input.title.trim() || 'Nafaa',
    summary: input.summary?.trim() || null,
    displayUrl: displayUrl(input.url),
    accent: input.accent ?? null,
    icon,
  };

  if (usableImage(input.ogImage)) {
    const dataUri = await fetchDataUri(
      cloudinaryUrl(input.ogImage, { width: OG_WIDTH, height: OG_HEIGHT, crop: 'fill', format: 'jpg', quality: 'auto:good' }),
    );
    if (dataUri) return { ...base, visual: { kind: 'fullBleed', dataUri } };
  }

  if (input.screenshot && usableImage(input.screenshot.media)) {
    const dataUri = await fetchDataUri(
      cloudinaryUrl(input.screenshot.media, {
        width: SCREENSHOT_BOX.width + 40,
        height: SCREENSHOT_BOX.imageHeight,
        crop: 'fill',
        gravity: 'north_west',
        format: 'jpg',
        quality: 'auto:good',
      }),
    );
    if (dataUri) return { ...base, visual: { kind: 'screenshot', dataUri, addressBar: input.screenshot.addressBar ?? null } };
  }

  if (input.photo && isTransformable(input.photo)) {
    const dataUri = await fetchDataUri(
      cloudinaryUrl(input.photo, { width: PHOTO_SIZE, height: PHOTO_SIZE, crop: 'fill', format: 'jpg', quality: 'auto:good' }),
    );
    if (dataUri) return { ...base, visual: { kind: 'photo', dataUri } };
  }

  return { ...base, visual: { kind: 'icon' } };
}

/** Renders a card from plain inputs. */
export async function renderOgCard(input: OgCardInput): Promise<ImageResponse> {
  const [model, fonts] = await Promise.all([buildModel(input), loadOgFonts()]);
  return new ImageResponse(<OgCard model={model} />, { ...OG_SIZE, fonts });
}

// ─── Entry mapping ──────────────────────────────────────────────────────────

/** Reads a string field from entry `data` without narrowing the whole union. */
function dataString(entry: PublicEntry, key: string): string | null {
  const value = (entry.data as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function pageEyebrow(entry: PublicEntry): string | null {
  const template = dataString(entry, 'template');
  if (template === 'pricing') return 'Pricing';
  if (template === 'contact') return 'Contact';
  if (template === 'legal') return 'Legal';
  const hubOf = dataString(entry, 'hubOf');
  if (hubOf && hubOf in ENTRY_TYPE_META) return ENTRY_TYPE_META[hubOf as CmsEntryType].labelPlural;
  return null;
}

/**
 * The hero screenshot, else the first screenshot block. Address-bar text comes
 * from the block, as the editor wrote it for the on-page frame.
 */
function entryScreenshot(entry: PublicEntry): OgCardInput['screenshot'] {
  for (const block of entry.blocks) {
    if (block.type === 'hero' && block.media?.kind === 'screenshot') {
      const media = entry.media[block.media.mediaId];
      if (media) return { media, addressBar: block.media.url ?? null };
    }
    if (block.type === 'screenshot') {
      const media = entry.media[block.mediaId];
      if (media) return { media, addressBar: block.url ?? null };
    }
  }
  return null;
}

/** Card inputs for a published (or previewed) entry. */
export function ogInputFromEntry(entry: PublicEntry): OgCardInput {
  const isPerson = entry.type === 'PERSON';
  const photoId = isPerson ? dataString(entry, 'photoMediaId') : null;
  return {
    eyebrow: entry.type === 'PAGE' ? pageEyebrow(entry) : TYPE_EYEBROW[entry.type],
    title: entry.title,
    summary: entry.summary,
    url: entry.url,
    accent: dataString(entry, 'color'),
    icon: dataString(entry, 'icon'),
    screenshot: isPerson ? null : entryScreenshot(entry),
    photo: photoId ? (entry.media[photoId] ?? entry.image) : isPerson ? entry.image : null,
    ogImage: entry.seo.ogImage,
  };
}

/** Text for the `og:image:alt` of an entry card. */
export function ogAltFromEntry(entry: PublicEntry): string {
  if (entry.seo.ogImage) return entry.seo.ogImage.alt;
  const eyebrow = entry.type === 'PAGE' ? pageEyebrow(entry) : TYPE_EYEBROW[entry.type];
  return eyebrow ? `${eyebrow}: ${entry.title} | Nafaa` : `${entry.title} | Nafaa`;
}

/**
 * Renders the card for an entry. When the entry is missing (unpublished
 * between build and request), it renders the fallback card instead of failing.
 */
export function renderEntryOgImage(entry: PublicEntry | null, fallback: OgCardInput = { title: 'Nafaa' }): Promise<ImageResponse> {
  return renderOgCard(entry ? ogInputFromEntry(entry) : fallback);
}

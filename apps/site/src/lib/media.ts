/**
 * Image delivery for CMS media (ARCH 4.7).
 *
 * Every CMS image is served by Cloudinary, never by Next's own optimiser:
 * - `cloudinaryUrl()` builds a delivery URL (`f_auto,q_auto,c_limit,w_<w>` by
 *   default), so each browser gets AVIF or WebP from the `Accept` header.
 * - `<CmsImage>` is a server component. It calls `getImageProps()` with a
 *   Cloudinary loader and renders a plain `<img>` with `srcset`, so it ships no
 *   client JavaScript. `sizes` is required, the blur placeholder comes from the
 *   database, and `priority` adds a preload hint for the LCP image.
 * - `ogImageUrl()` and `stableImageUrl()` give fixed-format URLs for social
 *   cards, JSON-LD and feeds, where content negotiation is not reliable.
 *
 * The cloud name comes from `CLOUDINARY_CLOUD_NAME`, falling back to the cloud
 * in `media.url`, so a missing env var never breaks rendering. Media that is not
 * on Cloudinary, SVG and non-image kinds are served as stored, untransformed.
 *
 * This file stays free of JSX so it can keep the `.ts` name ARCH gives it.
 */
import { createElement, type ReactElement } from 'react';
import { preload } from 'react-dom';
import { getImageProps, type ImageLoaderProps } from 'next/image';
import type { CmsMediaKind, PublicMedia } from '@/lib/cms/contract/cms-contract';

/** The fields of `PublicMedia` that delivery needs. */
export type DeliverableMedia = Pick<PublicMedia, 'publicId' | 'url' | 'mimeType' | 'kind'> &
  Partial<Pick<PublicMedia, 'width' | 'height' | 'focalX' | 'focalY'>>;

export type CloudinaryCrop = 'limit' | 'fill' | 'fit' | 'pad' | 'scale';
export type CloudinaryFormat = 'auto' | 'jpg' | 'png' | 'webp' | 'avif';
export type CloudinaryQuality = 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number;

export interface CloudinaryTransform {
  /** Output width in CSS pixels times DPR (the loader passes the srcset width). */
  width?: number;
  /** Output height. Only used with `fill`, `fit` or `pad`. */
  height?: number;
  /** Crop to this aspect ratio before scaling, centred on the focal point. */
  aspectRatio?: AspectRatio;
  crop?: CloudinaryCrop;
  format?: CloudinaryFormat;
  quality?: CloudinaryQuality;
  /** Background for `pad`, as a Cloudinary color (`white`, `rgb:f8fafc`). */
  background?: string;
  /** Gravity for `fill` without `aspectRatio`; defaults to the focal point, else `auto`. */
  gravity?: 'auto' | 'north_west' | 'north' | 'center';
}

/** `16:9` style string or a plain number (width / height). */
export type AspectRatio = `${number}:${number}` | number;

const CLOUDINARY_HOST = 'res.cloudinary.com';
const CLOUDINARY_URL_PATTERN = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\//;
const CLOUD_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Image MIME types Cloudinary can transform without changing what they show. */
const TRANSFORMABLE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/heic', 'image/heif', 'image/tiff']);
const IMAGE_KINDS: ReadonlySet<CmsMediaKind> = new Set(['IMAGE', 'SCREENSHOT', 'LOGO', 'ILLUSTRATION']);

/**
 * Default quality by kind. Screenshots are mostly text and flat color, which
 * `q_auto` at its default setting blurs at small widths.
 */
const DEFAULT_QUALITY: Record<CmsMediaKind, CloudinaryQuality> = {
  IMAGE: 'auto',
  SCREENSHOT: 'auto:good',
  LOGO: 'auto:good',
  ILLUSTRATION: 'auto:good',
  VIDEO: 'auto',
  DOCUMENT: 'auto',
};

/** Width used when a row has no stored dimensions (should not happen after upload). */
const FALLBACK_SIZE = { width: 1600, height: 900 } as const;

// ─── URL building ───────────────────────────────────────────────────────────

/** Cloud name and resource type from a Cloudinary delivery URL, or null. */
export function parseCloudinaryUrl(url: string): { cloudName: string; resourceType: string } | null {
  const match = CLOUDINARY_URL_PATTERN.exec(url);
  if (!match || !match[1] || !match[2]) return null;
  return { cloudName: match[1], resourceType: match[2] };
}

function resolveCloudName(media: Pick<PublicMedia, 'url'>): string | null {
  const fromEnv = process.env.CLOUDINARY_CLOUD_NAME;
  if (fromEnv && CLOUD_NAME_PATTERN.test(fromEnv)) return fromEnv;
  return parseCloudinaryUrl(media.url)?.cloudName ?? null;
}

/** True when the media can go through Cloudinary transformations. */
export function isTransformable(media: Pick<PublicMedia, 'url' | 'mimeType' | 'kind' | 'publicId'>): boolean {
  if (!IMAGE_KINDS.has(media.kind)) return false;
  if (!TRANSFORMABLE_MIME.has(media.mimeType.toLowerCase())) return false;
  if (!media.publicId) return false;
  const parsed = parseCloudinaryUrl(media.url);
  // A row whose stored URL is on another host was imported from elsewhere.
  if (!parsed && media.url.startsWith('http') && !media.url.includes(CLOUDINARY_HOST)) return false;
  if (parsed && parsed.resourceType !== 'image') return false;
  return resolveCloudName(media) !== null;
}

function ratioParts(ratio: AspectRatio): [number, number] {
  if (typeof ratio === 'number') return [Math.round(ratio * 1000), 1000];
  const [w, h] = ratio.split(':').map(Number);
  return [w && w > 0 ? w : 1, h && h > 0 ? h : 1];
}

function ratioValue(ratio: AspectRatio): number {
  const [w, h] = ratioParts(ratio);
  return w / h;
}

function encodePublicId(publicId: string): string {
  return publicId
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function qualityParam(quality: CloudinaryQuality): string {
  if (typeof quality === 'number') return `q_${Math.min(100, Math.max(1, Math.round(quality)))}`;
  return `q_${quality}`;
}

/**
 * Crop component for an aspect ratio, applied at the original resolution
 * before scaling. With a focal point it centres on it in original-image
 * pixels (`g_xy_center`); otherwise Cloudinary picks the subject (`g_auto`).
 */
function aspectCropComponent(media: DeliverableMedia, ratio: AspectRatio): string {
  const [w, h] = ratioParts(ratio);
  return `c_fill,ar_${w}:${h},${fillGravity(media, undefined)}`;
}

function fillGravity(media: DeliverableMedia, gravity: CloudinaryTransform['gravity']): string {
  if (gravity) return `g_${gravity}`;
  if (typeof media.focalX === 'number' && typeof media.focalY === 'number' && media.width && media.height) {
    return `g_xy_center,x_${Math.round(clamp01(media.focalX) * media.width)},y_${Math.round(clamp01(media.focalY) * media.height)}`;
  }
  return 'g_auto';
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Delivery URL for one rendition. Returns the stored URL unchanged when the
 * media cannot be transformed.
 */
export function cloudinaryUrl(media: DeliverableMedia, transform: CloudinaryTransform = {}): string {
  if (!isTransformable(media)) return media.url;
  const cloudName = resolveCloudName(media) as string;

  const components: string[] = [];
  if (transform.aspectRatio !== undefined) components.push(aspectCropComponent(media, transform.aspectRatio));

  const crop = transform.crop ?? 'limit';
  const main = [
    `f_${transform.format ?? 'auto'}`,
    qualityParam(transform.quality ?? DEFAULT_QUALITY[media.kind]),
    `c_${crop}`,
  ];
  if (transform.width) main.push(`w_${Math.round(transform.width)}`);
  if (transform.height && crop !== 'limit' && crop !== 'scale') main.push(`h_${Math.round(transform.height)}`);
  if (crop === 'fill' && transform.aspectRatio === undefined) main.push(fillGravity(media, transform.gravity));
  if (crop === 'pad') main.push(`b_${transform.background ?? 'white'}`);
  components.push(main.join(','));

  return `https://${CLOUDINARY_HOST}/${cloudName}/image/upload/${components.join('/')}/${encodePublicId(media.publicId)}`;
}

/**
 * A `next/image` loader bound to one media row. `src` and Next's `quality`
 * are ignored: the row carries the public id and quality is set per kind
 * (Cloudinary `q_auto` variants, not a fixed number). Next calls this once per
 * srcset width.
 */
export function cloudinaryLoader(media: DeliverableMedia, options: { aspectRatio?: AspectRatio; quality?: CloudinaryQuality } = {}) {
  return ({ width }: ImageLoaderProps): string =>
    cloudinaryUrl(media, { width, aspectRatio: options.aspectRatio, quality: options.quality });
}

/** 1200x630 JPEG for `og:image` when an entry has its own OG image. */
export function ogImageUrl(media: DeliverableMedia): string {
  return cloudinaryUrl(media, { width: 1200, height: 630, crop: 'fill', format: 'jpg', quality: 'auto:good' });
}

/**
 * Fixed-format URL for JSON-LD `image`, sitemaps, RSS and llms files: crawlers
 * and feed readers do not all negotiate AVIF.
 */
export function stableImageUrl(media: DeliverableMedia, width = 1600): string {
  const format: CloudinaryFormat = media.mimeType === 'image/png' && media.kind !== 'SCREENSHOT' ? 'png' : 'jpg';
  return cloudinaryUrl(media, { width, format });
}

/** Looks up a media id in a response's media dictionary. */
export function mediaById(dictionary: Record<string, PublicMedia> | undefined, id: string | null | undefined): PublicMedia | null {
  if (!dictionary || !id) return null;
  return dictionary[id] ?? null;
}

// ─── <CmsImage> ─────────────────────────────────────────────────────────────

export interface CmsImageProps {
  media: PublicMedia;
  /**
   * The `sizes` attribute, required so the browser picks the right srcset
   * width (for example `(min-width: 1024px) 560px, 100vw`).
   */
  sizes: string;
  /** Overrides the library alt. Pass `""` only for purely decorative images. */
  alt?: string;
  /** LCP image: eager load, `fetchpriority="high"` and a preload hint. */
  priority?: boolean;
  /** Crop to this ratio around the focal point (`16:9`, `4:3`, `1:1`). */
  aspectRatio?: AspectRatio;
  /** Cap the intrinsic width (and so the largest srcset entry). */
  maxWidth?: number;
  className?: string;
  /** Cloudinary quality; defaults by media kind. */
  quality?: CloudinaryQuality;
  /** Set false to skip the blur placeholder (for example on transparent logos). */
  placeholder?: boolean;
}

/** Intrinsic size after an optional crop and width cap. */
function intrinsicSize(media: PublicMedia, aspectRatio?: AspectRatio, maxWidth?: number): { width: number; height: number } {
  let width = media.width ?? FALLBACK_SIZE.width;
  let height = media.height ?? FALLBACK_SIZE.height;
  if (aspectRatio !== undefined) {
    const ratio = ratioValue(aspectRatio);
    // c_fill with ar_ keeps the largest area of that ratio inside the original.
    if (width / height > ratio) width = Math.round(height * ratio);
    else height = Math.round(width / ratio);
  }
  if (maxWidth && width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  return { width, height };
}

/**
 * Blur only behind images that are opaque, because the placeholder stays
 * painted behind the image (no client script removes it).
 */
function wantsBlur(media: PublicMedia, requested: boolean | undefined): boolean {
  if (requested === false || !media.blurDataUrl) return false;
  if (!media.blurDataUrl.startsWith('data:image/')) return false;
  return media.kind === 'SCREENSHOT' || media.mimeType === 'image/jpeg';
}

/**
 * Responsive CMS image as a plain `<img>` (server component, no client JS).
 */
export function CmsImage(props: CmsImageProps): ReactElement {
  const { media, sizes, priority = false, aspectRatio, maxWidth, className } = props;
  const alt = props.alt ?? media.alt;
  const { width, height } = intrinsicSize(media, aspectRatio, maxWidth);

  if (!isTransformable(media)) {
    return createElement('img', {
      src: media.url,
      alt,
      width,
      height,
      className,
      loading: priority ? 'eager' : 'lazy',
      decoding: 'async',
      fetchPriority: priority ? 'high' : undefined,
    });
  }

  const blur = wantsBlur(media, props.placeholder);
  const { props: imgProps } = getImageProps({
    src: media.publicId,
    alt,
    width,
    height,
    sizes,
    priority,
    className,
    loader: cloudinaryLoader(media, { aspectRatio, quality: props.quality }),
    placeholder: blur ? 'blur' : 'empty',
    blurDataURL: blur ? media.blurDataUrl : undefined,
  });

  if (priority && imgProps.srcSet) {
    preload(imgProps.src, { as: 'image', imageSrcSet: imgProps.srcSet, imageSizes: sizes, fetchPriority: 'high' });
  }

  return createElement('img', imgProps);
}

/**
 * Ads platforms: labels and logos for the ads page, its form and import.
 */

import type { BrandName } from '@/assets/brands/BrandLogo';
import { formatPKR } from '@core/lib/format';
import type { AdPlatform } from '../api/growth.api';

export const PLATFORM: Record<AdPlatform, { label: string; short: string; brand: BrandName }> = {
  META: { label: 'Facebook / Instagram', short: 'FB / Insta', brand: 'meta' },
  TIKTOK: { label: 'TikTok', short: 'TikTok', brand: 'tiktok' },
  GOOGLE: { label: 'Google', short: 'Google', brand: 'google' },
  OTHER: { label: 'Doosra', short: 'Doosra', brand: 'other' },
};

export const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
export const weekLabel = (key: string) => {
  const end = new Date(`${key}T12:00:00`);
  end.setDate(end.getDate() + 6);
  return `${dayLabel(key)} – ${end.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`;
};
/** Whole rupees for ads amounts. */
export const rs = (n: number | null | undefined) => formatPKR(n ?? 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const roasText = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v.toFixed(2)}x`);

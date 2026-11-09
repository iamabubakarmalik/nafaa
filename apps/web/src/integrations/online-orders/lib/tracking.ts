/**
 * Parcel states and journey steps: labels and colours shared by the parcel
 * map, the side lists, the order journey and the public tracking page.
 * Colours are design-system hue classes (they follow light and dark mode).
 */

import { t } from '@core/i18n';
import type { JourneyStepKey, ParcelState } from '../api/insights.api';

export const STATE_LABEL: Record<ParcelState, string> = {
  IN_TRANSIT: t('Raste me'),
  OUT_FOR_DELIVERY: 'Out for delivery',
  FAILED: t('Delivery nahi hui'),
  STUCK: t('Stuck 5+ din'),
  RETURNING: t('Wapas aa raha'),
  DELIVERED: t('Aaj deliver hue'),
};

/** fill (SVG), dot (background) and soft (chip) classes per state. */
export const STATE_STYLE: Record<ParcelState, { fill: string; stroke: string; dot: string; soft: string }> = {
  IN_TRANSIT: { fill: 'fill-sky-500', stroke: 'stroke-sky-500', dot: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700' },
  OUT_FOR_DELIVERY: { fill: 'fill-indigo-500', stroke: 'stroke-indigo-500', dot: 'bg-indigo-500', soft: 'bg-indigo-50 text-indigo-700' },
  FAILED: { fill: 'fill-amber-500', stroke: 'stroke-amber-500', dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700' },
  STUCK: { fill: 'fill-rose-500', stroke: 'stroke-rose-500', dot: 'bg-rose-500', soft: 'bg-rose-50 text-rose-700' },
  RETURNING: { fill: 'fill-fuchsia-500', stroke: 'stroke-fuchsia-500', dot: 'bg-fuchsia-500', soft: 'bg-fuchsia-50 text-fuchsia-700' },
  DELIVERED: { fill: 'fill-success-500', stroke: 'stroke-success-500', dot: 'bg-success-500', soft: 'bg-success-50 text-success-700' },
};

export const STEP_LABEL: Record<JourneyStepKey, string> = {
  BOOKED: t('Book hua'),
  PICKED_UP: t('Courier ne uthaya'),
  AT_ORIGIN_HUB: t('Bhejne wale shehar ka hub'),
  IN_TRANSIT: t('Raste me'),
  AT_DESTINATION_HUB: t('Customer ke shehar ka hub'),
  OUT_FOR_DELIVERY: t('Rider ke paas (out for delivery)'),
  END: t('Deliver'),
};

export const whenShort = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

/**
 * Labels, colors and links shared by the merchant journey screens: the Shop
 * 360 Journey tab, the Signup funnel page and the Shops list columns.
 */

import { Apple, CircleHelp, Globe, Monitor, Smartphone, type LucideIcon } from 'lucide-react';
import type { BadgeVariant } from '@/design-system/components';
import type { JourneyHealth, JourneyPlatform, JourneyStuck, JourneyUses } from '@/api/admin-journey.api';

export const PLATFORM: Record<JourneyPlatform | 'unknown', { label: string; icon: LucideIcon; color: string }> = {
  web: { label: 'Web', icon: Globe, color: '#4f46e5' },
  android: { label: 'Android', icon: Smartphone, color: '#059669' },
  ios: { label: 'iOS', icon: Apple, color: '#0284c7' },
  desktop: { label: 'Desktop', icon: Monitor, color: '#d97706' },
  unknown: { label: 'Unknown', icon: CircleHelp, color: '#94a3b8' },
};

export const PLATFORM_KEYS: Array<JourneyPlatform | 'unknown'> = ['web', 'android', 'ios', 'desktop', 'unknown'];

export const HEALTH: Record<JourneyHealth, { label: string; variant: BadgeVariant; color: string }> = {
  active: { label: 'Active', variant: 'success', color: '#059669' },
  at_risk: { label: 'At risk', variant: 'warning', color: '#d97706' },
  stuck: { label: 'Stuck', variant: 'danger', color: '#e11d48' },
  churned: { label: 'Churned', variant: 'default', color: '#64748b' },
};

export const STUCK: Record<JourneyStuck, string> = {
  onboarding: 'Setup (onboarding)',
  first_product: 'Adding first product',
  first_sale: 'Making first bill',
  paid: 'Buying a plan',
};

export const USES: Record<JourneyUses, string> = {
  web: 'Web only',
  mobile: 'Mobile only',
  both: 'Web and mobile',
  none: 'Not in 30 days',
};

/** Live Support chat for one shop, or several (bulk from the Funnel page). */
export const supportLink = (tenantIds: string | string[]) =>
  Array.isArray(tenantIds) ? `/support?tenants=${tenantIds.map(encodeURIComponent).join(',')}` : `/support?tenant=${encodeURIComponent(tenantIds)}`;

/** "facebook / cpc / eid-sale" from the parts that exist. */
export const utmLine = (u: { source: string | null; medium: string | null; campaign: string | null }) =>
  [u.source, u.medium, u.campaign].filter(Boolean).join(' / ') || null;

export const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : '—');

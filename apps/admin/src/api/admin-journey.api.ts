import { apiClient } from './client';

export type JourneyPlatform = 'web' | 'android' | 'ios' | 'desktop';
export type JourneyHealth = 'active' | 'at_risk' | 'stuck' | 'churned';
export type JourneyStuck = 'onboarding' | 'first_product' | 'first_sale' | 'paid';
export type JourneyUses = 'web' | 'mobile' | 'both' | 'none';

export interface JourneySummary {
  signupPlatform: JourneyPlatform | 'unknown';
  source: string;
  stuckAt: JourneyStuck | null;
  health: JourneyHealth;
  healthReason: string;
  uses: JourneyUses;
  lastSeenAt: string | null;
  lastAction: { label: string; at: string } | null;
}

interface Utm { source: string | null; medium: string | null; campaign: string | null; term: string | null; content: string | null }

export interface TenantJourney {
  tenantId: string;
  source: {
    label: string;
    utm: Utm;
    firstTouch: Utm;
    cta: string | null;
    referrerDomain: string | null;
    landingPage: string | null;
    referralCode: string | null;
    referredBy: { id: string; name: string } | null;
    partner: { id: string; code: string; via: string | null } | null;
  };
  signup: { platform: JourneyPlatform | 'unknown'; appVersion: string | null; method: string | null; at: string; recorded: boolean; inferred: boolean };
  platforms: Array<{ platform: JourneyPlatform; label: string; lastSeenAt: string | null; firstSeenAt: string | null }>;
  users: Array<{ id: string; name: string; role: string; lastSeenAt: string | null; web: string | null; desktop: string | null; android: string | null; ios: string | null }>;
  milestones: Array<{ key: string; label: string; done: boolean; at: string | null; core: boolean }>;
  onboarding: { steps: Array<{ id: string; label: string; required: boolean; done: boolean }>; finished: boolean; skipped: boolean; next: string | null };
  stuckAt: { key: JourneyStuck; label: string } | null;
  health: { state: JourneyHealth; label: string; reason: string };
  lastAction: { label: string; at: string } | null;
  trialEndsAt: string | null;
  timeline: Array<{ key: string; label: string; at: string; kind: 'milestone' | 'platform' | 'activity' }>;
}

export interface FunnelGroup { key: string; label: string; total: number; steps: number[] }

export interface JourneyFunnel {
  range: { from: string | null; to: string | null };
  total: number;
  steps: Array<{ key: string; label: string; count: number }>;
  daily: Array<{ date: string; total: number; platforms: Record<string, number>; sources: Record<string, number> }>;
  topSources: string[];
  byPlatform: FunnelGroup[];
  bySource: FunnelGroup[];
  webVsMobile: Array<{ key: 'web' | 'mobile'; label: string; signups: number; steps: number[]; medianHoursToFirstBill: number | null }>;
  unknownPlatform: number;
  uses: Record<JourneyUses, number>;
  health: Record<JourneyHealth, number>;
  stuck: Array<{ key: JourneyStuck; label: string; count: number }>;
  sources: string[];
}

export interface JourneyShop {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  status: string;
  createdAt: string;
  signupPlatform: JourneyPlatform | 'unknown';
  source: string;
  stuckAt: JourneyStuck | null;
  stuckLabel: string | null;
  onboardingNext: string | null;
  health: JourneyHealth;
  healthReason: string;
  uses: JourneyUses;
  lastSeenAt: string | null;
  lastAction: { label: string; at: string } | null;
}

export interface JourneyFilters { from?: string; to?: string; platform?: string; source?: string }

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminJourneyApi = {
  tenant: (id: string) => apiClient.get<{ data: TenantJourney }>(`/admin/journey/tenants/${id}`).then(unwrap),
  funnel: (params: JourneyFilters) => apiClient.get<{ data: JourneyFunnel }>('/admin/journey/funnel', { params }).then(unwrap),
  shops: (params: JourneyFilters & { stuck?: string; health?: string; uses?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: { items: JourneyShop[]; meta: { page: number; limit: number; total: number; totalPages: number } } }>('/admin/journey/shops', { params }).then(unwrap),
};

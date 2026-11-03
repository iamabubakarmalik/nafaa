/**
 * Mobile app control (apps/api/src/modules/mobile-control): devices, usage,
 * releases, maintenance, feature switches, announcements and push.
 */

import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export type Lang = 'en' | 'ur' | 'roman';
export interface LocalizedText { en: string; ur?: string; roman?: string }
export type Audience = 'all' | 'plan' | 'industry' | 'tenant';

export interface MobileTarget {
  audience: Audience;
  planSlugs: string[];
  industries: string[];
  tenantIds: string[];
  platforms: string[];
  minVersion: string | null;
  maxVersion: string | null;
}

export const emptyTarget = (): MobileTarget => ({
  audience: 'all', planSlugs: [], industries: [], tenantIds: [], platforms: [], minVersion: null, maxVersion: null,
});

export interface MobileOverview {
  days: number;
  totals: {
    devices: number; activeToday: number; active7d: number; active30d: number;
    newToday: number; pushReachable30d: number; olderAppUsers: number;
  };
  series: { date: string; installs: number; active: number }[];
  byPlatform: { key: string; devices: number }[];
  byVersion: { platform: string; version: string; devices: number; status: 'current' | 'outdated' | 'unsupported' }[];
  byModel: { key: string; devices: number }[];
  byLanguage: { key: string; devices: number }[];
  byIndustry: { key: string; devices: number }[];
  tenants: { active30d: number; onMobile: number; webOnly: number };
  oldVersions: {
    outdated: number; unsupported: number;
    latest: { ios: string | null; android: string | null };
    minimum: { ios: string | null; android: string | null };
  };
  topTenants: { tenantId: string; name: string; industry: string | null; devices: number; lastSeen: string }[];
}

export interface MobileDeviceRow {
  id: string;
  installId: string;
  platform: string;
  appVersion: string;
  buildNumber: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  deviceBrand: string | null;
  language: string | null;
  country: string | null;
  sessions: number;
  firstSeenAt: string;
  lastSeenAt: string;
  hasPush: boolean;
  tenant: { id: string; name: string; businessType: string | null; status?: string };
  user: { id: string; fullName: string; email: string; role: string; phone?: string | null; language?: string | null; lastLoginAt?: string | null };
}

export interface MobileDeviceDetail extends MobileDeviceRow {
  pushTokenPreview: string | null;
  activeDays: string[];
  otherDevices: { id: string; platform: string; appVersion: string; deviceModel: string | null; lastSeenAt: string }[];
}

export interface Paged<T> { items: T[]; total: number; page: number; limit: number; pages: number }

export interface PlatformRelease { latestVersion: string | null; minVersion: string | null; storeUrl: string | null }
export interface ReleaseNote { version: string; platform: 'all' | 'ios' | 'android'; date: string | null; text: LocalizedText }

export interface MobileConfig {
  releases: {
    ios: PlatformRelease;
    android: PlatformRelease;
    softUpdate: { enabled: boolean; title: LocalizedText; message: LocalizedText; remindAfterHours: number };
    forceUpdate: { title: LocalizedText; message: LocalizedText };
    notes: ReleaseNote[];
  };
  maintenance: { enabled: boolean; platforms: ('ios' | 'android')[]; title: LocalizedText; message: LocalizedText; until: string | null };
  flags: Record<string, boolean>;
}

export interface FlagGroup { id: string; label: string; help: string; flags: { key: string; label: string; help?: string }[] }

export interface AdminMobileConfig {
  config: MobileConfig;
  updatedAt: string | null;
  catalog: FlagGroup[];
  defaults: MobileConfig;
}

export interface Announcement extends MobileTarget {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  tone: 'info' | 'success' | 'warning' | 'critical';
  ctaLabel: LocalizedText | null;
  ctaLink: string | null;
  startsAt: string | null;
  endsAt: string | null;
  dismissible: boolean;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementInput = Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>;

export interface PushBroadcast extends MobileTarget {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  deepLink: string | null;
  includeOlderApp: boolean;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  audienceCount: number;
  sentCount: number;
  failedCount: number;
  dryRun: boolean;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface PushInput extends MobileTarget {
  title: LocalizedText;
  body: LocalizedText;
  deepLink: string | null;
  includeOlderApp: boolean;
}

export interface PushAudience {
  total: number;
  devices: number;
  olderApp: number;
  byPlatform: Record<string, number>;
  byLanguage: Record<string, number>;
  delivery: 'live' | 'dry-run';
}

export interface MobileTargets {
  plans: { slug: string; name: string }[];
  industries: { key: string; tenants: number }[];
  versions: { version: string; devices: number }[];
}

export interface TenantOption { id: string; name: string; businessType: string | null; devices?: number }

export interface DeviceQuery {
  q?: string; platform?: string; version?: string; tenantId?: string;
  activeDays?: number; sort?: 'lastSeen' | 'firstSeen' | 'version'; page?: number; limit?: number;
}

const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;

export const adminMobileApi = {
  overview: (days = 30) => apiClient.get('/admin/mobile/overview', { params: { days } }).then(unwrap<MobileOverview>),
  targets: () => apiClient.get('/admin/mobile/targets').then(unwrap<MobileTargets>),
  searchTenants: (q: string) => apiClient.get('/admin/mobile/tenants', { params: { q } }).then(unwrap<TenantOption[]>),
  tenantNames: (ids: string[]) => apiClient.get('/admin/mobile/tenants', { params: { ids: ids.join(',') } }).then(unwrap<TenantOption[]>),

  devices: (q: DeviceQuery) => apiClient.get('/admin/mobile/devices', { params: clean(q) }).then(unwrap<Paged<MobileDeviceRow>>),
  device: (id: string) => apiClient.get(`/admin/mobile/devices/${id}`).then(unwrap<MobileDeviceDetail>),
  clearPush: (id: string) => apiClient.post(`/admin/mobile/devices/${id}/clear-push`).then(unwrap<{ ok: boolean }>),
  removeDevice: (id: string) => apiClient.delete(`/admin/mobile/devices/${id}`).then(unwrap<{ ok: boolean }>),

  config: () => apiClient.get('/admin/mobile/config').then(unwrap<AdminMobileConfig>),
  saveConfig: (config: MobileConfig) => apiClient.put('/admin/mobile/config', config).then(unwrap<AdminMobileConfig>),

  announcements: () => apiClient.get('/admin/mobile/announcements').then(unwrap<Announcement[]>),
  createAnnouncement: (a: AnnouncementInput) => apiClient.post('/admin/mobile/announcements', a).then(unwrap<Announcement>),
  updateAnnouncement: (id: string, a: Partial<AnnouncementInput>) => apiClient.put(`/admin/mobile/announcements/${id}`, a).then(unwrap<Announcement>),
  deleteAnnouncement: (id: string) => apiClient.delete(`/admin/mobile/announcements/${id}`).then(unwrap<{ ok: boolean }>),

  audience: (t: Partial<PushInput>) => apiClient.post('/admin/mobile/push/audience', t).then(unwrap<PushAudience>),
  sendPush: (p: PushInput) => apiClient.post('/admin/mobile/push', p).then(unwrap<PushBroadcast>),
  pushHealth: (days = 7) => apiClient.get('/admin/mobile/push-health', { params: { days } }).then(unwrap<PushHealth>),
  pushHistory: (page = 1) => apiClient.get('/admin/mobile/push', { params: { page } }).then(unwrap<Paged<PushBroadcast>>),
};

/** Delivery health from Expo receipts (all staff app pushes: alerts, tests, broadcasts). */
export interface PushHealth {
  days: number;
  delivery: 'live' | 'dry-run';
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  unknown: number;
  errors: Array<{ error: string; count: number }>;
  platforms: Record<string, Record<string, number>>;
  events: Array<{ event: string; count: number }>;
  lastError: { error: string | null; platform: string | null; createdAt: string } | null;
  credentialsProblem: boolean;
}

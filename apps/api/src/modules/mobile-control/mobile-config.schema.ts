/**
 * Remote settings for the mobile app: releases and update prompts,
 * maintenance mode and feature switches. Stored as one JSON value in
 * SystemSetting ("mobile:config"). Every read goes through sanitizeConfig, so
 * missing or unknown fields fall back to the defaults below.
 */

import {
  compareVersions, isValidVersion, MOBILE_PLATFORMS, sanitizeText,
  type LocalizedText, type MobilePlatform,
} from './mobile-targeting';

export interface PlatformRelease {
  latestVersion: string | null;
  /** Versions below this must update before the app opens. */
  minVersion: string | null;
  storeUrl: string | null;
}

export interface ReleaseNote {
  version: string;
  platform: 'all' | MobilePlatform;
  date: string | null;
  text: LocalizedText;
}

export interface MobileConfig {
  releases: {
    ios: PlatformRelease;
    android: PlatformRelease;
    softUpdate: { enabled: boolean; title: LocalizedText; message: LocalizedText; remindAfterHours: number };
    forceUpdate: { title: LocalizedText; message: LocalizedText };
    notes: ReleaseNote[];
  };
  maintenance: {
    enabled: boolean;
    /** Empty: every platform. */
    platforms: MobilePlatform[];
    title: LocalizedText;
    message: LocalizedText;
    /** Shown to users as the expected end time. */
    until: string | null;
  };
  /** Missing keys are on. Only keys from FLAG_CATALOG are kept. */
  flags: Record<string, boolean>;
}

export interface FlagDef {
  key: string;
  label: string;
  help?: string;
}

export interface FlagGroup {
  id: string;
  label: string;
  help: string;
  flags: FlagDef[];
}

/** Every mobile switch. All default to on; turning one off hides or blocks it in the app. */
export const FLAG_CATALOG: FlagGroup[] = [
  {
    id: 'modules',
    label: 'Modules and tabs',
    help: 'Hide a whole area of the app on mobile. The web is not affected.',
    flags: [
      { key: 'module.dashboard', label: 'Home dashboard' },
      { key: 'module.pos', label: 'POS (sell)' },
      { key: 'module.products', label: 'Products' },
      { key: 'module.inventory', label: 'Stock and transfers' },
      { key: 'module.sales', label: 'Sales history and returns' },
      { key: 'module.customers', label: 'Customers and credit' },
      { key: 'module.purchasing', label: 'Purchases and suppliers' },
      { key: 'module.finance', label: 'Expenses, income and profit' },
      { key: 'module.reports', label: 'Reports' },
      { key: 'module.hr', label: 'Staff, attendance and payroll' },
      { key: 'module.bookings', label: 'Bookings' },
      { key: 'module.distribution', label: 'Distribution (booker, delivery, van)' },
      { key: 'module.onlineOrders', label: 'Online orders' },
      { key: 'module.notifications', label: 'Notifications' },
      { key: 'module.settings', label: 'Settings and team' },
      { key: 'module.billing', label: 'Plan and billing' },
    ],
  },
  {
    id: 'pos',
    label: 'POS options',
    help: 'Parts of the mobile POS screen.',
    flags: [
      { key: 'pos.cameraScanner', label: 'Camera barcode scanner' },
      { key: 'pos.quickKeys', label: 'Quick keys' },
      { key: 'pos.holdBills', label: 'Hold bills' },
      { key: 'pos.splitPayment', label: 'Split payment' },
      { key: 'pos.discounts', label: 'Discounts' },
      { key: 'pos.customerCredit', label: 'Sale on credit (khata)' },
      { key: 'pos.returns', label: 'Returns and void' },
      { key: 'pos.bluetoothPrinting', label: 'Bluetooth receipt printing' },
      { key: 'pos.shareReceipt', label: 'Share receipt (WhatsApp, image)' },
    ],
  },
  {
    id: 'kill',
    label: 'Kill switches',
    help: 'Turn a feature off everywhere in the app at once, for example while a problem is being fixed.',
    flags: [
      { key: 'feature.offlineSales', label: 'Offline sales', help: 'Sell without internet and sync later' },
      { key: 'feature.ai', label: 'Nafaa AI' },
      { key: 'feature.onlineOrders', label: 'Online orders sync' },
      { key: 'feature.signup', label: 'New sign-ups from the app' },
      { key: 'feature.pushNotifications', label: 'Push notifications' },
      { key: 'feature.otaUpdates', label: 'In-app updates', help: 'Download small updates without the store' },
      { key: 'feature.biometricLogin', label: 'Fingerprint and Face ID login' },
      { key: 'feature.imageUpload', label: 'Photo upload' },
    ],
  },
];

export const FLAG_KEYS: string[] = FLAG_CATALOG.flatMap((g) => g.flags.map((f) => f.key));

const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.nafaa.app';

export const DEFAULT_MOBILE_CONFIG: MobileConfig = {
  releases: {
    ios: { latestVersion: null, minVersion: null, storeUrl: null },
    android: { latestVersion: null, minVersion: null, storeUrl: ANDROID_STORE_URL },
    softUpdate: {
      enabled: true,
      title: { en: 'A new version is ready' },
      message: { en: 'Update Nafaa to get the latest features and fixes.' },
      remindAfterHours: 24,
    },
    forceUpdate: {
      title: { en: 'Please update Nafaa' },
      message: { en: 'This version is no longer supported. Update the app to keep using it.' },
    },
    notes: [],
  },
  maintenance: {
    enabled: false,
    platforms: [],
    title: { en: 'We will be back soon' },
    message: { en: 'Nafaa is being improved. Please try again in a little while.' },
    until: null,
  },
  flags: {},
};

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const ver = (v: unknown) => (isValidVersion(v) ? v.trim() : null);
const url = (v: unknown) => (typeof v === 'string' && /^https:\/\/\S{3,500}$/.test(v.trim()) ? v.trim() : null);
const isoDate = (v: unknown) => {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

function release(input: unknown, fallback: PlatformRelease): PlatformRelease {
  const src = obj(input);
  return {
    latestVersion: 'latestVersion' in src ? ver(src.latestVersion) : fallback.latestVersion,
    minVersion: 'minVersion' in src ? ver(src.minVersion) : fallback.minVersion,
    storeUrl: 'storeUrl' in src ? url(src.storeUrl) : fallback.storeUrl,
  };
}

export function sanitizeConfig(input: unknown): MobileConfig {
  const d = DEFAULT_MOBILE_CONFIG;
  const src = obj(input);
  const rel = obj(src.releases);
  const soft = obj(rel.softUpdate);
  const force = obj(rel.forceUpdate);
  const maint = obj(src.maintenance);
  const flagsIn = obj(src.flags);

  const notes: ReleaseNote[] = (Array.isArray(rel.notes) ? rel.notes : [])
    .map((n) => {
      const note = obj(n);
      const text = sanitizeText(note.text, 2000);
      const version = ver(note.version);
      if (!text || !version) return null;
      const platform = note.platform === 'ios' || note.platform === 'android' ? note.platform : 'all';
      return { version, platform, date: isoDate(note.date), text } as ReleaseNote;
    })
    .filter((n): n is ReleaseNote => !!n)
    .sort((a, b) => compareVersions(b.version, a.version))
    .slice(0, 30);

  const flags: Record<string, boolean> = {};
  for (const key of FLAG_KEYS) if (typeof flagsIn[key] === 'boolean') flags[key] = flagsIn[key] as boolean;

  const hours = Number(soft.remindAfterHours);

  return {
    releases: {
      ios: release(rel.ios, d.releases.ios),
      android: release(rel.android, d.releases.android),
      softUpdate: {
        enabled: bool(soft.enabled, d.releases.softUpdate.enabled),
        title: sanitizeText(soft.title, 120) ?? d.releases.softUpdate.title,
        message: sanitizeText(soft.message, 500) ?? d.releases.softUpdate.message,
        remindAfterHours: Number.isFinite(hours) ? Math.min(Math.max(Math.round(hours), 1), 24 * 30) : d.releases.softUpdate.remindAfterHours,
      },
      forceUpdate: {
        title: sanitizeText(force.title, 120) ?? d.releases.forceUpdate.title,
        message: sanitizeText(force.message, 500) ?? d.releases.forceUpdate.message,
      },
      notes,
    },
    maintenance: {
      enabled: bool(maint.enabled, false),
      platforms: (Array.isArray(maint.platforms) ? maint.platforms : []).filter((p): p is MobilePlatform =>
        (MOBILE_PLATFORMS as readonly unknown[]).includes(p),
      ),
      title: sanitizeText(maint.title, 120) ?? d.maintenance.title,
      message: sanitizeText(maint.message, 500) ?? d.maintenance.message,
      until: isoDate(maint.until),
    },
    flags,
  };
}

export type UpdateState = 'none' | 'soft' | 'force';

/** What the app should show for this platform and version. */
export function updateStateFor(config: MobileConfig, platform: string | null | undefined, version: string | null | undefined): UpdateState {
  if (!version || (platform !== 'ios' && platform !== 'android')) return 'none';
  const rel = config.releases[platform];
  if (rel.minVersion && compareVersions(version, rel.minVersion) < 0) return 'force';
  if (config.releases.softUpdate.enabled && rel.latestVersion && compareVersions(version, rel.latestVersion) < 0) return 'soft';
  return 'none';
}

/** Every flag with its effective value (missing = on). */
export function resolveFlags(config: MobileConfig): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of FLAG_KEYS) out[key] = config.flags[key] ?? true;
  return out;
}

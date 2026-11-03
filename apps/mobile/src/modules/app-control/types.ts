/** Shapes returned by GET /mobile/config (apps/api/src/modules/mobile-control). */

export type AppLanguage = 'en' | 'ur' | 'roman';

/** Text in the three app languages; English is always present. */
export interface LocalizedText {
  en: string;
  ur?: string;
  roman?: string;
}

export type UpdateState = 'none' | 'soft' | 'force';

export interface ReleaseNote {
  version: string;
  platform: 'all' | 'ios' | 'android';
  date: string | null;
  text: LocalizedText;
}

export interface AppAnnouncement {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  tone: 'info' | 'success' | 'warning' | 'critical';
  ctaLabel: LocalizedText | null;
  ctaLink: string | null;
  dismissible: boolean;
  endsAt: string | null;
  /** Changes when the banner is edited, so it shows again after a dismissal. */
  revision: number;
}

export interface AppConfig {
  configVersion: number;
  serverTime: string;
  update: {
    state: UpdateState;
    latestVersion: string | null;
    minVersion: string | null;
    storeUrl: string | null;
    title: LocalizedText;
    message: LocalizedText;
    remindAfterHours: number;
    notes: ReleaseNote[];
  };
  maintenance: {
    active: boolean;
    title: LocalizedText;
    message: LocalizedText;
    until: string | null;
  };
  /** Every mobile switch with its value. Unknown keys count as on. */
  flags: Record<string, boolean>;
  /** Platform appearance layer, including the mobile-only fields (mobileTabBar, mobilePosGrid, ...). */
  appearance: Record<string, unknown>;
  announcements: AppAnnouncement[];
}

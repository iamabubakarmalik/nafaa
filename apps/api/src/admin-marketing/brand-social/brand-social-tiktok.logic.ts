/**
 * TikTok Direct Post rules with no I/O, following TikTok's Content Sharing
 * Guidelines ("Required UX implementation"):
 * - privacy is picked by a person on every post, from the creator's
 *   privacy_level_options, with no default;
 * - comments, duets and stitches start off and are only sent as allowed when
 *   the creator's own TikTok settings allow them; photo posts have comments only;
 * - "Disclose post content" needs "Your brand", "Branded content" or both,
 *   and branded content cannot be private ("Only me");
 * - videos must fit the creator's max_video_post_duration_sec.
 * The composer mirrors these checks (apps/admin/src/features/brand-social/lib/tiktok.ts).
 */

import { TIKTOK_PRIVACY_LEVELS, type PostOptions, type TikTokPostOptions, type TikTokPrivacyLevel } from './brand-social.types';

export const isTikTokPrivacy = (v: unknown): v is TikTokPrivacyLevel => typeof v === 'string' && (TIKTOK_PRIVACY_LEVELS as readonly string[]).includes(v);

export const TIKTOK_PRIVACY_LABEL: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone', MUTUAL_FOLLOW_FRIENDS: 'Friends', FOLLOWER_OF_CREATOR: 'Followers', SELF_ONLY: 'Only me',
};

/** Blank TikTok options: nothing chosen, every interaction off, no disclosure. */
export const EMPTY_TIKTOK_OPTIONS: TikTokPostOptions = {
  privacyLevel: null, allowComment: false, allowDuet: false, allowStitch: false, disclose: false, yourBrand: false, brandedContent: false,
};

/** Cleans TikTok options from a request or the database; null when nothing usable was sent. */
export function normalizeTikTokOptions(raw: unknown): TikTokPostOptions | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const disclose = r.disclose === true;
  return {
    privacyLevel: isTikTokPrivacy(r.privacyLevel) ? r.privacyLevel : null,
    allowComment: r.allowComment === true,
    allowDuet: r.allowDuet === true,
    allowStitch: r.allowStitch === true,
    disclose,
    // The two choices only count while disclosure is on.
    yourBrand: disclose && r.yourBrand === true,
    brandedContent: disclose && r.brandedContent === true,
  };
}

/** Cleans the whole options object; unknown platform keys are dropped. */
export function normalizePostOptions(raw: unknown): PostOptions {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const tiktok = normalizeTikTokOptions((raw as Record<string, unknown>).tiktok);
  return tiktok ? { tiktok } : {};
}

/**
 * Applies an edit to saved options: null clears everything, a platform key
 * that is present replaces that platform's options, missing keys are kept.
 */
export function mergePostOptions(saved: unknown, input: unknown): PostOptions {
  if (input === null) return {};
  const cur = normalizePostOptions(saved);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return cur;
  const next = { ...cur };
  if (Object.prototype.hasOwnProperty.call(input, 'tiktok')) {
    const t = normalizeTikTokOptions((input as Record<string, unknown>).tiktok);
    if (t) next.tiktok = t; else delete next.tiktok;
  }
  return next;
}

/** True when Nafaa posts to this TikTok account directly (not to the drafts inbox). */
export function isTikTokDirect(a: { platform: string; status: string; autoPublish: boolean; meta?: unknown } | null | undefined): boolean {
  if (!a || a.platform !== 'TIKTOK' || a.status !== 'CONNECTED' || !a.autoPublish) return false;
  const meta = a.meta && typeof a.meta === 'object' ? (a.meta as { settings?: { tiktokMode?: string } }) : {};
  return meta.settings?.tiktokMode === 'DIRECT';
}

/** The creator limits the rules need (from creator_info). */
export interface TikTokCreatorLimits {
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number | null;
}

export interface TikTokIssue { code: string; message: string }

/**
 * What blocks a direct TikTok post. Without `creator` only the choices
 * themselves are checked (saved posts); with it, the choice is also checked
 * against the creator's current limits (composer, and right before posting).
 */
export function tiktokOptionIssues(
  o: TikTokPostOptions | null | undefined,
  media: { photo: boolean; durationSec?: number | null },
  creator?: TikTokCreatorLimits | null,
): TikTokIssue[] {
  const out: TikTokIssue[] = [];
  const opts = o ?? EMPTY_TIKTOK_OPTIONS;
  if (!opts.privacyLevel) out.push({ code: 'tiktok_privacy', message: 'Choose who can see this TikTok post in TikTok settings. TikTok asks for this on every post.' });
  if (opts.disclose && !opts.yourBrand && !opts.brandedContent) {
    out.push({ code: 'tiktok_disclose_empty', message: 'You need to indicate if your content promotes yourself, a third party, or both.' });
  }
  if (opts.brandedContent && opts.privacyLevel === 'SELF_ONLY') {
    out.push({ code: 'tiktok_branded_private', message: 'Branded content visibility cannot be set to private. Choose another TikTok privacy.' });
  }
  if (creator) {
    if (opts.privacyLevel && !creator.privacyLevelOptions.includes(opts.privacyLevel)) {
      out.push({ code: 'tiktok_privacy_unavailable', message: `TikTok no longer offers "${TIKTOK_PRIVACY_LABEL[opts.privacyLevel]}" for this account. Choose another privacy in TikTok settings.` });
    }
    const max = creator.maxVideoPostDurationSec;
    if (!media.photo && max && media.durationSec && media.durationSec > max) {
      out.push({ code: 'tiktok_too_long', message: `This TikTok account can post videos up to ${max} seconds; this one is ${Math.round(media.durationSec)} s.` });
    }
  }
  return out;
}

/** The label TikTok puts on the post, shown under the disclosure choices. */
export function tiktokDisclosureLabel(o: Pick<TikTokPostOptions, 'disclose' | 'yourBrand' | 'brandedContent'>, photo: boolean): string | null {
  if (!o.disclose) return null;
  const what = photo ? 'photo' : 'video';
  if (o.brandedContent) return `Your ${what} will be labeled as "Paid partnership".`;
  if (o.yourBrand) return `Your ${what} will be labeled as "Promotional content".`;
  return null;
}

/**
 * post_info fields for a direct post, built from the post's options and the
 * creator's current limits. An interaction the creator turned off in TikTok
 * is always sent as disabled.
 */
export function tiktokPostInfo(
  o: TikTokPostOptions | null | undefined,
  creator: TikTokCreatorLimits,
  media: { photo: boolean; durationSec?: number | null },
): { ok: true; info: Record<string, string | boolean> } | { ok: false; reason: string } {
  const issues = tiktokOptionIssues(o, media, creator);
  if (issues.length || !o?.privacyLevel) return { ok: false, reason: issues.map((i) => i.message).join(' ') };
  const info: Record<string, string | boolean> = {
    privacy_level: o.privacyLevel,
    disable_comment: !o.allowComment || creator.commentDisabled,
    brand_content_toggle: o.disclose && o.brandedContent,
    brand_organic_toggle: o.disclose && o.yourBrand,
  };
  if (!media.photo) {
    info.disable_duet = !o.allowDuet || creator.duetDisabled;
    info.disable_stitch = !o.allowStitch || creator.stitchDisabled;
  }
  return { ok: true, info };
}

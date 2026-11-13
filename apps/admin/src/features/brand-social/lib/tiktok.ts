/**
 * TikTok Direct Post rules for the composer. Mirrors the API's
 * brand-social-tiktok.logic.ts so problems show while editing; the API checks
 * again on save, approve, schedule and right before posting.
 */

import type { SocialAccount, TikTokCreatorInfo, TikTokPostOptions, TikTokPrivacyLevel } from '@/api/admin-brand-social.api';
import type { LocalWarning } from './post';

export const TIKTOK_PRIVACY_LABEL: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone', MUTUAL_FOLLOW_FRIENDS: 'Friends', FOLLOWER_OF_CREATOR: 'Followers', SELF_ONLY: 'Only me',
};

export const EMPTY_TIKTOK: TikTokPostOptions = {
  privacyLevel: null, allowComment: false, allowDuet: false, allowStitch: false, disclose: false, yourBrand: false, brandedContent: false,
};

export const MUSIC_USAGE_URL = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';
export const BRANDED_CONTENT_URL = 'https://www.tiktok.com/legal/page/global/bc-policy/en';

/** The TikTok account Nafaa posts to directly, or null (drafts mode, by hand, auto-publish off). */
export const tiktokDirectAccount = (accounts: SocialAccount[]) =>
  accounts.find((a) => a.platform === 'TIKTOK' && a.status === 'CONNECTED' && a.autoPublish && a.settings?.tiktokMode === 'DIRECT') ?? null;

/** What blocks a direct TikTok post; creator limits are checked when loaded. */
export function tiktokWarnings(
  o: TikTokPostOptions | undefined, media: { photo: boolean; durationSec?: number | null }, creator?: TikTokCreatorInfo | null,
): LocalWarning[] {
  const out: LocalWarning[] = [];
  const add = (code: string, message: string) => out.push({ platform: 'TIKTOK', level: 'error', code, message });
  const t = o ?? EMPTY_TIKTOK;
  if (!t.privacyLevel) add('tiktok_privacy', 'Choose who can see this TikTok post in TikTok settings. TikTok asks for this on every post.');
  if (t.disclose && !t.yourBrand && !t.brandedContent) add('tiktok_disclose_empty', 'You need to indicate if your content promotes yourself, a third party, or both.');
  if (t.brandedContent && t.privacyLevel === 'SELF_ONLY') add('tiktok_branded_private', 'Branded content visibility cannot be set to private. Choose another TikTok privacy.');
  if (creator?.canPost) {
    if (t.privacyLevel && !creator.privacyLevelOptions.includes(t.privacyLevel)) {
      add('tiktok_privacy_unavailable', `TikTok no longer offers "${TIKTOK_PRIVACY_LABEL[t.privacyLevel]}" for this account. Choose another privacy in TikTok settings.`);
    }
    const max = creator.maxVideoPostDurationSec;
    if (!media.photo && max && media.durationSec && media.durationSec > max) {
      add('tiktok_too_long', `This TikTok account can post videos up to ${max} seconds; this one is ${Math.round(media.durationSec)} s.`);
    }
  }
  if (creator && !creator.canPost) add('tiktok_cannot_post', creator.reason || 'TikTok says this account cannot post right now. Try again later.');
  return out;
}

/** The label TikTok adds to the post, or null. */
export function disclosureLabel(t: TikTokPostOptions, photo: boolean) {
  if (!t.disclose) return null;
  const what = photo ? 'photo' : 'video';
  if (t.brandedContent) return `Your ${what} will be labeled as "Paid partnership".`;
  if (t.yourBrand) return `Your ${what} will be labeled as "Promotional content".`;
  return null;
}

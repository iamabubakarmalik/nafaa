/**
 * Nafaa Social: what can be done with a post after it is live, per platform,
 * as the platforms' own APIs allow it (checked against their documentation,
 * November 2026). Each "off" action carries a plain reason for the admin
 * panel. Also the X poll rules and totals over metrics. No I/O; unit-tested
 * in brand-social-actions.spec.ts.
 *
 *   Facebook   edit message (posts made by Nafaa's app), delete; comments: read, reply, hide, delete.
 *   Instagram  no caption edit; delete (needs instagram_manage_contents); comments on/off;
 *              comments: read, reply, hide, delete.
 *   Threads    no edit; delete (needs threads_delete); replies: read, reply, hide.
 *   X          no edit; delete; replies: read (plan permitting), reply, hide (tweet.moderate.write).
 *   YouTube    edit title and description, delete (youtube.force-ssl); comments: read, reply and
 *              hide (force-ssl).
 *   Pinterest  edit title, description and link (Pinterest may keep pin editing restricted), delete;
 *              the API gives no pin comments.
 *   TikTok     the Content Posting API cannot edit, delete or read comments.
 */

import { PLATFORM_LABEL } from './brand-social.logic';
export { normalizeXPoll, xPollIssues, X_POLL_MAX_MINUTES, X_POLL_MIN_MINUTES } from './brand-social-tiktok.logic';
import { METRIC_KEYS, type BrandPlatform, type BrandPostKind, type MetricKey, type PlatformActions, type PlatformPublishState, type PostMetricView } from './brand-social.types';

export interface ActionAccount { platform: string; status: string; scopes: string[]; accessTokenEnc?: string | null }

const YT_WRITE = 'https://www.googleapis.com/auth/youtube.force-ssl';

/** Scope each action needs per platform (missing → "reconnect"). */
export const ACTION_SCOPES: Partial<Record<BrandPlatform, { edit?: string; delete?: string; reply?: string; hide?: string }>> = {
  INSTAGRAM: { delete: 'instagram_manage_contents', reply: 'instagram_manage_comments', hide: 'instagram_manage_comments' },
  FACEBOOK: { edit: 'pages_manage_posts', delete: 'pages_manage_posts', reply: 'pages_manage_engagement', hide: 'pages_manage_engagement' },
  THREADS: { delete: 'threads_delete', reply: 'threads_manage_replies', hide: 'threads_manage_replies' },
  X: { delete: 'tweet.write', reply: 'tweet.write', hide: 'tweet.moderate.write' },
  YOUTUBE: { edit: YT_WRITE, delete: YT_WRITE, reply: YT_WRITE, hide: YT_WRITE },
  PINTEREST: { edit: 'pins:write', delete: 'pins:write' },
};

/** Readable name of a permission for the "reconnect" text. */
const SCOPE_TEXT: Record<string, string> = {
  instagram_manage_contents: 'manage Instagram content',
  instagram_manage_comments: 'manage Instagram comments',
  pages_manage_posts: 'manage Page posts',
  pages_manage_engagement: 'manage Page comments',
  threads_delete: 'delete Threads posts',
  threads_manage_replies: 'manage Threads replies',
  'tweet.write': 'write posts',
  'tweet.moderate.write': 'hide replies',
  [YT_WRITE]: 'manage your YouTube videos and comments',
  'pins:write': 'write pins',
};

/** Null when the account has the scope (or no scopes are known), else the reconnect text. */
export function scopeGap(platform: BrandPlatform, account: ActionAccount | null | undefined, scope: string | undefined): string | null {
  if (!scope) return null;
  if (!account || !account.accessTokenEnc || account.status === 'DISCONNECTED' || account.status === 'MANUAL') {
    return `${PLATFORM_LABEL[platform]} is not connected through its API.`;
  }
  if (account.status === 'NEEDS_RECONNECT') return `Reconnect ${PLATFORM_LABEL[platform]} on the Accounts page first.`;
  if (!account.scopes.length || account.scopes.includes(scope)) return null;
  return `Reconnect ${PLATFORM_LABEL[platform]} on the Accounts page and allow "${SCOPE_TEXT[scope] ?? scope}" to use this.`;
}

const off = (reason: string) => ({ ok: false, reason });
const on = { ok: true, reason: null };

/** What Nafaa can do with one live platform post. */
export function platformActions(
  platform: BrandPlatform,
  state: PlatformPublishState | undefined,
  account: ActionAccount | null | undefined,
  kind: BrandPostKind,
): PlatformActions {
  const name = PLATFORM_LABEL[platform];
  const none: PlatformActions = {
    edit: { ok: false, fields: [], reason: null }, delete: off(''), toggleComments: off(''), comments: off(''),
  };
  const live = state?.status === 'PUBLISHED' && !!state.postId && !state.manual && !state.deletedAt;
  const why = !state || state.status !== 'PUBLISHED' ? 'Not live on this platform.'
    : state.deletedAt ? `Deleted from ${name}.`
      : state.manual || !state.postId ? 'Posted by hand, so Nafaa has no link to it through the API.' : null;
  if (!live) {
    const r = why ?? 'Not available.';
    return { edit: { ...none.edit, reason: r }, delete: off(r), toggleComments: off(r), comments: off(r) };
  }
  const scopes = ACTION_SCOPES[platform] ?? {};
  const gap = (s?: string) => scopeGap(platform, account, s);
  const editWith = (fields: PlatformActions['edit']['fields']) => {
    const g = gap(scopes.edit);
    return g ? { ok: false, fields, reason: g } : { ok: true, fields, reason: null };
  };
  const del = () => { const g = gap(scopes.delete); return g ? off(g) : on; };
  const story = kind === 'STORY';
  switch (platform) {
    case 'FACEBOOK':
      return {
        edit: story ? { ok: false, fields: [], reason: 'Facebook stories cannot be edited.' } : editWith(['message']),
        delete: del(),
        toggleComments: off('Facebook has no API switch for comments on a Page post.'),
        comments: story ? off('Stories have no comments.') : on,
      };
    case 'INSTAGRAM':
      return {
        edit: { ok: false, fields: [], reason: 'Instagram does not allow changing a caption through its API. Edit it in the Instagram app.' },
        delete: del(),
        toggleComments: story ? off('Stories have no comments.') : gap(scopes.hide) ? off(gap(scopes.hide)!) : on,
        comments: story ? off('Story replies arrive as messages, which Nafaa does not read.') : on,
      };
    case 'THREADS':
      return {
        edit: { ok: false, fields: [], reason: 'Threads has no API to edit a post.' },
        delete: del(),
        toggleComments: off('Threads sets who can reply only when the post is made.'),
        comments: on,
      };
    case 'X':
      return {
        edit: { ok: false, fields: [], reason: 'The X API cannot edit a post.' },
        delete: del(),
        toggleComments: off('X sets who can reply only when the post is made.'),
        comments: on,
      };
    case 'YOUTUBE':
      return {
        edit: editWith(['title', 'description']),
        delete: del(),
        toggleComments: off('Turn comments on or off in YouTube Studio.'),
        comments: on,
      };
    case 'PINTEREST':
      return {
        edit: editWith(['title', 'description', 'link']),
        delete: del(),
        toggleComments: off('Pinterest has no API switch for comments.'),
        comments: off('The Pinterest API does not give pin comments.'),
      };
    case 'TIKTOK':
      return {
        edit: { ok: false, fields: [], reason: 'The TikTok API cannot edit a post. Use the TikTok app.' },
        delete: off('The TikTok API cannot delete a post. Use the TikTok app.'),
        toggleComments: off('Set comments in the TikTok app.'),
        comments: off('The TikTok posting API does not give comments.'),
      };
    default:
      return { edit: { ok: false, fields: [], reason: `${name} is posted by hand.` }, delete: off(`${name} is posted by hand.`), toggleComments: off(`${name} is posted by hand.`), comments: off(`${name} is posted by hand.`) };
  }
}

/** What the inbox can do with a comment on one platform (own replies can always be deleted where the API deletes). */
export function commentActions(platform: BrandPlatform, account: ActionAccount | null | undefined, mine: boolean): { reply: boolean; hide: boolean; delete: boolean; reason: string | null } {
  const s = ACTION_SCOPES[platform] ?? {};
  const replyGap = scopeGap(platform, account, s.reply);
  const hideGap = scopeGap(platform, account, s.hide);
  switch (platform) {
    case 'FACEBOOK':
    case 'INSTAGRAM':
      return { reply: !replyGap, hide: !hideGap && !mine, delete: !hideGap, reason: replyGap ?? hideGap };
    case 'THREADS': {
      const delGap = scopeGap(platform, account, 'threads_delete');
      return { reply: !replyGap, hide: !hideGap && !mine, delete: mine && !delGap, reason: replyGap ?? hideGap ?? (mine ? null : 'Threads lets you hide a reply, not delete someone else\'s.') };
    }
    case 'X':
      return { reply: !replyGap, hide: !hideGap && !mine, delete: mine && !replyGap, reason: replyGap ?? hideGap ?? (mine ? null : 'X lets you hide a reply, not delete someone else\'s.') };
    case 'YOUTUBE':
      return { reply: !replyGap, hide: !hideGap && !mine, delete: mine && !hideGap, reason: replyGap ?? (mine ? null : 'YouTube lets you hide (reject) a comment, not delete someone else\'s.') };
    default:
      return { reply: false, hide: false, delete: false, reason: `${PLATFORM_LABEL[platform]} comments are not read by Nafaa.` };
  }
}

/* ───────────────────────── X polls ───────────────────────── */

/* ───────────────────────── metrics ───────────────────────── */

export const zeroTotals = (): Record<MetricKey, number> => Object.fromEntries(METRIC_KEYS.map((k) => [k, 0])) as Record<MetricKey, number>;

export function sumMetrics(list: Array<Partial<PostMetricView> | null | undefined>): Record<MetricKey, number> {
  const t = zeroTotals();
  for (const m of list) if (m) for (const k of METRIC_KEYS) t[k] += Number(m[k] ?? 0) || 0;
  return t;
}

/** Story media check: 9:16 within a small tolerance (null when the size is unknown). */
export function isNineBySixteen(m: { width?: number | null; height?: number | null } | undefined, tolerance = 0.03): boolean | null {
  if (!m?.width || !m?.height) return null;
  return Math.abs(m.width / m.height - 9 / 16) <= tolerance;
}

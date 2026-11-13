/**
 * Nafaa Social: the API contract shared with the admin app
 * (apps/admin/src/api/admin-brand-social.api.ts mirrors these types).
 *
 * Every route is under /api/admin/brand-social. Dates are ISO strings in UTC;
 * day keys (YYYY-MM-DD) and "best times" (HH:MM) are Pakistan time.
 */

/* ───────────────────────── enums ───────────────────────── */

export const BRAND_PLATFORMS = [
  'FACEBOOK', 'INSTAGRAM', 'THREADS', 'TIKTOK', 'YOUTUBE', 'X', 'LINKEDIN', 'PINTEREST', 'WHATSAPP_CHANNEL', 'GOOGLE_BUSINESS',
] as const;
export type BrandPlatform = (typeof BRAND_PLATFORMS)[number];

/** Platforms Nafaa can publish to through an API. Every other platform is posted by hand. */
export const API_PLATFORMS: readonly BrandPlatform[] = ['FACEBOOK', 'INSTAGRAM'];

export const POST_KINDS = ['POST', 'CAROUSEL', 'REEL', 'STORY', 'VIDEO', 'TEXT'] as const;
export type BrandPostKind = (typeof POST_KINDS)[number];

export const POST_STATUSES = [
  'IDEA', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIAL', 'FAILED', 'REJECTED', 'ARCHIVED',
] as const;
export type BrandPostStatus = (typeof POST_STATUSES)[number];

export const ACCOUNT_STATUSES = ['CONNECTED', 'MANUAL', 'NEEDS_RECONNECT', 'DISCONNECTED'] as const;
export type BrandAccountStatus = (typeof ACCOUNT_STATUSES)[number];

/**
 * Per-platform publish status:
 * - PUBLISHING: the publisher is working on it;
 * - WAITING: Instagram is still processing the video;
 * - HANDOFF: a person must post it by hand (manual platform, or auto-publish off);
 * - PUBLISHED: live (by the API, or marked posted by hand);
 * - FAILED: failed (willRetry says whether another try is planned);
 * - SKIPPED: the team chose not to post on this platform.
 */
export type PlatformPublishStatus = 'PUBLISHING' | 'WAITING' | 'HANDOFF' | 'PUBLISHED' | 'FAILED' | 'SKIPPED';

export interface PlatformPublishState {
  status: PlatformPublishStatus;
  postId?: string | null;
  permalink?: string | null;
  containerId?: string | null;
  /** Plain English reason for a failure. */
  error?: string | null;
  attempts: number;
  /** Last change of this state. */
  at: string;
  /** Next automatic try, when one is planned. */
  nextAt?: string | null;
  willRetry?: boolean;
  /** First comment posted after publishing. */
  commentId?: string | null;
  commentError?: string | null;
  /** Marked posted by hand. */
  manual?: boolean;
  postedById?: string | null;
}

export type PublishStateMap = Partial<Record<BrandPlatform, PlatformPublishState>>;

/* ───────────────────────── accounts ───────────────────────── */

export type TokenHealthView = 'ok' | 'expiring' | 'expired' | 'none';

export interface BrandAccountView {
  id: string;
  platform: BrandPlatform;
  name: string;
  handle: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  externalId: string;
  status: BrandAccountStatus;
  /** True for platforms Nafaa can post to through an API (Facebook, Instagram). */
  api: boolean;
  autoPublish: boolean;
  tokenHealth: TokenHealthView;
  tokenExpiresAt: string | null;
  scopes: string[];
  followers: number | null;
  lastError: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountsResponse {
  accounts: BrandAccountView[];
  /** The Meta user connection behind Facebook / Instagram (also used for ads). */
  meta: {
    configured: boolean;
    connected: boolean;
    userName: string | null;
    tokenHealth: TokenHealthView;
    tokenExpiresAt: string | null;
    scopes: string[];
    adsRead: boolean;
    /** The redirect URI to add in the Meta app (Valid OAuth Redirect URIs). */
    redirectUri: string;
  };
}

/** POST accounts/manual */
export interface ManualAccountInput { platform: BrandPlatform; handle: string; url?: string | null; name?: string | null; avatarUrl?: string | null }
/** PATCH accounts/:id */
export interface AccountPatchInput { autoPublish?: boolean; name?: string }

/** GET accounts/meta/connect-url */
export interface MetaConnectUrlResponse { url: string; redirectUri: string }

/** GET|POST accounts/meta/callback ({ code, state }) */
export interface MetaPageChoice {
  pageId: string;
  name: string;
  picture: string | null;
  igUserId: string | null;
  igUsername: string | null;
  igPicture: string | null;
  /** Already connected as an account. */
  connected: boolean;
}
export interface MetaCallbackResponse { userName: string; scopes: string[]; pages: MetaPageChoice[] }

/** POST accounts/meta/select */
export interface MetaSelectInput { pageId: string }
export interface MetaSelectResponse { accounts: BrandAccountView[] }

/* ───────────────────────── posts ───────────────────────── */

export interface PostMediaItem {
  assetId?: string | null;
  url: string;
  kind: 'image' | 'video';
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  alt?: string | null;
  thumbUrl?: string | null;
}

export interface PostWarning {
  /** null = applies to the whole post. */
  platform: BrandPlatform | null;
  /** error = this platform will not publish until fixed; warning = advice. */
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface BrandPostView {
  id: string;
  code: string;
  title: string;
  kind: BrandPostKind;
  pillar: string | null;
  campaign: string | null;
  caption: string;
  captions: Partial<Record<BrandPlatform, string>>;
  hashtags: string[];
  firstComment: string | null;
  link: string | null;
  media: PostMediaItem[];
  platforms: BrandPlatform[];
  scheduledAt: string | null;
  status: BrandPostStatus;
  publishState: PublishStateMap;
  publishedAt: string | null;
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  rejectedBy: { id: string; name: string } | null;
  rejectReason: string | null;
  aiMade: boolean;
  notes: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  /** Validation for every chosen platform. */
  warnings: PostWarning[];
  /** The exact text that goes out (or is copied) per platform: caption + hashtags (+ link where it belongs). */
  texts: Partial<Record<BrandPlatform, string>>;
  /** The UTM-tagged link per platform. */
  links: Partial<Record<BrandPlatform, string>>;
  /** Latest results per platform, when fetched. */
  metrics?: Partial<Record<BrandPlatform, PostMetricView>>;
}

export interface PostMetricView {
  reach: number; impressions: number; likes: number; comments: number; shares: number;
  saves: number; plays: number; clicks: number; engagement: number; fetchedAt: string;
}

/** GET posts query */
export interface PostListQuery {
  from?: string; to?: string;
  /** One status or a comma list. ARCHIVED is left out unless asked for. */
  status?: string;
  platform?: string; pillar?: string; campaign?: string; search?: string;
  /** "1" = only posts without a time. */
  unscheduled?: string;
}
export interface PostListResponse { posts: BrandPostView[]; total: number }

/** POST posts / PATCH posts/:id (every field optional on PATCH). */
export interface PostInput {
  title?: string;
  kind?: BrandPostKind;
  pillar?: string | null;
  campaign?: string | null;
  caption?: string;
  captions?: Partial<Record<BrandPlatform, string>>;
  hashtags?: string[];
  firstComment?: string | null;
  link?: string | null;
  media?: PostMediaItem[];
  /** Platform keys or account ids. */
  platforms?: string[];
  scheduledAt?: string | null;
  notes?: string | null;
  /** Only IDEA or DRAFT here; other moves use their own routes. */
  status?: 'IDEA' | 'DRAFT';
}

/** POST posts/:id/reject */
export interface RejectInput { reason: string }
/** POST posts/:id/retry */
export interface RetryInput { platform: BrandPlatform }
/** POST posts/:id/mark-posted (url optional when skipped). */
export interface MarkPostedInput { platform: BrandPlatform; url?: string | null; skipped?: boolean }
/** PATCH posts/:id/schedule */
export interface ScheduleInput { scheduledAt: string | null }

export type BulkAction = 'approve' | 'reject' | 'schedule' | 'archive' | 'shift-days';
/** POST posts/bulk */
export interface BulkInput { ids: string[]; action: BulkAction; reason?: string; scheduledAt?: string; days?: number }
export interface BulkResponse { done: string[]; failed: Array<{ id: string; error: string }> }

/* ───────────────────────── media ───────────────────────── */

export interface AssetView {
  id: string;
  kind: 'image' | 'video';
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  bytes: number | null;
  mime: string | null;
  title: string;
  tags: string[];
  folder: string | null;
  createdAt: string;
  /** Posts that use this asset (not archived). */
  usedIn: Array<{ id: string; title: string; status: BrandPostStatus }>;
}

/** GET assets?search&kind&folder */
export interface AssetListResponse { assets: AssetView[]; folders: string[]; tags: string[] }
/**
 * POST assets: register a file already uploaded (presigned upload).
 * POST assets/upload (multipart "file", plus optional title/folder/tags) stores
 * the file on the server's media storage and returns the AssetView; this is
 * the simplest way to add images and videos.
 * POST assets/presign { fileName, contentType, fileSize } returns a presigned
 * S3 PUT ({ uploadUrl, publicUrl, headers }) when S3 is set up.
 */
export interface AssetInput {
  url: string;
  kind?: 'image' | 'video';
  thumbUrl?: string | null;
  width?: number | null; height?: number | null; durationSec?: number | null;
  bytes?: number | null; mime?: string | null;
  title?: string; tags?: string[]; folder?: string | null;
}
/** PATCH assets/:id */
export interface AssetPatchInput { title?: string; tags?: string[]; folder?: string | null }

/* ───────────────────────── import ───────────────────────── */

/** pack.json inside the zip for POST import (multipart "file"). */
export interface ContentPack {
  campaign?: string;
  posts: Array<{
    title?: string;
    kind?: string;
    pillar?: string;
    caption?: string;
    captions?: Record<string, string>;
    hashtags?: string[];
    firstComment?: string;
    link?: string;
    platforms: string[];
    /** ISO; without an offset it is read as Pakistan time. */
    scheduledAt?: string;
    /** File names inside the zip (any folder). */
    media?: string[];
    notes?: string;
  }>;
}
export interface ImportReport {
  campaign: string | null;
  created: Array<{ id: string; title: string; status: BrandPostStatus; scheduledAt: string | null; warnings: number }>;
  skipped: Array<{ index: number; title: string; reason: string }>;
  assets: { uploaded: number; failed: Array<{ file: string; reason: string }> };
}

/* ───────────────────────── AI ───────────────────────── */

/** POST ai/caption */
export interface AiCaptionInput { brief: string; platform?: BrandPlatform; tone?: string }
export interface AiCaptionResponse { captions: string[]; hashtags: string[]; smart: boolean }
/** POST ai/plan: creates IDEA posts. month = YYYY-MM. */
export interface AiPlanInput { month: string; pillars?: string[]; perDay?: number; platforms?: BrandPlatform[]; brief?: string }
export interface AiPlanResponse { created: number; smart: boolean; posts: BrandPostView[] }

/* ───────────────────────── settings ───────────────────────── */

export interface BrandSocialSettings {
  timezone: string;
  requireApproval: boolean;
  autoApproveAiDrafts: boolean;
  /** Kill switch: nothing is published and no jobs call Meta while on. */
  paused: boolean;
  pausedAt: string | null;
  /** HH:MM (Pakistan time) suggestions per platform. */
  bestTimes: Partial<Record<BrandPlatform, string[]>>;
  hashtagSets: Array<{ name: string; tags: string[] }>;
  pillars: Array<{ key: string; label: string; color: string }>;
  campaigns: Array<{ key: string; label: string; color?: string | null; active: boolean }>;
  brandVoice: string;
  utm: { medium: string; defaultCampaign: string };
  /** Meta ad account for the ads overview (digits only). */
  adAccountId: string | null;
}

/* ───────────────────────── analytics ───────────────────────── */

/** GET analytics?from&to (day keys) */
export interface AnalyticsResponse {
  range: { from: string; to: string };
  totals: {
    posts: number; reach: number; impressions: number; engagement: number; engagementRate: number;
    likes: number; comments: number; shares: number; saves: number; plays: number;
    linkClicks: number; signups: number;
  };
  followers: Array<{
    accountId: string; platform: BrandPlatform; name: string;
    current: number | null; growth: number | null;
    series: Array<{ day: string; followers: number | null; reach: number | null }>;
  }>;
  topPosts: Array<{
    id: string; title: string; code: string; kind: BrandPostKind; pillar: string | null; platform: BrandPlatform;
    publishedAt: string | null; permalink: string | null; thumbUrl: string | null;
    reach: number; engagement: number; engagementRate: number; clicks: number;
  }>;
  /** 7 x 24 cells, weekday 0 = Sunday, Pakistan time. */
  heatmap: Array<{ weekday: number; hour: number; posts: number; avgEngagementRate: number }>;
  pillars: Array<{ pillar: string; posts: number; reach: number; engagement: number; engagementRate: number }>;
  links: {
    clicks: number; signups: number;
    byPost: Array<{ code: string; postId: string | null; title: string; clicks: number; signups: number }>;
    byCampaign: Array<{ campaign: string; clicks: number; signups: number }>;
  };
}

/** GET overview: numbers for the stat tiles and the "needs you" lists. */
export interface OverviewResponse {
  followers: { total: number; byPlatform: Array<{ platform: BrandPlatform; followers: number | null }> };
  postsThisWeek: number;
  reach7d: number;
  engagementRate7d: number;
  pendingApprovals: number;
  failed: number;
  handoffDue: number;
  paused: boolean;
  queue: BrandPostView[];
  needsYou: { approvals: BrandPostView[]; failed: BrandPostView[]; handoff: BrandPostView[] };
  accounts: BrandAccountView[];
}

/* ───────────────────────── ads ───────────────────────── */

/** GET ads/overview?from&to */
export type AdsOverviewResponse =
  | { connected: false; reason: string }
  | {
      connected: true;
      adAccountId: string;
      currency: string | null;
      range: { from: string; to: string };
      totals: { spend: number; impressions: number; clicks: number; cpc: number; ctr: number; reach: number; results: number };
      campaigns: Array<{ id: string; name: string; status: string | null; spend: number; impressions: number; clicks: number; cpc: number; ctr: number; reach: number; results: number; resultType: string | null }>;
    };

/* ───────────────────────── automation keys ───────────────────────── */

/**
 * Keys for an automated marketer (a scheduled AI job). Admin routes
 * (social.settings): GET keys, POST keys { name, scopes? } (the plain key
 * comes back once), DELETE keys/:id (revoke).
 *
 * The automation API is a separate controller at /api/brand-social/automation
 * with `Authorization: Bearer nsk_...`. It can create and edit posts (always
 * IN_REVIEW, never approved or published), add media, import content packs,
 * read posts / accounts / analytics / settings, and draft a first comment.
 * It can never approve, publish, connect accounts or change settings. Every
 * call is written to the admin audit log with the key name as the actor.
 *
 * Routes (scope in brackets):
 *   GET  posts, GET posts/:id, GET accounts, GET settings, GET analytics, GET assets   [read]
 *   POST posts, PATCH posts/:id                                                        [posts]
 *   POST posts/:id/comment-draft { text }                                              [comments]
 *   POST assets/presign, POST assets, POST assets/upload                               [assets]
 *   POST import (multipart "file")                                                     [import]
 */
export const AUTOMATION_SCOPES = ['read', 'posts', 'assets', 'import', 'comments'] as const;
export type AutomationScope = (typeof AUTOMATION_SCOPES)[number];

export interface AutomationKeyView {
  id: string;
  name: string;
  /** First characters of the key, to tell keys apart. */
  prefix: string;
  scopes: AutomationScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}
/** POST keys answer: `key` is shown once. */
export interface AutomationKeyCreated extends AutomationKeyView { key: string }
export interface AutomationKeyInput { name: string; scopes?: AutomationScope[] }

/** POST posts/:id/comment-draft (automation): sets the first comment on a post still in review, or adds it to the notes of an approved one. */
export interface CommentDraftInput { text: string }

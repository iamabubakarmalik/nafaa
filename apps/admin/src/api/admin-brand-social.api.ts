/**
 * Admin client for Nafaa Social (admin/brand-social): Nafaa's own social
 * accounts, posts, media library, approvals, analytics, settings, ads and
 * automation keys. Shapes mirror
 * apps/api/src/admin-marketing/brand-social/brand-social.types.ts.
 * Every call unwraps the global `{ success, data }` envelope.
 */

import { apiClient } from './client';

const BASE = '/admin/brand-social';

const unwrap = <T>(res: { data: unknown }): T => {
  const body = res.data as { data?: T } | T;
  return body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : (body as T);
};

/** Drops empty values so they are not sent as `?status=`. */
const clean = (p: object) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''));

// ─── Enums ──────────────────────────────────────────────────────────────

export const SOCIAL_PLATFORMS = [
  'FACEBOOK', 'INSTAGRAM', 'THREADS', 'TIKTOK', 'YOUTUBE', 'X', 'LINKEDIN', 'PINTEREST', 'WHATSAPP_CHANNEL', 'GOOGLE_BUSINESS',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type AccountStatus = 'CONNECTED' | 'MANUAL' | 'NEEDS_RECONNECT' | 'DISCONNECTED';
export const POST_KINDS = ['POST', 'CAROUSEL', 'REEL', 'STORY', 'VIDEO', 'TEXT'] as const;
export type PostKind = (typeof POST_KINDS)[number];
export const POST_STATUSES = [
  'IDEA', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIAL', 'FAILED', 'REJECTED', 'ARCHIVED',
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export type PublishStatus = 'PUBLISHING' | 'WAITING' | 'HANDOFF' | 'PUBLISHED' | 'FAILED' | 'SKIPPED';
export type AssetKind = 'image' | 'video';
export type TokenHealth = 'ok' | 'expiring' | 'expired' | 'none';

// ─── Accounts ───────────────────────────────────────────────────────────

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  name: string;
  handle: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  externalId: string;
  status: AccountStatus;
  api: boolean;
  autoPublish: boolean;
  tokenHealth: TokenHealth;
  tokenExpiresAt: string | null;
  scopes: string[];
  followers: number | null;
  lastError: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MetaConnection {
  configured: boolean;
  connected: boolean;
  userName: string | null;
  tokenHealth: TokenHealth;
  tokenExpiresAt: string | null;
  scopes: string[];
  adsRead: boolean;
  redirectUri: string;
}

export interface AccountsResponse { accounts: SocialAccount[]; meta: MetaConnection }

export interface MetaPageChoice {
  pageId: string;
  name: string;
  picture: string | null;
  igUserId: string | null;
  igUsername: string | null;
  igPicture: string | null;
  connected: boolean;
}
export interface MetaCallbackResult { userName: string; scopes: string[]; pages: MetaPageChoice[] }

// ─── Posts ──────────────────────────────────────────────────────────────

export interface PostMedia {
  assetId?: string | null;
  url: string;
  kind: AssetKind;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  alt?: string | null;
  thumbUrl?: string | null;
}

export interface PublishState {
  status: PublishStatus;
  postId?: string | null;
  permalink?: string | null;
  containerId?: string | null;
  error?: string | null;
  attempts: number;
  at: string;
  nextAt?: string | null;
  willRetry?: boolean;
  commentId?: string | null;
  commentError?: string | null;
  manual?: boolean;
  postedById?: string | null;
}

export interface PostWarning {
  platform: SocialPlatform | null;
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface PostMetrics {
  reach: number; impressions: number; likes: number; comments: number; shares: number;
  saves: number; plays: number; clicks: number; engagement: number; fetchedAt: string;
}

export interface Person { id: string; name: string }

export interface SocialPost {
  id: string;
  code: string;
  title: string;
  kind: PostKind;
  pillar: string | null;
  campaign: string | null;
  caption: string;
  captions: Partial<Record<SocialPlatform, string>>;
  hashtags: string[];
  firstComment: string | null;
  link: string | null;
  media: PostMedia[];
  platforms: SocialPlatform[];
  scheduledAt: string | null;
  status: PostStatus;
  publishState: Partial<Record<SocialPlatform, PublishState>>;
  publishedAt: string | null;
  approvedBy: Person | null;
  approvedAt: string | null;
  rejectedBy: Person | null;
  rejectReason: string | null;
  aiMade: boolean;
  notes: string | null;
  createdBy: Person | null;
  createdAt: string;
  updatedAt: string;
  warnings: PostWarning[];
  /** The exact text that goes out per platform: caption + hashtags (+ link where it belongs). */
  texts: Partial<Record<SocialPlatform, string>>;
  /** UTM-tagged link per platform. */
  links: Partial<Record<SocialPlatform, string>>;
  metrics?: Partial<Record<SocialPlatform, PostMetrics>>;
  /** Set when an automation key created the post. */
  createdByKey?: { id: string; name: string } | null;
}

export interface PostInput {
  title?: string;
  kind?: PostKind;
  pillar?: string | null;
  campaign?: string | null;
  caption?: string;
  captions?: Partial<Record<SocialPlatform, string>>;
  hashtags?: string[];
  firstComment?: string | null;
  link?: string | null;
  media?: PostMedia[];
  platforms?: SocialPlatform[];
  scheduledAt?: string | null;
  notes?: string | null;
  status?: 'IDEA' | 'DRAFT';
}

export interface PostFilters {
  from?: string;
  to?: string;
  /** One status or a comma list. */
  status?: string;
  platform?: string;
  pillar?: string;
  campaign?: string;
  search?: string;
  unscheduled?: '1';
}

export interface PostListResponse { posts: SocialPost[]; total: number }

export type BulkAction = 'approve' | 'reject' | 'schedule' | 'archive' | 'shift-days';
export interface BulkResult { done: string[]; failed: Array<{ id: string; error: string }> }

// ─── Media ──────────────────────────────────────────────────────────────

export interface SocialAsset {
  id: string;
  kind: AssetKind;
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
  usedIn: Array<{ id: string; title: string; status: PostStatus }>;
}

export interface AssetListResponse { assets: SocialAsset[]; folders: string[]; tags: string[] }

// ─── Settings ───────────────────────────────────────────────────────────

export interface HashtagSet { name: string; tags: string[] }
export interface Pillar { key: string; label: string; color: string }
export interface Campaign { key: string; label: string; color?: string | null; active: boolean }

export interface SocialSettings {
  timezone: string;
  requireApproval: boolean;
  autoApproveAiDrafts: boolean;
  paused: boolean;
  pausedAt: string | null;
  bestTimes: Partial<Record<SocialPlatform, string[]>>;
  hashtagSets: HashtagSet[];
  pillars: Pillar[];
  campaigns: Campaign[];
  brandVoice: string;
  utm: { medium: string; defaultCampaign: string };
  adAccountId: string | null;
}

// ─── Overview / analytics / ads ─────────────────────────────────────────

export interface SocialOverview {
  followers: { total: number; byPlatform: Array<{ platform: SocialPlatform; followers: number | null }> };
  postsThisWeek: number;
  reach7d: number;
  engagementRate7d: number;
  pendingApprovals: number;
  failed: number;
  handoffDue: number;
  paused: boolean;
  queue: SocialPost[];
  needsYou: { approvals: SocialPost[]; failed: SocialPost[]; handoff: SocialPost[] };
  accounts: SocialAccount[];
}

export interface AnalyticsResult {
  range: { from: string; to: string };
  totals: {
    posts: number; reach: number; impressions: number; engagement: number; engagementRate: number;
    likes: number; comments: number; shares: number; saves: number; plays: number;
    linkClicks: number; signups: number;
  };
  followers: Array<{
    accountId: string; platform: SocialPlatform; name: string;
    current: number | null; growth: number | null;
    series: Array<{ day: string; followers: number | null; reach: number | null }>;
  }>;
  topPosts: Array<{
    id: string; title: string; code: string; kind: PostKind; pillar: string | null; platform: SocialPlatform;
    publishedAt: string | null; permalink: string | null; thumbUrl: string | null;
    reach: number; engagement: number; engagementRate: number; clicks: number;
  }>;
  /** 7 × 24 cells, weekday 0 = Sunday, Pakistan time. */
  heatmap: Array<{ weekday: number; hour: number; posts: number; avgEngagementRate: number }>;
  pillars: Array<{ pillar: string; posts: number; reach: number; engagement: number; engagementRate: number }>;
  links: {
    clicks: number; signups: number;
    byPost: Array<{ code: string; postId: string | null; title: string; clicks: number; signups: number }>;
    byCampaign: Array<{ campaign: string; clicks: number; signups: number }>;
  };
}

export type AdsOverview =
  | { connected: false; reason: string }
  | {
    connected: true;
    adAccountId: string;
    currency: string | null;
    range: { from: string; to: string };
    totals: { spend: number; impressions: number; clicks: number; cpc: number; ctr: number; reach: number; results: number };
    campaigns: Array<{ id: string; name: string; status: string | null; spend: number; impressions: number; clicks: number; cpc: number; ctr: number; reach: number; results: number; resultType: string | null }>;
  };

// ─── Import / AI / keys ────────────────────────────────────────────────

export interface ImportReport {
  campaign: string | null;
  created: Array<{ id: string; title: string; status: PostStatus; scheduledAt: string | null; warnings: number }>;
  skipped: Array<{ index: number; title: string; reason: string }>;
  assets: { uploaded: number; failed: Array<{ file: string; reason: string }> };
}

export interface AiCaptionResult { captions: string[]; hashtags: string[]; smart: boolean }
export interface AiPlanResult { created: number; smart: boolean; posts: SocialPost[] }

export const AUTOMATION_SCOPES = ['read', 'posts', 'assets', 'import', 'comments'] as const;
export type AutomationScope = (typeof AUTOMATION_SCOPES)[number];

export interface AutomationKey {
  id: string;
  name: string;
  /** First characters of the key, to tell keys apart. */
  prefix: string;
  scopes: AutomationScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}
/** The plain `key` is shown once. */
export interface CreatedKey extends AutomationKey { key: string }

// ─── Calls ──────────────────────────────────────────────────────────────

export const brandSocialApi = {
  overview: () => apiClient.get(`${BASE}/overview`).then(unwrap<SocialOverview>),
  /** Posts with at least one platform waiting to be posted by hand. */
  handoff: () => apiClient.get(`${BASE}/handoff`).then(unwrap<{ posts: SocialPost[] }>),

  // Accounts
  accounts: () => apiClient.get(`${BASE}/accounts`).then(unwrap<AccountsResponse>),
  saveManualAccount: (body: { platform: SocialPlatform; handle: string; url?: string | null; name?: string | null; avatarUrl?: string | null }) =>
    apiClient.post(`${BASE}/accounts/manual`, clean(body)).then(unwrap<SocialAccount>),
  updateAccount: (id: string, body: { autoPublish?: boolean; name?: string }) =>
    apiClient.patch(`${BASE}/accounts/${id}`, body).then(unwrap<SocialAccount>),
  disconnectAccount: (id: string) => apiClient.delete(`${BASE}/accounts/${id}`).then(unwrap<SocialAccount>),
  refreshAccount: (id: string) => apiClient.post(`${BASE}/accounts/${id}/refresh`).then(unwrap<SocialAccount>),
  metaConnectUrl: () => apiClient.get(`${BASE}/accounts/meta/connect-url`).then(unwrap<{ url: string; redirectUri: string }>),
  metaCallback: (body: { code: string; state: string }) =>
    apiClient.post(`${BASE}/accounts/meta/callback`, body).then(unwrap<MetaCallbackResult>),
  metaSelect: (pageId: string) => apiClient.post(`${BASE}/accounts/meta/select`, { pageId }).then(unwrap<{ accounts: SocialAccount[] }>),

  // Posts
  posts: (f: PostFilters = {}) => apiClient.get(`${BASE}/posts`, { params: clean(f) }).then(unwrap<PostListResponse>),
  post: (id: string) => apiClient.get(`${BASE}/posts/${id}`).then(unwrap<SocialPost>),
  createPost: (body: PostInput) => apiClient.post(`${BASE}/posts`, body).then(unwrap<SocialPost>),
  updatePost: (id: string, body: PostInput) => apiClient.patch(`${BASE}/posts/${id}`, body).then(unwrap<SocialPost>),
  archivePost: (id: string) => apiClient.delete(`${BASE}/posts/${id}`).then(unwrap<SocialPost>),
  duplicatePost: (id: string) => apiClient.post(`${BASE}/posts/${id}/duplicate`).then(unwrap<SocialPost>),
  submit: (id: string) => apiClient.post(`${BASE}/posts/${id}/submit`).then(unwrap<SocialPost>),
  approve: (id: string) => apiClient.post(`${BASE}/posts/${id}/approve`).then(unwrap<SocialPost>),
  reject: (id: string, reason: string) => apiClient.post(`${BASE}/posts/${id}/reject`, { reason }).then(unwrap<SocialPost>),
  publishNow: (id: string) => apiClient.post(`${BASE}/posts/${id}/publish-now`).then(unwrap<SocialPost>),
  retry: (id: string, platform: SocialPlatform) => apiClient.post(`${BASE}/posts/${id}/retry`, { platform }).then(unwrap<SocialPost>),
  markPosted: (id: string, body: { platform: SocialPlatform; url?: string | null; skipped?: boolean }) =>
    apiClient.post(`${BASE}/posts/${id}/mark-posted`, clean(body)).then(unwrap<SocialPost>),
  schedule: (id: string, scheduledAt: string | null) =>
    apiClient.patch(`${BASE}/posts/${id}/schedule`, { scheduledAt }).then(unwrap<SocialPost>),
  bulk: (body: { ids: string[]; action: BulkAction; reason?: string; scheduledAt?: string; days?: number }) =>
    apiClient.post(`${BASE}/posts/bulk`, clean(body)).then(unwrap<BulkResult>),

  // Media
  assets: (f: { search?: string; kind?: string; folder?: string } = {}) =>
    apiClient.get(`${BASE}/assets`, { params: clean(f) }).then(unwrap<AssetListResponse>),
  /** Stores the file on the server's media storage and returns the asset. */
  uploadAsset: (file: File, meta: { title?: string; folder?: string | null }, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('file', file, file.name);
    if (meta.title) form.append('title', meta.title);
    if (meta.folder) form.append('folder', meta.folder);
    return apiClient.post(`${BASE}/assets/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 10 * 60_000,
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)); },
    }).then(unwrap<SocialAsset>);
  },
  updateAsset: (id: string, body: { title?: string; tags?: string[]; folder?: string | null }) =>
    apiClient.patch(`${BASE}/assets/${id}`, body).then(unwrap<SocialAsset>),
  deleteAsset: (id: string) => apiClient.delete(`${BASE}/assets/${id}`).then(() => undefined),

  // Analytics / ads
  analytics: (from: string, to: string) => apiClient.get(`${BASE}/analytics`, { params: { from, to } }).then(unwrap<AnalyticsResult>),
  ads: (from: string, to: string) => apiClient.get(`${BASE}/ads/overview`, { params: { from, to } }).then(unwrap<AdsOverview>),

  // Settings / import / AI
  settings: () => apiClient.get(`${BASE}/settings`).then(unwrap<SocialSettings>),
  saveSettings: (body: Partial<SocialSettings>) => {
    const { pausedAt: _pausedAt, ...rest } = body;
    return apiClient.put(`${BASE}/settings`, rest).then(unwrap<SocialSettings>);
  },
  importPack: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('file', file, file.name);
    return apiClient.post(`${BASE}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 20 * 60_000,
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)); },
    }).then(unwrap<ImportReport>);
  },
  aiCaption: (body: { brief: string; platform?: SocialPlatform; tone?: string }) =>
    apiClient.post(`${BASE}/ai/caption`, clean(body)).then(unwrap<AiCaptionResult>),
  aiPlan: (body: { month: string; pillars?: string[]; perDay?: number; platforms?: SocialPlatform[]; brief?: string }) =>
    apiClient.post(`${BASE}/ai/plan`, clean(body)).then(unwrap<AiPlanResult>),

  // Automation keys
  keys: () => apiClient.get(`${BASE}/keys`).then(unwrap<AutomationKey[] | { keys: AutomationKey[] }>)
    .then((r) => (Array.isArray(r) ? r : r.keys)),
  createKey: (body: { name: string; scopes?: AutomationScope[] }) => apiClient.post(`${BASE}/keys`, body).then(unwrap<CreatedKey>),
  revokeKey: (id: string) => apiClient.delete(`${BASE}/keys/${id}`).then(() => undefined),
};

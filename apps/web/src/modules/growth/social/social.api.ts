/**
 * Social media studio API (/online-store/social): calendar posts, reminders,
 * Nafaa AI content, products for posts, brand kit and social analytics.
 * The mobile app uses the same endpoints (apps/mobile online-store/api/social.ts).
 */

import { apiClient } from '@core/api/client';
import type { PlatformPublishState } from '@integrations/meta/meta.api';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'WHATSAPP_STATUS';
export const SOCIAL_PLATFORMS: SocialPlatform[] = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'WHATSAPP_STATUS'];
export type PostKind = 'POST' | 'REEL' | 'STORY' | 'STATUS';
export type PostStatus = 'IDEA' | 'DRAFT' | 'READY' | 'POSTED';

export interface PostMedia { url: string; kind: 'image' | 'video'; source: 'product' | 'upload' | 'creative'; productId?: string | null }
export interface PostLink { productId?: string | null; label: string; url: string }

export interface SocialPost {
  id: string;
  code: string;
  title: string | null;
  kind: PostKind;
  status: PostStatus;
  scheduledAt: string | null;
  day: string | null;
  platforms: SocialPlatform[];
  caption: string;
  hashtags: string[];
  media: PostMedia[];
  productIds: string[];
  links: PostLink[];
  taggedLinks: Partial<Record<SocialPlatform, PostLink[]>>;
  remindMinutes: number;
  reminderSentAt: string | null;
  postedAt: string | null;
  postUrls: Partial<Record<SocialPlatform, string>>;
  festivalKey: string | null;
  aiMade: boolean;
  notes: string | null;
  assignedToId: string | null;
  /** Publish to the connected Facebook / Instagram at scheduledAt. */
  autoPublish?: boolean;
  publishState?: Partial<Record<'FACEBOOK' | 'INSTAGRAM', PlatformPublishState>>;
  createdAt: string;
  updatedAt: string;
}

export type PostInput = Partial<Pick<SocialPost, 'title' | 'kind' | 'status' | 'scheduledAt' | 'platforms' | 'caption' | 'hashtags' | 'media' | 'productIds' | 'links' | 'remindMinutes' | 'festivalKey' | 'aiMade' | 'notes' | 'autoPublish'>>;

export interface Festival { key: string; date: string; name: string; leadDays: number; approx: boolean; idea: string; hashtags: string[] }

export interface CalendarData {
  from: string;
  to: string;
  today: string;
  items: SocialPost[];
  festivals: Festival[];
  upcomingFestivals: Festival[];
  stats: { thisWeek: number; postedWeek: number; overdue: number; ideas: number; ready: number };
}

export interface SocialProduct { id: string; name: string; sku: string | null; price: number; comparePrice: number | null; images: string[]; link: string | null }

export interface Brand { name: string; logoUrl: string | null; phone: string | null; handle: string | null; colors: { primary: string; accent: string; text: string } }

export type AiKind = 'caption' | 'hashtags' | 'script' | 'plan';
export type ContentLang = 'roman' | 'ur' | 'en';
export interface ReelScript { hook: string; scenes: Array<{ shot: string; text: string; seconds: number }>; cta: string; music: string }
export interface PlanIdea { date: string; time: string; platforms: SocialPlatform[]; kind: PostKind; title: string; caption: string; hashtags: string[]; productIds: string[]; festivalKey: string | null }
export interface AiResult { kind: AiKind; captions?: string[]; hashtags?: string[]; script?: ReelScript; plan?: PlanIdea[]; smart: boolean; remaining: number | null }
export interface AiRequest { kind: AiKind; productIds?: string[]; platform?: SocialPlatform; lang?: ContentLang; offer?: string; festivalKey?: string; note?: string; days?: 7 | 30; from?: string }

export interface SocialAnalytics {
  from: string;
  to: string;
  weeks: Array<{ week: string; counts: Partial<Record<SocialPlatform, number>>; total: number }>;
  totals: { posts: number; postsPerPlatform: Partial<Record<SocialPlatform, number>>; socialOrders: number; socialSales: number; taggedOrders: number; allOrders: number };
  byPlatform: Record<SocialPlatform, { orders: number; delivered: number; sales: number }>;
  posts: Array<{ id: string; title: string; platforms: SocialPlatform[]; day: string; postUrls: Partial<Record<SocialPlatform, string>>; orders: number; delivered: number; sales: number }>;
}

const base = '/online-store/social';

export const socialApi = {
  list: (q: { from: string; to: string; status?: PostStatus; platform?: SocialPlatform; search?: string }) =>
    apiClient.get(`${base}/posts`, { params: q }).then((r) => unwrap<CalendarData>(r)),
  get: (id: string) => apiClient.get(`${base}/posts/${id}`).then((r) => unwrap<SocialPost>(r)),
  due: () => apiClient.get(`${base}/due`).then((r) => unwrap<{ items: SocialPost[]; now: string }>(r)),
  create: (body: PostInput) => apiClient.post(`${base}/posts`, body).then((r) => unwrap<SocialPost>(r)),
  update: (id: string, body: PostInput) => apiClient.patch(`${base}/posts/${id}`, body).then((r) => unwrap<SocialPost>(r)),
  remove: (id: string) => apiClient.delete(`${base}/posts/${id}`).then((r) => unwrap<{ ok: boolean }>(r)),
  posted: (id: string, body: { urls?: Partial<Record<SocialPlatform, string>>; undo?: boolean }) =>
    apiClient.post(`${base}/posts/${id}/posted`, body).then((r) => unwrap<SocialPost>(r)),
  ai: (body: AiRequest) => apiClient.post(`${base}/ai`, body).then((r) => unwrap<AiResult>(r)),
  applyPlan: (ideas: PlanIdea[], status: PostStatus = 'IDEA') => apiClient.post(`${base}/plan/apply`, { ideas, status }).then((r) => unwrap<{ created: number }>(r)),
  products: (q: { search?: string; ids?: string[] }) =>
    apiClient.get(`${base}/products`, { params: { search: q.search || undefined, ids: q.ids?.length ? q.ids.join(',') : undefined } }).then((r) => unwrap<SocialProduct[]>(r)),
  brand: () => apiClient.get(`${base}/brand`).then((r) => unwrap<Brand>(r)),
  saveBrand: (body: { colors?: Partial<Brand['colors']>; handle?: string | null }) => apiClient.put(`${base}/brand`, body).then((r) => unwrap<Brand>(r)),
  analytics: (q: { from: string; to: string }) => apiClient.get(`${base}/analytics`, { params: q }).then((r) => unwrap<SocialAnalytics>(r)),
  /** Uploads a PNG made in the creative maker; returns its URL. */
  uploadImage: async (blob: Blob, name: string) => {
    const form = new FormData();
    form.append('file', new File([blob], name, { type: 'image/png' }));
    form.append('purpose', 'social');
    const r = await apiClient.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    const url: string | undefined = r.data?.data?.url || r.data?.url;
    if (!url) throw new Error('upload');
    return url;
  },
};

/**
 * Social media studio on mobile: the posts to do (reminders), upcoming
 * calendar posts, and marking a post posted. Same endpoints as the web
 * (apps/web/src/modules/growth/social/social.api.ts).
 */

import { apiClient } from '@/core/api/client';

const unwrap = <T,>(r: { data: unknown }): T => {
  const d = r.data as { data?: unknown } | null;
  return (d && typeof d === 'object' && 'data' in d && d.data !== undefined && !Array.isArray(d) ? d.data : d) as T;
};

export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'WHATSAPP_STATUS';
export type PostStatus = 'IDEA' | 'DRAFT' | 'READY' | 'POSTED';
export interface PostLink { productId?: string | null; label: string; url: string }

export interface SocialPost {
  id: string;
  code: string;
  title: string | null;
  kind: 'POST' | 'REEL' | 'STORY' | 'STATUS';
  status: PostStatus;
  scheduledAt: string | null;
  day: string | null;
  platforms: SocialPlatform[];
  caption: string;
  hashtags: string[];
  media: Array<{ url: string; kind: 'image' | 'video'; source: string; productId?: string | null }>;
  taggedLinks: Partial<Record<SocialPlatform, PostLink[]>>;
  postedAt: string | null;
  postUrls: Partial<Record<SocialPlatform, string>>;
  aiMade: boolean;
}

export interface SocialCalendar {
  today: string;
  items: SocialPost[];
  upcomingFestivals: Array<{ key: string; date: string; name: string; idea: string; approx: boolean }>;
  stats: { thisWeek: number; postedWeek: number; overdue: number; ideas: number; ready: number };
}

const base = '/online-store/social';

export const socialApi = {
  due: () => apiClient.get(`${base}/due`).then((r) => unwrap<{ items: SocialPost[]; now: string }>(r)),
  list: (q: { from: string; to: string }) => apiClient.get(`${base}/posts`, { params: { ...q, undated: '0' } }).then((r) => unwrap<SocialCalendar>(r)),
  get: (id: string) => apiClient.get(`${base}/posts/${id}`).then((r) => unwrap<SocialPost>(r)),
  posted: (id: string, body: { urls?: Partial<Record<SocialPlatform, string>>; undo?: boolean }) =>
    apiClient.post(`${base}/posts/${id}/posted`, body).then((r) => unwrap<SocialPost>(r)),
};

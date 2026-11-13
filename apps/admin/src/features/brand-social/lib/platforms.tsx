/**
 * Platform facts for Nafaa Social: names, brand colours, caption limits,
 * where to post by hand, and small brand marks drawn as inline SVG.
 */

import { useId } from 'react';
import type { PostKind, PostStatus, SocialPlatform } from '@/api/admin-brand-social.api';
import type { BadgeVariant } from '@/design-system/components';

export interface PlatformInfo {
  label: string;
  short: string;
  color: string;
  /** Caption limit in characters. */
  limit: number;
  /** Hashtag limit, when the platform has one. */
  hashtagLimit?: number;
  /** Published through the API (Meta) or handed to a person. */
  api: boolean;
  /** Where a person opens the platform to post by hand. */
  postUrl: string;
  /** Profile URL from a handle. */
  profile: (handle: string) => string;
}

export const PLATFORM: Record<SocialPlatform, PlatformInfo> = {
  FACEBOOK: { label: 'Facebook', short: 'FB', color: '#1877F2', limit: 63206, api: true, postUrl: 'https://business.facebook.com/latest/composer', profile: (h) => `https://www.facebook.com/${h}` },
  INSTAGRAM: { label: 'Instagram', short: 'IG', color: '#E1306C', limit: 2200, hashtagLimit: 30, api: true, postUrl: 'https://business.facebook.com/latest/composer', profile: (h) => `https://www.instagram.com/${h}` },
  THREADS: { label: 'Threads', short: 'TH', color: '#101010', limit: 500, api: false, postUrl: 'https://www.threads.net/', profile: (h) => `https://www.threads.net/@${h}` },
  TIKTOK: { label: 'TikTok', short: 'TT', color: '#111111', limit: 2200, api: false, postUrl: 'https://www.tiktok.com/tiktokstudio/upload', profile: (h) => `https://www.tiktok.com/@${h}` },
  YOUTUBE: { label: 'YouTube', short: 'YT', color: '#FF0000', limit: 5000, api: false, postUrl: 'https://studio.youtube.com/', profile: (h) => `https://www.youtube.com/@${h}` },
  X: { label: 'X', short: 'X', color: '#0F1419', limit: 280, api: false, postUrl: 'https://x.com/compose/post', profile: (h) => `https://x.com/${h}` },
  LINKEDIN: { label: 'LinkedIn', short: 'IN', color: '#0A66C2', limit: 3000, api: false, postUrl: 'https://www.linkedin.com/company/', profile: (h) => `https://www.linkedin.com/company/${h}` },
  PINTEREST: { label: 'Pinterest', short: 'PI', color: '#E60023', limit: 500, api: false, postUrl: 'https://www.pinterest.com/pin-creation-tool/', profile: (h) => `https://www.pinterest.com/${h}` },
  WHATSAPP_CHANNEL: { label: 'WhatsApp channel', short: 'WA', color: '#25D366', limit: 65536, api: false, postUrl: 'https://web.whatsapp.com/', profile: () => 'https://www.whatsapp.com/channel/' },
  GOOGLE_BUSINESS: { label: 'Google Business', short: 'GB', color: '#4285F4', limit: 1500, api: false, postUrl: 'https://business.google.com/', profile: () => 'https://business.google.com/' },
};

export const platformLabel = (p: string) => PLATFORM[p as SocialPlatform]?.label ?? p;

export const KIND_LABEL: Record<PostKind, string> = {
  POST: 'Post', CAROUSEL: 'Carousel', REEL: 'Reel', STORY: 'Story', VIDEO: 'Video', TEXT: 'Text',
};

export const STATUS: Record<PostStatus, { label: string; variant: BadgeVariant; color: string }> = {
  IDEA: { label: 'Idea', variant: 'default', color: '#94a3b8' },
  DRAFT: { label: 'Draft', variant: 'default', color: '#64748b' },
  IN_REVIEW: { label: 'In review', variant: 'warning', color: '#d97706' },
  APPROVED: { label: 'Approved', variant: 'info', color: '#0284c7' },
  SCHEDULED: { label: 'Scheduled', variant: 'brand', color: '#4f46e5' },
  PUBLISHING: { label: 'Publishing', variant: 'info', color: '#0ea5e9' },
  PUBLISHED: { label: 'Published', variant: 'success', color: '#16a34a' },
  PARTIAL: { label: 'Partly published', variant: 'warning', color: '#ea580c' },
  FAILED: { label: 'Failed', variant: 'danger', color: '#e11d48' },
  REJECTED: { label: 'Rejected', variant: 'danger', color: '#be123c' },
  ARCHIVED: { label: 'Archived', variant: 'default', color: '#94a3b8' },
};

export const statusLabel = (s: string) => STATUS[s as PostStatus]?.label ?? s;

/** Opens the platform's own composer in a new tab. */
export const openPlatform = (p: SocialPlatform) => window.open(PLATFORM[p].postUrl, '_blank', 'noopener');

/** Small brand mark, drawn here so the admin carries no extra logo files. */
export function PlatformMark({ p, size = 18, className }: { p: SocialPlatform; size?: number; className?: string }) {
  const gid = useId().replace(/:/g, '');
  const label = PLATFORM[p]?.label ?? p;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className={className ?? 'shrink-0'}>
      <title>{label}</title>
      {p === 'FACEBOOK' && <>
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path d="M13.4 19.5v-6h2l.3-2.4h-2.3V9.6c0-.7.2-1.2 1.2-1.2h1.2V6.3c-.2 0-1-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.8H9v2.4h2v6h2.4z" fill="#fff" />
      </>}
      {p === 'INSTAGRAM' && <>
        <defs>
          <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FEDA75" /><stop offset=".35" stopColor="#FA7E1E" /><stop offset=".6" stopColor="#D62976" /><stop offset="1" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="7" fill={`url(#${gid})`} />
        <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="16.1" cy="7.9" r="1" fill="#fff" />
      </>}
      {p === 'YOUTUBE' && <>
        <rect y="3.5" width="24" height="17" rx="5" fill="#FF0000" />
        <path d="M10 8.5v7l6-3.5z" fill="#fff" />
      </>}
      {p === 'X' && <>
        <rect width="24" height="24" rx="6" fill="#0F1419" />
        <path d="M6.5 6h3.2l2.6 3.6L15.4 6h1.9l-4.1 4.7L18 18h-3.2l-2.9-4-3.5 4H6.5l4.5-5.1z" fill="#fff" />
      </>}
      {p === 'THREADS' && <>
        <rect width="24" height="24" rx="6" fill="#101010" />
        <path d="M15.6 11.4c-.1 0-.2-.1-.3-.1-.2-2.6-1.6-4.1-4-4.1-1.4 0-2.6.6-3.3 1.7l1.3.9c.5-.8 1.3-1 2-1 .8 0 1.4.2 1.8.7.3.3.5.8.6 1.4-.7-.1-1.4-.2-2.2-.1-2.2.1-3.6 1.4-3.5 3.2.1.9.5 1.7 1.3 2.2.6.4 1.5.6 2.3.6 1.1-.1 2-.5 2.6-1.3.4-.6.7-1.3.9-2.2.5.3.9.7 1.1 1.2.4.8.4 2.2-.7 3.3-1 1-2.2 1.4-3.9 1.4-1.9 0-3.4-.6-4.3-1.8-.9-1.1-1.4-2.7-1.4-4.8s.5-3.7 1.4-4.8C8.2 5.6 9.7 5 11.6 5s3.4.6 4.4 1.8c.5.6.9 1.3 1.1 2.2l1.5-.4c-.3-1.1-.8-2-1.4-2.8C16 4.2 14.1 3.4 11.6 3.4 9.2 3.4 7.3 4.2 6 5.8 4.8 7.2 4.2 9.3 4.2 11.8s.6 4.6 1.8 6c1.3 1.6 3.2 2.4 5.6 2.4 2.1 0 3.6-.6 4.9-1.8 1.7-1.7 1.6-3.8 1.1-5-.4-.9-1.1-1.6-2-2zm-3.9 3.8c-.9 0-1.9-.4-1.9-1.3 0-.7.5-1.5 2.1-1.6h.5c.6 0 1.1.1 1.6.2-.2 2.2-1.2 2.7-2.3 2.7z" fill="#fff" />
      </>}
      {p === 'TIKTOK' && <>
        <rect width="24" height="24" rx="6" fill="#111" />
        <path d="M16.6 8.1a3.4 3.4 0 0 1-2.1-2.6h-2.3v9.2a1.9 1.9 0 1 1-1.4-1.9v-2.4a4.3 4.3 0 1 0 3.7 4.3V10a5.7 5.7 0 0 0 3.2 1V8.6c-.4 0-.8-.2-1.1-.5z" fill="#25F4EE" transform="translate(-.6 -.4)" />
        <path d="M16.6 8.1a3.4 3.4 0 0 1-2.1-2.6h-2.3v9.2a1.9 1.9 0 1 1-1.4-1.9v-2.4a4.3 4.3 0 1 0 3.7 4.3V10a5.7 5.7 0 0 0 3.2 1V8.6c-.4 0-.8-.2-1.1-.5z" fill="#FE2C55" transform="translate(.6 .4)" />
        <path d="M16.6 8.1a3.4 3.4 0 0 1-2.1-2.6h-2.3v9.2a1.9 1.9 0 1 1-1.4-1.9v-2.4a4.3 4.3 0 1 0 3.7 4.3V10a5.7 5.7 0 0 0 3.2 1V8.6c-.4 0-.8-.2-1.1-.5z" fill="#fff" />
      </>}
      {p === 'LINKEDIN' && <>
        <rect width="24" height="24" rx="5" fill="#0A66C2" />
        <path d="M7.2 9.6h2.3V17H7.2zM8.3 6a1.3 1.3 0 1 1 0 2.7 1.3 1.3 0 0 1 0-2.7zM11 9.6h2.2v1c.3-.6 1.1-1.2 2.3-1.2 2.4 0 2.9 1.6 2.9 3.7V17h-2.3v-3.5c0-.8 0-1.9-1.2-1.9s-1.4.9-1.4 1.9V17H11z" fill="#fff" />
      </>}
      {p === 'PINTEREST' && <>
        <circle cx="12" cy="12" r="12" fill="#E60023" />
        <path d="M12.3 4.8c-4 0-6 2.8-6 5.2 0 1.4.5 2.7 1.7 3.2.2.1.4 0 .4-.2l.2-.7c.1-.2 0-.3-.1-.5-.4-.4-.6-1-.6-1.8 0-2.3 1.7-4.4 4.5-4.4 2.5 0 3.8 1.5 3.8 3.5 0 2.6-1.2 4.9-2.9 4.9-1 0-1.7-.8-1.4-1.8.3-1.1.8-2.4.8-3.2 0-.7-.4-1.4-1.2-1.4-1 0-1.7 1-1.7 2.3 0 .8.3 1.4.3 1.4l-1.1 4.7c-.3 1.4 0 3.1 0 3.3 0 .1.1.1.2.1s1.2-1.5 1.6-2.9l.6-2.4c.3.6 1.2 1.1 2.2 1.1 2.9 0 4.8-2.6 4.8-6.1 0-2.7-2.2-5.2-5.6-5.2z" fill="#fff" />
      </>}
      {p === 'WHATSAPP_CHANNEL' && <>
        <circle cx="12" cy="12" r="12" fill="#25D366" />
        <path d="M12 5.5a6.4 6.4 0 0 0-5.5 9.7l-.9 3.3 3.4-.9A6.4 6.4 0 1 0 12 5.5zm3.7 9c-.2.4-.9.8-1.3.9-.3 0-.7.1-2.3-.5-1.9-.8-3.1-2.7-3.2-2.9-.1-.1-.8-1-.8-2s.5-1.4.7-1.6c.2-.2.4-.2.5-.2h.4c.1 0 .3 0 .4.3l.6 1.4c.1.1.1.2 0 .4l-.2.3-.3.3c-.1.1-.2.2-.1.4.1.2.5.9 1.2 1.4.8.7 1.4.9 1.6 1 .2.1.3.1.4-.1l.6-.7c.1-.2.3-.2.4-.1l1.3.6c.2.1.3.1.3.2.1.1.1.5-.2 1z" fill="#fff" />
      </>}
      {p === 'GOOGLE_BUSINESS' && <>
        <rect width="24" height="24" rx="6" fill="#fff" stroke="#dadce0" />
        <path d="M19.6 12.2c0-.6-.1-1.1-.2-1.6H12v3h4.3a3.7 3.7 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.3-3.4 2.3-5.8z" fill="#4285F4" />
        <path d="M12 20c2.2 0 4-.7 5.3-2l-2.6-2c-.7.5-1.6.8-2.7.8-2.1 0-3.9-1.4-4.5-3.3H4.8v2.1A8 8 0 0 0 12 20z" fill="#34A853" />
        <path d="M7.5 13.5a4.8 4.8 0 0 1 0-3V8.4H4.8a8 8 0 0 0 0 7.2z" fill="#FBBC05" />
        <path d="M12 7.2c1.2 0 2.2.4 3 1.2l2.3-2.3A8 8 0 0 0 4.8 8.4l2.7 2.1C8.1 8.6 9.9 7.2 12 7.2z" fill="#EA4335" />
      </>}
    </svg>
  );
}

/** Row of overlapping platform marks. */
export function PlatformStack({ platforms, size = 16, max = 5 }: { platforms: SocialPlatform[]; size?: number; max?: number }) {
  const shown = platforms.slice(0, max);
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => (
        <span key={p} className="rounded-full ring-2 ring-white" style={{ marginInlineStart: i ? -size / 3 : 0, lineHeight: 0 }}>
          <PlatformMark p={p} size={size} />
        </span>
      ))}
      {platforms.length > max && <span className="ms-1 text-[0.6875rem] font-semibold text-slate-500">+{platforms.length - max}</span>}
    </span>
  );
}

/**
 * Social platforms: names, colours, small brand marks, and where "Post
 * karein" sends the merchant (the app on a phone, the website on a computer).
 */

import { BrandLogo } from '@/assets/brands/BrandLogo';
import { t } from '@core/i18n';
import type { PostKind, PostStatus, SocialPlatform } from './social.api';

export const PLATFORM_META: Record<SocialPlatform, { label: string; color: string; app: string; web: string }> = {
  FACEBOOK: { label: 'Facebook', color: '#1877F2', app: 'fb://', web: 'https://www.facebook.com/' },
  INSTAGRAM: { label: 'Instagram', color: '#E1306C', app: 'instagram://camera', web: 'https://www.instagram.com/' },
  TIKTOK: { label: 'TikTok', color: '#000000', app: 'tiktok://', web: 'https://www.tiktok.com/upload' },
  YOUTUBE: { label: 'YouTube', color: '#FF0000', app: 'youtube://', web: 'https://studio.youtube.com/' },
  WHATSAPP_STATUS: { label: 'WhatsApp status', color: '#25D366', app: 'whatsapp://', web: 'https://web.whatsapp.com/' },
};

export const KIND_LABEL: Record<PostKind, string> = { POST: t('Post'), REEL: t('Reel / video'), STORY: t('Story'), STATUS: t('Status') };

export const STATUS_META: Record<PostStatus, { label: string; tone: string; dot: string }> = {
  IDEA: { label: t('Idea'), tone: 'bg-slate-100 text-slate-700', dot: '#94a3b8' },
  DRAFT: { label: t('Draft'), tone: 'bg-amber-50 text-amber-800', dot: '#f59e0b' },
  READY: { label: t('Ready'), tone: 'bg-sky-50 text-sky-800', dot: '#0284c7' },
  POSTED: { label: t('Posted'), tone: 'bg-success-50 text-success-700', dot: '#16a34a' },
};

/** True on phones and tablets, where the platform apps can open. */
export const isPhone = () => typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

/** Opens the platform: its app on a phone (website if the app does not open), the website on a computer. */
export function openPlatform(p: SocialPlatform) {
  const m = PLATFORM_META[p];
  if (!isPhone()) { window.open(m.web, '_blank', 'noopener'); return; }
  const fallback = window.setTimeout(() => { window.location.href = m.web; }, 1200);
  window.addEventListener('pagehide', () => window.clearTimeout(fallback), { once: true });
  window.location.href = m.app;
}

/** Small round brand mark. TikTok and WhatsApp use the shared logos; the rest are drawn here. */
export function PlatformMark({ p, size = 20 }: { p: SocialPlatform; size?: number }) {
  if (p === 'TIKTOK') return <BrandLogo name="tiktok" size={size} />;
  if (p === 'WHATSAPP_STATUS') return <BrandLogo name="whatsapp" size={size} />;
  const label = PLATFORM_META[p].label;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className="shrink-0">
      {p === 'FACEBOOK' && <>
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path d="M13.4 19.5v-6h2l.3-2.4h-2.3V9.6c0-.7.2-1.2 1.2-1.2h1.2V6.3c-.2 0-1-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.8H9v2.4h2v6h2.4z" fill="#fff" />
      </>}
      {p === 'INSTAGRAM' && <>
        <defs>
          <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FEDA75" /><stop offset=".35" stopColor="#FA7E1E" /><stop offset=".6" stopColor="#D62976" /><stop offset="1" stopColor="#4F5BD5" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="7" fill="url(#ig-grad)" />
        <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="16.1" cy="7.9" r="1" fill="#fff" />
      </>}
      {p === 'YOUTUBE' && <>
        <rect y="3.5" width="24" height="17" rx="5" fill="#FF0000" />
        <path d="M10 8.5v7l6-3.5z" fill="#fff" />
      </>}
    </svg>
  );
}

/** Date and time in the shop's local style: "Mon 10 Nov, 8:00 PM". */
export const whenLabel = (iso: string | null) => {
  if (!iso) return t('Tareekh nahi');
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}`;
};

/** Caption with hashtags, ready to paste. */
export const fullCaption = (caption: string, hashtags: string[]) => [caption.trim(), hashtags.join(' ')].filter(Boolean).join('\n\n');

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDaysKey = (key: string, n: number) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + n); return dayKey(d); };

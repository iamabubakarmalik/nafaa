/**
 * Live post previews drawn as each platform's own feed card: Facebook feed,
 * Instagram feed (4:5 crop), Instagram reel (9:16), X and LinkedIn. TikTok,
 * YouTube Shorts and Threads reuse the closest frame. These are mock frames
 * that follow the caption, media and link as they are typed.
 */

import { useState, type ReactNode } from 'react';
import {
  Bookmark, ChevronLeft, ChevronRight, Globe2, Heart, ImageIcon, MessageCircle, MoreHorizontal, Music2, Repeat2, Send, Share, Share2, ThumbsUp, BarChart2,
} from 'lucide-react';
import type { PostKind, PostMedia, SocialAccount, SocialPlatform } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { PLATFORM, PlatformMark } from '../lib/platforms';

export interface PreviewData {
  platform: SocialPlatform;
  account?: SocialAccount | null;
  text: string;
  media: PostMedia[];
  kind: PostKind;
  link: string;
  firstComment?: string;
  when?: string | null;
}

/** Caption with hashtags, mentions and links coloured like the platform does. */
function RichText({ text, linkClass }: { text: string; linkClass: string }) {
  const parts = text.split(/(https?:\/\/\S+|#[\p{L}\p{N}_]+|@[\w.]+)/gu);
  return <>{parts.map((s, i) => (/^(https?:\/\/|#|@)/.test(s) ? <span key={i} className={linkClass}>{s}</span> : <span key={i}>{s}</span>))}</>;
}

/** Caption cut after a few lines with the platform's "more" word. */
function Clamp({ text, lines, more, linkClass, className, lead }: { text: string; lines: number; more: string; linkClass: string; className?: string; lead?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const long = text.split('\n').length > lines || text.length > lines * 52;
  if (!text.trim() && !lead) return null;
  return (
    <div className={cn('whitespace-pre-wrap break-words', className)}>
      <div style={!open && long ? { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}>
        {lead}<RichText text={text} linkClass={linkClass} />
      </div>
      {long && <button type="button" onClick={() => setOpen((v) => !v)} className="font-semibold text-slate-500 hover:underline">{open ? 'less' : more}</button>}
    </div>
  );
}

function Media({ m, className, fit = 'cover' }: { m: PostMedia; className?: string; fit?: 'cover' | 'contain' }) {
  return m.kind === 'video'
    ? <video src={m.url} poster={m.thumbUrl ?? undefined} muted loop playsInline autoPlay className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain', className)} />
    : <img src={m.url} alt={m.alt ?? ''} className={cn('h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain', className)} />;
}

function NoMedia({ label = 'No media yet' }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400">
      <ImageIcon className="h-7 w-7" />
      <span className="text-[0.6875rem] font-medium">{label}</span>
    </div>
  );
}

/** Swipeable media with arrows and dots, like an Instagram carousel. */
function Carousel({ media, aspect, dots = 'below' }: { media: PostMedia[]; aspect: string; dots?: 'below' | 'over' }) {
  const [i, setI] = useState(0);
  const idx = Math.min(i, Math.max(0, media.length - 1));
  return (
    <div>
      <div className="relative overflow-hidden bg-black" style={{ aspectRatio: aspect }}>
        {media.length ? <Media m={media[idx]} /> : <NoMedia />}
        {media.length > 1 && <>
          <span className="absolute end-2.5 top-2.5 rounded-full bg-black/70 px-2 py-0.5 text-[0.6875rem] font-semibold text-white">{idx + 1}/{media.length}</span>
          {idx > 0 && <button type="button" aria-label="Previous" onClick={() => setI(idx - 1)} className="absolute start-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow"><ChevronLeft className="h-4 w-4" /></button>}
          {idx < media.length - 1 && <button type="button" aria-label="Next" onClick={() => setI(idx + 1)} className="absolute end-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow"><ChevronRight className="h-4 w-4" /></button>}
          {dots === 'over' && <Dots n={media.length} i={idx} className="absolute inset-x-0 bottom-2" light />}
        </>}
      </div>
      {media.length > 1 && dots === 'below' && <Dots n={media.length} i={idx} className="pt-2" />}
    </div>
  );
}

function Dots({ n, i, className, light }: { n: number; i: number; className?: string; light?: boolean }) {
  return (
    <div className={cn('flex justify-center gap-1', className)}>
      {Array.from({ length: n }, (_, k) => <span key={k} className={cn('h-1.5 w-1.5 rounded-full', k === i ? (light ? 'bg-white' : 'bg-[#0095F6]') : light ? 'bg-white/50' : 'bg-slate-300')} />)}
    </div>
  );
}

function Avatar({ account, platform, size = 36 }: { account?: SocialAccount | null; platform: SocialPlatform; size?: number }) {
  return account?.avatarUrl
    ? <img src={account.avatarUrl} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    : <span className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>n</span>;
}

const nameOf = (a: SocialAccount | null | undefined, fallback: string) => a?.name || fallback;
const handleOf = (a: SocialAccount | null | undefined, fallback: string) => (a?.handle || fallback).replace(/^@/, '');
const host = (link: string) => { try { return new URL(link).hostname.replace(/^www\./, ''); } catch { return 'nafaa.pk'; } };

/** Link card shown when a post has a link and no media. */
function LinkCard({ link, variant }: { link: string; variant: 'fb' | 'li' | 'x' }) {
  return (
    <div className={cn('overflow-hidden bg-slate-50', variant === 'x' ? 'mt-2 rounded-2xl ring-1 ring-slate-200' : 'border-y border-slate-200')}>
      <div className="flex aspect-[1.91/1] items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-800 text-2xl font-black tracking-tight text-white">nafaa</div>
      <div className="px-3 py-2">
        <p className="text-[0.6875rem] uppercase text-slate-500">{host(link)}</p>
        <p className="truncate text-[0.8125rem] font-semibold text-slate-900">Nafaa: POS, khata and online store for Pakistani shops</p>
      </div>
    </div>
  );
}

// ─── Facebook ────────────────────────────────────────────────────────────

function FacebookFeed({ d }: { d: PreviewData }) {
  const m = d.media;
  return (
    <div className="overflow-hidden rounded-xl bg-white text-[0.875rem] text-slate-900 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2 px-3 pt-3">
        <Avatar account={d.account} platform="FACEBOOK" size={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.875rem] font-semibold">{nameOf(d.account, 'Nafaa')}</p>
          <p className="flex items-center gap-1 text-[0.75rem] text-slate-500">{d.when ?? 'Just now'} · <Globe2 className="h-3 w-3" /></p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-slate-500" />
      </div>
      <Clamp text={d.text} lines={5} more="See more" linkClass="text-[#1877F2]" className="px-3 pb-2.5 pt-2 text-[0.9375rem] leading-snug" />
      {m.length === 0 && d.link && <LinkCard link={d.link} variant="fb" />}
      {m.length === 1 && <div className="max-h-[30rem] bg-black"><Media m={m[0]} fit="contain" className="max-h-[30rem]" /></div>}
      {m.length === 2 && <div className="grid grid-cols-2 gap-0.5">{m.map((x, i) => <div key={i} className="aspect-square"><Media m={x} /></div>)}</div>}
      {m.length >= 3 && (
        <div className="grid grid-cols-2 gap-0.5">
          <div className="col-span-2 aspect-[2/1]"><Media m={m[0]} /></div>
          {m.slice(1, 3).map((x, i) => (
            <div key={i} className="relative aspect-square">
              <Media m={x} />
              {i === 1 && m.length > 3 && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-bold text-white">+{m.length - 3}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="mx-3 mt-1 grid grid-cols-3 border-t border-slate-200 py-1 text-[0.8125rem] font-semibold text-slate-600">
        <span className="flex items-center justify-center gap-1.5 py-1.5"><ThumbsUp className="h-4 w-4" />Like</span>
        <span className="flex items-center justify-center gap-1.5 py-1.5"><MessageCircle className="h-4 w-4" />Comment</span>
        <span className="flex items-center justify-center gap-1.5 py-1.5"><Share className="h-4 w-4" />Share</span>
      </div>
      {d.firstComment && <FirstComment account={d.account} platform="FACEBOOK" text={d.firstComment} />}
    </div>
  );
}

function FirstComment({ account, platform, text }: { account?: SocialAccount | null; platform: SocialPlatform; text: string }) {
  return (
    <div className="flex gap-2 border-t border-slate-100 px-3 py-2.5">
      <Avatar account={account} platform={platform} size={28} />
      <div className="min-w-0 rounded-2xl bg-slate-100 px-3 py-1.5 text-[0.8125rem]">
        <p className="font-semibold">{nameOf(account, 'Nafaa')} <span className="ms-1 rounded bg-slate-200 px-1 text-[0.625rem] font-medium text-slate-600">Author</span></p>
        <p className="whitespace-pre-wrap break-words"><RichText text={text} linkClass="text-[#1877F2]" /></p>
      </div>
    </div>
  );
}

// ─── Instagram ───────────────────────────────────────────────────────────

function InstagramFeed({ d }: { d: PreviewData }) {
  const handle = handleOf(d.account, 'nafaa.pk');
  return (
    <div className="overflow-hidden rounded-xl bg-white text-[0.875rem] text-slate-900 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[2px]"><span className="block rounded-full bg-white p-[2px]"><Avatar account={d.account} platform="INSTAGRAM" size={28} /></span></span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.8125rem] font-semibold">{handle}</p>
          {d.link && <p className="truncate text-[0.6875rem] text-slate-500">Sponsored link in bio</p>}
        </div>
        <MoreHorizontal className="h-5 w-5" />
      </div>
      <Carousel media={d.media} aspect="4 / 5" />
      <div className="flex items-center gap-3.5 px-3 pt-2.5">
        <Heart className="h-6 w-6" /><MessageCircle className="h-6 w-6 -scale-x-100" /><Send className="h-6 w-6" />
        <Bookmark className="ms-auto h-6 w-6" />
      </div>
      <Clamp text={d.text} lines={2} more="more" linkClass="text-[#00376B]" className="px-3 pb-1 pt-0.5 text-[0.8125rem] leading-snug" lead={<span className="me-1 font-semibold">{handle}</span>} />
      {d.firstComment && <p className="px-3 pb-1 text-[0.8125rem]"><span className="me-1 font-semibold">{handle}</span><RichText text={d.firstComment} linkClass="text-[#00376B]" /></p>}
      <p className="px-3 pb-3 text-[0.6875rem] uppercase text-slate-400">{d.when ?? 'Just now'}</p>
      {d.link && <p className="border-t border-slate-100 px-3 py-2 text-[0.6875rem] text-amber-700">Links in Instagram captions are not clickable. Put it in the bio or a story.</p>}
    </div>
  );
}

/** Vertical 9:16 frame used for Instagram reels, TikTok and YouTube Shorts. */
function VerticalVideo({ d, flavour }: { d: PreviewData; flavour: 'reel' | 'tiktok' | 'shorts' }) {
  const handle = handleOf(d.account, flavour === 'shorts' ? 'Nafaapk' : 'nafaa.pk');
  const v = d.media.find((m) => m.kind === 'video') ?? d.media[0];
  return (
    <div className="mx-auto w-full max-w-[19rem] overflow-hidden rounded-[1.75rem] bg-black p-1.5 shadow-lg ring-1 ring-slate-300">
      <div className="relative overflow-hidden rounded-[1.4rem] bg-neutral-900" style={{ aspectRatio: '9 / 16' }}>
        {v ? <Media m={v} /> : <NoMedia label="Add a vertical video" />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3 text-[0.8125rem] font-semibold text-white">
          <span>{flavour === 'reel' ? 'Reels' : flavour === 'tiktok' ? 'Following  ·  For You' : 'Shorts'}</span>
          <PlatformMark p={flavour === 'reel' ? 'INSTAGRAM' : flavour === 'tiktok' ? 'TIKTOK' : 'YOUTUBE'} size={16} />
        </div>
        <div className="absolute bottom-16 end-2 flex flex-col items-center gap-3.5 text-white">
          {[[Heart, '2.4K'], [MessageCircle, '86'], [flavour === 'reel' ? Send : Share2, 'Share']].map(([Icon, n], i) => {
            const I = Icon as typeof Heart;
            return <span key={i} className="flex flex-col items-center gap-0.5 text-[0.625rem] font-semibold"><I className="h-6 w-6 drop-shadow" />{n as string}</span>;
          })}
          <MoreHorizontal className="h-5 w-5" />
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-1.5 px-3 pb-3 pe-12 text-white">
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
            <Avatar account={d.account} platform="INSTAGRAM" size={24} />{flavour === 'shorts' ? `@${handle}` : handle}
            <span className="rounded-md border border-white/70 px-1.5 py-px text-[0.6875rem]">{flavour === 'shorts' ? 'Subscribe' : 'Follow'}</span>
          </p>
          <Clamp text={d.text} lines={2} more="more" linkClass="font-semibold text-white" className="text-[0.75rem] leading-snug text-white/95" />
          <p className="flex items-center gap-1.5 text-[0.6875rem] text-white/90"><Music2 className="h-3 w-3" />Original audio · {handle}</p>
        </div>
      </div>
    </div>
  );
}

// ─── X ───────────────────────────────────────────────────────────────────

function XPost({ d }: { d: PreviewData }) {
  const m = d.media.slice(0, 4);
  return (
    <div className="rounded-xl bg-white px-3 py-3 text-[0.9375rem] text-slate-900 shadow-sm ring-1 ring-slate-200">
      <div className="flex gap-2.5">
        <Avatar account={d.account} platform="X" size={40} />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1 text-[0.9375rem] leading-tight">
            <span className="truncate font-bold">{nameOf(d.account, 'Nafaa')}</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden><path fill="#1D9BF0" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" /></svg>
            <span className="truncate text-slate-500">@{handleOf(d.account, 'nafaapk')} · {d.when ? d.when.split(',')[0] : 'now'}</span>
          </p>
          <div className="mt-0.5 whitespace-pre-wrap break-words leading-snug"><RichText text={d.text} linkClass="text-[#1D9BF0]" /></div>
          {m.length > 0 && (
            <div className={cn('mt-2.5 grid gap-0.5 overflow-hidden rounded-2xl ring-1 ring-slate-200', m.length > 1 && 'grid-cols-2')}>
              {m.map((x, i) => <div key={i} className={cn(m.length === 1 ? 'aspect-[16/9]' : m.length === 3 && i === 0 ? 'row-span-2' : 'aspect-[16/9]')}><Media m={x} /></div>)}
            </div>
          )}
          {!m.length && d.link && <LinkCard link={d.link} variant="x" />}
          <div className="mt-2.5 flex max-w-[22rem] justify-between text-[0.8125rem] text-slate-500">
            <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /></span>
            <span className="flex items-center gap-1.5"><Repeat2 className="h-4 w-4" /></span>
            <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /></span>
            <span className="flex items-center gap-1.5"><BarChart2 className="h-4 w-4" />9.1K</span>
            <span className="flex items-center gap-2"><Bookmark className="h-4 w-4" /><Share className="h-4 w-4" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LinkedIn ────────────────────────────────────────────────────────────

function LinkedInPost({ d }: { d: PreviewData }) {
  const m = d.media;
  return (
    <div className="overflow-hidden rounded-xl bg-white text-[0.875rem] text-slate-900 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start gap-2 px-3 pt-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-gradient-to-br from-emerald-500 to-teal-700 text-lg font-bold text-white">
          {d.account?.avatarUrl ? <img src={d.account.avatarUrl} alt="" className="h-full w-full object-cover" /> : 'n'}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.875rem] font-semibold">{nameOf(d.account, 'Nafaa')}</p>
          <p className="truncate text-[0.75rem] text-slate-500">2,340 followers</p>
          <p className="flex items-center gap-1 text-[0.75rem] text-slate-500">{d.when ? d.when.split(',')[0] : 'Now'} · <Globe2 className="h-3 w-3" /></p>
        </div>
        <span className="text-[0.875rem] font-semibold text-[#0A66C2]">+ Follow</span>
      </div>
      <Clamp text={d.text} lines={3} more="…see more" linkClass="font-semibold text-[#0A66C2]" className="px-3 pb-2 pt-2 text-[0.875rem] leading-snug" />
      {m.length === 0 && d.link && <LinkCard link={d.link} variant="li" />}
      {m.length === 1 && <div className="bg-black"><Media m={m[0]} fit="contain" className="max-h-[28rem]" /></div>}
      {m.length > 1 && (
        <div className="grid grid-cols-2 gap-0.5">
          {m.slice(0, 4).map((x, i) => (
            <div key={i} className="relative aspect-square"><Media m={x} />{i === 3 && m.length > 4 && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-bold text-white">+{m.length - 4}</span>}</div>
          ))}
        </div>
      )}
      <div className="mx-3 mt-1 grid grid-cols-4 border-t border-slate-200 py-1 text-[0.75rem] font-semibold text-slate-600">
        {[[ThumbsUp, 'Like'], [MessageCircle, 'Comment'], [Repeat2, 'Repost'], [Send, 'Send']].map(([I, l]) => {
          const Icon = I as typeof ThumbsUp;
          return <span key={l as string} className="flex items-center justify-center gap-1 py-1.5"><Icon className="h-4 w-4" />{l as string}</span>;
        })}
      </div>
    </div>
  );
}

// ─── Threads / generic ──────────────────────────────────────────────────

function ThreadsPost({ d }: { d: PreviewData }) {
  return (
    <div className="rounded-xl bg-white px-3 py-3 text-[0.9375rem] text-slate-900 shadow-sm ring-1 ring-slate-200">
      <div className="flex gap-2.5">
        <Avatar account={d.account} platform="THREADS" size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-semibold leading-tight">{handleOf(d.account, 'nafaa.pk')} <span className="font-normal text-slate-400">{d.when ? d.when.split(',')[0] : 'now'}</span></p>
          <div className="mt-0.5 whitespace-pre-wrap break-words leading-snug"><RichText text={d.text} linkClass="text-[#0095F6]" /></div>
          {d.media.length > 0 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto">{d.media.map((x, i) => <div key={i} className="h-44 w-36 shrink-0 overflow-hidden rounded-lg"><Media m={x} /></div>)}</div>
          )}
          <div className="mt-2.5 flex gap-4 text-slate-600"><Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Repeat2 className="h-5 w-5" /><Send className="h-5 w-5" /></div>
        </div>
      </div>
    </div>
  );
}

function GenericPost({ d }: { d: PreviewData }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white text-[0.875rem] text-slate-900 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2 px-3 pt-3">
        <PlatformMark p={d.platform} size={28} />
        <p className="font-semibold">{nameOf(d.account, 'Nafaa')}</p>
      </div>
      <div className="whitespace-pre-wrap break-words px-3 py-2 leading-snug"><RichText text={d.text} linkClass="text-brand-700" /></div>
      {d.media[0] && <div className="aspect-square bg-black"><Media m={d.media[0]} fit="contain" /></div>}
    </div>
  );
}

/** Frames a platform can be previewed in. */
export type PreviewFrame = 'fb' | 'ig-feed' | 'ig-reel' | 'x' | 'linkedin' | 'threads' | 'tiktok' | 'shorts' | 'generic';

export function framesFor(p: SocialPlatform, kind: PostKind): PreviewFrame[] {
  switch (p) {
    case 'FACEBOOK': return ['fb'];
    case 'INSTAGRAM': return kind === 'REEL' || kind === 'STORY' ? ['ig-reel', 'ig-feed'] : ['ig-feed', 'ig-reel'];
    case 'X': return ['x'];
    case 'LINKEDIN': return ['linkedin'];
    case 'THREADS': return ['threads'];
    case 'TIKTOK': return ['tiktok'];
    case 'YOUTUBE': return ['shorts'];
    default: return ['generic'];
  }
}

export const FRAME_LABEL: Record<PreviewFrame, string> = {
  fb: 'Feed', 'ig-feed': 'Feed 4:5', 'ig-reel': 'Reel 9:16', x: 'Post', linkedin: 'Feed', threads: 'Post', tiktok: 'Video 9:16', shorts: 'Short 9:16', generic: 'Post',
};

export function PostPreview({ frame, data }: { frame: PreviewFrame; data: PreviewData }) {
  switch (frame) {
    case 'fb': return <FacebookFeed d={data} />;
    case 'ig-feed': return <InstagramFeed d={data} />;
    case 'ig-reel': return <VerticalVideo d={data} flavour="reel" />;
    case 'tiktok': return <VerticalVideo d={data} flavour="tiktok" />;
    case 'shorts': return <VerticalVideo d={data} flavour="shorts" />;
    case 'x': return <XPost d={data} />;
    case 'linkedin': return <LinkedInPost d={data} />;
    case 'threads': return <ThreadsPost d={data} />;
    default: return <GenericPost d={data} />;
  }
}

/** Platform tabs plus frame switch, used by the composer and approvals. */
export function PreviewPanel({ platforms, build, initial }: { platforms: SocialPlatform[]; build: (p: SocialPlatform) => PreviewData; initial?: SocialPlatform }) {
  const [sel, setSel] = useState<SocialPlatform | null>(initial ?? null);
  const p = sel && platforms.includes(sel) ? sel : platforms[0];
  const data = p ? build(p) : null;
  const frames = p && data ? framesFor(p, data.kind) : [];
  const [frameSel, setFrameSel] = useState<PreviewFrame | null>(null);
  const frame = frameSel && frames.includes(frameSel) ? frameSel : frames[0];
  if (!p || !data) {
    return <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-50 text-center text-[0.8125rem] text-slate-500 ring-1 ring-slate-200"><Globe2 className="h-6 w-6 text-slate-400" />Pick a platform to see the preview.</div>;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {platforms.map((x) => (
          <button key={x} type="button" onClick={() => { setSel(x); setFrameSel(null); }} title={PLATFORM[x].label}
            className={cn('flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.75rem] font-semibold ring-1 transition', x === p ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
            <PlatformMark p={x} size={14} />{PLATFORM[x].short}
          </button>
        ))}
        {frames.length > 1 && (
          <span className="ms-auto inline-flex rounded-lg bg-slate-100 p-0.5">
            {frames.map((f) => (
              <button key={f} type="button" onClick={() => setFrameSel(f)} className={cn('rounded-md px-2 py-1 text-[0.6875rem] font-semibold', f === frame ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>{FRAME_LABEL[f]}</button>
            ))}
          </span>
        )}
      </div>
      <div className="mx-auto max-w-[26rem]"><PostPreview frame={frame} data={data} /></div>
    </div>
  );
}

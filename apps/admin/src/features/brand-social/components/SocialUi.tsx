/** Small building blocks shared by every Nafaa Social page. */

import type { ReactNode } from 'react';
import { AlertTriangle, Film, ImageIcon, RefreshCw, Type } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Skeleton } from '@/design-system/components';
import type { Pillar, PostMedia, PostStatus, SocialAccount, SocialPlatform, SocialPost } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { PLATFORM, PlatformMark, STATUS } from '../lib/platforms';

/** True when a post is only waiting on platforms a person has to finish by hand. */
export function waitingOnHand(post?: Pick<SocialPost, 'status' | 'publishState'> | null): boolean {
  if (!post || post.status !== 'PUBLISHING' || !post.publishState) return false;
  const open = Object.values(post.publishState).filter((x) => x && !['PUBLISHED', 'SKIPPED'].includes(x.status));
  return open.length > 0 && open.every((x) => x.status === 'HANDOFF');
}

export function PostStatusBadge({ status, size, post }: { status: PostStatus; size?: 'xs' | 'sm'; post?: Pick<SocialPost, 'status' | 'publishState'> | null }) {
  if (waitingOnHand(post)) return <Badge variant="warning" size={size ?? 'sm'} dot>Waiting for you</Badge>;
  const s = STATUS[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={s.variant} size={size ?? 'sm'} dot>{s.label}</Badge>;
}

/** Error card with a retry button. */
export function LoadError({ error, onRetry, what = 'this page' }: { error: unknown; onRetry?: () => void; what?: string }) {
  return (
    <Card>
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6 text-rose-500" />}
        title={`Could not load ${what}`}
        description={apiError(error, 'The server did not answer. Check your connection and try again.')}
        action={onRetry && <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>Try again</Button>}
      />
    </Card>
  );
}

/** Grey blocks while a list loads. */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
    </div>
  );
}

/** First media item of a post as a square thumbnail. */
export function PostThumb({ media, kind, size = 44, className }: { media: PostMedia[]; kind?: string; size?: number; className?: string }) {
  const m = media[0];
  const style = { width: size, height: size };
  if (!m) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400', className)} style={style}>
        <Type className="h-4 w-4" />
      </span>
    );
  }
  const src = m.kind === 'video' ? m.thumbUrl : m.url;
  return (
    <span className={cn('relative shrink-0 overflow-hidden rounded-lg bg-slate-200', className)} style={style}>
      {src ? <img src={src} alt={m.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
        : m.kind === 'video' ? <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />
          : <ImageIcon className="m-auto h-4 w-4 text-slate-400" />}
      {m.kind === 'video' && <Film className="absolute bottom-0.5 end-0.5 h-3 w-3 text-white drop-shadow" />}
      {media.length > 1 && <span className="absolute end-0.5 top-0.5 rounded bg-black/60 px-1 text-[0.5625rem] font-bold text-white">{media.length}</span>}
      {kind === 'REEL' && <span className="absolute start-0.5 top-0.5 rounded bg-black/60 px-1 text-[0.5625rem] font-bold text-white">Reel</span>}
    </span>
  );
}

/** Account picture with its platform mark in the corner. */
export function AccountAvatar({ account, platform, size = 36, dim }: { account?: SocialAccount | null; platform: SocialPlatform; size?: number; dim?: boolean }) {
  const initial = (account?.name ?? account?.handle ?? PLATFORM[platform].label).replace(/^@/, '').charAt(0).toUpperCase();
  return (
    <span className={cn('relative inline-flex shrink-0', dim && 'opacity-50 grayscale')} style={{ width: size, height: size }}>
      {account?.avatarUrl
        ? <img src={account.avatarUrl} alt="" className="h-full w-full rounded-full object-cover ring-1 ring-slate-200" />
        : <span className="flex h-full w-full items-center justify-center rounded-full font-bold text-white" style={{ background: PLATFORM[platform].color, fontSize: size * 0.4 }}>{initial}</span>}
      <span className="absolute -bottom-0.5 -end-0.5 rounded-full bg-white p-px" style={{ lineHeight: 0 }}>
        <PlatformMark p={platform} size={Math.max(12, size * 0.42)} />
      </span>
    </span>
  );
}

export function PillarDot({ pillar, pillars, withLabel }: { pillar: string | null | undefined; pillars: Pillar[] | undefined; withLabel?: boolean }) {
  if (!pillar) return null;
  const p = pillars?.find((x) => x.key === pillar || x.label === pillar);
  const color = p?.color ?? '#94a3b8';
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      {withLabel && <span className="truncate text-[0.75rem] text-slate-600">{p?.label ?? pillar}</span>}
    </span>
  );
}

export const pillarColor = (pillar: string | null | undefined, pillars: Pillar[] | undefined) =>
  pillars?.find((x) => x.key === pillar || x.label === pillar)?.color ?? '#94a3b8';

/** Small section heading inside a card. */
export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{children}</h3>
      {action}
    </div>
  );
}

/** Per-platform publish result chips for a post. */
export function PublishChips({ post }: { post: SocialPost }) {
  const ps = post.publishState ?? {};
  return (
    <span className="inline-flex flex-wrap gap-1">
      {post.platforms.map((p) => {
        const s = ps[p]?.status;
        const tone = s === 'PUBLISHED' ? 'bg-success-50 text-success-700 ring-success-200'
          : s === 'FAILED' ? 'bg-rose-50 text-rose-700 ring-rose-200'
            : s === 'HANDOFF' ? 'bg-amber-50 text-amber-800 ring-amber-200'
              : s === 'WAITING' || s === 'PUBLISHING' ? 'bg-blue-50 text-blue-700 ring-blue-200'
                : 'bg-slate-50 text-slate-600 ring-slate-200';
        const label = s === 'PUBLISHED' ? 'Live' : s === 'FAILED' ? (ps[p]?.willRetry ? 'Retrying' : 'Failed') : s === 'HANDOFF' ? 'By hand'
          : s === 'WAITING' ? 'Processing' : s === 'PUBLISHING' ? 'Publishing' : s === 'SKIPPED' ? 'Skipped' : 'Waiting';
        const content = <><PlatformMark p={p} size={12} />{label}</>;
        const cls = cn('inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[0.6875rem] font-medium ring-1', tone);
        return ps[p]?.permalink
          ? <a key={p} href={ps[p]!.permalink!} target="_blank" rel="noreferrer" className={cn(cls, 'hover:underline')} title={ps[p]?.error ?? undefined}>{content}</a>
          : <span key={p} className={cls} title={ps[p]?.error ?? undefined}>{content}</span>;
      })}
    </span>
  );
}

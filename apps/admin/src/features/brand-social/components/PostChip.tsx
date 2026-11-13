/** A post on the calendar: pillar colour, time, platforms, kind, status. Draggable when it can still move. */

import type { DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Film, Images, Image as ImageIcon, Type, Video, CircleDot } from 'lucide-react';
import type { Pillar, PostKind, SocialPost } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { PlatformMark, PlatformStack, STATUS } from '../lib/platforms';
import { fmtTime } from '../lib/time';
import { pillarColor } from './SocialUi';

export const KIND_ICON: Record<PostKind, typeof Film> = { POST: ImageIcon, CAROUSEL: Images, REEL: Film, STORY: CircleDot, VIDEO: Video, TEXT: Type };

/** Posts that have gone out (or are going) stay where they are. */
export const canMove = (p: SocialPost) => !['PUBLISHING', 'PUBLISHED', 'PARTIAL', 'ARCHIVED'].includes(p.status);

export const DRAG_TYPE = 'application/x-nafaa-post';

export function PostChip({ post, pillars, compact, showTime = true, onDragStart, onDragEnd, dragging }: {
  post: SocialPost; pillars?: Pillar[]; compact?: boolean; showTime?: boolean; dragging?: boolean;
  onDragStart?: (post: SocialPost) => void; onDragEnd?: () => void;
}) {
  const movable = canMove(post);
  const Icon = KIND_ICON[post.kind] ?? ImageIcon;
  const st = STATUS[post.status];
  const color = pillarColor(post.pillar, pillars);
  return (
    <Link
      to={`/social/posts/${post.id}`}
      draggable={movable}
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.setData(DRAG_TYPE, post.id);
        e.dataTransfer.setData('text/plain', post.title);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(post);
      }}
      onDragEnd={onDragEnd}
      title={`${post.title}\n${st?.label ?? post.status}${post.scheduledAt ? ` · ${fmtTime(post.scheduledAt)} PKT` : ''}${movable ? '\nDrag to move' : ''}`}
      className={cn(
        'group/chip relative block overflow-hidden rounded-lg bg-white ps-2 pe-1.5 text-start shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-400',
        compact ? 'py-1' : 'py-1.5',
        movable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        dragging && 'opacity-40',
        ['FAILED', 'REJECTED'].includes(post.status) && 'ring-rose-300',
      )}
    >
      <span className="absolute inset-y-0 start-0 w-1" style={{ background: color }} />
      <span className="flex items-center gap-1 text-[0.6875rem] leading-tight">
        {showTime && post.scheduledAt && <span className="shrink-0 font-semibold tabular-nums text-slate-900">{fmtTime(post.scheduledAt)}</span>}
        <Icon className="h-3 w-3 shrink-0 text-slate-400" aria-label={post.kind} />
        {compact && <span className="inline-flex min-w-0 items-center gap-px overflow-hidden">{post.platforms.slice(0, 3).map((x) => <PlatformMark key={x} p={x} size={11} />)}{post.platforms.length > 3 && <span className="text-[0.5625rem] font-semibold text-slate-400">+{post.platforms.length - 3}</span>}</span>}
        <span className="ms-auto inline-flex shrink-0 items-center gap-1">
          {post.aiMade && <Bot className="h-3 w-3 text-violet-500" aria-label="AI marketer" />}
          <span className="h-2 w-2 rounded-full" style={{ background: st?.color }} aria-label={st?.label} />
        </span>
      </span>
      <span className={cn('mt-0.5 block truncate font-medium text-slate-700', compact ? 'text-[0.6875rem]' : 'text-[0.75rem]')}>{post.title}</span>
      {!compact && <span className="mt-1 block"><PlatformStack platforms={post.platforms} size={13} max={6} /></span>}
    </Link>
  );
}

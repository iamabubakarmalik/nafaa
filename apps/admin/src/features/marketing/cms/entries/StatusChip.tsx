/** Entry status chip and dot (ARCH 13: Draft, Scheduled, Live, Live + changes, Live noindex, Archived). */
import { cn } from '@/lib/cn';
import type { CmsStatus, RobotsReason } from '../contract/cms-contract';
import { TONE_CLASSES, TONE_DOT, statusView } from '../editor/lib';

export function StatusChip({
  status,
  hasUnpublishedChanges = false,
  noindexReason = null,
  className,
}: {
  status: CmsStatus;
  hasUnpublishedChanges?: boolean;
  noindexReason?: RobotsReason | null;
  className?: string;
}) {
  const v = statusView({ status, hasUnpublishedChanges, noindexReason });
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONE_CLASSES[v.tone], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[v.tone])} />
      {v.label}
    </span>
  );
}

export function StatusDot({ status }: { status: CmsStatus }) {
  const v = statusView({ status, hasUnpublishedChanges: false });
  return <span title={v.label} className={cn('h-2 w-2 shrink-0 rounded-full', TONE_DOT[v.tone])} />;
}

/** Small SEO score ring (0-100). */
export function ScoreRing({ score, size = 30 }: { score: number | null | undefined; size?: number }) {
  if (score === null || score === undefined) return <span className="text-xs text-neutral-400">—</span>;
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#e11d48';
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} title={`SEO score ${score}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e5e5" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)} />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums text-neutral-800">{score}</span>
    </span>
  );
}

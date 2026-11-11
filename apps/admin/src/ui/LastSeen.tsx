/**
 * "Online now" (pulsing dot, active in the last 5 minutes) or "3h ago", with
 * the app used: web, desktop or mobile. Used for shops and users.
 */

import { Monitor, Smartphone, Globe } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/format';

const ONLINE_MS = 5 * 60_000;
const APP = { web: { label: 'Web', icon: Globe }, desktop: { label: 'Desktop', icon: Monitor }, mobile: { label: 'Mobile', icon: Smartphone } } as const;

export const isOnline = (at?: string | null) => !!at && Date.now() - new Date(at).getTime() < ONLINE_MS;

export function OnlineDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2.5 w-2.5 shrink-0', className)} aria-hidden>
      {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', online ? 'bg-emerald-500' : 'bg-slate-300')} />
    </span>
  );
}

export function LastSeen({ at, via, compact, never = 'Never' }: { at?: string | null; via?: string | null; compact?: boolean; never?: string }) {
  const online = isOnline(at);
  const app = via && via in APP ? APP[via as keyof typeof APP] : null;
  if (!at) return <span className="text-slate-400">{never}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={formatDateTime(at)}>
      <OnlineDot online={online} />
      <span className={online ? 'font-semibold text-emerald-700' : 'text-slate-600'}>{online ? 'Online now' : formatRelative(at)}</span>
      {app && !compact && <span className="inline-flex items-center gap-0.5 text-[0.75rem] text-slate-400"><app.icon className="h-3 w-3" />{app.label}</span>}
    </span>
  );
}

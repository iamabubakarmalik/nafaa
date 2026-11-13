/** Platform picker with the real account pictures; manual accounts are marked "by hand". */

import { Link } from 'react-router-dom';
import { Check, Hand } from 'lucide-react';
import { SOCIAL_PLATFORMS, type SocialAccount, type SocialPlatform } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { PLATFORM } from '../../lib/platforms';
import { AccountAvatar } from '../SocialUi';

export function PlatformPicker({ accounts, value, onChange, disabled }: {
  accounts: SocialAccount[]; value: SocialPlatform[]; onChange: (v: SocialPlatform[]) => void; disabled?: boolean;
}) {
  const live = accounts.filter((a) => a.status !== 'DISCONNECTED');
  // One tile per platform that has an account, plus any already chosen without one.
  const platforms = SOCIAL_PLATFORMS.filter((p) => live.some((a) => a.platform === p) || value.includes(p));
  const toggle = (p: SocialPlatform) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);

  if (!platforms.length) {
    return (
      <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
        No accounts yet. <Link to="/social/accounts" className="font-semibold underline">Connect Facebook and Instagram or add your other accounts</Link> first.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((p) => {
        const acc = live.find((a) => a.platform === p);
        const on = value.includes(p);
        const manual = !acc || acc.status === 'MANUAL' || !acc.autoPublish || !PLATFORM[p].api;
        const broken = acc?.status === 'NEEDS_RECONNECT';
        return (
          <button key={p} type="button" disabled={disabled} onClick={() => toggle(p)} aria-pressed={on}
            title={`${PLATFORM[p].label}${acc?.handle ? ` · @${acc.handle.replace(/^@/, '')}` : ''}${manual ? ' · posted by hand' : ' · publishes automatically'}`}
            className={cn(
              'group relative flex items-center gap-2 rounded-xl py-1.5 pe-3 ps-1.5 text-start ring-1 transition disabled:cursor-not-allowed disabled:opacity-60',
              on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300',
            )}>
            <AccountAvatar account={acc} platform={p} size={32} dim={!on} />
            <span className="min-w-0 leading-tight">
              <span className="block text-[0.8125rem] font-semibold text-slate-900">{PLATFORM[p].label}</span>
              <span className={cn('flex items-center gap-1 text-[0.6875rem]', broken ? 'text-rose-600' : 'text-slate-500')}>
                {broken ? 'Reconnect needed' : manual ? <><Hand className="h-3 w-3" />By hand</> : acc?.handle ? `@${acc.handle.replace(/^@/, '')}` : 'Auto'}
              </span>
            </span>
            {on && <span className="absolute -end-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white"><Check className="h-2.5 w-2.5" /></span>}
          </button>
        );
      })}
    </div>
  );
}

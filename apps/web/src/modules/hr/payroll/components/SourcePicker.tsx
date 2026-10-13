/**
 * Where the money comes from: the branch's open drawer, a safe / bank /
 * wallet account, or (for a salary) "pay later". Shows what each holds and
 * warns when it is not enough.
 */

import { Clock, TriangleAlert } from 'lucide-react';
import { Checkbox } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { PaySource, Sources } from '../api/payroll.api';
import { ACCOUNT_ICON, DRAWER_ICON } from './meta';

export interface SourceValue { source: PaySource; accountId?: string; allowNegative: boolean }

export function SourcePicker({ sources, value, onChange, total, allowLater }: {
  sources: Sources; value: SourceValue; onChange: (v: SourceValue) => void; total: number; allowLater?: boolean;
}) {
  const drawerOk = sources.canDrawer && !!sources.drawer;
  const accounts = sources.canAccount ? sources.accounts : [];
  const held = value.source === 'DRAWER' ? sources.drawer?.cash ?? 0
    : value.source === 'ACCOUNT' ? accounts.find((a) => a.id === value.accountId)?.balance ?? 0 : Infinity;
  const short = value.source !== 'NONE' && total > held + 0.5;

  const Option = ({ active, onClick, icon: Icon, title, sub, disabled }: {
    active: boolean; onClick: () => void; icon: typeof Clock; title: string; sub: string; disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active}
      className={cn('flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">{title}</span>
        <span className="block truncate text-[0.75rem] text-slate-500">{sub}</span>
      </span>
    </button>
  );

  return (
    <div className="space-y-2">
      <p className="text-[0.8125rem] font-medium text-slate-700">Paisa kahan se dena hai?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.canDrawer && (
          <Option active={value.source === 'DRAWER'} onClick={() => onChange({ ...value, source: 'DRAWER', accountId: undefined })} icon={DRAWER_ICON}
            disabled={!drawerOk} title="Galle se (cash)"
            sub={sources.drawer ? `${sources.drawer.registerNumber} · abhi ${formatPKR(sources.drawer.cash)}` : 'Galla band hai ya branch nahi chuni'} />
        )}
        {accounts.map((a) => {
          const Icon = ACCOUNT_ICON[a.kind];
          return (
            <Option key={a.id} active={value.source === 'ACCOUNT' && value.accountId === a.id} onClick={() => onChange({ ...value, source: 'ACCOUNT', accountId: a.id })}
              icon={Icon} title={a.name} sub={`${a.shopName ?? 'Poora karobar'} · ${formatPKR(a.balance)}`} />
          );
        })}
        {allowLater && (
          <Option active={value.source === 'NONE'} onClick={() => onChange({ ...value, source: 'NONE', accountId: undefined })} icon={Clock}
            title="Abhi nahi — baad me dein" sub="Tankhwah ban jayegi, raqam baqi rahegi" />
        )}
      </div>
      <p className="text-[0.75rem] text-slate-500">
        Galle se diya cash shift ke hisaab me "Cash out" likha jata hai; account se diya us account ki statement me. Dono ki ijazat Team settings me alag hai.
      </p>
      {!sources.canDrawer && !accounts.length && !allowLater && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">Aap ko galle ya account se paisa dene ki ijazat nahi.</p>
      )}
      {short && (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <p className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />Yahan sirf {formatPKR(held)} hain, dena {formatPKR(total)} hai.</p>
          <div className="mt-2">
            <Checkbox checked={value.allowNegative} onChange={(e) => onChange({ ...value, allowNegative: e.target.checked })}
              label="Kam ho to bhi dein" description="Hisaab minus me chala jayega — baad me paisa daal kar barabar karein" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Ready to send: a source is chosen and, when short, the user agreed. */
export function sourceReady(sources: Sources | undefined, v: SourceValue, total: number) {
  if (!sources) return false;
  if (v.source === 'NONE') return true;
  if (v.source === 'DRAWER' && !(sources.canDrawer && sources.drawer)) return false;
  if (v.source === 'ACCOUNT' && !sources.accounts.some((a) => a.id === v.accountId)) return false;
  const held = v.source === 'DRAWER' ? sources.drawer?.cash ?? 0 : sources.accounts.find((a) => a.id === v.accountId)?.balance ?? 0;
  return total <= held + 0.5 || v.allowNegative;
}

/** First sensible choice: the drawer when open, else the first account, else later. */
export function defaultSource(sources: Sources | undefined, allowLater: boolean): SourceValue {
  if (sources?.canDrawer && sources.drawer) return { source: 'DRAWER', allowNegative: false };
  const a = sources?.canAccount ? sources.accounts[0] : undefined;
  if (a) return { source: 'ACCOUNT', accountId: a.id, allowNegative: false };
  return { source: allowLater ? 'NONE' : 'DRAWER', allowNegative: false };
}

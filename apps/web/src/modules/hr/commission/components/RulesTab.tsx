/**
 * The shop's commission rules as cards: what each pays, for whom, which
 * categories, its minimum and target, with an on/off switch and edit.
 */

import type { ReactNode } from 'react';
import { Gauge, Pencil, Plus, Target, Users } from 'lucide-react';
import { Button, Skeleton, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { CommissionRule, RulePayload } from '../api/commission.api';
import { rateText, ruleName } from './meta';

export const toPayload = (r: CommissionRule, patch: Partial<RulePayload> = {}): RulePayload => ({
  name: r.name ?? null, userId: r.userId ?? null, basis: r.basis, valueType: r.valueType, value: r.value, categoryIds: r.categoryIds,
  minMonthlySale: r.minMonthlySale ?? null, targetAmount: r.targetAmount ?? null, targetBonus: r.targetBonus ?? null,
  isActive: r.isActive, note: r.note ?? null, ...patch,
});

export function RulesTab({ rules, loading, categories, busy, onNew, onEdit, onToggle }: {
  rules: CommissionRule[];
  loading: boolean;
  categories: Array<{ id: string; name: string }>;
  busy: boolean;
  onNew: () => void;
  onEdit: (r: CommissionRule) => void;
  onToggle: (r: CommissionRule) => void;
}) {
  if (loading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>;
  if (!rules.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Gauge className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">Abhi koi rule nahi</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Ek rule bana dein, maslan "sale par 2%". Phir har mahine ka hisab asli sale se khud banta rahega.</p>
        <Button className="mt-4" onClick={onNew} leftIcon={<Plus className="h-4 w-4" />}>Naya rule</Button>
      </div>
    );
  }
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const ownFor = new Set(rules.filter((r) => r.isActive && r.userId).map((r) => r.userId));
  return (<>
    <p className="rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200/80">
      Jis bande ka apna rule ho us par sirf wohi chalta hai; baqi sab par "sab ke liye" wale rule chalte hain. Kai rule ek saath chal kar jur jate hain.
    </p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rules.map((r) => {
        const cats = r.categoryIds.map((id) => catName.get(id) ?? 'Hati hui category');
        return (
          <div key={r.id} className={cn('flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !r.isActive && 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{ruleName(r)}</p>
                <p className="text-lg font-bold text-brand-700">{rateText(r)}</p>
              </div>
              <button type="button" onClick={() => onEdit(r)} aria-label="Badlein" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] text-slate-600">
              <Users className="h-3.5 w-3.5" />{r.userId ? r.user?.fullName ?? 'Hataya hua banda' : `Sab chaalu bande${ownFor.size ? ` (${ownFor.size} ke apne rule hain)` : ''}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {cats.length > 0 && <Tag title={cats.join(', ')}>{cats.length > 2 ? `${cats.slice(0, 2).join(', ')} +${cats.length - 2}` : cats.join(', ')}</Tag>}
              {r.minMonthlySale ? <Tag>{formatPKR(r.minMonthlySale)} ke baad</Tag> : null}
              {r.targetAmount ? <Tag tone="amber"><Target className="h-3 w-3" />{formatPKR(r.targetAmount)} → {formatPKR(r.targetBonus ?? 0)}</Tag> : null}
            </div>
            {r.note && <p className="mt-2 line-clamp-2 text-[0.75rem] text-slate-500">{r.note}</p>}
            <div className="mt-auto pt-3">
              <Switch size="sm" label={r.isActive ? 'Chaalu' : 'Band'} checked={r.isActive} disabled={busy} onChange={() => onToggle(r)} />
            </div>
          </div>
        );
      })}
    </div>
  </>);
}

function Tag({ children, tone, title }: { children: ReactNode; tone?: 'amber'; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1',
      tone === 'amber' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-slate-50 text-slate-700 ring-slate-200')}>{children}</span>
  );
}

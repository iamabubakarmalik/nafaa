/**
 * Commission plans: what partners earn for bringing shops. Pick a plan on
 * the left and edit it on the right. One plan is the default for every
 * partner without their own plan; it starts at zero, so nobody earns until
 * the amounts are set here.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, Banknote, Clock, Lightbulb, Lock, Plus, Repeat, Save, Star, Trash2, TrendingUp, Users } from 'lucide-react';
import { Alert, Badge, Button, Card, Input, PageHero, PageShell, Skeleton, Switch, Textarea, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPartnersApi, type PartnerPlan, type PlanInput } from '@/api/admin-partners.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { formatPKRFull, num } from '@/lib/format';

const NEW = '__new__';

interface Draft {
  name: string; description: string; active: boolean; isDefault: boolean;
  signupBonus: string; activationBonus: string; activationSales: string; activationDays: string;
  recurringPercent: string; recurringMonths: string; managerOverridePercent: string; clawbackDays: string;
  slabs: Array<{ signups: string; bonus: string }>;
}

const blank: Draft = {
  name: '', description: '', active: true, isDefault: false, signupBonus: '0', activationBonus: '0', activationSales: '20', activationDays: '30',
  recurringPercent: '0', recurringMonths: '0', managerOverridePercent: '0', clawbackDays: '30', slabs: [],
};

const toDraft = (p: PartnerPlan): Draft => ({
  name: p.name, description: p.description ?? '', active: p.active, isDefault: p.isDefault,
  signupBonus: String(p.signupBonus), activationBonus: String(p.activationBonus), activationSales: String(p.activationSales), activationDays: String(p.activationDays),
  recurringPercent: String(p.recurringPercent), recurringMonths: String(p.recurringMonths), managerOverridePercent: String(p.managerOverridePercent), clawbackDays: String(p.clawbackDays),
  slabs: (p.slabs ?? []).map((s) => ({ signups: String(s.signups), bonus: String(s.bonus) })),
});

const toInput = (d: Draft): PlanInput => ({
  name: d.name.trim(), description: d.description.trim() || null, active: d.active, isDefault: d.isDefault,
  signupBonus: Number(d.signupBonus) || 0, activationBonus: Number(d.activationBonus) || 0,
  activationSales: Number(d.activationSales) || 0, activationDays: Number(d.activationDays) || 0,
  recurringPercent: Number(d.recurringPercent) || 0, recurringMonths: Number(d.recurringMonths) || 0,
  managerOverridePercent: Number(d.managerOverridePercent) || 0, clawbackDays: Number(d.clawbackDays) || 0,
  slabs: d.slabs.filter((s) => s.signups.trim() || s.bonus.trim()).map((s) => ({ signups: Number(s.signups), bonus: Number(s.bonus) })),
});

/** One-line summary of what a plan pays. */
function summary(p: PartnerPlan) {
  const parts = [
    p.signupBonus > 0 && `${formatPKRFull(p.signupBonus)} per paid signup`,
    p.activationBonus > 0 && `${formatPKRFull(p.activationBonus)} per activation`,
    p.recurringPercent > 0 && p.recurringMonths > 0 && `${p.recurringPercent}% for ${p.recurringMonths} months`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Pays nothing yet';
}

export default function PlansPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('partners.manage');
  const plans = useQuery({ queryKey: ['admin', 'partners', 'plans'], queryFn: adminPartnersApi.plans });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const list = plans.data ?? [];
  const selected = list.find((p) => p.id === selectedId);

  useEffect(() => { if (!selectedId && list.length) setSelectedId(list[0].id); }, [list, selectedId]);
  useEffect(() => {
    if (selectedId === NEW) setDraft(blank);
    else if (selected) setDraft(toDraft(selected));
  }, [selectedId, selected]);

  const dirty = useMemo(() => {
    if (!draft) return false;
    if (selectedId === NEW) return !!draft.name.trim();
    return !!selected && JSON.stringify(toInput(draft)) !== JSON.stringify(toInput(toDraft(selected)));
  }, [draft, selected, selectedId]);

  const save = useMutation({
    mutationFn: () => (selectedId === NEW ? adminPartnersApi.createPlan(toInput(draft!)) : adminPartnersApi.updatePlan(selectedId!, toInput(draft!))),
    onSuccess: (p) => { toast.success('Plan saved. New earnings use it from the next commission run.'); qc.invalidateQueries({ queryKey: ['admin', 'partners', 'plans'] }); setSelectedId(p.id); },
    onError: (e) => toast.error(apiError(e)),
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const def = list.find((p) => p.isDefault);
  const field = (k: keyof Draft, label: string, hint: string, opts: { suffix?: string; max?: number; step?: number } = {}) => (
    <Input label={label} hint={hint} type="number" min={0} max={opts.max} step={opts.step ?? 1} disabled={!canManage}
      value={draft![k] as string} onChange={(e) => set(k, e.target.value as never)} rightIcon={opts.suffix ? <span className="text-[0.75rem] text-slate-400">{opts.suffix}</span> : undefined} />
  );

  return (
    <PageShell>
      <PageHero
        title="Commission plans"
        chip={plans.data ? `${list.length} plans` : undefined}
        busy={plans.isFetching}
        loading={plans.isLoading}
        actions={
          <>
            {canManage && <button type="button" className={heroPrimaryButton} onClick={() => setSelectedId(NEW)}><Plus className="h-4 w-4" /> New plan</button>}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={plans.data ? [
          { label: 'Default plan', value: def?.name ?? '—', hint: def ? summary(def) : undefined },
          { label: 'Partners on default', value: num(def?.partners ?? 0) },
          { label: 'Active plans', value: num(list.filter((p) => p.active).length) },
        ] : undefined}
      />

      {def && def.signupBonus === 0 && def.activationBonus === 0 && def.recurringPercent === 0 && (
        <Alert tone="warning" title="The default plan pays nothing yet">
          It starts at zero so nobody earns by accident. Set the amounts below before partners start bringing shops.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card title="Plans" flush className="h-fit">
          <ul className="space-y-1 p-2">
            {plans.isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            {list.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setSelectedId(p.id)} className={cn('flex w-full items-start gap-3 rounded-xl p-2.5 text-start transition', p.id === selectedId ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-slate-50')}>
                  <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', p.isDefault ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                    {p.isDefault ? <Star className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5"><span className="truncate text-[0.875rem] font-semibold text-slate-900">{p.name}</span>{!p.active && <Badge>Off</Badge>}</span>
                    <span className="block text-[0.75rem] text-slate-500">{num(p.partners ?? 0)} partners · {summary(p)}</span>
                  </span>
                </button>
              </li>
            ))}
            {selectedId === NEW && <li className="rounded-xl bg-brand-50 p-2.5 text-[0.875rem] font-semibold text-brand-800 ring-1 ring-brand-200">New plan</li>}
          </ul>
        </Card>

        {draft ? (
          <Card
            title={selectedId === NEW ? 'New plan' : selected?.name}
            description={selected?.isDefault ? 'Default plan: used by every partner without their own plan.' : 'Give this plan to a partner from their profile.'}
            actions={canManage
              ? <Button size="sm" leftIcon={<Save className="h-4 w-4" />} disabled={!dirty || !draft.name.trim()} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
              : <span className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" /> View only</span>}
          >
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Name" required value={draft.name} disabled={!canManage} onChange={(e) => set('name', e.target.value)} />
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <Switch label="Default plan" description="For partners without their own plan." checked={draft.isDefault} disabled={!canManage || !!selected?.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
                  <Switch label="In use" description="Off hides it when picking a plan." checked={draft.active} disabled={!canManage || draft.isDefault} onChange={(e) => set('active', e.target.checked)} />
                </div>
              </div>
              <Textarea label="Description (admins only)" rows={2} value={draft.description} disabled={!canManage} onChange={(e) => set('description', e.target.value)} />

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-slate-900"><BadgeCheck className="h-4 w-4 text-brand-600" /> One-time bonuses</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field('signupBonus', 'Signup bonus (PKR)', 'Paid once, when the shop makes its first approved payment.', { suffix: 'PKR' })}
                  {field('activationBonus', 'Activation bonus (PKR)', 'Paid once, when the shop starts really using Nafaa (below).', { suffix: 'PKR' })}
                  {field('activationSales', 'Activation: sales needed', 'Number of sales the shop must make…', { suffix: 'sales' })}
                  {field('activationDays', 'Activation: within days', '…within this many days of joining.', { suffix: 'days' })}
                </div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-slate-900"><Repeat className="h-4 w-4 text-brand-600" /> Recurring share and managers</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {field('recurringPercent', 'Share of each payment', 'Percent of every approved shop payment…', { suffix: '%', max: 100, step: 0.5 })}
                  {field('recurringMonths', 'For months', '…for this many months from the first payment. 0 = off.', { suffix: 'months' })}
                  {field('managerOverridePercent', 'Manager override', 'Percent of an agent’s earning that their area manager also gets.', { suffix: '%', max: 100, step: 0.5 })}
                </div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-slate-900"><Clock className="h-4 w-4 text-brand-600" /> Hold period</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field('clawbackDays', 'Hold days', 'Earnings wait this long before they can be paid. If the payment is refunded or the shop is suspended in that time, the earning is cancelled.', { suffix: 'days' })}
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-slate-900"><TrendingUp className="h-4 w-4 text-brand-600" /> Monthly target bonus</h3>
                  {canManage && <Button size="xs" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => set('slabs', [...draft.slabs, { signups: '', bonus: '' }])}>Add step</Button>}
                </div>
                <p className="mb-2 text-[0.75rem] text-slate-500">Extra bonus for paid signups in a month. Only the highest step reached is paid, once, after the month ends.</p>
                {!draft.slabs.length ? <p className="rounded-xl bg-slate-50 px-3 py-3 text-[0.8125rem] text-slate-500 ring-1 ring-slate-200">No target bonus.</p> : (
                  <ul className="space-y-2">
                    {draft.slabs.map((s, i) => (
                      <li key={i} className="flex items-end gap-2">
                        <Input label={i === 0 ? 'Paid signups in the month' : undefined} type="number" min={1} value={s.signups} disabled={!canManage} wrapperClassName="flex-1"
                          onChange={(e) => set('slabs', draft.slabs.map((x, j) => (j === i ? { ...x, signups: e.target.value } : x)))} />
                        <Input label={i === 0 ? 'Bonus (PKR)' : undefined} type="number" min={0} value={s.bonus} disabled={!canManage} wrapperClassName="flex-1"
                          onChange={(e) => set('slabs', draft.slabs.map((x, j) => (j === i ? { ...x, bonus: e.target.value } : x)))} />
                        {canManage && <Button variant="ghost" size="icon" aria-label="Remove step" className="text-rose-600" onClick={() => set('slabs', draft.slabs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </Card>
        ) : <Skeleton className="h-96 rounded-3xl" />}
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Commission plans"
          description="A plan decides what a partner earns. Every partner uses the default plan unless you give them another."
          flowTitle="When a partner earns"
          flow={[
            { label: 'Shop activates', hint: 'Activation bonus', icon: BadgeCheck, color: '#4f46e5' },
            { label: 'First payment', hint: 'Signup bonus', icon: Banknote, color: '#0284c7' },
            { label: 'Later payments', hint: 'Recurring share', icon: Repeat, color: '#d97706' },
            { label: 'After hold days', hint: 'Payable', icon: Clock, color: '#059669' },
          ]}
          steps={[
            { icon: Star, color: '#d97706', title: 'Default plan', text: 'Starts at zero. Set its amounts before partners start, or nobody earns.' },
            { icon: Plus, color: '#4f46e5', title: 'Special plans', text: 'Make a plan for resellers or a city launch, then pick it on the partner’s profile.' },
            { icon: Users, color: '#0284c7', title: 'Managers', text: 'The override percent comes from the agent’s plan and goes to their area manager.' },
            { icon: Clock, color: '#059669', title: 'Changes', text: 'A change applies to earnings made after it. Earnings already made keep their amount.' },
          ]}
          tips={['Nafaa employees earn commission only when “Earns commission too” is on in their profile.', 'The commission job runs every 30 minutes.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

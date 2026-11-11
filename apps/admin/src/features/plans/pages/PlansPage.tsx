/**
 * Plans: the subscription plans shops can be on. Set prices, limits and the
 * features each plan includes. Plans are few, so they are listed as cards;
 * the editor opens in a side drawer. A plan any shop has used is switched off
 * and hidden instead of deleted.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Boxes, Check, Edit, Gift, Layers, Lightbulb, Plus, Puzzle, Sparkles, Trash2, Users } from 'lucide-react';
import {
  Alert, Badge, Button, Card, Drawer, EmptyState, Input, PageHero, PageShell, Skeleton, Switch, Textarea, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPlansApi, type AdminPlan, type UpsertPlanPayload } from '@/api/admin-plans.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatPKR, formatPKRFull, num } from '@/lib/format';
import { FeatureChecklist, featureSummary, useFeatureCatalog } from '../components/FeatureChecklist';

const TRIAL_SLUG = 'free-trial';
const UNLIMITED = 999_999;

type LimitField = 'maxProducts' | 'maxUsers' | 'maxShops' | 'maxSalesPerMonth';
const LIMITS: Array<[LimitField, string]> = [['maxShops', 'Shops'], ['maxUsers', 'Users'], ['maxProducts', 'Products'], ['maxSalesPerMonth', 'Bills a month']];

/** Old boolean columns → feature keys, for plans saved before the feature list existed. */
const LEGACY: Array<[keyof AdminPlan, string]> = [
  ['featureProfitReport', 'profit_report'], ['featureProfitReport', 'expenses'], ['featureLoyalty', 'loyalty'], ['featureDiscounts', 'discount_rules'],
  ['featureExports', 'exports'], ['featureBackup', 'backup'], ['featureStockTransfer', 'stock_transfer'], ['featureMultiShop', 'multi_shop'],
  ['featureWhatsappReceipt', 'whatsapp_receipt'], ['featureCustomBranding', 'branding'], ['featureSupport24x7', 'priority_support'], ['featureDistribution', 'distribution'],
];
const CORE = ['pos', 'khata', 'inventory', 'returns', 'barcode', 'cash_register', 'reports', 'offline'];

/** The features a plan gives today, the same way the server works them out. */
function planFeatures(p: AdminPlan): string[] {
  const out = new Set(p.features?.length ? p.features : [...CORE, ...LEGACY.filter(([col]) => p[col]).map(([, k]) => k)]);
  if (p.featureDistribution) out.add('distribution');
  return [...out];
}

const limitText = (n: number) => (n >= UNLIMITED ? 'Unlimited' : num(n));

/** Percent saved against paying monthly for the same months. */
function discount(monthly: number, price: number, months: number) {
  const full = monthly * months;
  if (!full || !price) return null;
  return Math.round((1 - price / full) * 100);
}

export default function PlansPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('plans.manage');
  const [editing, setEditing] = useState<AdminPlan | 'new' | null>(null);
  const catalog = useFeatureCatalog();

  const plans = useQuery({ queryKey: ['admin', 'plans'], queryFn: adminPlansApi.list });
  const rows = plans.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] });

  const remove = useMutation({
    mutationFn: adminPlansApi.remove,
    onSuccess: (r) => { toast.success(r.message ?? 'Plan deleted'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Could not delete the plan')),
  });
  const onDelete = async (p: AdminPlan) => {
    const used = p._count?.subscriptions ?? 0;
    const ok = await confirmDialog({
      title: used > 0 ? `Switch off ${p.name}?` : `Delete ${p.name}?`,
      text: used > 0
        ? `${num(used)} subscriptions have used this plan, so it cannot be deleted. It will be switched off and hidden. Shops on it keep it until their period ends.`
        : 'No shop has used this plan. It is deleted for good.',
      yes: used > 0 ? 'Switch off' : 'Delete plan',
      danger: true,
    });
    if (ok) remove.mutate(p.id);
  };

  const live = (p: AdminPlan) => (p.subscribers?.active ?? 0) + (p.subscribers?.pastDue ?? 0);
  const paying = rows.filter((p) => !p.isFree && p.slug !== TRIAL_SLUG).reduce((n, p) => n + live(p), 0);
  const trial = rows.reduce((n, p) => n + (p.subscribers?.trial ?? 0), 0);
  const onFree = rows.filter((p) => p.isFree).reduce((n, p) => n + live(p), 0);

  return (
    <PageShell>
      <PageHero
        title="Plans"
        chip={plans.data ? `${num(rows.length)} plans` : undefined}
        busy={plans.isFetching}
        loading={plans.isLoading}
        actions={
          <>
            {canManage && <button type="button" className={heroPrimaryButton} onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New plan</button>}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={plans.data ? [
          { label: 'Shops on paid plans', value: num(paying), hint: 'Active and past due' },
          { label: 'On trial', value: num(trial) },
          { label: 'On the free plan', value: num(onFree) },
          { label: 'Active plans', value: num(rows.filter((p) => p.isActive).length), hint: `${num(rows.filter((p) => p.isPublic && p.isActive).length)} public` },
        ] : undefined}
      />

      {plans.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={<Layers className="h-6 w-6" />} title="No plans yet" description="Create the first plan shops can subscribe to."
          action={canManage ? <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>New plan</Button> : undefined} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const q = discount(p.priceMonthly, p.priceQuarterly, 3);
            const y = discount(p.priceMonthly, p.priceYearly, 12);
            return (
              <Card key={p.id} className={p.isActive ? '' : 'opacity-70'}
                title={p.name}
                description={<span className="font-mono">{p.slug}</span>}
                actions={canManage ? (
                  <div className="flex gap-1">
                    <button type="button" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Edit className="h-4 w-4" /></button>
                    <button type="button" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ) : undefined}
              >
                <div className="flex flex-wrap gap-1.5">
                  {p.isFree && <Badge variant="brand">Free plan</Badge>}
                  {p.slug === TRIAL_SLUG && <Badge variant="info">{p.trialDays} day trial</Badge>}
                  <Badge variant={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Active' : 'Off'}</Badge>
                  <Badge variant={p.isPublic ? 'info' : 'warning'}>{p.isPublic ? 'Public' : 'Hidden'}</Badge>
                </div>
                <p className="mt-3 text-[0.875rem] text-slate-600">{p.description || 'No description'}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {([['Monthly', p.priceMonthly, null], ['Quarterly', p.priceQuarterly, q], ['Yearly', p.priceYearly, y]] as const).map(([label, price, off]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-2">
                      <div className="text-[0.6875rem] text-slate-500">{label}</div>
                      <div className="text-[0.9375rem] font-bold text-slate-900">{formatPKRFull(price)}</div>
                      {off != null && off > 0 && <div className="text-[0.6875rem] font-medium text-emerald-700">{off}% off</div>}
                    </div>
                  ))}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.8125rem]">
                  {LIMITS.map(([k, label]) => (
                    <div key={k} className="flex justify-between"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{limitText(p[k])}</dd></div>
                  ))}
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900"><Users className="h-3.5 w-3.5 text-slate-400" />{num(p.subscribers?.active ?? 0)} active</span>
                  {!!p.subscribers?.trial && <span className="text-slate-600">{num(p.subscribers.trial)} on trial</span>}
                  {!!p.subscribers?.pastDue && <span className="text-amber-700">{num(p.subscribers.pastDue)} past due</span>}
                  <span className="ms-auto text-[0.75rem] text-slate-500">{featureSummary(planFeatures(p), catalog.data?.features)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && <PlanDrawer plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}

      {guide.isOpen && (
        <PageGuide
          title="Plans"
          description="The plans shops can subscribe to: prices, limits and what each one includes."
          flowTitle="From plan to shop"
          flow={[
            { label: 'You set a plan', icon: Layers, color: '#4f46e5' },
            { label: 'Pricing page', hint: 'If public', icon: Sparkles, color: '#0284c7' },
            { label: 'Shop subscribes', icon: Users, color: '#d97706' },
            { label: 'Features turn on', icon: Boxes, color: '#059669' },
          ]}
          steps={[
            { icon: Plus, color: '#4f46e5', title: 'Prices and limits', text: 'Set the monthly, quarterly and yearly price. The discount for longer periods is shown as you type. Turn on "Unlimited" for no limit.' },
            { icon: Boxes, color: '#059669', title: 'Features', text: 'Tick what the plan includes. Shops on the plan get exactly these. Add-on features are normally sold as add-ons, not put in a plan.' },
            { icon: Gift, color: '#db2777', title: 'Free plan and trial', text: 'The free plan has no price. The trial plan’s length is the same as "Trial days" in billing settings.' },
            { icon: AlertTriangle, color: '#d97706', title: 'Changes apply to everyone', text: 'A change reaches every shop on the plan within a minute. Lowering a limit can lock shops that are already above it.' },
          ]}
          tips={['A plan any shop has used cannot be deleted. It is switched off and hidden instead.', 'Give one shop a different deal from Shop 360 → Plan & add-ons, not by changing the plan.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
          footer={<Link to="/addons" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><Puzzle className="h-4 w-4" /> Open add-ons</Link>}
        />
      )}
    </PageShell>
  );
}

const blank: UpsertPlanPayload = {
  name: '', slug: '', description: '', priceMonthly: 0, priceQuarterly: 0, priceYearly: 0, trialDays: 0, isActive: true, isPublic: true, sortOrder: 0,
  maxProducts: 500, maxUsers: 2, maxShops: 1, maxSalesPerMonth: 2000, features: CORE, isFree: false,
};

const toForm = (p: AdminPlan): UpsertPlanPayload => ({
  name: p.name, slug: p.slug, description: p.description ?? '', priceMonthly: p.priceMonthly, priceQuarterly: p.priceQuarterly, priceYearly: p.priceYearly,
  trialDays: p.trialDays, isActive: p.isActive, isPublic: p.isPublic, sortOrder: p.sortOrder, maxProducts: p.maxProducts, maxUsers: p.maxUsers,
  maxShops: p.maxShops, maxSalesPerMonth: p.maxSalesPerMonth, features: planFeatures(p), isFree: !!p.isFree,
});

function PlanDrawer({ plan, onClose, onSaved }: { plan: AdminPlan | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<UpsertPlanPayload>(() => (plan ? toForm(plan) : blank));
  const set = (patch: Partial<UpsertPlanPayload>) => setForm((f) => ({ ...f, ...patch }));
  const isTrial = (plan?.slug ?? form.slug) === TRIAL_SLUG;
  const users = (plan?.subscribers?.active ?? 0) + (plan?.subscribers?.trial ?? 0) + (plan?.subscribers?.pastDue ?? 0);

  const lowered = useMemo(
    () => (plan ? LIMITS.filter(([k]) => form[k] < plan[k]).map(([, label]) => label) : []),
    [form, plan],
  );

  const save = useMutation({
    mutationFn: () => {
      const payload: UpsertPlanPayload = {
        ...form,
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description?.trim() || undefined,
        ...(form.isFree ? { priceMonthly: 0, priceQuarterly: 0, priceYearly: 0 } : {}),
      };
      return plan ? adminPlansApi.update(plan.id, payload) : adminPlansApi.create(payload);
    },
    onSuccess: () => { toast.success(plan ? 'Plan saved' : 'Plan created'); onSaved(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Could not save the plan')),
  });
  const submit = async () => {
    if (!form.name.trim() || !form.slug.trim()) return toast.error('Enter a name and a slug');
    if (lowered.length && users > 0 && !(await confirmDialog({
      title: 'Lower limits for every shop on this plan?',
      text: `${lowered.join(', ')} will be lower for ${num(users)} shops. Shops already above a limit cannot add more until they upgrade or remove some.`,
      yes: 'Save anyway',
      danger: true,
    }))) return;
    save.mutate();
  };

  const money = (k: 'priceMonthly' | 'priceQuarterly' | 'priceYearly', label: string, months: number) => {
    const off = months > 1 ? discount(form.priceMonthly, form[k], months) : null;
    return (
      <Input label={label} type="number" min={0} value={form[k]} disabled={form.isFree}
        onChange={(e) => set({ [k]: Number(e.target.value) || 0 } as Partial<UpsertPlanPayload>)}
        hint={months > 1 ? (off == null ? `Full price ${formatPKRFull(form.priceMonthly * months)}` : off > 0 ? `${off}% off ${months} × monthly` : off < 0 ? `${-off}% more than ${months} × monthly` : 'No discount') : 'Per month'} />
    );
  };

  return (
    <Drawer open onClose={onClose} size="xl" title={plan ? `Edit ${plan.name}` : 'New plan'}
      description={plan && users > 0 ? `${num(users)} shops are on this plan. Changes reach them within a minute.` : 'Prices, limits and features.'}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={save.isPending} leftIcon={<Check className="h-4 w-4" />}>{plan ? 'Save plan' : 'Create plan'}</Button></div>}>
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" required value={form.name} onChange={(e) => set({ name: e.target.value })} />
          <Input label="Slug" required value={form.slug} disabled={!!plan} onChange={(e) => set({ slug: e.target.value })}
            hint={plan ? 'Cannot change after the plan is made.' : 'Lowercase letters, numbers and dashes. Cannot change later.'} />
          <div className="sm:col-span-2"><Textarea label="Description" rows={2} value={form.description ?? ''} onChange={(e) => set({ description: e.target.value })} /></div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Switch label="Free plan" description="No price. For very small shops." checked={form.isFree} onChange={(e) => set({ isFree: e.target.checked })} />
          <Switch label="Active" description="Off: shops cannot choose it." checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
          <Switch label="Public" description="Shown on the pricing page." checked={form.isPublic} onChange={(e) => set({ isPublic: e.target.checked })} />
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[0.875rem] font-semibold text-slate-900">Prices (PKR)</h4>
            {!form.isFree && form.priceMonthly > 0 && (
              <Button size="xs" variant="outline" onClick={() => set({ priceQuarterly: Math.round((form.priceMonthly * 3 * 0.95) / 10) * 10, priceYearly: form.priceMonthly * 10 })}>
                Quarterly 5% off, yearly 2 months free
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {money('priceMonthly', 'Monthly', 1)}
            {money('priceQuarterly', 'Quarterly', 3)}
            {money('priceYearly', 'Yearly', 12)}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {isTrial && <Input label="Trial days" type="number" min={0} max={90} value={form.trialDays} onChange={(e) => set({ trialDays: Number(e.target.value) || 0 })} hint="Also changes Trial days in billing settings." />}
            <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })} hint="Lower shows first." />
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-[0.875rem] font-semibold text-slate-900">Limits</h4>
          {lowered.length > 0 && users > 0 && (
            <Alert tone="warning" className="mb-3" title="Lowering a limit can lock shops">
              {lowered.join(', ')} {lowered.length === 1 ? 'is' : 'are'} lower than now. Shops already above it cannot add more until they upgrade.
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {LIMITS.map(([k, label]) => {
              const unlimited = form[k] >= UNLIMITED;
              return (
                <div key={k} className="rounded-2xl p-3 ring-1 ring-slate-200">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[0.8125rem] font-medium text-slate-800">{label}</span>
                    <Switch size="sm" label="Unlimited" checked={unlimited} onChange={(e) => set({ [k]: e.target.checked ? UNLIMITED : plan && plan[k] < UNLIMITED ? plan[k] : 0 } as Partial<UpsertPlanPayload>)} />
                  </div>
                  {!unlimited && <Input aria-label={label} type="number" min={0} value={form[k]} onChange={(e) => set({ [k]: Math.max(0, Number(e.target.value) || 0) } as Partial<UpsertPlanPayload>)} />}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[0.75rem] text-slate-500">Bookers for distribution are sold as an add-on, not set by the plan.</p>
        </section>

        <section>
          <h4 className="mb-3 text-[0.875rem] font-semibold text-slate-900">Features</h4>
          <FeatureChecklist value={form.features} onChange={(features) => set({ features })} />
        </section>

        <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <h4 className="text-[0.875rem] font-semibold text-slate-900">Add-on features</h4>
          <p className="mb-3 mt-0.5 text-[0.75rem] text-slate-500">Normally sold as add-ons. Tick one only to include it in this plan for every shop on it.</p>
          <FeatureChecklist value={form.features} onChange={(features) => set({ features })} groups={['Add-on']} />
        </section>
      </div>
    </Drawer>
  );
}

/**
 * Plans: the subscription plans shops can be on. Set prices, limits and which
 * features each plan includes. Plans are few, so they are listed as cards.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Boxes, Check, Edit, Layers, Lightbulb, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import {
  Badge, Button, Card, Checkbox, EmptyState, Input, Modal, PageHero, PageShell, Skeleton, Switch, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPlansApi, type AdminPlan, type UpsertPlanPayload } from '@/api/admin-plans.api';
import { formatPKR } from '@/lib/format';
import { num } from '@/lib/format';


const FEATURE_KEYS: Array<keyof UpsertPlanPayload> = [
  'featurePos', 'featureBarcodeScanner', 'featureMultiShop', 'featureReports',
  'featureProfitReport', 'featureLoyalty', 'featureDiscounts', 'featureKhata',
  'featureExports', 'featureBackup', 'featureNotifications', 'featureCashRegister',
  'featureStockTransfer', 'featureReturns', 'featureSupport24x7',
  'featureWhatsappReceipt', 'featureCustomBranding', 'featureDistribution',
];

const FEATURE_LABELS: Record<string, string> = {
  featurePos: 'POS',
  featureBarcodeScanner: 'Barcode scanner',
  featureMultiShop: 'Multiple shops',
  featureReports: 'Reports',
  featureProfitReport: 'Profit reports',
  featureLoyalty: 'Loyalty points',
  featureDiscounts: 'Discount codes',
  featureKhata: 'Khata',
  featureExports: 'Exports',
  featureBackup: 'Backup',
  featureNotifications: 'Notifications',
  featureCashRegister: 'Cash register',
  featureStockTransfer: 'Stock transfer',
  featureReturns: 'Returns',
  featureSupport24x7: '24/7 Support',
  featureWhatsappReceipt: 'WhatsApp receipt',
  featureCustomBranding: 'Custom branding',
  featureDistribution: 'Distribution (bookers, routes, load sheets)',
};

const emptyPlan: UpsertPlanPayload = {
  name: '',
  slug: '',
  description: '',
  priceMonthly: 0,
  priceQuarterly: 0,
  priceYearly: 0,
  trialDays: 7,
  isActive: true,
  isPublic: true,
  sortOrder: 0,
  maxProducts: 50,
  maxUsers: 2,
  maxShops: 1,
  maxSalesPerMonth: 500,
  featurePos: true,
  featureBarcodeScanner: true,
  featureMultiShop: false,
  featureReports: true,
  featureProfitReport: false,
  featureLoyalty: false,
  featureDiscounts: false,
  featureKhata: true,
  featureExports: false,
  featureBackup: false,
  featureNotifications: true,
  featureCashRegister: true,
  featureStockTransfer: false,
  featureReturns: true,
  featureSupport24x7: false,
  featureWhatsappReceipt: false,
  featureCustomBranding: false,
  featureDistribution: false,
};

export default function PlansPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [editPlan, setEditPlan] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);

  const plans = useQuery({ queryKey: ['admin', 'plans'], queryFn: adminPlansApi.list });
  const rows = plans.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'plans'] });

  const remove = useMutation({
    mutationFn: adminPlansApi.remove,
    onSuccess: () => { toast.success('Plan deleted'); refresh(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not delete the plan'),
  });
  const onDelete = async (p: AdminPlan) => {
    const used = p._count?.subscriptions ?? 0;
    const ok = await confirmDialog({
      title: `Delete ${p.name}?`,
      text: used > 0 ? `${used} subscriptions use this plan. Deleting may fail or affect those shops.` : 'This cannot be undone.',
      yes: 'Delete plan',
      danger: true,
    });
    if (ok) remove.mutate(p.id);
  };

  const subscribers = rows.reduce((sum, p) => sum + (p._count?.subscriptions ?? 0), 0);

  return (
    <PageShell>
      <PageHero
        title="Plans"
        chip={plans.data ? `${num(rows.length)} plans` : undefined}
        busy={plans.isFetching}
        loading={plans.isLoading}
        actions={
          <>
            <button type="button" className={heroPrimaryButton} onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New plan</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={plans.data ? [
          { label: 'Active plans', value: num(rows.filter((p) => p.isActive).length), hint: `of ${num(rows.length)}` },
          { label: 'Public plans', value: num(rows.filter((p) => p.isPublic).length), hint: 'Shown on the pricing page' },
          { label: 'Subscriptions', value: num(subscribers) },
        ] : undefined}
      />

      {plans.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={<Layers className="h-6 w-6" />} title="No plans yet" description="Create the first plan shops can subscribe to."
          action={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>New plan</Button>} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const features = FEATURE_KEYS.filter((k) => p[k as keyof AdminPlan]);
            return (
              <Card key={p.id} className={p.isActive ? '' : 'opacity-70'}
                title={<span className="flex items-center gap-2">{p.name}</span>}
                description={<span className="font-mono">{p.slug}</span>}
                actions={
                  <div className="flex gap-1">
                    <button type="button" aria-label={`Edit ${p.name}`} onClick={() => setEditPlan(p)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Edit className="h-4 w-4" /></button>
                    <button type="button" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                }
              >
                <p className="text-[0.875rem] text-slate-600">{p.description || 'No description'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                  <Badge variant={p.isPublic ? 'info' : 'warning'}>{p.isPublic ? 'Public' : 'Private'}</Badge>
                  <Badge><Users className="me-1 h-3 w-3" />{num(p._count?.subscriptions ?? 0)} shops</Badge>
                  {p.trialDays > 0 && <Badge>{p.trialDays} day trial</Badge>}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {([['Monthly', p.priceMonthly], ['Quarterly', p.priceQuarterly], ['Yearly', p.priceYearly]] as const).map(([label, price]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-2">
                      <div className="text-[0.6875rem] text-slate-500">{label}</div>
                      <div className="text-[0.9375rem] font-bold text-slate-900">{formatPKR(price)}</div>
                    </div>
                  ))}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.8125rem]">
                  {([['Products', p.maxProducts], ['Users', p.maxUsers], ['Shops', p.maxShops], ['Sales a month', p.maxSalesPerMonth]] as const).map(([label, v]) => (
                    <div key={label} className="flex justify-between"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{num(v)}</dd></div>
                  ))}
                </dl>
                <div className="mt-4 border-t border-slate-100 pt-3 text-[0.75rem] text-slate-500">
                  {features.length ? <><span className="font-medium text-slate-700">{features.length} features:</span> {features.map((k) => FEATURE_LABELS[k as string]).join(', ')}</> : 'No features included'}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(creating || editPlan) && (
        <PlanFormModal plan={editPlan} onClose={() => { setCreating(false); setEditPlan(null); }} onSaved={refresh} />
      )}

      {guide.isOpen && (
        <PageGuide
          title="Plans"
          description="The plans shops can subscribe to: price, limits and features."
          flowTitle="From plan to shop"
          flow={[
            { label: 'You make a plan', icon: Layers, color: '#4f46e5' },
            { label: 'Shown on pricing', hint: 'If public', icon: Sparkles, color: '#0284c7' },
            { label: 'Shop subscribes', icon: Users, color: '#d97706' },
            { label: 'Features turn on', icon: Boxes, color: '#059669' },
          ]}
          steps={[
            { icon: Plus, color: '#4f46e5', title: 'Create a plan', text: 'Set the monthly, quarterly and yearly price, the trial days and the limits.' },
            { icon: Boxes, color: '#059669', title: 'Choose features', text: 'Tick what the plan includes. Shops on the plan get exactly these.' },
            { icon: Edit, color: '#d97706', title: 'Public or private', text: 'A private plan is hidden from the pricing page but you can still give it to a shop.' },
          ]}
          tips={['Changing a plan changes it for every shop on it.', 'Set a limit very high for "no limit".']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function PlanFormModal({ plan, onClose, onSaved }: { plan: AdminPlan | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<UpsertPlanPayload>(() => {
    if (!plan) return emptyPlan;
    const { id: _id, _count, ...rest } = plan;
    return { ...emptyPlan, ...rest, description: plan.description ?? '', featureDistribution: plan.featureDistribution ?? false };
  });
  const set = (patch: Partial<UpsertPlanPayload>) => setForm((f) => ({ ...f, ...patch }));
  const save = useMutation({
    mutationFn: () => (plan ? adminPlansApi.update(plan.id, form) : adminPlansApi.create(form)),
    onSuccess: () => { toast.success(plan ? 'Plan updated' : 'Plan created'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not save the plan'),
  });
  const submit = () => {
    if (!form.name.trim() || !form.slug.trim()) return toast.error('Enter a name and a slug');
    save.mutate();
  };
  const numberField = (label: string, key: keyof UpsertPlanPayload) => (
    <Input key={key} label={label} type="number" min={0} value={(form[key] as number) ?? 0} onChange={(e) => set({ [key]: Number(e.target.value) } as Partial<UpsertPlanPayload>)} />
  );

  return (
    <Modal open onClose={onClose} size="lg" title={plan ? `Edit ${plan.name}` : 'New plan'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={save.isPending} leftIcon={<Check className="h-4 w-4" />}>{plan ? 'Save changes' : 'Create plan'}</Button></>}>
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          <Input label="Slug" value={form.slug} onChange={(e) => set({ slug: e.target.value })} hint="Used in links. Lowercase, no spaces." />
          <div className="sm:col-span-2"><Input label="Description" value={form.description ?? ''} onChange={(e) => set({ description: e.target.value })} /></div>
        </section>

        <section>
          <h4 className="mb-3 text-[0.875rem] font-semibold text-slate-900">Prices</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            {numberField('Monthly (PKR)', 'priceMonthly')}
            {numberField('Quarterly (PKR)', 'priceQuarterly')}
            {numberField('Yearly (PKR)', 'priceYearly')}
            {numberField('Trial days', 'trialDays')}
            {numberField('Sort order', 'sortOrder')}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-[0.875rem] font-semibold text-slate-900">Limits</h4>
          <div className="grid gap-4 sm:grid-cols-4">
            {numberField('Products', 'maxProducts')}
            {numberField('Users', 'maxUsers')}
            {numberField('Shops', 'maxShops')}
            {numberField('Sales a month', 'maxSalesPerMonth')}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Switch label="Active" description="Inactive plans cannot be chosen." checked={form.isActive ?? true} onChange={(e) => set({ isActive: e.target.checked })} />
          <Switch label="Public" description="Show on the pricing page." checked={form.isPublic ?? true} onChange={(e) => set({ isPublic: e.target.checked })} />
        </section>

        <section>
          <h4 className="mb-3 text-[0.875rem] font-semibold text-slate-900">Features</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((k) => (
              <Checkbox key={k as string} label={FEATURE_LABELS[k as string]} checked={(form[k] as boolean) ?? false} onChange={(e) => set({ [k]: e.target.checked } as Partial<UpsertPlanPayload>)} />
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}

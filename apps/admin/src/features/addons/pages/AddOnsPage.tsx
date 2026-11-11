/**
 * Add-ons: extras a shop can add to a paid plan (channels, distribution,
 * extra users, setup). Set the price, what each one turns on, bundles and
 * which plans may buy it. Grouped by category; the editor opens in a drawer.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Gift, Layers, Lightbulb, Package, Plus, Puzzle, ShoppingCart, Store, Tag } from 'lucide-react';
import {
  Alert, Badge, Button, Checkbox, Drawer, Input, PageHero, PageShell, Segmented, Select, Switch, Table, TBody, Td, Textarea, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  ADDON_CATEGORIES, LIMIT_LABELS, adminBillingCatalogApi, type AddOnInput, type AddOnKind, type AdminAddOn, type LimitKey,
} from '@/api/admin-billing-catalog.api';
import { adminPlansApi } from '@/api/admin-plans.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatPKR, formatPKRFull, num } from '@/lib/format';
import { ListCard } from '@/ui';
import { FeatureChecklist, useFeatureCatalog } from '@/features/plans/components/FeatureChecklist';

const KEY = ['admin', 'billing', 'addons'];
const KINDS: Array<{ value: AddOnKind; label: string }> = [
  { value: 'FLAT', label: 'Monthly' },
  { value: 'PER_UNIT', label: 'Per unit' },
  { value: 'ONE_TIME', label: 'One time' },
];
const LIMIT_KEYS: LimitKey[] = ['users', 'shops', 'products', 'salesPerMonth', 'bookers'];

const categoryLabel = (c: string) => ADDON_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export function priceText(a: Pick<AdminAddOn, 'kind' | 'priceMonthly' | 'unitLabel'>) {
  if (a.kind === 'ONE_TIME') return `${formatPKRFull(a.priceMonthly)} once`;
  if (a.kind === 'PER_UNIT') return `${formatPKRFull(a.priceMonthly)} / ${a.unitLabel || 'unit'} / month`;
  return `${formatPKRFull(a.priceMonthly)} / month`;
}

export default function AddOnsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('plans.manage');
  const [editing, setEditing] = useState<AdminAddOn | 'new' | null>(null);

  const addOns = useQuery({ queryKey: KEY, queryFn: adminBillingCatalogApi.addOns });
  const rows = addOns.data ?? [];
  const grouped = useMemo(() => {
    const cats = [...ADDON_CATEGORIES.map((c) => c.value), ...new Set(rows.map((r) => r.category))];
    return [...new Set(cats)].map((c) => ({ category: c, items: rows.filter((r) => r.category === c) })).filter((g) => g.items.length);
  }, [rows]);

  const sum = (k: keyof AdminAddOn['shops']) => rows.reduce((n, a) => n + a.shops[k], 0);

  return (
    <PageShell>
      <PageHero
        title="Add-ons"
        chip={addOns.data ? `${num(rows.length)} add-ons` : undefined}
        busy={addOns.isFetching}
        loading={addOns.isLoading}
        actions={
          <>
            {canManage && <button type="button" className={heroPrimaryButton} onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New add-on</button>}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={addOns.data ? [
          { label: 'On sale', value: num(rows.filter((a) => a.isActive && a.isPublic && !a.comingSoon).length), hint: `of ${num(rows.length)}` },
          { label: 'Paid and running', value: num(sum('paying')), hint: 'Shop add-ons' },
          { label: 'Free or gifted', value: num(sum('free')), hint: 'Trial, grandfather, admin' },
          { label: 'Waiting for payment', value: num(sum('pendingPayment')), hint: `${num(sum('pastDue'))} switched off` },
        ] : undefined}
      />

      <ListCard loading={addOns.isLoading} empty={!rows.length} emptyIcon={<Puzzle className="h-6 w-6" />} emptyTitle="No add-ons yet"
        emptyText="Make the first add-on shops can buy with a paid plan."
        emptyAction={canManage ? <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>New add-on</Button> : undefined}>
        <Table minWidth="54rem">
          <THead><Tr><Th>Add-on</Th><Th>Type</Th><Th align="right">Price</Th><Th align="right">Paying</Th><Th align="right">Free</Th><Th align="right">Waiting</Th><Th>Status</Th></Tr></THead>
          <TBody>
            {grouped.map((g) => [
              <Tr key={`h-${g.category}`} className="bg-slate-50/70">
                <Td colSpan={7} className="py-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{categoryLabel(g.category)}</Td>
              </Tr>,
              ...g.items.map((a) => (
                <Tr key={a.id} interactive={canManage} onClick={canManage ? () => setEditing(a) : undefined}>
                  <Td>
                    <div className="font-semibold text-slate-900">{a.name}</div>
                    <div className="text-[0.75rem] text-slate-500"><code>{a.key}</code>{a.bundleKeys.length ? ` · bundle of ${a.bundleKeys.length}` : ''}{a.availableOnPlans.length ? ` · ${a.availableOnPlans.join(', ')}` : ' · every paid plan'}</div>
                  </Td>
                  <Td className="whitespace-nowrap">{KINDS.find((k) => k.value === a.kind)?.label}</Td>
                  <Td align="right" className="whitespace-nowrap font-semibold text-slate-900">{priceText(a)}</Td>
                  <Td align="right">{num(a.shops.paying)}</Td>
                  <Td align="right">{num(a.shops.free)}</Td>
                  <Td align="right">{a.shops.pendingPayment ? <span className="text-amber-700">{num(a.shops.pendingPayment)}</span> : '0'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {!a.isActive && <Badge>Off</Badge>}
                      {a.isActive && a.comingSoon && <Badge variant="info">Coming soon</Badge>}
                      {a.isActive && !a.isPublic && <Badge variant="warning">Hidden</Badge>}
                      {a.isActive && a.isPublic && !a.comingSoon && <Badge variant="success">On sale</Badge>}
                    </div>
                  </Td>
                </Tr>
              )),
            ])}
          </TBody>
        </Table>
      </ListCard>

      {editing && <AddOnDrawer addOn={editing === 'new' ? null : editing} all={rows} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: KEY })} />}

      {guide.isOpen && (
        <PageGuide
          title="Add-ons"
          description="Extras a shop adds on top of a paid plan. Each one turns on features or adds capacity."
          flowTitle="How a shop gets an add-on"
          flow={[
            { label: 'You price it', icon: Tag, color: '#4f46e5' },
            { label: 'Shop adds it', hint: 'From My plan', icon: Store, color: '#0284c7' },
            { label: 'Bill to pay', hint: 'Within pay days', icon: ShoppingCart, color: '#d97706' },
            { label: 'Features on', icon: Package, color: '#059669' },
          ]}
          steps={[
            { icon: Tag, color: '#4f46e5', title: 'Price and type', text: 'Monthly add-ons have one price. Per unit add-ons (extra user, booker) are priced per unit. One-time services are billed once.' },
            { icon: Package, color: '#059669', title: 'What it turns on', text: 'Tick the features it gives and any extra capacity per unit, for example 1 user or 1 shop.' },
            { icon: Layers, color: '#0284c7', title: 'Bundles', text: 'A bundle includes other add-ons at one price. The saving is shown as you pick them.' },
            { icon: Gift, color: '#db2777', title: 'Deals for one shop', text: 'To give an add-on free or at a special price, open the shop in Shop 360 → Plan & add-ons.' },
          ]}
          tips={['Switching an add-on off stops it for every shop that has it, at once.', '"Coming soon" shows it on the price list but nobody can buy it.', 'Hidden add-ons can still be given to a shop by an admin.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
          footer={<Link to="/plans" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Open plans</Link>}
        />
      )}
    </PageShell>
  );
}

type Draft = AddOnInput & { key: string };

const blank: Draft = {
  key: '', name: '', description: '', category: 'integrations', kind: 'FLAT', priceMonthly: 0, unitLabel: null, grantsFeatures: [], grantsLimits: null,
  bundleKeys: [], availableOnPlans: [], isPublic: true, isActive: true, comingSoon: false, sortOrder: 0,
};

const toDraft = (a: AdminAddOn): Draft => ({
  key: a.key, name: a.name, description: a.description ?? '', category: a.category, kind: a.kind, priceMonthly: a.priceMonthly, unitLabel: a.unitLabel,
  grantsFeatures: a.grantsFeatures, grantsLimits: a.grantsLimits, bundleKeys: a.bundleKeys, availableOnPlans: a.availableOnPlans,
  isPublic: a.isPublic, isActive: a.isActive, comingSoon: a.comingSoon, sortOrder: a.sortOrder,
});

function AddOnDrawer({ addOn, all, onClose, onSaved }: { addOn: AdminAddOn | null; all: AdminAddOn[]; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(() => (addOn ? toDraft(addOn) : blank));
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const plans = useQuery({ queryKey: ['admin', 'plans'], queryFn: adminPlansApi.list });
  const catalog = useFeatureCatalog();
  const paidPlans = (plans.data ?? []).filter((p) => !p.isFree && p.slug !== 'free-trial');

  // A bundle may include add-ons that are not bundles themselves; an add-on inside a bundle cannot become one.
  const insideBundle = all.some((a) => a.id !== addOn?.id && a.bundleKeys.includes(d.key));
  const bundleChoices = all.filter((a) => a.key !== d.key && !a.bundleKeys.length && a.kind !== 'ONE_TIME');
  const bundleFull = bundleChoices.filter((a) => d.bundleKeys.includes(a.key)).reduce((n, a) => n + a.priceMonthly, 0);
  const users = addOn ? addOn.shops.total : 0;

  const setLimit = (k: LimitKey, v: string) => {
    const next = { ...(d.grantsLimits ?? {}) };
    const n = Math.max(0, Math.floor(Number(v)));
    if (!v || !n) delete next[k]; else next[k] = n;
    set({ grantsLimits: Object.keys(next).length ? next : null });
  };

  const save = useMutation({
    mutationFn: () => {
      const { key, ...rest } = d;
      const body = { ...rest, name: d.name.trim(), description: d.description?.trim() || null, unitLabel: d.kind === 'PER_UNIT' ? d.unitLabel?.trim() || null : null };
      return addOn ? adminBillingCatalogApi.updateAddOn(addOn.id, body) : adminBillingCatalogApi.createAddOn({ ...body, key: key.trim().toLowerCase() });
    },
    onSuccess: () => { toast.success(addOn ? 'Add-on saved' : 'Add-on created'); onSaved(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Could not save the add-on')),
  });
  const submit = async () => {
    if (!d.name.trim() || (!addOn && !d.key.trim())) return toast.error('Enter a key and a name');
    if (addOn && addOn.isActive && !d.isActive && users > 0 && !(await confirmDialog({
      title: `Switch off ${addOn.name}?`,
      text: `${num(users)} shops have it. It stops for all of them at once, and their connected channels pause.`,
      yes: 'Switch off',
      danger: true,
    }))) return;
    save.mutate();
  };

  return (
    <Drawer open onClose={onClose} size="xl" title={addOn ? `Edit ${addOn.name}` : 'New add-on'}
      description={addOn && users > 0 ? `${num(users)} shops have this add-on. Price changes apply from their next bill.` : 'Price, what it turns on, and who can buy it.'}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={save.isPending} leftIcon={<Check className="h-4 w-4" />}>{addOn ? 'Save add-on' : 'Create add-on'}</Button></div>}>
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <Input label="Key" required value={d.key} disabled={!!addOn} onChange={(e) => set({ key: e.target.value })}
            hint={addOn ? 'Cannot change after the add-on is made.' : 'Lowercase letters, numbers and underscores. Cannot change later.'} />
          <Input label="Name" required value={d.name} onChange={(e) => set({ name: e.target.value })} hint="Shown to shops." />
          <div className="sm:col-span-2"><Textarea label="Description" rows={2} value={d.description ?? ''} onChange={(e) => set({ description: e.target.value })} hint="One line shops see under the name." /></div>
          <Select label="Category" value={d.category} onChange={(e) => set({ category: e.target.value })} options={ADDON_CATEGORIES} />
          <Input label="Sort order" type="number" value={d.sortOrder} onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })} hint="Lower shows first." />
        </section>

        <section>
          <h4 className="mb-2 text-[0.875rem] font-semibold text-slate-900">Price</h4>
          <Segmented value={d.kind} onChange={(kind) => set({ kind })} items={KINDS} label="Type" />
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Input label={d.kind === 'ONE_TIME' ? 'Price (PKR, once)' : d.kind === 'PER_UNIT' ? 'Price per unit a month (PKR)' : 'Price a month (PKR)'} type="number" min={0}
              value={d.priceMonthly} onChange={(e) => set({ priceMonthly: Number(e.target.value) || 0 })}
              hint={d.kind === 'ONE_TIME' ? undefined : 'Longer plans get the same discount on add-ons.'} />
            {d.kind === 'PER_UNIT' && <Input label="Unit name" value={d.unitLabel ?? ''} onChange={(e) => set({ unitLabel: e.target.value })} placeholder="user, shop, booker" />}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Switch label="On" description="Off stops it for every shop." checked={d.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
          <Switch label="Public" description="Shown on the price list." checked={d.isPublic} onChange={(e) => set({ isPublic: e.target.checked })} />
          <Switch label="Coming soon" description="Listed, but cannot be bought." checked={d.comingSoon} onChange={(e) => set({ comingSoon: e.target.checked })} />
        </section>

        <section>
          <h4 className="text-[0.875rem] font-semibold text-slate-900">Features it turns on</h4>
          <p className="mb-3 mt-0.5 text-[0.75rem] text-slate-500">Usually one add-on feature. A shop gets these while the add-on is paid, free or in its pay window.</p>
          <FeatureChecklist value={d.grantsFeatures} onChange={(grantsFeatures) => set({ grantsFeatures })} groups={['Add-on', 'Core', 'Business', 'Growth', 'Advanced']} catalog={catalog.data?.features} />
        </section>

        <section>
          <h4 className="text-[0.875rem] font-semibold text-slate-900">Extra capacity {d.kind === 'PER_UNIT' ? 'per unit' : ''}</h4>
          <p className="mb-3 mt-0.5 text-[0.75rem] text-slate-500">Added to the plan’s limits{d.kind === 'PER_UNIT' ? ', times the number of units' : ''}. Leave empty for none.</p>
          <div className="grid gap-3 sm:grid-cols-5">
            {LIMIT_KEYS.map((k) => (
              <Input key={k} label={LIMIT_LABELS[k]} type="number" min={0} value={d.grantsLimits?.[k] ?? ''} onChange={(e) => setLimit(k, e.target.value)} />
            ))}
          </div>
        </section>

        <section>
          <h4 className="text-[0.875rem] font-semibold text-slate-900">Bundle</h4>
          {insideBundle ? (
            <p className="mt-1 text-[0.8125rem] text-slate-500">This add-on is part of a bundle, so it cannot be a bundle itself.</p>
          ) : (
            <>
              <p className="mb-3 mt-0.5 text-[0.75rem] text-slate-500">Tick add-ons to sell together at this price. A shop with the bundle gets everything they turn on.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {bundleChoices.map((a) => (
                  <Checkbox key={a.key} label={a.name} description={priceText(a)} checked={d.bundleKeys.includes(a.key)}
                    onChange={(e) => set({ bundleKeys: e.target.checked ? [...d.bundleKeys, a.key] : d.bundleKeys.filter((k) => k !== a.key) })} />
                ))}
              </div>
              {d.bundleKeys.length > 0 && (
                <Alert tone={bundleFull > d.priceMonthly ? 'success' : 'warning'} className="mt-3">
                  Bought apart: {formatPKRFull(bundleFull)} a month. Bundle: {formatPKRFull(d.priceMonthly)}.{' '}
                  {bundleFull > d.priceMonthly ? `Shops save ${formatPKRFull(bundleFull - d.priceMonthly)}.` : 'The bundle is not cheaper than buying them apart.'}
                </Alert>
              )}
            </>
          )}
        </section>

        <section>
          <h4 className="text-[0.875rem] font-semibold text-slate-900">Plans that can buy it</h4>
          <p className="mb-3 mt-0.5 text-[0.75rem] text-slate-500">Leave all unticked for every paid plan. The free plan never gets add-ons.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {paidPlans.map((p) => (
              <Checkbox key={p.slug} label={p.name} checked={d.availableOnPlans.includes(p.slug)}
                onChange={(e) => set({ availableOnPlans: e.target.checked ? [...d.availableOnPlans, p.slug] : d.availableOnPlans.filter((s) => s !== p.slug) })} />
            ))}
          </div>
        </section>
      </div>
    </Drawer>
  );
}

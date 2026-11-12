/**
 * Shop 360 → Plan & add-ons: what the shop may use right now and why, its
 * usage against the limits, its add-ons and bills, and the admin deals —
 * change or extend the plan, give an add-on free or at a custom price, extra
 * features, limit overrides and the grandfather date.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarPlus, Gift, Puzzle, Repeat, Save, Trash2 } from 'lucide-react';
import {
  Alert, Badge, Button, Card, Checkbox, Input, Modal, Segmented, Select, Skeleton, Switch, Table, TBody, Td, Textarea, Th, THead, Tr, confirmDialog,
} from '@/design-system/components';
import {
  LIMIT_LABELS, adminShopBillingApi, type BillingState, type GiveAddOnPayload, type LimitKey, type ShopBilling,
} from '@/api/admin-billing-catalog.api';
import { adminPlansApi } from '@/api/admin-plans.api';
import { adminSubscriptionsApi, type BillingInterval } from '@/api/admin-subscriptions.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { formatDate, formatPKRFull, formatPkDateTime, formatTimeLeft, num } from '@/lib/format';
import { planEndLine } from '../lib/plan-state';
import { DetailList, StatusBadge, statusLabel } from '@/ui';
import { FeatureChecklist } from '@/features/plans/components/FeatureChecklist';

const LIMIT_KEYS: LimitKey[] = ['users', 'shops', 'products', 'salesPerMonth', 'bookers'];
const INTERVALS: BillingInterval[] = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
const STATE: Record<BillingState, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'brand' }> = {
  trial: { label: 'Trial', variant: 'info' },
  active: { label: 'Paid and active', variant: 'success' },
  free: { label: 'Free plan', variant: 'brand' },
  grace: { label: 'In grace', variant: 'warning' },
  expired: { label: 'Expired', variant: 'danger' },
};
const SOURCE: Record<string, string> = { USER: 'Shop', CHECKOUT: 'Checkout', ADMIN: 'Admin', TRIAL: 'Trial', GRANDFATHER: 'Grandfather' };

const limitText = (n: number, unlimited: number) => (n >= unlimited ? 'Unlimited' : num(n));
/** ISO → yyyy-mm-dd for a date input. */
const dayInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');
/** yyyy-mm-dd → end of that day, Pakistan time. */
const endOfPkDay = (day: string) => new Date(`${day}T23:59:59+05:00`).toISOString();

export default function TenantPlanPanel({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const qc = useQueryClient();
  const can = useCan();
  const canManage = can('tenants.manage');
  const canPlans = can('plans.manage');
  const key = ['admin', 'tenant', tenantId, 'plan-billing'];
  const q = useQuery({ queryKey: key, queryFn: () => adminShopBillingApi.get(tenantId) });
  const [giving, setGiving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [extending, setExtending] = useState(false);

  const apply = (next: ShopBilling) => { qc.setQueryData(key, next); qc.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId], exact: true }); };
  const reload = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId], exact: true }); };

  const remove = useMutation({
    mutationFn: (addOnKey: string) => adminShopBillingApi.removeAddOn(tenantId, addOnKey),
    onSuccess: (next) => { apply(next); toast.success('Add-on switched off'); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!q.data) return q.isError ? <Alert tone="danger">{apiError(q.error)}</Alert> : <Skeleton className="h-96 rounded-3xl" />;
  const b = q.data;
  const e = b.entitlements;
  const U = b.catalog.unlimited;
  const state = STATE[e.state];
  const live = b.addOns.filter((a) => a.status !== 'CANCELLED');
  const past = b.addOns.filter((a) => a.status === 'CANCELLED');

  return (
    <div className="space-y-4">
      {e.paused && <Alert tone="danger" title={e.pausedUntil ? `Paused until ${formatPkDateTime(e.pausedUntil)} (${formatTimeLeft(e.pausedUntil)})` : 'Paused until an admin unpauses it'}>{e.pauseReason ? <>Reason shown to the shop: <b>{e.pauseReason}</b></> : 'No reason given.'}</Alert>}
      {e.state === 'expired' && <Alert tone="danger" title={e.periodEnd ? `This shop's plan ended ${formatPkDateTime(e.periodEnd)} (${formatTimeLeft(e.periodEnd)})` : "This shop's plan has ended"}>The merchant apps are stopped except billing. Give or extend a plan to restore access.</Alert>}
      {e.state === 'grace' && <Alert tone="warning" title={`In grace: ${e.graceDaysLeft ?? 0} day${e.graceDaysLeft === 1 ? '' : 's'} left`}>The app stops {e.blocksAt ? `${formatPkDateTime(e.blocksAt)} (${formatTimeLeft(e.blocksAt)})` : '—'} unless the shop pays.</Alert>}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Current plan" description="What decides this shop’s access right now."
          actions={canPlans ? (
            <div className="flex flex-wrap gap-2">
              {e.subscriptionId && e.state !== 'free' && <Button size="sm" variant="outline" leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={() => setExtending(true)}>Extend</Button>}
              <Button size="sm" leftIcon={<Repeat className="h-4 w-4" />} onClick={() => setAssigning(true)}>Change plan</Button>
            </div>
          ) : undefined}>
          <p className="mb-3 text-[0.9375rem] font-semibold text-slate-900">
            {planEndLine(e.state, e.plan?.name, e.state === 'trial' ? e.trialEndsAt : e.periodEnd)}
            {e.state !== 'free' && (e.state === 'trial' ? e.trialEndsAt : e.periodEnd) && <span className="ms-2 text-[0.8125rem] font-normal text-slate-500">{formatTimeLeft((e.state === 'trial' ? e.trialEndsAt : e.periodEnd)!)}</span>}
          </p>
          <DetailList cols={3} items={[
            { label: 'State', value: <span className="inline-flex flex-wrap gap-1.5"><Badge variant={state.variant}>{state.label}</Badge>{e.paused && <Badge variant="danger">Paused</Badge>}</span> },
            { label: 'Plan', value: e.plan ? `${e.plan.name}${e.interval ? ` · ${statusLabel(e.interval)}` : ''}` : 'No plan' },
            { label: e.state === 'trial' ? 'Trial ends' : 'Period ends', value: e.state === 'free' ? 'Never' : (e.state === 'trial' ? e.trialEndsAt ?? e.periodEnd : e.periodEnd) ? formatPkDateTime((e.state === 'trial' ? e.trialEndsAt ?? e.periodEnd : e.periodEnd)!) : null },
            { label: 'App stops', value: e.state === 'free' ? 'Never' : e.blocksAt ? formatPkDateTime(e.blocksAt) : null },
            { label: 'Grandfathered until', value: e.grandfatheredUntil ? formatDate(e.grandfatheredUntil) : 'No' },
            { label: 'Features on', value: num(e.features.length) },
          ]} />
          <GrandfatherEditor tenantId={tenantId} value={b.deals.billingGrandfatherUntil} disabled={!canManage} onSaved={apply} />
        </Card>

        <Card title="Usage and limits" description="Plan limits plus add-ons and overrides.">
          <ul className="space-y-3">
            {LIMIT_KEYS.map((k) => {
              const used = b.usage[k] ?? 0;
              const limit = e.limits[k] ?? 0;
              const unlimited = limit >= U;
              const pct = unlimited ? 0 : limit ? Math.min(100, Math.round((used / limit) * 100)) : used ? 100 : 0;
              const over = !unlimited && used > limit;
              return (
                <li key={k}>
                  <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                    <span className="text-slate-700">{LIMIT_LABELS[k]}{b.deals.limitOverrides[k] != null && <span className="ms-1.5 text-[0.6875rem] font-medium text-brand-700">override</span>}</span>
                    <span className={cn('tabular-nums', over ? 'font-semibold text-rose-600' : 'text-slate-900')}>{num(used)} / {limitText(limit, U)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', over || pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${unlimited ? 100 : pct}%`, opacity: unlimited ? 0.25 : 1 }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card title="Add-ons" description="Paid, free and waiting add-ons. Removing one switches it off at once." flush
        actions={canManage ? <Button size="sm" leftIcon={<Gift className="h-4 w-4" />} onClick={() => setGiving(true)}>Give add-on</Button> : undefined}>
        {!live.length && !past.length ? <p className="px-5 py-6 text-[0.8125rem] text-slate-500">No add-ons.</p> : (
          <Table minWidth="48rem">
            <THead><Tr><Th>Add-on</Th><Th>Status</Th><Th>From</Th><Th>Runs until</Th><Th align="right">Price a month</Th><Th align="right"><span className="sr-only">Actions</span></Th></Tr></THead>
            <TBody>
              {[...live, ...past].map((a) => {
                const until = a.freeUntil ? `Free until ${formatDate(a.freeUntil)}` : a.paymentDueAt && a.status === 'PENDING_PAYMENT' ? `Pay by ${formatDate(a.paymentDueAt)}` : a.currentPeriodEnd ? formatDate(a.currentPeriodEnd) : a.source === 'ADMIN' && a.status === 'ACTIVE' ? 'Forever (gift)' : '—';
                return (
                  <Tr key={a.id} className={a.status === 'CANCELLED' ? 'opacity-60' : undefined}>
                    <Td>
                      <div className="font-medium text-slate-900">{a.addOn.name}{a.addOn.kind === 'PER_UNIT' && ` × ${a.quantity}`}</div>
                      {a.note && <div className="text-[0.75rem] text-slate-500">{a.note}</div>}
                      {!a.addOn.isActive && <div className="text-[0.75rem] text-rose-600">Add-on is switched off for everyone</div>}
                    </Td>
                    <Td><StatusBadge value={a.status} />{a.cancelAtPeriodEnd && <div className="mt-0.5 text-[0.6875rem] text-slate-500">Ends with period</div>}</Td>
                    <Td className="text-[0.8125rem]">{SOURCE[a.source] ?? a.source}</Td>
                    <Td className="whitespace-nowrap text-[0.8125rem]">{until}</Td>
                    <Td align="right" className="whitespace-nowrap">
                      {a.unitPrice != null ? <><span className="font-semibold text-slate-900">{formatPKRFull(a.unitPrice)}</span><div className="text-[0.6875rem] text-brand-700">custom</div></> : formatPKRFull(a.addOn.priceMonthly)}
                    </Td>
                    <Td align="right">
                      {canManage && a.status !== 'CANCELLED' && (
                        <Button size="xs" variant="ghost" className="text-rose-600" leftIcon={<Trash2 className="h-3.5 w-3.5" />} loading={remove.isPending && remove.variables === a.addOn.key}
                          onClick={async () => {
                            if (await confirmDialog({ title: `Switch off ${a.addOn.name}?`, text: `It stops for ${tenantName} now, and any unpaid bill made only for it is cancelled. Connected channels pause.`, yes: 'Switch off', danger: true })) remove.mutate(a.addOn.key);
                          }}>Remove</Button>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ExtraFeaturesCard billing={b} tenantId={tenantId} disabled={!canManage} onSaved={apply} />
        <LimitOverridesCard billing={b} tenantId={tenantId} disabled={!canManage} onSaved={apply} />
      </div>

      <Card title="Bills" description="Latest invoices with their lines." flush>
        {!b.invoices.length ? <p className="px-5 py-6 text-[0.8125rem] text-slate-500">No invoices.</p> : (
          <ul className="divide-y divide-slate-100">
            {b.invoices.map((i) => (
              <li key={i.id} className="px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
                  <code className="text-[0.75rem]">{i.invoiceNumber}</code>
                  <StatusBadge value={i.status} />
                  {i.payments.some((p) => p.status === 'PENDING') && <Badge variant="warning">Payment in review</Badge>}
                  <span className="text-slate-500">{formatDate(i.createdAt)}{i.status !== 'PAID' && i.status !== 'CANCELLED' ? ` · due ${formatDate(i.dueDate)}` : ''}</span>
                  <span className="ms-auto font-semibold tabular-nums text-slate-900">{formatPKRFull(i.total)}</span>
                </div>
                {i.items.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 text-[0.75rem] text-slate-600">
                    {i.items.map((it) => <li key={it.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{it.description}</span><span className="shrink-0 tabular-nums">{formatPKRFull(it.amount)}</span></li>)}
                  </ul>
                ) : i.description && <p className="mt-1 text-[0.75rem] text-slate-500">{i.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {giving && <GiveAddOnModal billing={b} tenantId={tenantId} onClose={() => setGiving(false)} onSaved={apply} />}
      {assigning && <AssignPlanModal tenantId={tenantId} currentPlanId={e.plan?.id} onClose={() => setAssigning(false)} onDone={reload} />}
      {extending && e.subscriptionId && <ExtendModal subscriptionId={e.subscriptionId} label={`${e.plan?.name ?? 'Plan'}, ends ${e.periodEnd ? formatDate(e.periodEnd) : '—'}`} onClose={() => setExtending(false)} onDone={reload} />}
    </div>
  );
}

function GrandfatherEditor({ tenantId, value, disabled, onSaved }: { tenantId: string; value: string | null; disabled: boolean; onSaved: (b: ShopBilling) => void }) {
  const [day, setDay] = useState(dayInput(value));
  useEffect(() => setDay(dayInput(value)), [value]);
  const save = useMutation({
    mutationFn: (next: string | null) => adminShopBillingApi.updateDeals(tenantId, { billingGrandfatherUntil: next }),
    onSuccess: (b, next) => { onSaved(b); toast.success(next ? 'Grandfather date saved' : 'Grandfather period ended'); },
    onError: (e) => toast.error(apiError(e)),
  });
  if (disabled) return null;
  return (
    <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
      <Input type="date" label="Grandfathered until" value={day} onChange={(e) => setDay(e.target.value)} wrapperClassName="w-44"
        hint="Everything stays on, free, until this day." />
      <Button size="sm" variant="outline" disabled={!day || day === dayInput(value)} loading={save.isPending && save.variables !== null} onClick={() => save.mutate(endOfPkDay(day))}>Save date</Button>
      {value && (
        <Button size="sm" variant="ghost" className="text-rose-600" loading={save.isPending && save.variables === null} onClick={async () => {
          if (await confirmDialog({ title: 'End the grandfather period now?', text: 'The shop keeps only what its plan and add-ons give. Channels it does not pay for pause.', yes: 'End now', danger: true })) save.mutate(null);
        }}>End now</Button>
      )}
    </div>
  );
}

function ExtraFeaturesCard({ billing, tenantId, disabled, onSaved }: { billing: ShopBilling; tenantId: string; disabled: boolean; onSaved: (b: ShopBilling) => void }) {
  const [value, setValue] = useState(billing.deals.extraFeatures);
  useEffect(() => setValue(billing.deals.extraFeatures), [billing.deals.extraFeatures]);
  const dirty = value.slice().sort().join() !== billing.deals.extraFeatures.slice().sort().join();
  const save = useMutation({
    mutationFn: () => adminShopBillingApi.updateDeals(tenantId, { extraFeatures: value }),
    onSuccess: (b) => { onSaved(b); toast.success('Extra features saved'); },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <Card title="Extra features" description="Turned on for this shop only, on top of its plan, while the shop is not expired."
      actions={!disabled ? <Button size="sm" leftIcon={<Save className="h-4 w-4" />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save</Button> : undefined}>
      <FeatureChecklist value={value} onChange={setValue} disabled={disabled} catalog={billing.catalog.features} locked={billing.plan?.features}
        groups={['Core', 'Business', 'Growth', 'Advanced', 'Add-on']} columns={2} />
    </Card>
  );
}

function LimitOverridesCard({ billing, tenantId, disabled, onSaved }: { billing: ShopBilling; tenantId: string; disabled: boolean; onSaved: (b: ShopBilling) => void }) {
  const U = billing.catalog.unlimited;
  const initial = useMemo(() => Object.fromEntries(LIMIT_KEYS.map((k) => [k, billing.deals.limitOverrides[k] != null ? String(billing.deals.limitOverrides[k]) : ''])) as Record<LimitKey, string>, [billing.deals.limitOverrides]);
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = LIMIT_KEYS.some((k) => form[k] !== initial[k]);
  const save = useMutation({
    mutationFn: () => adminShopBillingApi.updateDeals(tenantId, {
      limitOverrides: Object.fromEntries(LIMIT_KEYS.map((k) => [k, form[k] === '' ? null : Math.max(0, Math.floor(Number(form[k])) || 0)])) as Partial<Record<LimitKey, number | null>>,
    }),
    onSuccess: (b) => { onSaved(b); toast.success('Limit overrides saved'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const planLimit = (k: LimitKey) => (k === 'bookers' ? null : billing.plan?.limits[k as Exclude<LimitKey, 'bookers'>] ?? null);
  return (
    <Card title="Limit overrides" description="Replaces the limit for this shop, whatever its plan and add-ons say. Leave empty to use the plan."
      actions={!disabled ? <Button size="sm" leftIcon={<Save className="h-4 w-4" />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save</Button> : undefined}>
      <div className="space-y-3">
        {LIMIT_KEYS.map((k) => {
          const unlimited = form[k] !== '' && Number(form[k]) >= U;
          const pl = planLimit(k);
          return (
            <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              {unlimited ? (
                <div><div className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{LIMIT_LABELS[k]}</div><div className="flex h-10 items-center rounded-lg bg-slate-50 px-3 text-[0.875rem] text-slate-700 ring-1 ring-slate-200">Unlimited</div></div>
              ) : (
                <Input label={LIMIT_LABELS[k]} type="number" min={0} value={form[k]} disabled={disabled} placeholder="Plan limit"
                  hint={`Now ${limitText(billing.entitlements.limits[k], U)}${pl != null ? ` · plan ${limitText(pl, U)}` : ''} · using ${num(billing.usage[k])}`}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              )}
              <Switch size="sm" label="Unlimited" disabled={disabled} checked={unlimited} onChange={(e) => setForm({ ...form, [k]: e.target.checked ? String(U) : '' })} className={unlimited ? '' : 'mb-6'} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

type Mode = 'forever' | 'free_until' | 'custom_price';
const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'forever', label: 'Free forever' },
  { value: 'free_until', label: 'Free until' },
  { value: 'custom_price', label: 'Custom price' },
];

function GiveAddOnModal({ billing, tenantId, onClose, onSaved }: { billing: ShopBilling; tenantId: string; onClose: () => void; onSaved: (b: ShopBilling) => void }) {
  const choices = billing.catalog.addOns;
  const [key, setKey] = useState('');
  const [mode, setMode] = useState<Mode>('forever');
  const [qty, setQty] = useState('1');
  const [until, setUntil] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const addOn = choices.find((a) => a.key === key);
  const existing = billing.addOns.find((a) => a.addOn.key === key && a.status !== 'CANCELLED');
  const oneTime = addOn?.kind === 'ONE_TIME';

  const give = useMutation({
    mutationFn: () => {
      const quantity = addOn?.kind === 'PER_UNIT' ? Math.max(1, Math.floor(Number(qty)) || 1) : 1;
      const base = { key, quantity, note: note.trim() || undefined };
      const payload: GiveAddOnPayload = mode === 'forever' ? { ...base, mode }
        : mode === 'free_until' ? { ...base, mode, freeUntil: endOfPkDay(until) }
        : { ...base, mode, unitPrice: Math.max(0, Number(price) || 0) };
      return adminShopBillingApi.giveAddOn(tenantId, payload);
    },
    onSuccess: (b) => { onSaved(b); toast.success(mode === 'custom_price' ? 'Price saved' : 'Add-on given'); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = () => {
    if (!addOn) return toast.error('Pick an add-on');
    if (oneTime && mode !== 'custom_price') return toast.error('A one-time service can only be billed at a price');
    if (mode === 'free_until' && !until) return toast.error('Pick the last free day');
    if (mode === 'custom_price' && price === '') return toast.error('Enter the price');
    give.mutate();
  };

  return (
    <Modal open onClose={onClose} title="Give an add-on" description="For a friend, a partner deal or a test. Works on any plan, even hidden add-ons."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={give.isPending} leftIcon={<Puzzle className="h-4 w-4" />}>{mode === 'custom_price' ? 'Save price' : 'Give add-on'}</Button></>}>
      <div className="space-y-4">
        <Select label="Add-on" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Choose an add-on"
          options={choices.map((a) => ({ value: a.key, label: `${a.name} · ${formatPKRFull(a.priceMonthly)}${a.kind === 'PER_UNIT' ? ` per ${a.unitLabel || 'unit'}` : a.kind === 'ONE_TIME' ? ' once' : ''}${!a.isActive ? ' (off)' : a.comingSoon ? ' (coming soon)' : ''}` }))} />
        {addOn && !addOn.isActive && <Alert tone="warning">This add-on is switched off for everyone, so it gives nothing until you turn it on in Add-ons.</Alert>}
        <div>
          <div className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Deal</div>
          <Segmented value={mode} onChange={setMode} items={MODES} label="Deal" />
          <p className="mt-1.5 text-[0.75rem] text-slate-500">
            {mode === 'forever' && 'On for good with no bill, until you remove it.'}
            {mode === 'free_until' && 'On and free until the day you pick. After that the shop has to pay for it, or it switches off.'}
            {mode === 'custom_price' && (existing
              ? 'The shop already has it. Its state stays the same; this price is saved for its bills from now on.'
              : 'Turned on now with a bill at this price for the rest of the current period, to pay within the add-on pay days. During a trial or grandfather period it is free until that ends.')}
          </p>
        </div>
        {addOn?.kind === 'PER_UNIT' && <Input label={`How many ${addOn.unitLabel || 'units'}`} type="number" min={1} max={500} value={qty} onChange={(e) => setQty(e.target.value)} />}
        {mode === 'free_until' && <Input label="Free until (last free day)" type="date" value={until} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setUntil(e.target.value)} />}
        {mode === 'custom_price' && <Input label={oneTime ? 'Price (PKR, once)' : `Price a month (PKR${addOn?.kind === 'PER_UNIT' ? ', per unit' : ''})`} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)}
          hint={addOn ? `List price ${formatPKRFull(addOn.priceMonthly)}. Enter 0 for free.` : undefined} />}
        <Textarea label="Note (admins only)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: friend of the owner, free for 6 months" />
      </div>
    </Modal>
  );
}

function AssignPlanModal({ tenantId, currentPlanId, onClose, onDone }: { tenantId: string; currentPlanId?: string; onClose: () => void; onDone: () => void }) {
  const plans = useQuery({ queryKey: ['admin', 'plans'], queryFn: adminPlansApi.list });
  const [planId, setPlanId] = useState(currentPlanId ?? '');
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const [days, setDays] = useState('');
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState(true);
  const [notes, setNotes] = useState('');
  const plan = plans.data?.find((p) => p.id === planId);
  const listPrice = plan ? (interval === 'YEARLY' ? plan.priceYearly : interval === 'QUARTERLY' ? plan.priceQuarterly : plan.priceMonthly) : 0;

  const assign = useMutation({
    mutationFn: () => adminSubscriptionsApi.assign({
      tenantId, planId, interval, customDays: days ? Number(days) : undefined, markAsPaid: paid, notes: notes.trim() || undefined,
      customAmount: price === '' ? undefined : Math.max(0, Number(price) || 0),
    }),
    onSuccess: () => { toast.success('Plan given'); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Could not give the plan')),
  });

  return (
    <Modal open onClose={onClose} title="Change plan" description="Gives the plan right away and replaces the shop’s current plan."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => (planId ? assign.mutate() : toast.error('Pick a plan'))} loading={assign.isPending}>Give plan</Button></>}>
      <div className="space-y-4">
        <Select label="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)} placeholder="Choose a plan"
          options={(plans.data ?? []).map((p) => ({ value: p.id, label: `${p.name}${p.isFree ? ' (free)' : ` · ${formatPKRFull(p.priceMonthly)} / month`}${p.isActive ? '' : ' (off)'}` }))} />
        <Select label="Billing" value={interval} onChange={(e) => setInterval(e.target.value as BillingInterval)} options={INTERVALS.map((v) => ({ value: v, label: statusLabel(v) }))} />
        <Input label="Price for this period (PKR)" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={plan ? String(listPrice) : undefined}
          hint={plan ? `Empty uses the plan price, ${formatPKRFull(listPrice)}. Enter 0 for a free gift (not counted as revenue).` : 'Pick a plan first.'} />
        <Input label="Custom days (optional)" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} hint="Replaces the billing length, for example 90 for three months." />
        <Checkbox checked={paid} onChange={(e) => setPaid(e.target.checked)} label="Mark as paid" description="Starts the plan now. Off: the shop gets a bill to pay first." />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="For example: launch offer" />
      </div>
    </Modal>
  );
}

function ExtendModal({ subscriptionId, label, onClose, onDone }: { subscriptionId: string; label: string; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState('30');
  const [reason, setReason] = useState('');
  const extend = useMutation({
    mutationFn: () => adminSubscriptionsApi.extend(subscriptionId, Number(days), reason.trim() || undefined),
    onSuccess: () => { toast.success('Plan extended'); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Could not extend')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Extend plan" description={label}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={extend.isPending} onClick={() => (Number(days) > 0 ? extend.mutate() : toast.error('Enter a number of days'))}>Extend</Button></>}>
      <div className="space-y-4">
        <Input label="Extra days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} hint="Added to the current end date, free." />
        <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: goodwill" />
      </div>
    </Modal>
  );
}

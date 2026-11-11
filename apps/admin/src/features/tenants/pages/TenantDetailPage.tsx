/**
 * Shop 360: one shop's full picture — health score, sales trend, team and
 * devices, plan and invoices, the partner who brought it, online store, notes
 * and a timeline of shop and admin activity — with the admin actions (sign in
 * as the shop, suspend or reactivate, delete), each shown only to admins
 * allowed to use it.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import {
  Activity, Building2, CheckCircle2, CircleAlert, CreditCard, Gift, Globe, LogIn, LogOut, MessageSquare, Pencil, Package, Phone, Receipt,
  ShieldCheck, ShoppingCart, Smartphone, Store, Trash2, Truck, UserCog, Users, XCircle,
} from 'lucide-react';
import {
  Alert, Badge, Button, Card, Checkbox, EmptyState, Input, Select, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, Textarea, ViewTabs, confirmDialog,
  heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { adminTenantsApi, type TenantStatus } from '@/api/admin-tenants.api';
import { adminImpersonateApi } from '@/api/admin-impersonate.api';
import TenantNotesPanel from '@/features/notes/pages/TenantNotesPanel';
import TenantCommercePanel from '@/features/commerce/components/TenantCommercePanel';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, formatPKR, formatPKRFull, formatRelative, num } from '@/lib/format';
import { BUSINESS_TYPES, industryForType } from '@/lib/industries';
import { apiError } from '@/lib/errors';
import { DetailList, LastSeen, OnlineDot, StatusBadge, isOnline, statusLabel } from '@/ui';
import { BUSINESS_MODELS, BusinessModelChips } from '../components/BusinessModelChips';
import { UserActions } from '@/features/users/components/UserActions';
import { TenantPartnerCard } from '@/features/partners/components/TenantPartnerCard';

type Tab = 'overview' | 'team' | 'billing' | 'online' | 'notes' | 'timeline';

function HealthRing({ score }: { score: number }) {
  const color = score >= 80 ? '#059669' : score >= 40 ? '#d97706' : '#e11d48';
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0" aria-label={`Health ${score} of 100`}>
      <circle cx="38" cy="38" r={r} fill="none" strokeWidth="8" className="stroke-slate-100" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" className="fill-slate-900 text-[1rem] font-bold">{score}</text>
    </svg>
  );
}

function SuspendModal({ open, onClose, onConfirm, busy }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; busy: boolean }) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suspend this shop?"
      description="Its staff cannot sign in until you reactivate it. The owner gets a notification with your reason."
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} onClick={() => onConfirm(reason.trim())}>Suspend</Button></div>}
    >
      <Textarea label="Reason (shown to the owner)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Payment overdue for 2 months" />
    </Modal>
  );
}

function EditShopModal({ open, onClose, tenant, onSaved }: { open: boolean; onClose: () => void; tenant: { id: string; name: string; phone?: string | null; businessType?: string | null; businessModels?: string[] | null }; onSaved: () => void }) {
  const [form, setForm] = useState({ name: tenant.name, phone: tenant.phone ?? '', businessType: tenant.businessType ?? '', businessModels: tenant.businessModels ?? [] });
  const save = useMutation({
    mutationFn: () => adminTenantsApi.updateProfile(tenant.id, { name: form.name, phone: form.phone || null, businessType: form.businessType || null, businessModels: form.businessModels }),
    onSuccess: () => { toast.success('Shop updated'); onSaved(); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const toggleModel = (m: string) => setForm((f) => ({ ...f, businessModels: f.businessModels.includes(m) ? f.businessModels.filter((x) => x !== m) : [...f.businessModels, m] }));
  return (
    <Modal open={open} onClose={onClose} title="Edit shop" description="Changes show in the shop's own app right away."
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!form.name.trim()} onClick={() => save.mutate()}>Save</Button></div>}>
      <div className="space-y-3">
        <Input label="Shop name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Select label="Industry" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} placeholder="Not chosen"
          options={BUSINESS_TYPES.map((t) => ({ value: t, label: industryForType(t).label }))} hint="Changes which industry tools the shop sees." />
        <div>
          <div className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">How they sell</div>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_MODELS.map((m) => (
              <Checkbox key={m.id} label={m.label} checked={form.businessModels.includes(m.id)} onChange={() => toggleModel(m.id)} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const can = useCan();
  const [tab, setTab] = useState<Tab>('overview');
  const [suspending, setSuspending] = useState(false);
  const [editing, setEditing] = useState(false);

  const detail = useQuery({ queryKey: ['admin', 'tenant', id], queryFn: () => adminTenantsApi.getOne(id!), enabled: !!id });
  const insights = useQuery({ queryKey: ['admin', 'tenant', id, 'insights'], queryFn: () => adminTenantsApi.insights(id!), enabled: !!id });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin', 'tenant', id] }); qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }); };
  const status = useMutation({
    mutationFn: ({ s, reason }: { s: TenantStatus; reason?: string }) => adminTenantsApi.updateStatus(id!, s, reason),
    onSuccess: (_, v) => { toast.success(v.s === 'SUSPENDED' ? 'Shop suspended' : 'Shop reactivated'); setSuspending(false); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: () => adminTenantsApi.remove(id!),
    onSuccess: () => { toast.success('Shop deleted'); navigate('/tenants'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const signOutAll = useMutation({
    mutationFn: () => adminTenantsApi.signOutAll(id!),
    onSuccess: (r) => toast.success(`${r.ended} session${r.ended === 1 ? '' : 's'} ended`),
    onError: (e) => toast.error(apiError(e)),
  });
  const impersonate = useMutation({
    mutationFn: () => adminImpersonateApi.impersonate(id!),
    onSuccess: (data) => {
      const tenantUrl = (import.meta.env.VITE_TENANT_URL as string) || 'http://localhost:5173';
      window.open(`${tenantUrl}/login?impersonate=1&access=${encodeURIComponent(data.accessToken)}&refresh=${encodeURIComponent(data.refreshToken)}`, '_blank');
      toast.success('Opening the shop in a new tab. This is logged.');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (detail.isError) {
    return <PageShell><EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Shop not found" description="It may have been deleted." action={<Link to="/tenants" className="font-semibold text-brand-700 hover:underline">Back to shops</Link>} /></PageShell>;
  }
  if (!detail.data) {
    return <PageShell><PageHero title="Shop" back="/tenants" loading /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  }

  const { tenant, stats } = detail.data;
  const ins = insights.data;
  const industry = industryForType(tenant.businessType ?? 'NONE');
  const activeSub = tenant.subscriptions.find((s: { status: string }) => ['ACTIVE', 'TRIAL', 'PENDING_PAYMENT', 'PAST_DUE'].includes(s.status));
  const profit = stats.totalRevenue - stats.totalCogs - stats.totalExpenses;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Activity },
    { id: 'team' as const, label: 'Team & devices', icon: Users, count: tenant._count.users },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
    { id: 'online' as const, label: 'Online store', icon: Globe },
    { id: 'notes' as const, label: 'Notes', icon: MessageSquare },
    { id: 'timeline' as const, label: 'Timeline', icon: Receipt },
  ];

  return (
    <PageShell>
      <PageHero
        title={tenant.name}
        back="/tenants"
        backLabel="Shops"
        chip={statusLabel(tenant.status)}
        busy={detail.isFetching || insights.isFetching}
        meta={<span className="inline-flex flex-wrap items-center gap-x-2">@{tenant.slug}{tenant.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{tenant.phone}</span>}<span>· {industry.label}</span><span>· joined {formatDateTime(tenant.createdAt)}</span></span>}
        actions={
          <>
            {can('tenants.impersonate') && (
              <button type="button" className={heroPrimaryButton} disabled={impersonate.isPending} onClick={async () => {
                if (await confirmDialog({ title: `Sign in as ${tenant.name}?`, text: 'Opens their merchant app in a new tab with owner access. Anything you do there is real and is logged under your name.', yes: 'Sign in as shop' })) impersonate.mutate();
              }}><LogIn className="h-4 w-4" /> Sign in as shop</button>
            )}
            {can('tenants.manage') && <button type="button" className={heroButton} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Edit</span></button>}
            {can('tenants.manage') && (
              <button type="button" className={heroButton} aria-label="Sign everyone out" title="Sign everyone in this shop out" onClick={async () => {
                if (await confirmDialog({ title: `Sign everyone in ${tenant.name} out?`, text: 'Every user of this shop is signed out on every device and must sign in again. Nothing else changes.', yes: 'Sign everyone out' })) signOutAll.mutate();
              }}><LogOut className="h-4 w-4" /></button>
            )}
            {can('tenants.manage') && (tenant.status === 'SUSPENDED'
              ? <button type="button" className={heroButton} onClick={() => status.mutate({ s: 'ACTIVE' })}><CheckCircle2 className="h-4 w-4" /> Reactivate</button>
              : <button type="button" className={heroButton} onClick={() => setSuspending(true)}><XCircle className="h-4 w-4" /> Suspend</button>)}
            {can('tenants.delete') && (
              <button type="button" className={heroButton} aria-label="Delete shop" onClick={async () => {
                if (await confirmDialog({ title: `Delete ${tenant.name} for ever?`, text: `This removes the shop with its ${num(tenant._count.products)} products, ${num(tenant._count.sales)} sales and ${num(tenant._count.customers)} customers. It cannot be undone.`, yes: 'Delete for ever', danger: true })) remove.mutate();
              }}><Trash2 className="h-4 w-4" /></button>
            )}
          </>
        }
        stats={[
          { label: 'Health', value: ins ? `${ins.health.score}/100` : '—', hint: ins?.health.label },
          { label: 'Sales (7 days)', value: ins ? formatPKR(ins.sales.last7Total) : '—', hint: ins ? `${num(ins.sales.last7Bills)} bills` : undefined },
          { label: 'Plan', value: activeSub ? activeSub.plan.name : 'No plan', hint: activeSub ? `${statusLabel(activeSub.status)} · ends ${formatDate(activeSub.currentPeriodEnd)}` : undefined },
          { label: 'Last active', value: isOnline(tenant.lastActiveAt) ? 'Online now' : tenant.lastActiveAt ? formatRelative(tenant.lastActiveAt) : 'Never', hint: `Last sale ${ins?.sales.lastSaleAt ? formatRelative(ins.sales.lastSaleAt) : 'never'}` },
        ]}
      />

      {tenant.status === 'SUSPENDED' && <Alert tone="danger" title="This shop is suspended">Its staff cannot sign in. Reactivate it to restore access.</Alert>}

      <ViewTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-4">
          <KpiRow cols={5}>
            <KpiCard icon={ShoppingCart} color="#0891b2" label="All-time sales" value={formatPKR(stats.totalRevenue)} hint={`${num(tenant._count.sales)} bills`} />
            <KpiCard icon={Receipt} color="#059669" label="Profit (approx.)" value={formatPKR(profit)} hint="Sales − cost − expenses" />
            <KpiCard icon={Package} color="#7c3aed" label="Products" value={num(tenant._count.products)} />
            <KpiCard icon={Users} color="#4f46e5" label="Customers" value={num(tenant._count.customers)} />
            <KpiCard icon={Store} color="#d97706" label="Branches" value={num(tenant._count.shops)} hint={`${num(tenant._count.suppliers)} suppliers`} />
          </KpiRow>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Sales, last 30 days" description="Completed bills per Pakistan day." className="xl:col-span-2">
              {ins ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ins.sales.daily} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                      <XAxis dataKey="date" tickFormatter={(d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} minTickGap={28} tickLine={false} axisLine={false} fontSize={11} stroke="#94a3b8" />
                      <Tooltip formatter={(v) => [formatPKRFull(Number(v)), 'Sales']} labelFormatter={(l) => String(l)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                      <Area type="monotone" dataKey="total" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.12} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <Skeleton className="h-56 rounded-2xl" />}
            </Card>
            <Card title="Health" description="Five checks, 20 points each.">
              {ins ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3"><HealthRing score={ins.health.score} /><div><div className="text-[1rem] font-bold text-slate-900">{ins.health.label}</div><div className="text-[0.75rem] text-slate-500">{ins.activeUsers7} people active this week</div></div></div>
                  <ul className="space-y-1.5">
                    {ins.health.factors.map((f) => (
                      <li key={f.key} className="flex items-start gap-2 text-[0.8125rem]">
                        {f.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
                        <span><span className="font-medium text-slate-900">{f.label}</span><span className="block text-[0.75rem] text-slate-500">{f.detail}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : <Skeleton className="h-56 rounded-2xl" />}
            </Card>
          </div>
          <Card title="Profile">
            <DetailList cols={3} items={[
              { label: 'Industry', value: <span className="inline-flex items-center gap-1.5"><industry.icon className="h-4 w-4" style={{ color: industry.color }} />{industry.label}</span> },
              { label: 'Sells', value: <BusinessModelChips models={tenant.businessModels} /> },
              { label: 'Status', value: <StatusBadge value={tenant.status} /> },
              { label: 'Setup', value: ins?.onboarding ? (ins.onboarding.isCompleted ? 'Finished' : ins.onboarding.isSkipped ? 'Skipped' : `Step ${ins.onboarding.currentStep}`) : 'Not started' },
              { label: 'Referral code', value: tenant.referralCode ? <code>{tenant.referralCode}</code> : null },
              { label: 'Referred by', value: tenant.referredBy ? <Link to={`/tenants/${tenant.referredBy.id}`} className="text-brand-700 hover:underline">{tenant.referredBy.name}</Link> : null },
              { label: 'Shops they referred', value: num(tenant._count.referredTenants) },
              { label: 'Account credit', value: formatPKRFull(tenant.accountCredit) },
              { label: 'Shop id', value: <code className="break-all text-[0.75rem]">{tenant.id}</code> },
            ]} />
          </Card>
          <TenantPartnerCard tenantId={tenant.id} tenantName={tenant.name} />
        </div>
      )}

      {tab === 'team' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Team" description={`${tenant.users.length} people can sign in`} flush>
            <ul className="divide-y divide-slate-100">
              {tenant.users.map((u: { id: string; fullName: string; email: string; phone: string | null; role: string; isActive: boolean; lastLoginAt: string | null; lastSeenAt: string | null; lastSeenVia: string | null; createdAt: string }) => (
                <li key={u.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.8125rem] font-semibold text-slate-600">
                    {u.fullName.charAt(0).toUpperCase()}
                    <OnlineDot online={isOnline(u.lastSeenAt)} className="absolute -bottom-0.5 -end-0.5 ring-2 ring-white rounded-full" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-medium text-slate-900">{u.fullName}{!u.isActive && <span className="ms-2 text-[0.75rem] text-rose-600">switched off</span>}</span>
                    <span className="block truncate text-[0.75rem] text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ''}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]"><LastSeen at={u.lastSeenAt ?? u.lastLoginAt} via={u.lastSeenVia} never="Never signed in" /><span className="text-slate-400">· added {formatDateTime(u.createdAt)}</span></span>
                  </span>
                  <Badge variant={u.role === 'OWNER' ? 'brand' : 'default'}>{statusLabel(u.role)}</Badge>
                  <UserActions user={u} />
                </li>
              ))}
            </ul>
          </Card>
          <div className="space-y-4">
            <Card title="Branches" flush>
              <ul className="divide-y divide-slate-100">
                {(ins?.shops ?? []).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.875rem] sm:px-5">
                    <Building2 className="h-4 w-4 text-slate-400" /><span className="flex-1 text-slate-900">{s.name}</span>
                    {s.isMain && <Badge variant="brand">Main</Badge>}{!s.isActive && <Badge>Closed</Badge>}
                  </li>
                ))}
                {ins && !ins.shops.length && <li className="px-5 py-4 text-[0.8125rem] text-slate-500">No branches.</li>}
              </ul>
            </Card>
            <Card title="Phones and tablets" description="Devices using the Nafaa mobile app." flush>
              <ul className="divide-y divide-slate-100">
                {(ins?.devices ?? []).map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                    <Smartphone className="h-4 w-4 text-slate-400" />
                    <span className="min-w-0 flex-1"><span className="block text-slate-900">{d.platform} · app {d.appVersion}</span><span className="block text-[0.75rem] text-slate-500">{d.user ?? 'Unknown user'}{d.osVersion ? ` · OS ${d.osVersion}` : ''}</span></span>
                    <span className="text-[0.75rem] text-slate-500">{formatRelative(d.lastSeenAt)}</span>
                  </li>
                ))}
                {ins && !ins.devices.length && <li className="px-5 py-4 text-[0.8125rem] text-slate-500">Not using the mobile app.</li>}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Subscriptions" actions={can('plans.view') ? <Link to={`/subscriptions?q=${encodeURIComponent(tenant.slug)}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Manage plan</Link> : undefined} flush>
            <ul className="divide-y divide-slate-100">
              {tenant.subscriptions.map((s: { id: string; status: string; amount: number; interval: string; currentPeriodEnd: string; plan: { name: string } }) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <span className="min-w-0 flex-1"><span className="block text-[0.875rem] font-medium text-slate-900">{s.plan.name}</span><span className="block text-[0.75rem] text-slate-500">{formatPKRFull(s.amount)} / {statusLabel(s.interval)} · until {formatDate(s.currentPeriodEnd)}</span></span>
                  <StatusBadge value={s.status} />
                </li>
              ))}
              {!tenant.subscriptions.length && <li className="px-5 py-4 text-[0.8125rem] text-slate-500">No subscriptions.</li>}
            </ul>
          </Card>
          <div className="space-y-4">
            <Card title="Payments" flush>
              <ul className="divide-y divide-slate-100">
                {tenant.payments.map((p: { id: string; amount: number; status: string; method?: string; createdAt: string }) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                    <span className="flex-1 text-slate-900">{formatPKRFull(p.amount)}<span className="ms-2 text-slate-500">{p.method ? statusLabel(p.method) : ''} · {formatDate(p.createdAt)}</span></span>
                    <StatusBadge value={p.status} />
                  </li>
                ))}
                {!tenant.payments.length && <li className="px-5 py-4 text-[0.8125rem] text-slate-500">No payments.</li>}
              </ul>
            </Card>
            <Card title="Invoices" flush>
              <ul className="divide-y divide-slate-100">
                {tenant.invoices.map((i: { id: string; invoiceNumber: string; total: number; status: string; createdAt: string }) => (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                    <code className="flex-1 text-[0.75rem]">{i.invoiceNumber}</code>
                    <span className="text-slate-500">{formatDate(i.createdAt)}</span>
                    <span className="w-24 text-end font-semibold tabular-nums text-slate-900">{formatPKRFull(i.total)}</span>
                  </li>
                ))}
                {!tenant.invoices.length && <li className="px-5 py-4 text-[0.8125rem] text-slate-500">No invoices.</li>}
              </ul>
            </Card>
            <Card title="Referral reward" description="Credit earned by referring other shops.">
              <div className="flex items-center gap-3 text-[0.875rem]"><Gift className="h-5 w-5 text-pink-600" /><span className="flex-1">{num(tenant._count.referredTenants)} shops referred</span><b>{formatPKRFull(tenant.accountCredit)}</b></div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'online' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard icon={Globe} color="#0891b2" label="Connected channels" value={ins ? num(ins.integrations.filter((i) => i.isActive).length) : '—'} />
            <KpiCard icon={ShoppingCart} color="#4f46e5" label="Online orders (30 days)" value={ins ? num(ins.onlineOrders30) : '—'} />
            <KpiCard icon={Truck} color="#d97706" label="Couriers" value={ins ? num(ins.couriers.filter((c) => c.isActive).length) : '—'} hint={ins?.couriers.map((c) => statusLabel(c.provider)).join(', ') || undefined} />
          </div>
          {ins && !!ins.integrations.length && (
            <Card title="Channels" flush>
              <ul className="divide-y divide-slate-100">
                {ins.integrations.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                    <Globe className="h-4 w-4 text-slate-400" /><span className="flex-1 font-medium text-slate-900">{statusLabel(i.type)}</span>
                    <span className="text-slate-500">{i.lastSyncAt ? `synced ${formatRelative(i.lastSyncAt)}` : 'never synced'}</span>
                    <StatusBadge value={i.isActive ? i.status : 'DISABLED'} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <TenantCommercePanel tenantId={tenant.id} />
        </div>
      )}

      {tab === 'notes' && <TenantNotesPanel tenantId={tenant.id} />}

      {tab === 'timeline' && (
        <Card title="Timeline" description="What the shop did, and what admins did to it, newest first." flush>
          {!ins ? <div className="p-4"><Skeleton className="h-48 rounded-2xl" /></div> : !ins.timeline.length ? <p className="px-5 py-6 text-[0.8125rem] text-slate-500">Nothing recorded yet.</p> : (
            <ol className="relative space-y-0 py-2">
              {ins.timeline.map((t) => (
                <li key={t.id} className="flex gap-3 px-4 py-2.5 sm:px-5">
                  <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', t.kind === 'admin' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500')}>
                    {t.kind === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserCog className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 text-[0.8125rem]">
                    <span className="block text-slate-900">{t.title}{t.failed && <span className="ms-2 text-rose-600">failed</span>}</span>
                    <span className="block text-[0.75rem] text-slate-500">{t.kind === 'admin' ? 'Admin' : 'Shop'}{t.who ? ` · ${t.who}` : ''} · {formatRelative(t.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      <EditShopModal open={editing} onClose={() => setEditing(false)} tenant={tenant} onSaved={refresh} />
      <SuspendModal open={suspending} onClose={() => setSuspending(false)} busy={status.isPending} onConfirm={(reason) => status.mutate({ s: 'SUSPENDED', reason: reason || undefined })} />
    </PageShell>
  );
}

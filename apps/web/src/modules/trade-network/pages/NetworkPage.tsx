/**
 * Seller side of the trade network: link requests from shops, the network
 * customers with their khata and orders, and the network profile (invite
 * code and link, and the opt-in "Nafaa par distributors" listing).
 * Needs distribution switched on.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, Copy, Inbox, MessageCircle, Network, RefreshCw, Share2, Users, X } from 'lucide-react';
import {
  Button, Input, PageHero, PageShell, Select, Skeleton, Switch, Textarea, ViewTabs, confirmDialog, heroIconButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { DistributionGate } from '@modules/distribution/components/DistributionGate';
import { Empty, Panel, Pill } from '@modules/distribution/components/parts';
import { useMoney } from '@modules/distribution/hooks/useDistribution';
import { dayTime } from '@modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type IncomingRequest, type Profile } from '../api/trade.api';
import { LINK_STATUS } from '../lib/meta';
import { BizAvatar, Where, useOverview } from '../components/shared';
import { TermsModal } from '../components/TermsModal';
import { t as tr } from '@core/i18n';

type Tab = 'customers' | 'requests' | 'profile';

export default function NetworkPage() {
  return <DistributionGate><Seller /></DistributionGate>;
}

function Seller() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const ov = useOverview();
  const tab = (params.get('tab') as Tab) || ((ov.data?.seller.requests ?? 0) > 0 ? 'requests' : 'customers');
  const s = ov.data?.seller;
  return (
    <PageShell>
      <PageHero back="/distribution" backLabel={tr('Distribution')}
        title={tr('Network')}
        chip={<><Network /> {' '}{tr('Nafaa network')}</>}
        meta={tr('Jo dukaanein Nafaa par hain woh aap se seedha Order bhejti hain — Orders desk me aate hain, delivery ke baad un ke paas Purchase khud banti hai')}
        busy={ov.isFetching}
        actions={<button type="button" onClick={() => qc.invalidateQueries({ queryKey: [TRADE_KEY] })} className={heroIconButton} aria-label={tr('Taaza karein')}><RefreshCw className={cn('h-4 w-4', ov.isFetching && 'animate-spin')} /></button>}
        stats={[
          { label: tr('Network customers'), value: String(s?.customers ?? '—') },
          { label: tr('Requests'), value: String(s?.requests ?? '—') },
          { label: tr('Naye Order'), value: String(s?.newOrders ?? '—') },
          { label: tr('Payment confirm'), value: String(s?.paymentsToConfirm ?? '—') },
        ]}
      />
      <ViewTabs value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[{ id: 'customers', label: tr('Customers'), count: s?.customers }, { id: 'requests', label: tr('Requests'), count: s?.requests }, { id: 'profile', label: tr('Invite & profile') }]}
        right={(s?.newOrders ?? 0) > 0 ? <Link to="/distribution/orders?status=BOOKED" className="text-[0.8125rem] font-semibold text-brand-700">{tr('{{newOrders}} naye Order desk par →', { newOrders: s?.newOrders })}</Link> : undefined} />
      {tab === 'customers' ? <Customers /> : tab === 'requests' ? <Requests /> : <ProfileTab />}
    </PageShell>
  );
}

function Customers() {
  const money = useMoney();
  const q = useQuery({ queryKey: [TRADE_KEY, 'customers'], queryFn: () => tradeApi.customers() });
  const rows = q.data ?? [];
  if (q.isLoading) return <Skeleton className="h-64 rounded-3xl" />;
  if (!rows.length) {
    return (
      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <Empty icon={<Users className="h-5 w-5" />} text={tr('Abhi koi dukaan jori nahi. \'Invite & profile\' se apna invite link dukaanon ko bhejein.')} action={<Link to="?tab=profile"><Button variant="secondary">{tr('Invite link')}</Button></Link>} />
      </section>
    );
  }
  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.id}>
            <Link to={`/network/links/${r.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50/80 sm:px-5">
              <BizAvatar card={r.buyer} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="truncate text-[0.9375rem] font-semibold text-slate-900">{r.buyer?.name}</span>{r.status !== 'ACTIVE' && <Pill tone={LINK_STATUS[r.status].tone}>{LINK_STATUS[r.status].label}</Pill>}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">
                  <Where card={r.buyer} />{r.customer?.priceListName ? ` · ${r.customer.priceListName}` : ''}{r.customer?.routeName ? ` · ${r.customer.routeName}` : ''}
                </span>
              </span>
              <span className="hidden text-end sm:block">
                <span className="block text-[0.75rem] text-slate-500">{tr('30 din')}</span>
                <span className="block text-[0.875rem] font-semibold tabular-nums">{tr('{{orders30d}} Order · {{value30d}}', { orders30d: r.orders30d, value30d: money(r.value30d) })}</span>
              </span>
              <span className="w-28 text-end">
                <span className="block text-[0.75rem] text-slate-500">{tr('Khata')}</span>
                <span className="block text-[0.875rem] font-bold tabular-nums text-slate-900">{money(r.customer?.balance ?? 0)}</span>
              </span>
              {r.paymentsToConfirm > 0 && <Pill tone="amber">{tr('{{paymentsToConfirm}} payment confirm', { paymentsToConfirm: r.paymentsToConfirm })}</Pill>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Requests() {
  const qc = useQueryClient();
  const canLink = usePermission(PERMISSIONS.TRADE_LINKS_MANAGE);
  const [approve, setApprove] = useState<IncomingRequest | null>(null);
  const q = useQuery({ queryKey: [TRADE_KEY, 'incoming'], queryFn: tradeApi.incoming });
  const reject = useMutation({
    mutationFn: (id: string) => tradeApi.reject(id),
    onSuccess: () => { toast.success(tr('Request reject')); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const rows = q.data ?? [];
  if (q.isLoading) return <Skeleton className="h-48 rounded-3xl" />;
  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {!rows.length ? <Empty icon={<Inbox className="h-5 w-5" />} text={tr('Koi naya request nahi.')} /> : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <BizAvatar card={r.buyer} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{r.buyer?.name}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">
                  {[r.buyer?.phone, r.buyer?.address, r.buyer?.city].filter(Boolean).join(' · ')} · {dayTime(r.requestedAt)} · {r.requestedVia === 'DIRECTORY' ? tr('Directory se') : r.requestedVia === 'PHONE' ? tr('Phone se') : tr('Invite code se')}
                </span>
                {r.requestNote && <span className="mt-0.5 flex items-center gap-1 text-[0.75rem] text-slate-600"><MessageCircle className="h-3 w-3" />{r.requestNote}</span>}
                {r.suggestedCustomer && <span className="mt-0.5 block text-[0.75rem] text-teal-700">{tr('Pehle se customer: {{name}}', { name: r.suggestedCustomer.name })}</span>}
              </span>
              {canLink && (
                <span className="flex gap-2">
                  <Button size="sm" variant="ghost" leftIcon={<X className="h-4 w-4" />} onClick={async () => {
                    if (await confirmDialog({ title: tr('{{name}} ka request reject karein?', { name: r.buyer?.name }), yes: tr('Reject'), danger: true })) reject.mutate(r.id);
                  }}>{tr('Reject')}</Button>
                  <Button size="sm" variant="success" leftIcon={<BadgeCheck className="h-4 w-4" />} onClick={() => setApprove(r)}>{tr('Approve')}</Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {approve && <TermsModal linkId={approve.id} mode="approve" buyer={approve.buyer} suggested={approve.suggestedCustomer} onClose={() => setApprove(null)} />}
    </section>
  );
}

function ProfileTab() {
  const qc = useQueryClient();
  const canLink = usePermission(PERMISSIONS.TRADE_LINKS_MANAGE);
  const q = useQuery({ queryKey: [TRADE_KEY, 'profile'], queryFn: tradeApi.profile });
  const [form, setForm] = useState<Partial<Profile>>({});
  useEffect(() => { if (q.data) setForm(q.data.profile); }, [q.data]);
  const save = useMutation({
    mutationFn: () => tradeApi.saveProfile({
      acceptRequests: form.acceptRequests, listed: form.listed, displayName: form.displayName ?? '', phone: form.phone ?? '', city: form.city ?? '', area: form.area ?? '',
      categories: form.categories, brands: form.brands, about: form.about ?? '', minOrderValue: form.minOrderValue ?? null, catalogScope: form.catalogScope,
    }),
    onSuccess: () => { toast.success(tr('Profile save')); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const newCode = useMutation({
    mutationFn: tradeApi.newCode,
    onSuccess: () => { toast.success(tr('Naya code ban gaya — purana ab nahi chalega')); qc.invalidateQueries({ queryKey: [TRADE_KEY, 'profile'] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  if (!q.data) return <Skeleton className="h-72 rounded-3xl" />;
  const p = q.data.profile;
  const link = `${window.location.origin}/network/join/${p.inviteCode}`;
  const msg = tr('Assalam o alaikum! Ab aap {{value}} se Nafaa par seedha Order bhej sakte hain. Yeh link kholein: {{link}} (code {{inviteCode}})', { value: q.data.card?.name ?? 'hum', link, inviteCode: p.inviteCode });
  const copy = (t: string) => { void navigator.clipboard?.writeText(t); toast.success(tr('Copy ho gaya')); };
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm((f) => ({ ...f, [k]: v }));
  const list = (v?: string[]) => (v ?? []).join(', ');
  const parse = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Panel title={tr('Invite code')} sub={tr('Dukaanein is code ya link se aap ko request bhejti hain')}>
        <div className="rounded-2xl bg-slate-900 px-4 py-5 text-center text-white">
          <div className="text-[0.75rem] uppercase tracking-widest text-white/60">{tr('Aap ka code')}</div>
          <div className="mt-1 font-mono text-[1.75rem] font-bold tracking-widest">{p.inviteCode}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" leftIcon={<Copy className="h-4 w-4" />} onClick={() => copy(link)}>{tr('Copy link')}</Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"><Button size="sm" leftIcon={<Share2 className="h-4 w-4" />}>{tr('Share on WhatsApp')}</Button></a>
          {canLink && <Button size="sm" variant="ghost" loading={newCode.isPending} onClick={async () => {
            if (await confirmDialog({ title: tr('Naya code banayein?'), text: tr('Purana code aur link band ho jayenge. Jure hue customers par koi farq nahi.'), yes: tr('New code') })) newCode.mutate();
          }}>{tr('New code')}</Button>}
        </div>
        <p className="mt-3 break-all text-[0.75rem] text-slate-500">{link}</p>
      </Panel>
      <Panel title={tr('Profile aur directory')} right={canLink && <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>{tr('Save')}</Button>}>
        <div className="space-y-4">
          <Switch label={tr('Naye requests lein')} description={tr('Band ho to koi naya request nahi aa sakta')} checked={!!form.acceptRequests} disabled={!canLink} onChange={(e) => set('acceptRequests', e.target.checked)} />
          <Switch label={tr('\'Nafaa par distributors\' me dikhein')} description={tr('Aap ke shehar ki dukaanein aap ko dhoond kar request bhej sakengi')} checked={!!form.listed} disabled={!canLink} onChange={(e) => set('listed', e.target.checked)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={tr('Naam (directory me)')} placeholder={q.data.card?.name} value={form.displayName ?? ''} disabled={!canLink} onChange={(e) => set('displayName', e.target.value)} />
            <Input label={tr('Phone')} value={form.phone ?? ''} disabled={!canLink} onChange={(e) => set('phone', e.target.value)} />
            <Input label={tr('Shehar')} value={form.city ?? ''} disabled={!canLink} onChange={(e) => set('city', e.target.value)} />
            <Input label={tr('Ilaqa')} value={form.area ?? ''} disabled={!canLink} onChange={(e) => set('area', e.target.value)} />
            <Input label={tr('Categories')} hint={tr('Comma se alag: Grocery, Beverages')} value={list(form.categories)} disabled={!canLink} onChange={(e) => set('categories', parse(e.target.value))} />
            <Input label={tr('Brands')} hint={tr('Comma se alag')} value={list(form.brands)} disabled={!canLink} onChange={(e) => set('brands', parse(e.target.value))} />
            <Input label={tr('Kam se kam Order (Rs)')} inputMode="numeric" value={form.minOrderValue ?? ''} disabled={!canLink} onChange={(e) => set('minOrderValue', Number(e.target.value.replace(/\D/g, '')) || null)} />
            <Select label={tr('Catalog me kya dikhe')} value={form.catalogScope ?? 'ALL'} disabled={!canLink} onChange={(e) => set('catalogScope', e.target.value as Profile['catalogScope'])}
              options={[{ value: 'ALL', label: tr('Sab active items') }, { value: 'LISTED', label: tr('Sirf customer ki price list wale') }]} />
          </div>
          <Textarea label={tr('Apne baare me')} rows={2} value={form.about ?? ''} disabled={!canLink} onChange={(e) => set('about', e.target.value)} />
        </div>
      </Panel>
    </div>
  );
}

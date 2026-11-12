/**
 * One Nafaa Stores website: settings summary, domains with their status,
 * 30-day numbers, recent orders, abuse reports and theme publish history,
 * plus the admin actions (suspend, force password mode, refresh the live
 * site, re-verify or detach a domain, sign in as the shop). Every action
 * asks first and is logged by the server; nothing here deletes store data.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CircleAlert, ExternalLink, Flag, Globe, History, Lightbulb, Lock, LockOpen, LogIn, PauseCircle, PlayCircle, RefreshCw, ShieldAlert, Store, Unplug,
} from 'lucide-react';
import {
  Alert, Button, Card, EmptyState, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminStoresApi, type AdminStoreDetail, type StoreDomainRow } from '@/api/admin-stores.api';
import { DetailList, StatusBadge } from '@/ui';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatPKR, formatPKRFull, formatRelative, num } from '@/lib/format';
import { Empty, Pill } from '@/features/shared/kit';
import { TextActionModal } from '../components/TextActionModal';
import { DomainStatusBadge, ReportStatusBadge, StoreStatusBadge, dateTime, reasonLabel, themeLabel, useImpersonateStore } from '../components/StoresUi';

const yesNo = (v: boolean | undefined | null) => (v ? 'Yes' : 'No');
const money = (v: number | null | undefined) => (v == null ? 'No limit' : formatPKRFull(v));
const PAYMENT_LABEL: Record<string, string> = { cod: 'Cash on delivery', SAFEPAY: 'Card (Safepay)', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa' };
const ADVANCE_LABEL: Record<string, string> = { off: 'No advance', shop_rule: 'Shop rule', always_cod: 'Always for COD' };

export default function StoreDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const can = useCan();
  const guide = usePageGuide();
  const [modal, setModal] = useState<'suspend' | 'lock' | null>(null);
  const detail = useQuery({ queryKey: ['admin-store', id], queryFn: () => adminStoresApi.detail(id), enabled: !!id });
  const history = useQuery({ queryKey: ['admin-store-history', id], queryFn: () => adminStoresApi.themeHistory(id), enabled: !!id });
  const impersonate = useImpersonateStore();

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin-store', id] });
    void qc.invalidateQueries({ queryKey: ['admin-stores-list'] });
    void qc.invalidateQueries({ queryKey: ['admin-stores-overview'] });
  };
  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onError: (e) => toast.error(apiError(e)),
  });
  const act = (fn: () => Promise<unknown>, done: string | ((r: unknown) => string)) =>
    run.mutate(fn, { onSuccess: (r) => { toast.success(typeof done === 'string' ? done : done(r)); refresh(); setModal(null); } });

  if (detail.isError) {
    return (
      <PageShell>
        <PageHero title="Store" back="/stores/list" />
        <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Store not found" description="It may not exist, or the stores service is not running yet."
          action={<Link to="/stores/list" className="font-semibold text-brand-700 hover:underline">Back to stores</Link>} />
      </PageShell>
    );
  }
  const s = detail.data;
  if (!s) return <PageShell><PageHero title="Store" back="/stores/list" loading /><Skeleton className="h-96 rounded-3xl" /></PageShell>;

  const canManage = can('stores.manage');
  const canSuspend = can('stores.suspend');
  const shopName = s.tenant.name ?? s.name;

  const suspendToggle = async () => {
    if (!s.suspended) { setModal('suspend'); return; }
    if (await confirmDialog({ title: `Unsuspend ${s.name}?`, text: 'The website opens to buyers again with its own status (live, password or draft). Checkout works again.', yes: 'Unsuspend' })) {
      act(() => adminStoresApi.unsuspend(s.id), 'Website unsuspended');
    }
  };
  const lockToggle = async () => {
    if (!s.forcedPassword) { setModal('lock'); return; }
    if (await confirmDialog({ title: 'Release password mode?', text: 'The shop can take the website live again from its own app. The website stays in password mode until they do.', yes: 'Release' })) {
      act(() => adminStoresApi.forcePassword(s.id, false), 'Password mode released');
    }
  };
  const revalidate = async () => {
    if (await confirmDialog({ title: 'Refresh the live website?', text: 'Clears the cached pages so buyers see the latest products, theme and settings within a minute. Nothing is changed.', yes: 'Refresh' })) {
      act(() => adminStoresApi.revalidate(s.id), (r) => ((r as { sent?: boolean })?.sent ? 'Refresh sent to the website' : 'Cache cleared on the server; the website did not answer'));
    }
  };
  const verify = (d: StoreDomainRow) => act(() => adminStoresApi.verifyDomain(s.id, d.id), `Checked ${d.hostname}`);
  const detach = async (d: StoreDomainRow) => {
    if (await confirmDialog({
      title: `Remove ${d.hostname} from hosting?`,
      text: 'Detaches this domain from the hosting project and marks it "Removed by Nafaa". The domain row, the store and all its data stay. The shop can add the domain again later.',
      yes: 'Remove from hosting', danger: true,
    })) act(() => adminStoresApi.removeFromVercel(s.id, d.id), `${d.hostname} removed from hosting`);
  };

  return (
    <PageShell>
      <PageHero
        title={s.name}
        back="/stores/list"
        chip={<StoreStatusBadge status={s.status} suspended={s.suspended} forcedPassword={s.forcedPassword} />}
        meta={<span>{s.subdomain} · {shopName}</span>}
        busy={detail.isFetching || run.isPending}
        actions={
          <>
            <a href={s.url} target="_blank" rel="noreferrer" className={heroButton}><ExternalLink className="h-4 w-4" /> Open website</a>
            {can('tenants.impersonate') && (
              <button type="button" className={heroPrimaryButton} disabled={impersonate.isPending}
                onClick={() => impersonate.mutate({ tenantId: s.impersonate.tenantId, shopName, path: s.impersonate.path })}>
                <LogIn className="h-4 w-4" /> Sign in as shop
              </button>
            )}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Visitors (30d)', value: num(s.stats30d.visitors) },
          { label: 'Orders (30d)', value: num(s.stats30d.orders) },
          { label: 'Sales value (30d)', value: formatPKR(s.stats30d.gmv) },
          { label: 'Conversion', value: `${s.stats30d.conversion}%` },
        ]}
      />

      {s.suspended && (
        <Alert tone="danger" title="Suspended by Nafaa">
          Buyers see a neutral "unavailable" page and checkout is refused. Reason: {s.suspendReason ?? 'not given'}.
        </Alert>
      )}
      {s.forcedPassword && !s.suspended && (
        <Alert tone="warning" title="Password mode forced by Nafaa">The shop cannot take this website live until the lock is released here.</Alert>
      )}
      {!s.entitled && (
        <Alert tone="warning" title="Website add-on is not active">The shop no longer pays for the website add-on, so they cannot edit the website.</Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Settings summary" description="What the shop has set up. Read only here.">
            <SettingsSummary s={s} />
          </Card>

          <Card flush title="Domains" description={`The free address ${s.subdomain} always works. Custom domains are listed here.`}>
            {!s.domains.length ? <Empty>No custom domains. The website runs on its free address.</Empty> : (
              <div className="mt-3">
                <Table minWidth="40rem">
                  <THead><Tr><Th>Domain</Th><Th>Status</Th><Th>SSL</Th><Th align="right">Actions</Th></Tr></THead>
                  <TBody>
                    {s.domains.map((d) => (
                      <Tr key={d.id}>
                        <Td>
                          <div className="flex items-center gap-1.5 font-medium text-slate-900">{d.hostname}{d.isPrimary && <Pill tone="indigo">Primary</Pill>}</div>
                          {d.error && <div className="mt-0.5 max-w-[20rem] text-[0.75rem] text-rose-700">{d.error}</div>}
                        </Td>
                        <Td><DomainStatusBadge status={d.status} /></Td>
                        <Td>{d.sslReady ? <Pill tone="emerald">Ready</Pill> : <span className="text-slate-400">Not yet</span>}</Td>
                        <Td align="right">
                          {canManage ? (
                            <div className="flex justify-end gap-1.5">
                              <Button size="xs" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} disabled={run.isPending} onClick={() => verify(d)}>Re-verify</Button>
                              <Button size="xs" variant="critical" leftIcon={<Unplug className="h-3.5 w-3.5" />} disabled={run.isPending} onClick={() => detach(d)}>Remove from hosting</Button>
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>

          <Card flush title="Recent orders" description="Last 10 website orders">
            {!s.recentOrders.length ? <Empty>No orders from this website yet.</Empty> : (
              <div className="mt-3">
                <Table minWidth="32rem">
                  <THead><Tr><Th>Order</Th><Th>Status</Th><Th align="right">Total</Th><Th>Received</Th></Tr></THead>
                  <TBody>
                    {s.recentOrders.map((o) => (
                      <Tr key={o.id}>
                        <Td className="font-medium text-slate-900">#{o.orderNumber}</Td>
                        <Td><StatusBadge value={o.status} /></Td>
                        <Td align="right">{formatPKRFull(o.total)}</Td>
                        <Td className="whitespace-nowrap">{dateTime(o.receivedAt)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>

          <Card flush title="Theme publish history" description="Every saved and published version of the website design">
            {history.isLoading ? <div className="p-4"><Skeleton className="h-24 rounded-xl" /></div>
              : !history.data?.items.length ? <Empty>{history.isError ? 'Could not load the history.' : 'No theme versions yet.'}</Empty> : (
                <div className="mt-3">
                  <Table minWidth="36rem">
                    <THead><Tr><Th>Version</Th><Th>Status</Th><Th>Theme</Th><Th>Note</Th><Th>Published</Th></Tr></THead>
                    <TBody>
                      {history.data.items.map((v) => (
                        <Tr key={v.id}>
                          <Td className="font-medium text-slate-900">v{v.version}</Td>
                          <Td><StatusBadge value={v.status} /></Td>
                          <Td>{themeLabel(v.themeId)}</Td>
                          <Td className="max-w-[16rem] truncate">{v.note ?? <span className="text-slate-400">—</span>}</Td>
                          <Td className="whitespace-nowrap">
                            {v.publishedAt ? <>{dateTime(v.publishedAt)}{v.publishedBy && <div className="text-[0.75rem] text-slate-500">by {v.publishedBy}</div>}</>
                              : <span className="text-slate-400">Edited {formatRelative(v.updatedAt)}</span>}
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Actions" description="Each step asks first and is written to the admin audit log.">
            <div className="space-y-3">
              <ActionRow icon={s.suspended ? PlayCircle : PauseCircle} title={s.suspended ? 'Unsuspend website' : 'Suspend website'}
                text={s.suspended ? 'Opens the website to buyers again.' : 'Buyers see an "unavailable" page; checkout stops. Data stays.'}
                allowed={canSuspend} danger={!s.suspended} label={s.suspended ? 'Unsuspend' : 'Suspend'} onClick={suspendToggle} busy={run.isPending} />
              <ActionRow icon={s.forcedPassword ? LockOpen : Lock} title={s.forcedPassword ? 'Release password mode' : 'Force password mode'}
                text={s.forcedPassword ? 'Lets the shop go live again.' : 'Moves a live website behind a password; the shop cannot go live.'}
                allowed={canManage} danger={!s.forcedPassword} label={s.forcedPassword ? 'Release' : 'Force password'} onClick={lockToggle} busy={run.isPending} />
              <ActionRow icon={RefreshCw} title="Refresh live website" text="Clears cached pages so buyers see the latest version."
                allowed={canManage} label="Refresh" onClick={revalidate} busy={run.isPending} />
            </div>
            {!canSuspend && !canManage && <p className="mt-3 text-[0.75rem] text-slate-500">Your role can only view websites.</p>}
          </Card>

          <Card title="Shop">
            <DetailList items={[
              { label: 'Shop', value: <Link to={`/tenants/${s.tenant.id}`} className="font-medium text-brand-700 hover:underline">{shopName}</Link> },
              { label: 'Email', value: s.tenant.email },
              { label: 'Phone', value: s.tenant.phone },
              { label: 'Website add-on', value: s.entitled ? <Pill tone="emerald">Active</Pill> : <Pill tone="amber">Missing</Pill> },
              { label: 'Order channel', value: s.integration ? <StatusBadge value={s.integration.isActive ? s.integration.status : 'PAUSED'} /> : null },
              { label: 'Created', value: dateTime(s.createdAt) },
              { label: 'Launched', value: s.launchedAt ? dateTime(s.launchedAt) : 'Not yet' },
              { label: 'Last published', value: s.lastPublishedAt ? dateTime(s.lastPublishedAt) : 'Never' },
            ]} />
          </Card>

          <Card flush title="Abuse reports" actions={s.reports.length ? <Link to={`/stores/reports?storeId=${s.id}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Open queue</Link> : undefined}>
            {!s.reports.length ? <Empty>No reports for this store.</Empty> : (
              <ul className="mt-2 divide-y divide-slate-100">
                {s.reports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
                    <div className="min-w-0">
                      <div className="text-[0.8125rem] font-medium text-slate-900">{reasonLabel(r.reason)}</div>
                      <div className="text-[0.75rem] text-slate-500">{formatRelative(r.createdAt)}</div>
                    </div>
                    <ReportStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <TextActionModal open={modal === 'suspend'} onClose={() => setModal(null)} busy={run.isPending} danger
        title={`Suspend ${s.name}?`} description={'Every page shows buyers a neutral "This store is unavailable" message and checkout is refused. No store data is removed.'}
        label="Reason (internal, kept on the store)" placeholder="e.g. Several scam reports; fake branded products" yes="Suspend website"
        onConfirm={(reason) => act(() => adminStoresApi.suspend(s.id, reason), 'Website suspended')} />
      <TextActionModal open={modal === 'lock'} onClose={() => setModal(null)} busy={run.isPending} required={false}
        title="Force password mode?" description="A live website moves behind a password and the shop cannot take it live until you release it."
        label="Message on the password page (optional)" placeholder="e.g. This store is being updated. Please check back soon." hint="Shown to buyers on the password page. Leave empty to keep the shop's own message."
        yes="Force password" onConfirm={(message) => act(() => adminStoresApi.forcePassword(s.id, true, message || undefined), 'Password mode forced')} />

      {guide.isOpen && (
        <PageGuide
          title="Store"
          description="One merchant website with its domains, orders and admin actions."
          flowTitle="When a store breaks the rules"
          flow={[
            { label: 'Report', hint: 'Buyer or team', icon: Flag, color: '#d97706' },
            { label: 'Check', hint: 'Orders, reports, website', icon: Store, color: '#0284c7' },
            { label: 'Lock or suspend', hint: 'With a reason', icon: ShieldAlert, color: '#e11d48' },
            { label: 'Release', hint: 'When fixed', icon: PlayCircle, color: '#059669' },
          ]}
          steps={[
            { icon: Store, color: '#0284c7', title: 'Read the summary', text: 'Settings, checkout rules and the last 30 days of orders show how the store is used.' },
            { icon: Globe, color: '#0d9488', title: 'Fix domains', text: 'Re-verify a domain after the shop changes DNS. Remove a stuck one from hosting; the store and its data stay.' },
            { icon: ShieldAlert, color: '#e11d48', title: 'Act', text: 'Force password mode to hide a website for a while, or suspend it with a reason for serious problems.' },
            { icon: History, color: '#4f46e5', title: 'Check history', text: 'Theme history shows who published each design version and when.' },
          ]}
          tips={['Signing in as the shop opens their app in a new tab and is logged under your name.', 'Buyers never see the suspend reason.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function ActionRow({ icon: Icon, title, text, allowed, danger, label, onClick, busy }: {
  icon: typeof Lock; title: string; text: string; allowed: boolean; danger?: boolean; label: string; onClick: () => void; busy?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'}`}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-[0.75rem] text-slate-500">{text}</p>
        {allowed
          ? <Button className="mt-2" size="xs" variant={danger ? 'critical' : 'secondary'} disabled={busy} onClick={onClick}>{label}</Button>
          : <p className="mt-1.5 text-[0.6875rem] font-medium text-slate-400">Your role cannot do this.</p>}
      </div>
    </div>
  );
}

function SettingsSummary({ s }: { s: AdminStoreDetail }) {
  const st = s.settings ?? {};
  const co = s.checkout;
  const payments = co ? Object.entries(co.payments ?? {}).filter(([, on]) => on).map(([k]) => PAYMENT_LABEL[k] ?? k) : [];
  const trackers = Object.entries(st.tracking ?? {}).filter(([, v]) => !!v).length;
  return (
    <DetailList cols={3} items={[
      { label: 'Website address', value: <a href={s.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{s.url.replace(/^https?:\/\//, '')}</a> },
      { label: 'Theme', value: themeLabel(s.themeId) },
      { label: 'Tagline', value: st.tagline },
      { label: 'Products shown', value: st.catalogMode === 'CHOSEN' ? 'Only chosen products' : 'All priced products' },
      { label: 'Sold-out products', value: st.showOutOfStock === false ? 'Hidden' : 'Shown' },
      { label: 'Languages', value: st.languages ? st.languages.enabled.map((l) => (l === 'ur' ? 'Urdu' : 'English')).join(', ') : null },
      { label: 'Contact phone', value: st.contact?.phone },
      { label: 'WhatsApp', value: st.contact?.whatsapp ?? st.whatsappButton?.number },
      { label: 'Email', value: st.contact?.email },
      { label: 'SEO title', value: st.seo?.title },
      { label: 'Search engines', value: st.seo?.noindex ? 'Hidden (noindex)' : 'Allowed' },
      { label: 'Tracking pixels', value: trackers ? `${trackers} set` : 'None' },
      { label: 'Payments', value: payments.length ? payments.join(', ') : 'None' },
      { label: 'Buyer login', value: co?.loginMode ? co.loginMode.charAt(0).toUpperCase() + co.loginMode.slice(1) : null },
      { label: 'Advance payment', value: co?.advance ? `${ADVANCE_LABEL[co.advance.mode] ?? co.advance.mode}${co.advance.mode !== 'off' ? ` (${co.advance.percent}%)` : ''}` : null },
      { label: 'Minimum order', value: money(co?.minOrder) },
      { label: 'Largest COD order', value: money(co?.maxCodOrder) },
      { label: 'COD confirm on WhatsApp', value: yesNo(co?.codConfirmWhatsApp) },
    ]} />
  );
}

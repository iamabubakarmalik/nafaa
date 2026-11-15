/**
 * One shop on Nafaa Market: profile, section and flow, numbers, documents,
 * reviews summary and recent orders, plus the admin actions (approve or
 * reject, pause, verification level, section, featured on home). Every
 * action asks first where it affects customers and is logged by the server.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, CircleAlert, ExternalLink, FileText, PauseCircle, PlayCircle, ShieldCheck, Sparkles, Star, Store, XCircle } from 'lucide-react';
import {
  Alert, Button, Card, EmptyState, PageHero, PageShell, Select, Skeleton, Switch, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, MARKET_GATES, VERIFICATION_LEVELS, type MarketGate, type MarketShopDetail, type VerificationLevel } from '@/api/admin-market.api';
import { DetailList } from '@/ui';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatPKR, formatPKRFull, num } from '@/lib/format';
import { Empty, Pill } from '@/features/shared/kit';
import { TextActionModal } from '@/features/stores/components/TextActionModal';
import { ApprovalBadge, GATE_LABEL, GateTag, GuideButton, LEVEL_LABEL, MarketGuide, OrderStatusBadge, SettingRow, ShopStateBadge, dateTime } from '../components/MarketUi';

const MARKET_URL = (import.meta.env.VITE_MARKET_URL as string) || 'https://market.nafaa.pk';
const FLOW_LABEL: Record<string, string> = {
  modifiers: 'Add-ons', substitutes: 'Replacements', deliverySlots: 'Delivery slots', prescription: 'Prescription upload', customCake: 'Custom cake',
  booking: 'Booking', sizeColour: 'Size and colour', courier: 'Courier', pickup: 'Pickup', dineIn: 'Dine-in', giftMessage: 'Gift message',
};

/** Documents are free-form JSON from the shop; links open, other values print as text. */
function DocumentsList({ docs }: { docs: unknown }) {
  if (!docs) return <Empty>No documents uploaded.</Empty>;
  const entries: Array<[string, unknown]> = Array.isArray(docs) ? docs.map((d, i) => [`File ${i + 1}`, d]) : Object.entries(docs as Record<string, unknown>);
  const show = (v: unknown): React.ReactNode => {
    if (typeof v === 'string') return /^https?:\/\//.test(v) ? <a href={v} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">Open <ExternalLink className="h-3 w-3" /></a> : v;
    if (Array.isArray(v)) return <div className="space-y-1">{v.map((x, i) => <div key={i}>{show(x)}</div>)}</div>;
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.url === 'string') return <span>{typeof o.kind === 'string' ? `${o.kind}: ` : ''}{show(o.url)}</span>;
      return <span className="font-mono text-[0.75rem]">{JSON.stringify(v)}</span>;
    }
    return String(v ?? '—');
  };
  return <DetailList cols={2} items={entries.map(([k, v]) => ({ label: k, value: show(v) }))} />;
}

export default function MarketShopDetailPage() {
  const { shopId = '' } = useParams();
  const guide = usePageGuide();
  const navigate = useNavigate();
  const can = useCan();
  const qc = useQueryClient();
  const [modal, setModal] = useState<'reject' | 'pause' | null>(null);
  const detail = useQuery({ queryKey: ['admin-market-shop', shopId], queryFn: () => adminMarketApi.shop(shopId), enabled: !!shopId });

  const run = useMutation({
    mutationFn: (fn: () => Promise<MarketShopDetail>) => fn(),
    onError: (e) => toast.error(apiError(e)),
  });
  const act = (fn: () => Promise<MarketShopDetail>, done: string) =>
    run.mutate(fn, {
      onSuccess: (d) => {
        qc.setQueryData(['admin-market-shop', shopId], d);
        void qc.invalidateQueries({ queryKey: ['admin-market-shops'] });
        void qc.invalidateQueries({ queryKey: ['admin-market-overview'] });
        toast.success(done);
        setModal(null);
      },
    });

  if (detail.isError) {
    return (
      <PageShell>
        <PageHero title="Shop" back="/market/shops" />
        <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Shop not found" description="This shop has no Market profile."
          action={<Link to="/market/shops" className="font-semibold text-brand-700 hover:underline">Back to shops</Link>} />
      </PageShell>
    );
  }
  const s = detail.data;
  if (!s) return <PageShell><PageHero title="Shop" back="/market/shops" loading /><Skeleton className="h-96 rounded-3xl" /></PageShell>;

  const canManage = can('marketplace.manage');
  const approve = async () => {
    if (await confirmDialog({ title: `Approve ${s.name}?`, text: 'The shop shows to customers on the Market (when it is published and not paused). Unverified shops move to Bronze.', yes: 'Approve' })) {
      act(() => adminMarketApi.approveShop(s.shopId), 'Shop approved');
    }
  };
  const resume = async () => {
    if (await confirmDialog({ title: `Resume ${s.name}?`, text: 'Customers can order from this shop again during its opening hours.', yes: 'Resume' })) {
      act(() => adminMarketApi.updateShop(s.shopId, { isPaused: false }), 'Shop resumed');
    }
  };
  const setLevel = (level: VerificationLevel) => act(() => adminMarketApi.updateShop(s.shopId, { verificationLevel: level }), `Level set to ${LEVEL_LABEL[level]}`);
  const setGate = async (value: string) => {
    const gate = value === 'AUTO' ? null : (value as MarketGate);
    if (await confirmDialog({ title: 'Move this shop to another section?', text: 'The customer flow follows the section (cart rules, extra checkout steps). The shop can still change its own switches.', yes: 'Move' })) {
      act(() => adminMarketApi.updateShop(s.shopId, { gate }), 'Section saved');
    }
  };
  const setFeatured = (on: boolean) => act(() => adminMarketApi.updateShop(s.shopId, { featured: on }), on ? 'Featured on the home screen' : 'Removed from featured');

  return (
    <PageShell>
      <PageHero
        title={s.name}
        back="/market/shops"
        chip={<span className="inline-flex flex-wrap gap-1"><ShopStateBadge listed={s.listed} isPaused={s.isPaused} /><ApprovalBadge state={s.approval} /></span>}
        meta={<span>{s.city}{s.area ? `, ${s.area}` : ''} · {s.tenant.name}</span>}
        busy={detail.isFetching || run.isPending}
        actions={
          <>
            {s.listed && <a href={`${MARKET_URL}/shop/${s.slug}`} target="_blank" rel="noreferrer" className={heroButton}><ExternalLink className="h-4 w-4" /> Open on Market</a>}
            {canManage && s.approval !== 'APPROVED' && s.listed && (
              <button type="button" className={heroPrimaryButton} onClick={approve} disabled={run.isPending}><BadgeCheck className="h-4 w-4" /> Approve</button>
            )}
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={[
          { label: 'Orders (30d)', value: num(s.stats.orders30d), hint: `${num(s.stats.orders)} in all` },
          { label: 'GMV (30d)', value: formatPKR(s.stats.gmv30d), hint: `${formatPKR(s.stats.gmv)} in all` },
          { label: 'Rating', value: s.reviews.count ? s.reviews.average.toFixed(1) : '—', hint: `${num(s.reviews.count)} reviews` },
          { label: 'Customers', value: num(s.stats.customers) },
        ]}
      />

      {s.isPaused && <Alert tone="warning" title="Paused">Customers see the shop as closed and cannot order. Reason: {s.pausedReason ?? 'not given'}.</Alert>}
      {s.approval === 'REJECTED' && s.review && <Alert tone="danger" title={`Rejected ${dateTime(s.review.at)}`}>Reason given to the shop: {s.review.reason ?? '—'}</Alert>}
      {s.approval === 'PENDING' && <Alert tone="info" title="Awaiting approval">Check the profile and documents, then approve or reject.</Alert>}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Profile" description="What customers see. The shop edits this from POS > Market.">
            <div className="mb-4 flex items-center gap-3">
              {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-slate-100 text-slate-400"><Store className="h-6 w-6" /></div>}
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{s.name}</div>
                <div className="text-[0.8125rem] text-slate-500">{s.tagline ?? 'No tagline'}</div>
              </div>
            </div>
            <DetailList cols={2} items={[
              { label: 'Section', value: <GateTag gate={s.gate} /> },
              { label: 'Industry', value: s.industry },
              { label: 'Address', value: s.address || null },
              { label: 'Phone', value: s.phone },
              { label: 'WhatsApp', value: s.whatsapp },
              { label: 'Email', value: s.email },
              { label: 'Sub-categories', value: s.subCategories.length ? s.subCategories.join(', ') : null },
              { label: 'Published', value: s.listedAt ? dateTime(s.listedAt) : 'Not yet' },
            ]} />
            {s.description && <p className="mt-4 whitespace-pre-line text-[0.8125rem] text-slate-600">{s.description}</p>}
            {!!s.galleryUrls.length && (
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {s.galleryUrls.slice(0, 8).map((u) => <img key={u} src={u} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />)}
              </div>
            )}
          </Card>

          <Card title="Delivery, payments and flow">
            <DetailList cols={3} items={[
              { label: 'Delivery', value: s.delivery.offersDelivery ? `Yes, ${s.delivery.radiusKm} km` : 'No' },
              { label: 'Pickup', value: s.delivery.offersPickup ? 'Yes' : 'No' },
              { label: 'Delivery fee', value: formatPKRFull(s.delivery.fee) },
              { label: 'Free delivery above', value: s.delivery.freeAbove == null ? '—' : formatPKRFull(s.delivery.freeAbove) },
              { label: 'Minimum order', value: s.delivery.minOrder ? formatPKRFull(s.delivery.minOrder) : 'None' },
              { label: 'Delivery time', value: s.delivery.etaMinutes ? `${s.delivery.etaMinutes} min` : null },
            ]} />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Object.entries(s.payments).filter(([, on]) => on).map(([k]) => <Pill key={k} tone="teal">{k === 'cod' ? 'Cash on delivery' : k}</Pill>)}
              {Object.entries(s.flow).filter(([k, v]) => v === true && FLOW_LABEL[k]).map(([k]) => <Pill key={k} tone="indigo">{FLOW_LABEL[k]}</Pill>)}
            </div>
          </Card>

          <Card title="Documents" description="CNIC, registration and files the shop uploaded">
            <DetailList cols={3} className="mb-4" items={[
              { label: 'CNIC', value: s.cnicNumber },
              { label: 'Business registration', value: s.businessRegNumber },
              { label: 'Tax number', value: s.taxNumber },
            ]} />
            <DocumentsList docs={s.documents} />
          </Card>

          <Card flush title="Recent orders" actions={<Link to={`/market/orders?shopId=${s.shopId}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">All orders</Link>}>
            {!s.recentOrders.length ? <Empty>No Market orders yet.</Empty> : (
              <Table minWidth="36rem">
                <THead><Tr><Th>Order</Th><Th>Customer</Th><Th>Status</Th><Th align="right">Total</Th><Th>Placed</Th></Tr></THead>
                <TBody>
                  {s.recentOrders.map((o) => (
                    <Tr key={o.id} interactive onClick={() => navigate(`/market/orders/${o.id}`)}>
                      <Td className="font-medium text-slate-900">#{o.orderNumber}</Td>
                      <Td>{o.customer ?? '—'}</Td>
                      <Td><OrderStatusBadge status={o.status} /></Td>
                      <Td align="right">{formatPKRFull(o.total)}</Td>
                      <Td className="whitespace-nowrap">{dateTime(o.createdAt)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Actions" description="Written to the admin audit log.">
            <fieldset disabled={!canManage || run.isPending} className="divide-y divide-slate-100">
              <SettingRow title="Approval" hint={s.verifiedAt ? `Approved ${dateTime(s.verifiedAt)}` : 'Not approved yet'}>
                <div className="flex gap-2">
                  {s.approval !== 'APPROVED' && <Button size="sm" onClick={approve} disabled={!s.listed} title={s.listed ? undefined : 'The shop has not published yet'}><BadgeCheck className="h-4 w-4" /> Approve</Button>}
                  {s.approval !== 'REJECTED' && <Button size="sm" variant="secondary" onClick={() => setModal('reject')}><XCircle className="h-4 w-4" /> Reject</Button>}
                </div>
              </SettingRow>
              <SettingRow title={s.isPaused ? 'Paused' : 'Pause shop'} hint={s.isPaused ? 'Customers cannot order' : 'Stop orders without removing the shop'}>
                {s.isPaused
                  ? <Button size="sm" variant="secondary" onClick={resume}><PlayCircle className="h-4 w-4" /> Resume</Button>
                  : <Button size="sm" variant="secondary" onClick={() => setModal('pause')}><PauseCircle className="h-4 w-4" /> Pause</Button>}
              </SettingRow>
              <SettingRow title="Featured on home" hint="Shown first in the featured row">
                <Switch checked={s.featured} onChange={(e) => setFeatured(e.target.checked)} aria-label="Featured on home" />
              </SettingRow>
              <div className="space-y-3 pt-3">
                <Select label="Verification level" size="sm" value={s.verificationLevel} onChange={(e) => setLevel(e.target.value as VerificationLevel)}
                  options={VERIFICATION_LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} hint="Gold and Platinum shops can appear in the featured row on their own." />
                <Select label="Section" size="sm" value={s.gateSaved ?? 'AUTO'} onChange={(e) => void setGate(e.target.value)}
                  options={[{ value: 'AUTO', label: `Automatic (${GATE_LABEL[s.gate]})` }, ...MARKET_GATES.map((g) => ({ value: g, label: GATE_LABEL[g] }))]} />
              </div>
            </fieldset>
            {!canManage && <p className="mt-3 text-[0.75rem] text-slate-500">Your role can only view the Market.</p>}
          </Card>

          <Card title="Business">
            <DetailList items={[
              { label: 'Business', value: <Link to={`/tenants/${s.tenantId}`} className="font-medium text-brand-700 hover:underline">{s.tenant.name}</Link> },
              { label: 'POS shop', value: s.shop.name },
              { label: 'Phone', value: s.tenant.phone ?? s.shop.phone },
              { label: 'Business type', value: s.tenant.businessType },
              { label: 'Account', value: s.tenant.status },
              { label: 'Order channel', value: s.integration ? (s.integration.isActive ? <Pill tone="emerald">Connected</Pill> : <Pill tone="amber">Paused</Pill>) : 'Created on first order' },
              { label: 'Market profile since', value: dateTime(s.createdAt) },
            ]} />
          </Card>

          <Card title="Reviews" actions={<Link to={`/market/reviews?shopId=${s.shopId}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Moderate</Link>}>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">{s.reviews.count ? s.reviews.average.toFixed(1) : '—'}</span>
              <span className="text-[0.8125rem] text-slate-500">{num(s.reviews.count)} visible · {num(s.reviews.hidden)} hidden</span>
            </div>
            <ul className="space-y-1.5">
              {s.reviews.byRating.map((r) => (
                <li key={r.rating} className="flex items-center gap-2 text-[0.75rem] text-slate-600">
                  <span className="inline-flex w-8 items-center gap-0.5">{r.rating}<Star className="h-3 w-3 text-amber-500" /></span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${s.reviews.count ? (r.count / s.reviews.count) * 100 : 0}%` }} /></div>
                  <span className="w-8 text-right">{num(r.count)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <TextActionModal open={modal === 'reject'} onClose={() => setModal(null)} busy={run.isPending} danger
        title={`Reject ${s.name}?`} description="The shop is taken off the Market. The owner can fix the profile and publish again, which sends it back here."
        label="Reason for the shop" placeholder="e.g. The shop photos and address do not match the CNIC." yes="Reject"
        onConfirm={(reason) => act(() => adminMarketApi.rejectShop(s.shopId, reason), 'Shop rejected')} />
      <TextActionModal open={modal === 'pause'} onClose={() => setModal(null)} busy={run.isPending} danger required={false}
        title={`Pause ${s.name}?`} description="Customers see the shop as closed and cannot order until you resume it. Open orders are not touched."
        label="Reason (optional)" placeholder="e.g. Many late deliveries this week." yes="Pause"
        onConfirm={(reason) => act(() => adminMarketApi.updateShop(s.shopId, { isPaused: true, pausedReason: reason }), 'Shop paused')} />

      {guide.isOpen && (
        <MarketGuide
          search={false}
          title="Shop"
          description="Check a shop and decide what customers see."
          flowTitle="Review a shop"
          flow={[
            { label: 'Profile', hint: 'Name, photos, address', icon: Store, color: '#4f46e5' },
            { label: 'Documents', hint: 'CNIC and files', icon: FileText, color: '#0284c7' },
            { label: 'Decide', hint: 'Approve, pause, feature', icon: ShieldCheck, color: '#16a34a' },
          ]}
          steps={[
            { icon: Store, color: '#4f46e5', title: 'Check the profile', text: 'Make sure the name, photos and address look real and match the business.' },
            { icon: FileText, color: '#0284c7', title: 'Check the documents', text: 'CNIC, registration and any files the shop uploaded.' },
            { icon: BadgeCheck, color: '#16a34a', title: 'Approve or reject', text: 'Approve to show the shop; reject with a reason the owner can act on.' },
            { icon: Sparkles, color: '#7c3aed', title: 'Feature good shops', text: 'Featured shops come first on the home screen.' },
          ]}
          tips={['Pausing keeps the shop and its products; customers just cannot order.', 'Changing the section changes the customer flow for this shop.', 'Business opens the shop in the Shops workspace.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

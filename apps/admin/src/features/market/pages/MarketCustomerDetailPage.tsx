/**
 * One Market customer: contact, wallet and points, addresses, orders,
 * support tickets and the block switch. Blocking signs the customer out of
 * the Market apps and stops new orders; it is logged by the server.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CircleAlert, LifeBuoy, ShieldCheck, ShoppingBag, User } from 'lucide-react';
import { Alert, Card, EmptyState, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, type MarketCustomerDetail } from '@/api/admin-market.api';
import { DetailList } from '@/ui';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatPKRFull, num } from '@/lib/format';
import { Empty, Pill } from '@/features/shared/kit';
import { TextActionModal } from '@/features/stores/components/TextActionModal';
import { GuideButton, MarketGuide, OrderStatusBadge, TicketStatusBadge, dateTime } from '../components/MarketUi';

export default function MarketCustomerDetailPage() {
  const { id = '' } = useParams();
  const guide = usePageGuide();
  const navigate = useNavigate();
  const can = useCan();
  const qc = useQueryClient();
  const [blockOpen, setBlockOpen] = useState(false);
  const detail = useQuery({ queryKey: ['admin-market-customer', id], queryFn: () => adminMarketApi.customer(id), enabled: !!id });
  const setBlocked = useMutation({
    mutationFn: (v: { blocked: boolean; reason?: string }) => adminMarketApi.setCustomerBlocked(id, v.blocked, v.reason),
    onSuccess: (d: MarketCustomerDetail) => {
      qc.setQueryData(['admin-market-customer', id], d);
      void qc.invalidateQueries({ queryKey: ['admin-market-customers'] });
      toast.success(d.blocked ? 'Customer blocked' : 'Customer unblocked');
      setBlockOpen(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (detail.isError) {
    return (
      <PageShell>
        <PageHero title="Customer" back="/market/customers" />
        <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Customer not found" action={<Link to="/market/customers" className="font-semibold text-brand-700 hover:underline">Back to customers</Link>} />
      </PageShell>
    );
  }
  const c = detail.data;
  if (!c) return <PageShell><PageHero title="Customer" back="/market/customers" loading /><Skeleton className="h-96 rounded-3xl" /></PageShell>;

  const unblock = async () => {
    if (await confirmDialog({ title: `Unblock ${c.name}?`, text: 'They can sign in and order on the Market again.', yes: 'Unblock' })) setBlocked.mutate({ blocked: false });
  };

  return (
    <PageShell>
      <PageHero
        title={c.name}
        back="/market/customers"
        chip={c.blocked ? <Pill tone="rose">Blocked</Pill> : <Pill tone="emerald">Active</Pill>}
        meta={<span>{c.phone}{c.lastKnownCity ? ` · ${c.lastKnownCity}` : ''}</span>}
        busy={detail.isFetching || setBlocked.isPending}
        actions={
          <>
            {can('marketplace.manage') && (c.blocked
              ? <button type="button" className={heroButton} onClick={unblock}><ShieldCheck className="h-4 w-4" /> Unblock</button>
              : <button type="button" className={heroButton} onClick={() => setBlockOpen(true)}><Ban className="h-4 w-4" /> Block</button>)}
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={[
          { label: 'Orders', value: num(c.stats.orders), hint: `${num(c.stats.delivered)} delivered` },
          { label: 'Spent', value: formatPKRFull(c.stats.spent), hint: 'Delivered orders' },
          { label: 'Wallet', value: formatPKRFull(c.wallet), hint: `${num(c.loyaltyPoints)} points` },
          { label: 'Cancelled', value: num(c.stats.cancelled) },
        ]}
      />

      {c.blocked && <Alert tone="danger" title={`Blocked ${c.bannedAt ? dateTime(c.bannedAt) : ''}`}>Reason: {c.banReason ?? 'not given'}.</Alert>}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card flush title="Orders" description="Last 20">
            {!c.orders.length ? <Empty>No orders yet.</Empty> : (
              <Table minWidth="36rem">
                <THead><Tr><Th>Order</Th><Th>Shop</Th><Th>Status</Th><Th align="right">Total</Th><Th>Placed</Th></Tr></THead>
                <TBody>
                  {c.orders.map((o) => (
                    <Tr key={o.id} interactive onClick={() => navigate(`/market/orders/${o.id}`)}>
                      <Td className="font-medium text-slate-900">#{o.orderNumber}</Td>
                      <Td>{o.shop}</Td>
                      <Td><OrderStatusBadge status={o.status} /></Td>
                      <Td align="right">{formatPKRFull(o.total)}</Td>
                      <Td className="whitespace-nowrap">{dateTime(o.createdAt)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
          <Card flush title="Support tickets">
            {!c.tickets.length ? <Empty>No tickets.</Empty> : (
              <Table minWidth="32rem">
                <THead><Tr><Th>Ticket</Th><Th>Subject</Th><Th>Status</Th><Th>Opened</Th></Tr></THead>
                <TBody>
                  {c.tickets.map((t) => (
                    <Tr key={t.id} interactive onClick={() => navigate(`/market/support/${t.id}`)}>
                      <Td className="font-medium text-slate-900">#{t.ticketNumber}</Td>
                      <Td>{t.subject}</Td>
                      <Td><TicketStatusBadge status={t.status} /></Td>
                      <Td className="whitespace-nowrap">{dateTime(t.createdAt)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Contact">
            <DetailList items={[
              { label: 'Phone', value: <span>{c.phone} {c.phoneVerified && <Pill tone="emerald">Verified</Pill>}</span> },
              { label: 'Email', value: c.email },
              { label: 'Sign-in', value: c.authProvider.replace(/_/g, ' ').toLowerCase() },
              { label: 'Language', value: c.language },
              { label: 'Referral code', value: c.referralCode },
              { label: 'Signed up', value: dateTime(c.createdAt) },
              { label: 'Last active', value: c.lastActiveAt ? dateTime(c.lastActiveAt) : null },
              { label: 'Reviews written', value: num(c.stats.reviews) },
            ]} />
          </Card>
          <Card title="Addresses">
            {!c.addresses.length ? <Empty>No saved addresses.</Empty> : (
              <ul className="space-y-2.5">
                {c.addresses.map((a) => (
                  <li key={a.id} className="text-[0.8125rem]">
                    <div className="font-medium text-slate-900">{a.label}</div>
                    <div className="text-slate-600">{a.addressLine1}, {a.city}</div>
                    <div className="text-[0.75rem] text-slate-500">{a.phone}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <TextActionModal open={blockOpen} onClose={() => setBlockOpen(false)} busy={setBlocked.isPending} danger
        title={`Block ${c.name}?`} description="They are signed out of the Market app and website and cannot order. Their past orders stay."
        label="Reason (kept for staff)" placeholder="e.g. Repeated fake orders." yes="Block customer"
        onConfirm={(reason) => setBlocked.mutate({ blocked: true, reason })} />

      {guide.isOpen && (
        <MarketGuide
          search={false}
          title="Customer"
          description="One Market buyer and their history."
          flow={[
            { label: 'Customer', hint: 'Contact', icon: User, color: '#4f46e5' },
            { label: 'Orders', hint: 'Last 20', icon: ShoppingBag, color: '#0284c7' },
            { label: 'Tickets', hint: 'Support', icon: LifeBuoy, color: '#16a34a' },
          ]}
          steps={[
            { icon: ShoppingBag, color: '#0284c7', title: 'Check the orders', text: 'Open any order to see items, the shop side and cancel options.' },
            { icon: LifeBuoy, color: '#16a34a', title: 'Check tickets', text: 'Open a ticket to reply to the customer.' },
            { icon: Ban, color: '#e11d48', title: 'Block only for abuse', text: 'Fake orders, abuse to riders or fraud. Write the reason.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

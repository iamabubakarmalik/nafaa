/**
 * One network link as either side sees it: the agreed statement, payments,
 * orders and the link's settings (auto-receive for the buyer; terms, pause
 * and unlink for the seller).
 */

import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, ClipboardList, Pause, Play, Settings2, ShoppingCart } from 'lucide-react';
import { Button, PageHero, PageShell, Skeleton, Switch, ViewTabs, confirmDialog, heroButton } from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { Empty, Fact, Panel, Pill } from '@modules/distribution/components/parts';
import { useMoney } from '@modules/distribution/hooks/useDistribution';
import { dayTime } from '@modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type LinkView } from '../api/trade.api';
import { LINK_STATUS, ORDER_STATUS, RECEIVE_STATE } from '../lib/meta';
import { PaymentsPanel, StatementPanel } from '../components/AccountView';
import { TermsModal } from '../components/TermsModal';
import { BizAvatar, Where } from '../components/shared';
import { t as tr } from '@core/i18n';

type Tab = 'statement' | 'payments' | 'orders' | 'settings';

export default function AccountPage() {
  const { linkId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'statement';
  const canPay = usePermission(PERMISSIONS.TRADE_PAYMENTS_MANAGE);
  const q = useQuery({ queryKey: [TRADE_KEY, 'link', linkId], queryFn: () => tradeApi.link(linkId) });
  const link = q.data;
  const seller = link?.side === 'SELLER';
  const back = seller ? '/network/customers' : '/network';

  return (
    <PageShell>
      <PageHero back={back} backLabel={seller ? tr('Network') : tr('Suppliers')} loading={q.isLoading}
        title={link?.other?.name ?? tr('Hisaab')}
        chip={link && <><Pill tone={LINK_STATUS[link.status].tone}>{LINK_STATUS[link.status].label}</Pill></>}
        meta={link ? <>{seller ? tr('Network customer') : tr('Network supplier')}{link.other?.city ? ` · ${[link.other.area, link.other.city].filter(Boolean).join(', ')}` : ''}{link.activatedAt ? tr(' · {{activatedAt}} se jura', { activatedAt: dayTime(link.activatedAt) }) : ''}</> : undefined}
        actions={link && !seller && link.status === 'ACTIVE' && <Link to={`/network/order/${link.id}`} className={heroButton}><ShoppingCart className="h-4 w-4" /><span>{tr('Order')}</span></Link>}
      />
      <ViewTabs value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[{ id: 'statement', label: tr('Statement') }, { id: 'payments', label: tr('Payments') }, { id: 'orders', label: tr('Orders') }, { id: 'settings', label: tr('Settings') }]} />
      {!link ? <Skeleton className="h-72 rounded-3xl" />
        : tab === 'statement' ? <StatementPanel linkId={linkId} />
          : tab === 'payments' ? <PaymentsPanel linkId={linkId} side={link.side} canManage={canPay} />
            : tab === 'orders' ? (seller ? <SellerOrders linkId={linkId} /> : <BuyerOrdersLink linkId={linkId} />)
              : seller ? <SellerSettings link={link} /> : <BuyerSettings link={link} />}
    </PageShell>
  );
}

function SellerOrders({ linkId }: { linkId: string }) {
  const money = useMoney();
  const q = useQuery({ queryKey: [TRADE_KEY, 'link-orders', linkId], queryFn: () => tradeApi.linkOrders(linkId) });
  return (
    <Panel title={tr('Is dukaan ke Nafaa Order')} sub={tr('Approve, Invoice aur load sheet Orders desk se hote hain')} flush
      right={<Link to="/distribution/orders"><Button size="sm" variant="secondary" leftIcon={<ClipboardList className="h-4 w-4" />}>{tr('Orders desk')}</Button></Link>}>
      {q.isLoading ? <Skeleton className="m-4 h-32 rounded-xl" /> : !q.data?.length ? <Empty text={tr('Abhi koi Order nahi.')} /> : (
        <ul className="divide-y divide-slate-100">
          {q.data.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
              <span className="min-w-0 flex-1">
                <span className="block text-[0.875rem] font-semibold text-slate-900">{o.orderNumber}{o.invoiceNumber ? ` · ${o.invoiceNumber}` : ''}</span>
                <span className="block text-[0.75rem] text-slate-500">{dayTime(o.createdAt)}{o.receivedAt ? tr(' · dukaan ne {{receivedAt}} ko receive kiya', { receivedAt: dayTime(o.receivedAt) }) : ''}</span>
              </span>
              <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
              {o.receiveState === 'RECEIVED' && <Pill tone={RECEIVE_STATE.RECEIVED.tone}>{tr('Dukaan ko mil gaya')}</Pill>}
              <span className="w-24 text-end text-[0.875rem] font-semibold tabular-nums">{money(o.invoiceTotal ?? o.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function BuyerOrdersLink({ linkId }: { linkId: string }) {
  const money = useMoney();
  const q = useQuery({ queryKey: [TRADE_KEY, 'orders', 'link', linkId], queryFn: () => tradeApi.orders({ linkId, limit: 50 }) });
  return (
    <Panel title={tr('Is supplier ke Order')} flush right={<Link to="/network/orders"><Button size="sm" variant="secondary">{tr('All orders')}</Button></Link>}>
      {q.isLoading ? <Skeleton className="m-4 h-32 rounded-xl" /> : !q.data?.orders.length ? <Empty text={tr('Abhi koi Order nahi.')} /> : (
        <ul className="divide-y divide-slate-100">
          {q.data.orders.map((o) => (
            <li key={o.id}>
              <Link to={`/network/orders?id=${o.id}`} className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-slate-50/80 sm:px-5">
                <span className="min-w-0 flex-1"><span className="block text-[0.875rem] font-semibold text-slate-900">{o.orderNumber}</span><span className="block text-[0.75rem] text-slate-500">{dayTime(o.createdAt)}</span></span>
                <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                <span className="w-24 text-end text-[0.875rem] font-semibold tabular-nums">{money(o.deliveredValue ?? o.invoiceTotal ?? o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function BuyerSettings({ link }: { link: LinkView }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const canLink = usePermission(PERMISSIONS.TRADE_LINKS_MANAGE);
  const save = useMutation({
    mutationFn: (autoReceive: boolean) => tradeApi.buyerSettings(link.id, { autoReceive }),
    onSuccess: () => { toast.success(tr('Save')); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const unlink = useMutation({
    mutationFn: () => tradeApi.unlink(link.id),
    onSuccess: () => { toast.success(tr('Link khatam')); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); nav('/network'); },
    onError: (e) => toast.error(tradeError(e)),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={tr('Maal receive karna')}>
        <Switch label={tr('Deliver hote hi khud stock me daalein')} description={tr('On ho to \'Mark received\' dabane ki zaroorat nahi — delivery par Purchase khud receive ho jayegi.')}
          checked={!!link.autoReceive} disabled={!canLink || save.isPending} onChange={(e) => save.mutate(e.target.checked)} />
      </Panel>
      <Panel title={tr('Supplier')}>
        <div className="flex items-center gap-3">
          <BizAvatar card={link.other} size="lg" />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900">{link.other?.name}</div>
            <div className="text-[0.75rem] text-slate-500"><Where card={link.other} />{link.other?.phone ? ` · ${link.other.phone}` : ''}</div>
            {link.supplier && <div className="mt-1 text-[0.75rem] text-slate-500">{tr('Aap ke Suppliers me: {{name}}', { name: link.supplier.name })}</div>}
          </div>
        </div>
        {canLink && ['ACTIVE', 'PAUSED'].includes(link.status) && (
          <Button className="mt-4" variant="ghost" leftIcon={<Ban className="h-4 w-4" />} loading={unlink.isPending} onClick={async () => {
            if (await confirmDialog({ title: tr('Link khatam karein?'), text: tr('Naye Order band ho jayenge. Purane Order, Purchase aur khata wese hi rahenge.'), yes: tr('Unlink'), danger: true })) unlink.mutate();
          }}>{tr('Unlink')}</Button>
        )}
      </Panel>
    </div>
  );
}

function SellerSettings({ link }: { link: LinkView }) {
  const qc = useQueryClient();
  const money = useMoney();
  const canLink = usePermission(PERMISSIONS.TRADE_LINKS_MANAGE);
  const [terms, setTerms] = useState(false);
  const act = useMutation({
    mutationFn: (kind: 'pause' | 'resume' | 'unlink') => tradeApi[kind](link.id),
    onSuccess: () => { toast.success(tr('Save')); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const c = link.customer;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={tr('Terms')} right={canLink && c && <Button size="sm" variant="secondary" leftIcon={<Settings2 className="h-4 w-4" />} onClick={() => setTerms(true)}>{tr('Edit')}</Button>}>
        {c ? (
          <div className="grid grid-cols-2 gap-4">
            <Fact label={tr('Customer')}>{c.name}</Fact>
            <Fact label={tr('Khata')}>{money(c.balance)}</Fact>
            <Fact label={tr('Price list')}>{c.priceListName ?? tr('Default')}</Fact>
            <Fact label={tr('Route')}>{c.routeName ?? '—'}</Fact>
            <Fact label={tr('Udhaar ki had')}>{c.creditLimit ? money(c.creditLimit) : tr('Koi had nahi')}</Fact>
            <Fact label={tr('Udhaar ke din')}>{c.creditDays ?? '—'}</Fact>
          </div>
        ) : <p className="text-[0.8125rem] text-slate-500">{tr('Approve hone ke baad yahan terms aayenge.')}</p>}
      </Panel>
      <Panel title={tr('Link')}>
        <p className="text-[0.8125rem] text-slate-600">{tr('Rokne se dukaan naye Order nahi bhej sakti; chalte Order, delivery aur payments chalte rahenge.')}</p>
        {canLink && (
          <div className="mt-4 flex flex-wrap gap-2">
            {link.status === 'ACTIVE' && <Button variant="secondary" leftIcon={<Pause className="h-4 w-4" />} loading={act.isPending} onClick={() => act.mutate('pause')}>{tr('Pause')}</Button>}
            {link.status === 'PAUSED' && <Button leftIcon={<Play className="h-4 w-4" />} loading={act.isPending} onClick={() => act.mutate('resume')}>{tr('Resume')}</Button>}
            {['ACTIVE', 'PAUSED'].includes(link.status) && <Button variant="ghost" leftIcon={<Ban className="h-4 w-4" />} onClick={async () => {
              if (await confirmDialog({ title: tr('Link khatam karein?'), text: tr('Purane Order aur khata wese hi rahenge.'), yes: tr('Unlink'), danger: true })) act.mutate('unlink');
            }}>{tr('Unlink')}</Button>}
          </div>
        )}
      </Panel>
      {terms && c && <TermsModal linkId={link.id} mode="terms" buyer={link.other} initial={{ ...c, bookedById: link.bookedById }} onClose={() => setTerms(false)} />}
    </div>
  );
}

/**
 * The account of one network link, for both sides: the shared statement,
 * payments with two-sided confirmation, the orders of this link and the
 * link settings (auto receive for the buyer; terms, pause and unlink for the seller).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, ClipboardList, Pause, Play, Settings2, ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Button, Card, DetailRow, DetailSection, EmptyState, ErrorState, IconButton, ListRow, Row, Screen, Segmented, SettingSwitch, SkeletonRows, Text, confirm, toast, useTheme,
} from '@/design';
import { dayTime, rs } from '@/modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type LinkView } from '../api/trade.api';
import { LINK_STATUS, ORDER_STATUS, RECEIVE_STATE } from '../lib/meta';
import { PaymentsView, StatementView } from '../components/AccountView';
import { BizAvatar, CachedLine, Pill, whereText } from '../components/shared';
import { TermsSheet } from '../components/TermsSheet';

type Tab = 'statement' | 'payments' | 'orders' | 'settings';

export function AccountScreen() {
  const th = useTheme();
  const { linkId = '', tab: tabParam } = useLocalSearchParams<{ linkId: string; tab?: string }>();
  const [tab, setTab] = useState<Tab>(() => (['statement', 'payments', 'orders', 'settings'].includes(tabParam ?? '') ? tabParam as Tab : 'statement'));
  const can = usePermission();
  const canPay = can(P.TRADE_PAYMENTS_MANAGE);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [TRADE_KEY, 'link', linkId], queryFn: () => tradeApi.link(linkId) });
  const link = q.data;
  const seller = link?.side === 'SELLER';

  return (
    <Screen
      title={link?.other?.name ?? t('Hisaab')}
      subtitle={link ? `${seller ? t('Network customer') : t('Network supplier')}${link.other?.city ? ` · ${whereText(link.other)}` : ''}` : undefined}
      actions={link && !seller && link.status === 'ACTIVE' ? <IconButton icon={ShoppingCart} label={t('Order')} variant="soft" onPress={() => router.push(`/network/order/${link.id}`)} /> : undefined}
      onRefresh={() => qc.invalidateQueries({ queryKey: [TRADE_KEY] })} refreshing={q.isRefetching}
    >
      <View style={{ gap: th.space(3) }}>
        {link && (
          <Row gap={2}>
            <Pill tone={LINK_STATUS[link.status].tone}>{LINK_STATUS[link.status].label}</Pill>
            {!!link.activatedAt && <Text size="xs" tone="muted">{t(' · {{activatedAt}} se jura', { activatedAt: dayTime(link.activatedAt) }).replace(/^ · /, '')}</Text>}
          </Row>
        )}
        <Segmented size="sm" value={tab} onChange={setTab}
          options={[{ value: 'statement', label: t('Statement') }, { value: 'payments', label: t('Payments') }, { value: 'orders', label: t('Orders') }, { value: 'settings', label: t('Settings') }]} />
        {q.isLoading ? <SkeletonRows count={4} /> : !link ? <ErrorState error={q.error} onRetry={q.refetch} />
          : tab === 'statement' ? <StatementView linkId={linkId} />
            : tab === 'payments' ? <PaymentsView linkId={linkId} side={link.side} canManage={canPay} />
              : tab === 'orders' ? (seller ? <SellerOrders linkId={linkId} /> : <BuyerOrders linkId={linkId} />)
                : seller ? <SellerSettings link={link} /> : <BuyerSettings link={link} />}
      </View>
    </Screen>
  );
}

function SellerOrders({ linkId }: { linkId: string }) {
  const q = useQuery({ queryKey: [TRADE_KEY, 'link-orders', linkId], queryFn: () => tradeApi.linkOrders(linkId) });
  return (
    <Card title={t('Is dukaan ke Nafaa Order')} description={t('Approve, Invoice aur load sheet Orders desk se hote hain')} flush
      action={<IconButton icon={ClipboardList} label={t('Orders desk')} onPress={() => router.push('/distribution/orders' as never)} />}>
      {q.isLoading ? <SkeletonRows count={3} /> : !q.data?.length ? <EmptyState compact icon={ClipboardList} title={t('Abhi koi Order nahi.')} /> : q.data.map((o, i) => (
        <ListRow key={o.id} divider={i < q.data.length - 1}
          title={`${o.orderNumber ?? ''}${o.invoiceNumber ? ` · ${o.invoiceNumber}` : ''}`}
          subtitle={`${dayTime(o.createdAt)}${o.receivedAt ? t(' · dukaan ne {{receivedAt}} ko receive kiya', { receivedAt: dayTime(o.receivedAt) }) : ''}`}
          trailing={(
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Amount value={o.invoiceTotal ?? o.total} weight="semibold" />
              <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
              {o.receiveState === 'RECEIVED' && <Pill tone={RECEIVE_STATE.RECEIVED.tone}>{t('Dukaan ko mil gaya')}</Pill>}
            </View>
          )} />
      ))}
    </Card>
  );
}

function BuyerOrders({ linkId }: { linkId: string }) {
  const q = useQuery({ queryKey: [TRADE_KEY, 'orders', 'link', linkId], queryFn: () => tradeApi.orders({ linkId, limit: 50 }) });
  return (
    <Card title={t('Is supplier ke Order')} flush action={<Button size="sm" variant="secondary" onPress={() => router.push('/network/orders')}>{t('All orders')}</Button>}>
      {q.isLoading ? <SkeletonRows count={3} /> : !q.data?.orders.length ? <EmptyState compact icon={ClipboardList} title={t('Abhi koi Order nahi.')} /> : q.data.orders.map((o, i) => (
        <ListRow key={o.id} divider={i < q.data.orders.length - 1} chevron title={o.orderNumber ?? ''} subtitle={dayTime(o.createdAt)}
          onPress={() => router.push(`/network/orders/${o.id}`)}
          trailing={(
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Amount value={o.deliveredValue ?? o.invoiceTotal ?? o.total} weight="semibold" />
              <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
            </View>
          )} />
      ))}
    </Card>
  );
}

function BuyerSettings({ link }: { link: LinkView }) {
  const th = useTheme();
  const qc = useQueryClient();
  const canLink = usePermission()(P.TRADE_LINKS_MANAGE);
  const save = useMutation({
    mutationFn: (autoReceive: boolean) => tradeApi.buyerSettings(link.id, { autoReceive }),
    onSuccess: () => { toast.success(t('Save')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const unlink = useMutation({
    mutationFn: () => tradeApi.unlink(link.id),
    onSuccess: () => { toast.success(t('Link khatam')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); router.replace('/network'); },
    onError: (e) => toast.error(tradeError(e)),
  });
  return (
    <View style={{ gap: th.space(3) }}>
      <Card title={t('Maal receive karna')}>
        <SettingSwitch label={t('Deliver hote hi khud stock me daalein')} description={t('On ho to \'Mark received\' dabane ki zaroorat nahi — delivery par Purchase khud receive ho jayegi.')}
          value={!!link.autoReceive} disabled={!canLink || save.isPending} onChange={(v) => save.mutate(v)} />
      </Card>
      <Card title={t('Supplier')}>
        <Row gap={3}>
          <BizAvatar card={link.other} size={44} />
          <View style={{ flex: 1 }}>
            <Text weight="semibold">{link.other?.name}</Text>
            <Text size="xs" tone="muted">{[whereText(link.other), link.other?.phone].filter(Boolean).join(' · ')}</Text>
            {link.supplier && <Text size="xs" tone="muted">{t('Aap ke Suppliers me: {{name}}', { name: link.supplier.name })}</Text>}
          </View>
        </Row>
        {canLink && ['ACTIVE', 'PAUSED'].includes(link.status) && (
          <Button style={{ marginTop: th.space(3) }} variant="ghost" icon={Ban} loading={unlink.isPending} onPress={async () => {
            if (await confirm({ title: t('Link khatam karein?'), message: t('Naye Order band ho jayenge. Purane Order, Purchase aur khata wese hi rahenge.'), confirmLabel: t('Unlink'), tone: 'danger' })) unlink.mutate();
          }}>{t('Unlink')}</Button>
        )}
      </Card>
    </View>
  );
}

function SellerSettings({ link }: { link: LinkView }) {
  const th = useTheme();
  const qc = useQueryClient();
  const canLink = usePermission()(P.TRADE_LINKS_MANAGE);
  const [terms, setTerms] = useState(false);
  const act = useMutation({
    mutationFn: (kind: 'pause' | 'resume' | 'unlink') => tradeApi[kind](link.id),
    onSuccess: () => { toast.success(t('Save')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const c = link.customer;
  return (
    <View style={{ gap: th.space(3) }}>
      <Card title={t('Terms')} action={canLink && c ? <IconButton icon={Settings2} label={t('Edit')} onPress={() => setTerms(true)} /> : undefined} flush={!!c}>
        {c ? (
          <DetailSection>
            <DetailRow label={t('Customer')} value={c.name} />
            <DetailRow label={t('Khata')} value={<Amount value={c.balance} />} />
            <DetailRow label={t('Price list')} value={c.priceListName ?? t('Default')} />
            <DetailRow label={t('Route')} value={c.routeName ?? '—'} />
            <DetailRow label={t('Udhaar ki had')} value={c.creditLimit ? rs(c.creditLimit) : t('Koi had nahi')} />
            <DetailRow label={t('Udhaar ke din')} value={c.creditDays != null ? String(c.creditDays) : '—'} last />
          </DetailSection>
        ) : <Text size="sm" tone="muted">{t('Approve hone ke baad yahan terms aayenge.')}</Text>}
      </Card>
      <Card title={t('Link')}>
        <Text size="sm" tone="secondary">{t('Rokne se dukaan naye Order nahi bhej sakti; chalte Order, delivery aur payments chalte rahenge.')}</Text>
        {canLink && (
          <Row gap={2} wrap style={{ marginTop: th.space(3) }}>
            {link.status === 'ACTIVE' && <Button variant="secondary" icon={Pause} loading={act.isPending} onPress={() => act.mutate('pause')}>{t('Pause')}</Button>}
            {link.status === 'PAUSED' && <Button icon={Play} loading={act.isPending} onPress={() => act.mutate('resume')}>{t('Resume')}</Button>}
            {['ACTIVE', 'PAUSED'].includes(link.status) && (
              <Button variant="ghost" icon={Ban} onPress={async () => {
                if (await confirm({ title: t('Link khatam karein?'), message: t('Purane Order aur khata wese hi rahenge.'), confirmLabel: t('Unlink'), tone: 'danger' })) act.mutate('unlink');
              }}>{t('Unlink')}</Button>
            )}
          </Row>
        )}
      </Card>
      {terms && c && <TermsSheet linkId={link.id} mode="terms" buyer={link.other} initial={{ ...c, bookedById: link.bookedById }} onClose={() => setTerms(false)} />}
    </View>
  );
}

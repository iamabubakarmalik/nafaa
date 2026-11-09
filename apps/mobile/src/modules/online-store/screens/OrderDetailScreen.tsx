/**
 * One online order with everything the shop does on it: warnings, branch,
 * COD confirmation, customer and risk, staff notes and tags, items, money
 * (delivery, advances, COD), true profit, payment link, bill and invoice,
 * the parcel's journey, team (assignee, follow-up), status history and the
 * courier. The board status chip moves the order to any status; Edit opens
 * the full edit screen. The next step sits at the bottom. Mirrors the web
 * OrderDetailPanel.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRightLeft, Ban, CheckCircle2, Link2, MessageCircle, MoreHorizontal, Package, Pencil, Printer, RefreshCw, Share2, Tag, Truck } from 'lucide-react-native';
import { router } from 'expo-router';
import { isClosed as closedOf, orderNo, orderOptions, stockState } from '@nafaa/core/online-store';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { Badge, Button, DetailTemplate, HeroAmount, Icon, IconButton, ListGroup, ListRow, PageHero, PressableScale, Sheet, Text, toast, useTheme } from '@/design';
import { apiErrorMessage, ordersApi, statusOf, unmatchedFromError } from '../api/online';
import { boardApi } from '../api/board';
import { BookCourierSheet } from '../components/board/BookCourierSheet';
import { StatusSheet } from '../components/board/StatusSheet';
import { WaSheet } from '../components/board/WaSheet';
import { HistoryCard, JourneyCard, TeamCard } from '../components/order/BoardCards';
import { entryLabel, useMoveOrder } from '../hooks/useMoveOrder';
import { boardEntry, boardOf } from '../lib/board';
import { getOrderCards } from '../lib/extensions';
import { printLabels } from '../lib/docs';
import { ChannelLogo } from '../components/BrandLogo';
import { Note, OrderStatusBadge, SavedDataNote } from '../components/bits';
import { ReasonSheet } from '../components/OrderSheets';
import { ConfirmCard, CustomerCard, ExtrasCard } from '../components/order/CustomerCards';
import { BillCard, ItemsCard, MoneyCard, PaymentLinkCard, ProfitCard, TimelineCard } from '../components/order/MoneyCards';
import { CourierCard, DarazCard, DispatchSheet, ManualTrackCard } from '../components/order/CourierCards';
import { BranchPicker, MatchSheet, type Matches } from '../components/order/OrderTools';
import { CANCEL_REASONS, NEXT_ACTION, NEXT_FALLBACK, RTO_REASONS, STATUS_LABEL } from '../lib/labels';
import { KEYS, refreshOrders, useOnlineGuard } from '../lib/online';
import { printInvoices } from '../lib/docs';
import { useShopLanguage } from '../lib/messages';
import { copyText } from '../lib/device';

export function OrderDetailScreen() {
  const th = useTheme();
  const { id, match } = useLocalSearchParams<{ id: string; match?: string }>();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name ?? '');
  const lang = useShopLanguage();
  const { guard } = useOnlineGuard();
  const [matchOpen, setMatchOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rtoOpen, setRtoOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);

  const q = useQuery({ queryKey: KEYS.order(id), queryFn: () => boardApi.detail(id), refetchInterval: 20_000, enabled: !!id });
  const custom = useQuery({ queryKey: [...KEYS.orders, 'stages'], queryFn: boardApi.stages, staleTime: 5 * 60_000 }).data ?? [];
  const mover = useMoveOrder(custom);
  const o = q.data;
  const refresh = () => refreshOrders(qc, id);
  useEffect(() => { if (match === '1' && o && o.lines.some((l) => !l.match)) setMatchOpen(true); }, [match, !!o]); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = useMutation({
    mutationFn: (matches?: Matches) => ordersApi.accept(id, {
      matches: matches ? Object.fromEntries(Object.entries(matches).map(([k, v]) => [k, { productId: v.productId, variantId: v.variantId ?? null }])) : undefined,
    }),
    onSuccess: (res) => {
      setMatchOpen(false);
      refresh();
      haptic('success');
      toast.success(t('Bill ban gaya — {{saleNumber}}', { saleNumber: res.sale.saleNumber }), { message: t('Stock inventory se kam ho gaya') });
    },
    onError: async (err) => {
      // 409: some items have no product (or someone else is accepting). Re-read; link if still needed.
      if (unmatchedFromError(err) !== null || statusOf(err) === 409) {
        const fresh = await qc.fetchQuery({ queryKey: KEYS.order(id), queryFn: () => boardApi.detail(id) });
        if (fresh.lines.some((l) => !l.match)) { setMatchOpen(true); return; }
      }
      haptic('error');
      toast.error(apiErrorMessage(err, t('Accept nahi hua')));
    },
  });
  const setStatus = useMutation({
    mutationFn: (body: { status: string; trackingNumber?: string; courierName?: string; courierCode?: string }) => ordersApi.setStatus(id, body),
    onSuccess: (r) => { refresh(); setDispatchOpen(false); haptic('success'); toast.success(STATUS_LABEL[r.orderStatus] ? t(STATUS_LABEL[r.orderStatus].label) : t('Update ho gaya')); },
    onError: (err) => toast.error(apiErrorMessage(err, t('Nahi hua'))),
  });
  const cancel = useMutation({
    mutationFn: (reason: string) => ordersApi.cancel(id, reason),
    onSuccess: () => { refresh(); setCancelOpen(false); toast.success(o?.nafaaSaleId ? t('Order cancel — bill void, stock wapas aa gaya') : t('Order cancel ho gaya')); },
    onError: (err) => toast.error(apiErrorMessage(err, t('Nahi hua'))),
  });
  const returned = useMutation({
    mutationFn: (reason: string) => ordersApi.markReturned(id, reason),
    onSuccess: () => { refresh(); setRtoOpen(false); toast.success(t('Parcel wapas — bill void, stock wapas aa gaya')); },
    onError: (err) => toast.error(apiErrorMessage(err, t('Nahi hua'))),
  });

  const num = o ? orderNo(o) : '';
  const entry = o ? boardEntry(boardOf(o), custom) : undefined;
  const isPending = o?.orderStatus === 'PENDING';
  const closed = o ? closedOf(o) : false;
  const opt = o ? orderOptions(o) : null;
  const unmatched = o ? o.lines.filter((l) => !l.match).length : 0;
  const lowStock = o ? o.lines.filter((l) => l.match && !l.match.enough && isPending) : [];
  const invoice = (mode: 'print' | 'share') => printInvoices([id], shopName, lang, mode);

  const bottom = !o || !canManage || closed || (o.orderStatus === 'DELIVERED' && !opt?.rto) ? undefined : isPending ? (
    <>
      <Button size="lg" variant="success" icon={CheckCircle2} style={{ flex: 1 }} loading={accept.isPending}
        onPress={guard(() => (unmatched > 0 ? setMatchOpen(true) : accept.mutate(undefined)))}>{t('Accept + Bill banao')}</Button>
      <Button size="lg" variant="secondary" onPress={guard(() => setCancelOpen(true))}>{t('Reject')}</Button>
    </>
  ) : o.orderStatus === 'ACCEPTING' ? (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: th.space(2), paddingVertical: th.space(3) }}>
      <ActivityIndicator /><Text size="sm" weight="bold" tone="muted">{t('Bill ban raha hai…')}</Text>
    </View>
  ) : (
    <>
      {o.nextStatus && (
        <Button size="lg" style={{ flex: 1 }} iconEnd={Truck} loading={setStatus.isPending}
          onPress={guard(() => (o.nextStatus === 'OUT_FOR_DELIVERY' && !o.courierBooked ? setDispatchOpen(true) : setStatus.mutate({ status: o.nextStatus! })))}>
          {t(NEXT_ACTION[o.orderStatus] ?? NEXT_FALLBACK)}
        </Button>
      )}
      {!o.nextStatus && opt?.rto && (
        <Button size="lg" variant="secondary" icon={Package} style={{ flex: 1 }} onPress={guard(() => setRtoOpen(true))}>{t('Wapas aaya (RTO)')}</Button>
      )}
      {!!o.nextStatus && (opt?.rto || (o.orderStatus !== 'DELIVERED' && !o.dispatchedAt)) && (
        <IconButton icon={MoreHorizontal} label={t('Aur kaam')} variant="secondary" size="lg" onPress={() => setMoreOpen(true)} />
      )}
    </>
  );

  return (
    <>
      <DetailTemplate
        title={o ? `#${num}` : t('Order')}
        subtitle={o ? `${o.integration?.displayName ?? ''} · ${formatDateTime(o.receivedAt)}` : undefined}
        actions={o ? <>
          {opt?.invoice && <IconButton icon={Printer} label={t('Invoice')} onPress={() => invoice('print')} />}
          <IconButton icon={Share2} label={t('Share')} onPress={() => (opt?.invoice ? invoice('share') : copyText(`#${num} · ${o.customerName}`, t('Copy ho gaya')))} />
          <IconButton icon={RefreshCw} label={t('Taaza')} onPress={() => q.refetch()} />
        </> : undefined}
        loading={q.isLoading}
        error={!o ? q.error : undefined}
        onRetry={q.refetch}
        onRefresh={q.refetch}
        refreshing={q.isRefetching}
        bottomActions={bottom}
      >
        {o && (
          <>
            <PageHero chip={entryLabel(entry, o.orderStatus)} meta={o.customerName}
              stats={[
                { label: t('Total'), value: <HeroAmount value={o.total} size="2xl" /> },
                { label: t('COD baqi'), value: <HeroAmount value={o.money?.codDue ?? (o.isCod && o.paymentStatus !== 'PAID' ? o.total : 0)} size="lg" /> },
                { label: t('Cheezein'), value: String(o.items.reduce((a, i) => a + Number(i.quantity || 0), 0)) },
                { label: t('Courier'), value: o.courierLabel ?? o.courierName ?? '—' },
              ]} />
            <SavedDataNote query={q} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), flexWrap: 'wrap' }}>
              <ChannelLogo type={o.integration?.type} platform={o.platform ?? o.metadata?.platform} size={28} />
              <PressableScale disabled={!canManage || mover.busyId === o.id} onPress={guard(() => setStatusOpen(true))} accessibilityLabel={t('Status badlein')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1), paddingHorizontal: th.space(3), paddingVertical: th.space(1.5), borderRadius: th.radius('full'), backgroundColor: th.colors[entry?.tone ?? 'neutral'].soft }}>
                {entry && <Icon icon={entry.icon} size={14} color={th.colors[entry.tone].text} />}
                <Text size="sm" weight="bold" color={th.colors[entry?.tone ?? 'neutral'].text}>{entryLabel(entry, o.orderStatus)}</Text>
                {canManage && <Icon icon={ArrowRightLeft} size={13} color={th.colors[entry?.tone ?? 'neutral'].text} />}
              </PressableScale>
              <OrderStatusBadge status={o.orderStatus} long />
              {o.isTest && <Badge tone="warning" solid>{t('TEST')}</Badge>}
              {o.isCod && o.paymentStatus !== 'PAID' && !closed && <Badge tone="warning">{t('COD')}</Badge>}
            </View>
            <View style={{ flexDirection: 'row', gap: th.space(2), flexWrap: 'wrap' }}>
              {!!o.customerPhone && <Button size="sm" variant="success" icon={MessageCircle} onPress={() => setWaOpen(true)}>{t('WhatsApp')}</Button>}
              {canManage && !closed && o.orderStatus !== 'DELIVERED' && <Button size="sm" variant="secondary" icon={Pencil} onPress={() => router.push(`/online/orders/${id}/edit` as never)}>{t('Edit order')}</Button>}
              {canManage && !!o.nafaaSaleId && !o.courierBooked && !o.dispatchedAt && !closed && <Button size="sm" variant="secondary" icon={Truck} onPress={guard(() => setBookOpen(true))}>{t('Book courier')}</Button>}
              {!!o.trackingNumber && <Button size="sm" variant="secondary" icon={Tag} onPress={() => void printLabels([o.id])}>{t('Airway bill')}</Button>}
              {!!o.trackingNumber && <IconButton icon={Share2} label={t('Airway bill share')} variant="secondary" size="sm" onPress={() => void printLabels([o.id], 'share')} />}
            </View>

            {o.metadata?.cancelRequested && !closed && (
              <Note tone="danger" icon={Ban}>{t('Customer ne website par ye order cancel kar diya hai. Bill ban chuka hai — neeche "Cancel" dabayein taake bill void ho aur stock wapas aaye.')}</Note>
            )}
            {o.metadata?.autoAcceptError && isPending && <Note tone="warning" icon={AlertTriangle}>{t('Khud accept nahi ho saka: {{autoAcceptError}}', { autoAcceptError: o.metadata.autoAcceptError })}</Note>}
            {isPending && unmatched > 0 && (
              <Note tone="warning" icon={Link2}>{t('{{unmatched}} item ka Nafaa product nahi mila. Accept dabayein — jodne ka safha khul jayega (sirf ek dafa).', { unmatched })}</Note>
            )}
            {lowStock.length > 0 && (
              <Note tone="danger" icon={Package}>
                {t('Stock kam hai: {{value}}', {
                  value: lowStock.map((l) => {
                    const s = stockState(l.match!.stock);
                    return `${l.match!.name} (${s.kind === 'ok' ? t('{{n}} hai', { n: s.n }) : t('khatam')}, ${t('{{quantity}} chahiye', { quantity: l.quantity })})`;
                  }).join(', '),
                })}
              </Note>
            )}
            {o.autoBookError && !o.courierBooked && <Note tone="warning" icon={Truck}>{t('Courier par khud booking nahi hui: {{autoBookError}}', { autoBookError: o.autoBookError })}</Note>}

            <BranchPicker order={o} canManage={canManage} onChanged={refresh} />
            <ConfirmCard order={o} canManage={canManage} onChanged={refresh} onRefused={() => setCancelOpen(true)} />
            <CustomerCard order={o} canManage={canManage} onChanged={refresh} />
            <ExtrasCard order={o} canManage={canManage} onChanged={refresh} />
            <ItemsCard order={o} />
            <MoneyCard order={o} canManage={canManage} onChanged={refresh} />
            <ProfitCard order={o} canManage={canManage} onChanged={refresh} />
            {o.integration?.type !== 'DARAZ' && <PaymentLinkCard order={o} canManage={canManage} onChanged={refresh} />}
            <BillCard order={o} onInvoice={invoice} />
            <TimelineCard order={o} />
            <JourneyCard order={o} />
            <TeamCard order={o} canManage={canManage} />
            <HistoryCard order={o} custom={custom} />
            {getOrderCards().map(({ key, Component }) => <Component key={key} order={o} canManage={canManage} onChanged={refresh} />)}
            {o.integration?.type === 'DARAZ' ? <DarazCard order={o} canManage={canManage} onChanged={refresh} /> : <CourierCard order={o} canManage={canManage} onChanged={refresh} />}
            <ManualTrackCard order={o} />
          </>
        )}
      </DetailTemplate>

      {o && (
        <>
          <MatchSheet open={matchOpen} lines={o.lines} loading={accept.isPending} onClose={() => setMatchOpen(false)} onConfirm={guard((m: Matches) => accept.mutate(m))} />
          <ReasonSheet open={cancelOpen} reasons={CANCEL_REASONS}
            title={isPending ? t('#{{cancelTarget}} reject karein?', { cancelTarget: num }) : t('#{{cancelTarget}} cancel karein?', { cancelTarget: num })}
            description={o.nafaaSaleId ? t('Bill void ho jayega aur saara stock wapas inventory me aa jayega.') : t('Order cancel list me chala jayega.')}
            confirmLabel={t('Haan, cancel')} loading={cancel.isPending} onClose={() => setCancelOpen(false)} onConfirm={guard((r: string) => cancel.mutate(r))} />
          <ReasonSheet open={rtoOpen} reasons={RTO_REASONS} title={t('Parcel wapas aaya (RTO)?')}
            description={t('Bill void ho jayega aur saara stock wapas inventory me. COD ka paisa nahi aayega.')}
            confirmLabel={t('Haan, wapas aaya')} loading={returned.isPending} onClose={() => setRtoOpen(false)} onConfirm={guard((r: string) => returned.mutate(r))} />
          <DispatchSheet open={dispatchOpen} order={o} loading={setStatus.isPending} onClose={() => setDispatchOpen(false)}
            onConfirm={guard((courierCode?: string, courierName?: string, trackingNumber?: string) => setStatus.mutate({ status: 'OUT_FOR_DELIVERY', courierCode, courierName, trackingNumber }))} />
          {mover.ui}
          <StatusSheet open={statusOpen} title={`#${num}`} current={boardOf(o)} custom={custom} onClose={() => setStatusOpen(false)} onPick={(to) => mover.request(o, to)} />
          <WaSheet order={waOpen ? o : null} onClose={() => setWaOpen(false)} />
          <BookCourierSheet orders={bookOpen ? [o] : null} onClose={() => setBookOpen(false)} />
          <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={`#${num}`}>
            <ListGroup>
              {opt?.rto && <ListRow icon={Package} iconTone="warning" title={t('Wapas aaya (RTO)')} onPress={() => { setMoreOpen(false); setTimeout(() => setRtoOpen(true), 250); }} />}
              {o.orderStatus !== 'DELIVERED' && !o.dispatchedAt && <ListRow icon={Ban} destructive title={t('Cancel')} onPress={() => { setMoreOpen(false); setTimeout(() => setCancelOpen(true), 250); }} />}
            </ListGroup>
          </Sheet>
        </>
      )}
    </>
  );
}

/**
 * Bulk orders (web BulkOrdersPage): a farmer's whole-season order booked before
 * sowing. Move it step by step to delivered (that makes the bill), take an
 * advance, or cancel. Needs the server.
 */

import { router } from 'expo-router';
import { Banknote, Boxes, Plus, Truck, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { NEXT_STATUS, OPEN_STATUSES } from '@nafaa/core/industries/agri';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, DetailRow, EmptyState, ListRow, ListTemplate, Row, Sheet, Text, confirm, toast, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet, RowCard, StatRow } from '../../_shared/farm/ui';
import { bulkOrdersApi, type BulkOrder, type OrderStatus } from '../api';
import { AGRI_KEYS, ORDER_STATUS, refreshAgri, seasonLabel } from '../meta';

const LIMIT = 25;
type Filter = 'open' | 'ALL' | OrderStatus;

export function BulkOrdersScreen() {
  const th = useTheme();
  const can = usePermission();
  const manage = can(P.AGRI_ORDERS_MANAGE);
  const { guard } = useDeskOnline('agriDesk');
  const { cost } = useCostMask();
  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<BulkOrder | null>(null);
  const params = { search: search.trim() || undefined, status: filter === 'ALL' || filter === 'open' ? undefined : filter, limit: LIMIT };
  const list = usePaged([AGRI_KEYS.orders, 'paged', params], (page) => bulkOrdersApi.page({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })));
  const stats = list.first?.stats;
  const rows = filter === 'open' ? list.items.filter((o) => OPEN_STATUSES.includes(o.status)) : list.items;
  const live = open ? list.items.find((o) => o.id === open.id) ?? open : null;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Boxes, tone: 'info', label: t('Khule orders'), loading: list.loading, value: String(stats?.pending ?? 0), hint: cost(stats?.openValue ?? 0) },
        { icon: Banknote, tone: 'success', label: t('Advance'), loading: list.loading, value: cost(stats?.advance ?? 0), hint: t('Kul orders ki value') + ' ' + cost(stats?.value ?? 0) },
      ]} />
      <ChipGroup value={filter} onChange={(v) => setFilter(v as Filter)} style={{ marginHorizontal: -th.space(4) }} options={[
        { value: 'open', label: t('Khule') }, { value: 'ALL', label: t('Sab') },
        ...(['CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as OrderStatus[]).map((s) => ({ value: s, label: t(ORDER_STATUS[s].label) })),
      ]} />
      <OfflineNote feature="agriDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<BulkOrder>
        title={t('Bulk orders')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Order number, farmer, phone, fasal ya maal…') }}
        summary={header}
        data={rows}
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={list.refetch}
        onEndReached={list.loadMore}
        keyExtractor={(o) => o.id}
        renderItem={({ item: o }) => {
          const st = ORDER_STATUS[o.status];
          const due = Math.max(o.total - o.paidAmount, 0);
          return (
            <RowCard>
              <ListRow icon={Boxes} iconTone={st.tone}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{o.customerName ?? '—'}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" ltr numberOfLines={1}>{`${o.orderNumber} · ${formatDate(o.orderDate)}`}</Text>
                  <Text size="xs" tone="secondary" numberOfLines={1}>{[o.cropTarget, o.season ? seasonLabel(o.season) : '', t('{{count}} cheezein', { count: o.items.length })].filter(Boolean).join(' · ')}</Text>
                </View>}
                trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={o.total} weight="bold" />{due > 0 && o.status !== 'CANCELLED' && <Text size="2xs" tone="danger">{t('Baqi')} {formatMoney(due)}</Text>}</View>}
                chevron onPress={() => setOpen(o)} />
            </RowCard>
          );
        }}
        empty={<EmptyState icon={Boxes} title={search ? t('Is search me koi order nahi') : t('Abhi koi order nahi')} message={t('Bijai se pehle farmer ka poore season ka maal yahan book karein.')} />}
        fab={manage ? { icon: Plus, label: t('Naya order'), onPress: () => guard(() => router.push('/agri/bulk-orders/new' as never)) } : undefined}
      />
      <OrderSheet order={live} manage={manage} onClose={() => setOpen(null)} />
    </>
  );
}

function OrderSheet({ order: o, manage, onClose }: { order: BulkOrder | null; manage: boolean; onClose: () => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('agriDesk');
  const [sheet, setSheet] = useState<'pay' | 'cancel' | null>(null);
  const [busy, setBusy] = useState(false);
  const next = o ? NEXT_STATUS[o.status] : undefined;
  const isOpen = !!o && OPEN_STATUSES.includes(o.status);
  const due = o ? Math.max(o.total - o.paidAmount, 0) : 0;
  const advance = async () => {
    if (!o || !next) return;
    if (next === 'DELIVERED') {
      const ok = await confirm({ title: t('Pahunch gaya'), message: t('Maal dene par "Pahunch gaya" dabayein — bill ban jata hai, stock ghatta hai aur baqi season ke udhaar me jata hai.'), confirmLabel: t('Pahunch gaya') });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const r = await bulkOrdersApi.updateStatus(o.id, next);
      refreshAgri([AGRI_KEYS.orders, AGRI_KEYS.farmers], next === 'DELIVERED');
      toast.success(next === 'DELIVERED' && r.bill ? t('Bill ban gaya — stock ghat gaya aur baqi khate me') : t(ORDER_STATUS[next].label));
      if (next === 'DELIVERED') onClose();
    } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={!!o && !sheet} onClose={onClose} title={o?.customerName} description={o ? `${o.orderNumber} · ${formatDate(o.orderDate, { year: true })}` : undefined} height={0.88}
        footer={o && manage && isOpen ? (
          <Row gap={2}>
            {next && <Button style={{ flex: 2 }} size="lg" icon={next === 'OUT_FOR_DELIVERY' || next === 'DELIVERED' ? Truck : undefined} loading={busy} onPress={() => guard(() => void advance())}>{t(ORDER_STATUS[next].label)}</Button>}
            {due > 0 && <Button style={{ flex: 1 }} size="lg" variant="secondary" icon={Banknote} onPress={() => guard(() => setSheet('pay'))}>{t('Advance')}</Button>}
            <Button size="lg" variant="secondary" icon={X} onPress={() => guard(() => setSheet('cancel'))}>{t('Cancel')}</Button>
          </Row>
        ) : undefined}>
        {o && (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2} wrap><Badge tone={ORDER_STATUS[o.status].tone}>{t(ORDER_STATUS[o.status].label)}</Badge>{o.bill && <Badge tone="success">{t('Bill {{saleNumber}}', { saleNumber: o.bill.saleNumber })}</Badge>}{o.isCredit && <Badge tone="warning">{t('Baqi season ke udhaar me')}</Badge>}</Row>
            <Card flush>
              {o.items.map((it, i) => (
                <ListRow key={it.id ?? i} dense divider title={it.productName} subtitle={`${it.quantity} ${it.unit} × ${formatMoney(it.pricePerUnit)}${it.discount ? ` − ${formatMoney(it.discount)}` : ''}`} trailing={<Amount value={it.total} size="sm" weight="semibold" />} />
              ))}
              <DetailRow label={t('Discount')} value={formatMoney(o.bulkDiscount)} />
              {o.isDelivery && <DetailRow label={t('Kiraya')} value={formatMoney(o.deliveryCharges)} />}
              {o.otherCharges > 0 && <DetailRow label={t('Doosre charges')} value={formatMoney(o.otherCharges)} />}
              <DetailRow label={t('Kul')} value={<Amount value={o.total} weight="bold" />} />
              <DetailRow label={t('Advance')} value={<Amount value={o.paidAmount} tone="success" />} />
              <DetailRow label={t('Baqi')} value={<Amount value={due} tone={due > 0 ? 'danger' : undefined} weight="bold" />} last />
            </Card>
            <Card flush>
              {!!o.deliveryDate && <DetailRow label={t('Kab chahiye')} value={formatDate(o.deliveryDate, { year: true })} />}
              {o.isDelivery && <DetailRow label={t('Delivery')} value={[o.deliveryAddress, o.vehicleNumber && t('Gaari {{vehicleNumber}}', { vehicleNumber: o.vehicleNumber })].filter(Boolean).join(' · ') || '—'} />}
              {!!o.customerPhone && <DetailRow label={t('Phone')} value={<Text ltr>{o.customerPhone}</Text>} />}
              {!!o.cropTarget && <DetailRow label={t('Fasal')} value={`${o.cropTarget}${o.landAreaAcres ? ` · ${t('{{count}} acre', { count: o.landAreaAcres })}` : ''}`} />}
              <DetailRow label={t('Note')} value={o.farmerNotes || o.cancellationReason || '—'} last />
            </Card>
          </View>
        )}
      </Sheet>
      <PaySheet open={sheet === 'pay'} title={t('Advance mila')} name={o?.customerName ?? ''} due={due} advance cta={t('Wasool karein')}
        onConfirm={async ({ paymentMethod, paidAmount }) => { await bulkOrdersApi.addPayment(o!.id, paidAmount, paymentMethod); refreshAgri([AGRI_KEYS.orders, AGRI_KEYS.farmers], true); toast.success(t('Advance mila')); }}
        onClose={() => setSheet(null)} />
      <ReasonSheet open={sheet === 'cancel'} title={t('Order cancel karein?')} description={t('Bill se pehle cancel ho sakta hai. Advance farmer ke khate me jama rehta hai — wapas dena ho to khate se dein.')} cta={t('Cancel karein')} required={false}
        onClose={() => setSheet(null)} onConfirm={async (reason) => { try { await bulkOrdersApi.updateStatus(o!.id, 'CANCELLED', reason || undefined); refreshAgri([AGRI_KEYS.orders, AGRI_KEYS.farmers]); toast.success(t('Order cancel')); onClose(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); throw e; } }} />
    </>
  );
}

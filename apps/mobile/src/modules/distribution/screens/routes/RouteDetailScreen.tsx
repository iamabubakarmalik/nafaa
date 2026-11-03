/**
 * One route: who runs it and its shops in visit order. Move a shop up or
 * down (or to the top), then save; the booker app shows shops in this
 * order. Shops can be added from any route or from those on none.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDown, ArrowUp, Pencil, Plus, Save, Trash2, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, confirm, DetailRow, DetailSection, DetailTemplate, EmptyState, IconButton, ListRow, Row, StatusPill, SwipeRow, Text, toast } from '@/design';
import { DIST_KEY, distSetupApi, type CustomerCard, type SaveRoute } from '../../api/distribution.api';
import { useCustomerRoster } from '../../api/setup-lookups';
import { CachedNote } from '../../components/parts';
import { DistributionGate } from '../../components/DistributionGate';
import { CustomerPickSheet } from '../../components/SetupPickers';
import { RouteFormSheet } from '../../components/RouteFormSheet';
import { partyName, rs } from '../../lib/meta';
import { WEEKDAYS } from '../../lib/setup';

export function RouteDetailScreen() {
  return <DistributionGate title={t('Routes')}><Body /></DistributionGate>;
}

function Body() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_ROUTES_MANAGE);
  const q = useQuery({ queryKey: [DIST_KEY, 'route', id], queryFn: () => distSetupApi.route(id!), enabled: !!id });
  const rosterQ = useCustomerRoster(canManage);
  const [order, setOrder] = useState<CustomerCard[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (q.data) setOrder(q.data.customers); }, [q.data]);
  const route = q.data;
  const changed = useMemo(() => (q.data?.customers ?? []).map((c) => c.id).join() !== order.map((c) => c.id).join(), [q.data, order]);

  const refresh = () => qc.invalidateQueries({ queryKey: [DIST_KEY] });
  const saveOrder = useMutation({
    mutationFn: () => distSetupApi.setRouteCustomers(id!, order.map((c) => c.id), true),
    onSuccess: () => { void refresh(); toast.success(t('Tarteeb save ho gayi')); },
  });
  const remove = useMutation({
    mutationFn: (cid: string) => distSetupApi.removeRouteCustomer(id!, cid),
    onSuccess: () => { void refresh(); },
  });
  const update = useMutation({
    mutationFn: (body: Partial<SaveRoute>) => distSetupApi.updateRoute(id!, body),
    onSuccess: () => { void refresh(); setEditing(false); toast.success(t('Save ho gaya')); },
  });
  const del = useMutation({
    mutationFn: () => distSetupApi.deleteRoute(id!),
    onSuccess: (r) => { void refresh(); toast.success(r.deleted ? t('Route mita diya') : t('Route band kar diya (purane orders is par hain)')); router.back(); },
  });
  const add = useMutation({
    mutationFn: (ids: string[]) => distSetupApi.setRouteCustomers(id!, ids),
    onSuccess: (_r, ids) => { void refresh(); setAdding(false); toast.success(t('{{count}} dukaanein {{name}} par lag gayin', { count: ids.length, name: route?.name ?? '' })); },
  });

  const move = (from: number, to: number) => setOrder((o) => {
    if (to < 0 || to >= o.length || from === to) return o;
    const n = [...o];
    const [x] = n.splice(from, 1);
    n.splice(to, 0, x);
    return n;
  });

  const days = route?.visitDays.length ? route.visitDays.map((d) => t(WEEKDAYS[d])).join(', ') : t('Koi din nahi');
  const balance = order.reduce((s, c) => s + (Number(c.balance) || 0), 0);

  const confirmDelete = async () => {
    if (!route) return;
    if (await confirm({ title: t('{{name}} mitayein?', { name: route.name }), message: t('Customers route se hat jayenge. Purane orders is route par hon to route sirf band hoga.'), confirmLabel: t('Mitayein'), tone: 'danger' })) del.mutate();
  };

  return (
    <>
      <DetailTemplate
        title={route?.name ?? t('Routes')}
        subtitle={route?.area || undefined}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        onRefresh={q.refetch}
        refreshing={q.isRefetching}
        actions={canManage && route ? (
          <Row gap={1}>
            <IconButton icon={Pencil} label={t('Badlein')} onPress={() => setEditing(true)} />
            <IconButton icon={Trash2} label={t('Route mitayein')} variant="danger" onPress={confirmDelete} />
          </Row>
        ) : undefined}
        bottomActions={changed && canManage ? (
          <>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setOrder(q.data?.customers ?? [])}>{t('Rehne dein')}</Button>
            <Button style={{ flex: 1.4 }} icon={Save} loading={saveOrder.isPending} onPress={() => saveOrder.mutate()}>{t('Save karein')}</Button>
          </>
        ) : undefined}
      >
        {route && (
          <>
            <CachedNote query={q} />
            <DetailSection title={route.code ? `${t('Route')} · ${route.code}` : t('Route')} action={!route.isActive ? <StatusPill tone="danger">{t('Band')}</StatusPill> : undefined}>
              <DetailRow label={t('Din')} value={days} />
              <DetailRow label={t('Booker')} value={route.bookerName ?? '—'} />
              <DetailRow label={t('Delivery')} value={route.deliveryUserName ?? '—'} />
              <DetailRow label={t('Godown')} value={route.shopName ?? t('Default')} last />
            </DetailSection>
            <DetailSection
              title={t('Dukaanein ({{count}})', { count: order.length })}
              action={canManage ? <Button size="sm" icon={Plus} onPress={() => setAdding(true)}>{t('Dukaan jorein')}</Button> : undefined}
            >
              {order.length > 0 && <Text size="xs" tone="muted">{t('Upar se neeche visit ki tarteeb · kul udhaar {{balance}}', { balance: rs(balance) })}</Text>}
              {!order.length ? (
                <EmptyState compact icon={Plus} title={t('Is route par abhi koi dukaan nahi — "Dukaan jorein" dabayein.')} />
              ) : order.map((c, i) => {
                const row = (
                  <ListRow
                    dense
                    leading={<View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}><Text weight="bold" tone="muted">{i + 1}</Text></View>}
                    title={partyName(c)}
                    subtitle={[c.businessName ? c.name : null, c.area, c.phone, c.latitude == null ? t('GPS nahi') : null].filter(Boolean).join(' · ') || '—'}
                    trailing={canManage ? (
                      <Row gap={0}>
                        {Number(c.balance) > 0 && <Text size="xs" tone="danger" weight="semibold">{rs(c.balance)}</Text>}
                        <IconButton icon={ArrowUp} label={t('Upar')} size="sm" disabled={i === 0} onPress={() => move(i, i - 1)} />
                        <IconButton icon={ArrowDown} label={t('Neeche')} size="sm" disabled={i === order.length - 1} onPress={() => move(i, i + 1)} />
                      </Row>
                    ) : undefined}
                    onLongPress={canManage && i > 0 ? () => move(i, 0) : undefined}
                  />
                );
                return canManage ? (
                  <SwipeRow key={c.id} end={[{ icon: X, label: t('Route se hatayein'), tone: 'danger', onPress: () => remove.mutate(c.id) }]}>{row}</SwipeRow>
                ) : <View key={c.id}>{row}</View>;
              })}
            </DetailSection>
          </>
        )}
      </DetailTemplate>
      {editing && route && <RouteFormSheet route={route} saving={update.isPending} onClose={() => setEditing(false)} onSave={(body) => update.mutate(body)} />}
      {adding && route && (
        <CustomerPickSheet
          open onClose={() => setAdding(false)} title={t('{{name}} par dukaanein', { name: route.name })}
          description={t('Jis tarteeb se nishan lagayenge usi tarteeb se aakhir me judengi.')}
          customers={(rosterQ.data ?? []).filter((c) => c.routeId !== route.id)} loading={rosterQ.isLoading}
          views={[
            { value: 'free', label: t('Bina route'), test: (c) => !c.routeId },
            { value: 'all', label: t('Sab'), test: () => true },
          ]}
          tag={(c) => (c.routeId ? t('Doosra route') : null)}
          confirmLabel={t('Jorein')} busy={add.isPending} onConfirm={(ids) => add.mutate(ids)}
        />
      )}
    </>
  );
}

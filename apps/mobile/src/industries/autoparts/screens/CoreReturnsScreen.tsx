/**
 * Old parts (cores) taken back from customers (web CoreReturnsPage): held in the
 * shop, sent back to the supplier, or scrapped. Each one was taken off a bill
 * as a trade-in, at the counter or at the vehicle hand-over.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Archive, Plus, Recycle, Trash2, Truck, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, ListRow, ListTemplate, Row, Text, toast, useTheme, type StatusTone } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { Meta, RowCard, StatGrid } from '../../_shared/trade/kit';
import { coreReturnsApi, type CoreReturn, type CoreStatus, type CoreView } from '../api';
import { AddCoreSheet } from '../components/CoreSheet';
import { CORE_KEY, dateTime, refreshAuto } from '../meta';

const STATUS: Record<CoreStatus, { label: string; tone: StatusTone }> = {
  HELD: { label: 'Dukaan me', tone: 'warning' }, SENT_TO_SUPPLIER: { label: 'Supplier ko gaya', tone: 'info' }, SCRAPPED: { label: 'Kabar', tone: 'neutral' },
};
const LIMIT = 40;

export function CoreReturnsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('autopartsDesk');
  const canAdd = can(P.POS_USE);
  const canMove = can(P.STOCK_ADJUSTMENTS_MANAGE);
  const [view, setView] = useState<CoreView>('HELD');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState('');
  const q = { view, search: search.trim() || undefined, limit: LIMIT };
  const list = usePaged([CORE_KEY, 'page', q], (page) => coreReturnsApi.page({ ...q, page }).then((r) => ({ ...r, pages: r.totalPages })));
  const c = list.first?.counts;

  const move = (r: CoreReturn, status: CoreStatus) => guard(async () => {
    setBusyId(r.id);
    try { await coreReturnsApi.setStatus(r.id, status); toast.success(t('{{label}} — likh liya', { label: t(STATUS[status].label) })); refreshAuto([CORE_KEY]); }
    catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusyId(''); }
  });

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: Archive, tone: 'warning', label: t('Dukaan me'), value: String(c?.HELD.count ?? 0), hint: formatMoney(c?.HELD.value ?? 0), onPress: () => setView('HELD') },
        { icon: Truck, tone: 'info', label: t('Supplier ko gaye'), value: String(c?.SENT_TO_SUPPLIER.count ?? 0), hint: formatMoney(c?.SENT_TO_SUPPLIER.value ?? 0), onPress: () => setView('SENT_TO_SUPPLIER') },
        { icon: Trash2, tone: 'neutral', label: t('Kabar'), value: String(c?.SCRAPPED.count ?? 0), hint: formatMoney(c?.SCRAPPED.value ?? 0), onPress: () => setView('SCRAPPED') },
      ]} />
      <OfflineNote feature="autopartsDesk" />
      <ChipGroup value={view} onChange={(v) => setView(v as CoreView)} style={{ marginHorizontal: -th.space(4) }}
        options={[{ value: 'HELD', label: `${t('Dukaan me')}${c ? ` · ${c.HELD.count}` : ''}` }, { value: 'SENT_TO_SUPPLIER', label: t('Supplier ko gaye') }, { value: 'SCRAPPED', label: t('Kabar') }, { value: 'all', label: t('Sab') }]} />
      <AddCoreSheet open={adding} onClose={() => setAdding(false)} />
    </View>
  );

  return (
    <ListTemplate<CoreReturn>
      title={t('Purane parts')}
      subtitle={t('Customer se wapas liye purane part — supplier ko bhejein ya kabar me dein')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Part ka naam…') }}
      summary={summary}
      data={list.items}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={list.refetch}
      onEndReached={list.loadMore}
      keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => {
        const st = STATUS[r.status];
        return (
          <RowCard>
            <ListRow
              icon={Recycle} iconTone="warning"
              title={<Row gap={1.5} wrap><Text weight="semibold" style={{ flexShrink: 1 }}>{r.description}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
              subtitle={<View style={{ gap: 3 }}>
                <Text size="xs" tone="secondary">{r.sale ? t('Bill {{saleNumber}}{{value}}{{value2}}', { saleNumber: r.sale.saleNumber, value: r.sale.status === 'VOIDED' ? t(' (void)') : '', value2: r.sale.customer ? ` · ${r.sale.customer.name}` : '' }) : t('Abhi kisi bill par nahi')}</Text>
                <Meta parts={[dateTime(r.createdAt), r.product?.name, r.job ? `${r.job.jobNumber}${r.job.registrationNumber ? ` ${r.job.registrationNumber}` : ''}` : null]} />
                {canMove ? (
                  <Row gap={1} wrap>
                    {r.status === 'HELD' ? <><Button size="sm" variant="secondary" icon={Truck} loading={busyId === r.id} onPress={() => move(r, 'SENT_TO_SUPPLIER')}>{t('Supplier ko')}</Button><Button size="sm" variant="ghost" icon={Trash2} onPress={() => move(r, 'SCRAPPED')}>{t('Kabar')}</Button></>
                      : <Button size="sm" variant="ghost" icon={Undo2} loading={busyId === r.id} onPress={() => move(r, 'HELD')}>{t('Wapas dukaan me')}</Button>}
                  </Row>
                ) : null}
              </View>}
              trailing={<Text weight="bold" ltr>{formatMoney(r.value)}</Text>}
              onPress={r.job ? () => router.push(`/autoparts/jobs/${r.job!.id}` as never) : undefined}
            />
          </RowCard>
        );
      }}
      empty={<EmptyState icon={Recycle} title={search ? t('Koi part nahi mila') : t('Is list me koi purana part nahi')} message={t('Counter par "Purana part liya" ya gaari dete waqt likhein — qeemat bill se Trade-in ban kar katti hai.')} />}
      fab={canAdd ? { icon: Plus, label: t('Purana part'), onPress: () => guard(() => setAdding(true)) } : undefined}
    />
  );
}

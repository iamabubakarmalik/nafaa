/**
 * Prescriptions list (web PrescriptionsPage): what waits for the pharmacist's
 * check, what is ready to hand over and what was given, for any period. Status
 * counts, search and paging come from the server.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { FilePlus, FileText } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { drName } from '@nafaa/core/industries/pharmacy';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, ListRow, ListTemplate, Row, Select, StatTile, Text, useDebouncedValue, useTheme } from '@/design';
import { useQuery } from '@tanstack/react-query';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { OfflineNote } from '../../_shared/deskKit';
import { doctorsApi, prescriptionsApi, type Prescription, type PrescriptionStatus } from '../api';
import { DOCTORS_KEY, RX_KEY, RX_STATUS } from '../meta';

const LIMIT = 25;
type Tab = 'all' | PrescriptionStatus;
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all', label: 'Sab' }, { id: 'PENDING', label: 'Check baqi' }, { id: 'VERIFIED', label: 'Dene ko tayyar' },
  { id: 'PARTIALLY_DISPENSED', label: 'Kuch di' }, { id: 'DISPENSED', label: 'Poori di' }, { id: 'REJECTED', label: 'Radd' },
];

export function PrescriptionsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const params = useLocalSearchParams<{ doctor?: string }>();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [doctorId, setDoctorId] = useState(params.doctor ?? '');
  const q = useDebouncedValue(search.trim(), 300);
  const rec = usePeriod(params.doctor ? 'all' : 'month');
  const query = useMemo(() => ({
    status: tab === 'all' ? undefined : tab, search: q || undefined, doctorId: doctorId || undefined,
    ...(rec.period.from !== 'all' ? { from: rec.period.from, to: rec.period.to } : {}),
  }), [tab, q, doctorId, rec.period.from, rec.period.to]);

  const list = useInfiniteQuery({
    queryKey: [RX_KEY, query],
    queryFn: ({ pageParam }) => prescriptionsApi.page({ ...query, page: pageParam, limit: LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    refetchInterval: 60_000,
  });
  const { data: doctors = [] } = useQuery({ queryKey: [DOCTORS_KEY, 'all'], queryFn: () => doctorsApi.list(), staleTime: 5 * 60_000 });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const c = list.data?.pages[0]?.counts;
  const dispensedValue = list.data?.pages[0]?.dispensedValue ?? 0;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} label={t('Check baqi')} value={String(c?.PENDING ?? 0)} tone={c?.PENDING ? 'warning' : 'neutral'} loading={!c} onPress={() => setTab('PENDING')} />
        <StatTile style={{ flex: 1 }} label={t('Dene ko tayyar')} value={String((c?.VERIFIED ?? 0) + (c?.PARTIALLY_DISPENSED ?? 0))} tone="info" loading={!c} onPress={() => setTab('VERIFIED')} />
        <StatTile style={{ flex: 1 }} label={t('Di gayi dawai')} value={cost(dispensedValue)} tone="success" loading={!c} />
      </Row>
      <ChipGroup value={tab} onChange={setTab} style={{ marginHorizontal: -th.space(4) }}
        options={TABS.map((x) => ({ value: x.id, label: t(x.label), count: c ? (x.id === 'all' ? c.all : c[x.id]) : undefined }))} />
      <ChipGroup value={rec.preset} onChange={(v) => rec.setPreset(v as typeof rec.preset)} style={{ marginHorizontal: -th.space(4) }}
        options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
      {doctors.length > 0 && (
        <Select label={t('Doctor')} value={doctorId || 'all'} onChange={(v) => setDoctorId(v === 'all' ? '' : v)}
          options={[{ value: 'all', label: t('Sab doctor') }, ...doctors.map((d) => ({ value: d.id, label: drName(d.name), description: d.specialization ?? d.registrationNumber }))]} />
      )}
      <OfflineNote feature="pharmacyDesk" />
      <CachedNote query={list} />
    </View>
  );

  return (
    <ListTemplate<Prescription>
      title={t('Nuskhe')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Nuskha number, mareez, phone, CNIC, doctor ya dawai…') }}
      summary={header}
      data={items}
      loading={list.isLoading}
      error={!list.data ? list.error : undefined}
      onRetry={() => void list.refetch()}
      refreshing={list.isRefetching && !list.isFetchingNextPage}
      onRefresh={() => void list.refetch()}
      onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
      keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => {
        const st = RX_STATUS[r.status];
        const given = r.items.reduce((s, i) => s + (i.dispensedQty ?? 0), 0);
        const asked = r.items.reduce((s, i) => s + i.prescribedQty, 0);
        return (
          <ListRow icon={FileText} iconTone={st.tone}
            title={r.patientName || t('Mareez')}
            subtitle={[r.prescriptionNumber, drName(r.doctorName), formatDate(r.createdAt)].filter(Boolean).join(' · ')}
            overline={t('{{count}} dawaiyan · {{given}}/{{asked}} di', { count: r.items.length, given: Number(given.toFixed(2)), asked: Number(asked.toFixed(2)) })}
            trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Badge tone={st.tone}>{r.type === 'REFILL' ? `${t(st.label)} · Refill` : t(st.label)}</Badge><Text size="xs" tone="muted">{cost(r.totalAmount)}</Text></View>}
            chevron onPress={() => router.push(`/pharmacy/prescriptions/${r.id}` as never)} />
        );
      }}
      empty={<EmptyState icon={FileText} title={search || doctorId ? t('Is filter me koi nuskha nahi') : t('Is muddat me koi nuskha nahi')} message={t('Mareez nuskha laye to "Naya nuskha" se likhein.')}
        action={can(P.POS_USE) ? <Button icon={FilePlus} onPress={() => router.push('/pharmacy/prescriptions/new' as never)}>{t('Naya nuskha')}</Button> : undefined} />}
      fab={can(P.POS_USE) ? { icon: FilePlus, label: t('Naya nuskha'), onPress: () => router.push('/pharmacy/prescriptions/new' as never) } : undefined}
    />
  );
}

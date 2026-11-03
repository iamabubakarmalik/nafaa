/**
 * Prescriptions (web PrescriptionsPage): every customer's eye power with
 * search, views (active, running out, expired, closed) and type. Running out
 * is the best reason to call a customer back for a new test. Swipe a row for
 * a glasses order, renew or WhatsApp.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, CalendarX, FilePlus, FileText, Glasses, MessageCircle, RefreshCw, SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { powerSummary, rxState } from '@nafaa/core/industries/optical';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Select, Sheet, StatTile, SwipeRow, Text, useDebouncedValue, useTheme } from '@/design';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { prescriptionsApi, type OpticalPrescription, type RxPage, type RxView } from '../api';
import { usePaged } from '../hooks';
import { OPTICAL_KEYS, RX_TYPES, dayOnly, rangeParams, refreshOptical, rxRecallText, rxTypeLabel } from '../meta';

const VIEWS: Array<{ value: RxView; label: string }> = [
  { value: 'active', label: msg('Chalu') }, { value: 'expiring', label: msg('Muddat qareeb') }, { value: 'expired', label: msg('Muddat khatam') },
  { value: 'inactive', label: msg('Band') }, { value: 'all', label: msg('Sab') },
];

/** Short expiry text for a row ("12 din baqi", "3 din pehle khatam"). */
export function rxLine(rx: OpticalPrescription): string {
  const s = rxState(rx);
  if (s.state === 'inactive') return t('Band');
  if (s.days == null) return dayOnly(rx.prescriptionDate);
  if (s.state === 'expired') return t('{{value}} din pehle khatam', { value: -s.days });
  if (s.state === 'soon') return t('{{d}} din baqi', { d: s.days });
  return dayOnly(rx.expiryDate);
}

export function PrescriptionsScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const canBill = can(P.POS_USE);
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<RxView>((params.view as RxView) || 'active');
  useEffect(() => { if (params.view) setView(params.view as RxView); }, [params.view]);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(false);
  const q = useDebouncedValue(search.trim(), 250);
  const range = usePeriod('all');
  const query = { view, search: q || undefined, type: type || undefined, ...rangeParams(range.period, range.startHour) };
  const { q: list, rows, more } = usePaged<OpticalPrescription, RxPage>([OPTICAL_KEYS.rx, 'page', query], (page) => prescriptionsApi.page({ ...query, page, limit: 30 }));
  const sum = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'summary'], queryFn: prescriptionsApi.summary });
  const s = sum.data;
  const renew = useMutation({
    mutationFn: (rx: OpticalPrescription) => prescriptionsApi.renew(rx.id),
    onSuccess: (n) => { refreshOptical([OPTICAL_KEYS.rx]); router.push(`/optical/prescriptions/${n.id}/edit` as never); },
  });
  const filtered = !!type || range.preset !== 'all';

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={FileText} label={t('Chalu')} loading={!s} value={String(s?.active ?? 0)} hint={t('Is mahine {{count}}', { count: s?.thisMonth ?? 0 })} onPress={() => setView('active')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarClock} tone="warning" label={t('60 din me khatam')} loading={!s} value={String(s?.expiringSoon ?? 0)} onPress={() => setView('expiring')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarX} tone={s?.expired ? 'danger' : 'neutral'} label={t('Muddat khatam')} loading={!s} value={String(s?.expired ?? 0)} onPress={() => setView('expired')} />
      </Row>
      <ChipGroup value={view} onChange={setView} style={{ marginHorizontal: -th.space(4) }} options={VIEWS.map((v) => ({ value: v.value, label: t(v.label) }))} />
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate<OpticalPrescription>
        title={t('Nuskhe')}
        subtitle={t('Har customer ka aankh ka number')}
        actions={<IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered ? 1 : undefined} onPress={() => setFilters(true)} />}
        search={{ value: search, onChange: setSearch, placeholder: t('Nuskha number, customer, mobile ya doctor…') }}
        summary={header}
        data={rows}
        loading={list.isLoading}
        error={!list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void sum.refetch(); }}
        onEndReached={more}
        keyExtractor={(r) => r.id}
        renderItem={({ item: rx }) => {
          const st = rxState(rx);
          const usable = rx.isActive && st.state !== 'expired';
          return (
            <SwipeRow end={[
              ...(usable && canBill ? [{ icon: Glasses, label: t('Chashma'), tone: 'brand' as const, onPress: () => router.push(`/optical/lens-orders/new?rx=${rx.id}` as never) }] : []),
              ...(rx.isActive && st.days != null && st.days < 30 ? [{ icon: RefreshCw, label: t('Renew'), tone: 'info' as const, onPress: () => renew.mutate(rx) }] : []),
              { icon: MessageCircle, label: t('WhatsApp'), tone: 'success' as const, onPress: () => { openWhatsApp(rx.customerPhone, rxRecallText(rx.customerName, dayOnly(rx.prescriptionDate), lang)); } },
            ]}>
              <ListRow
                title={rx.customerName}
                overline={`${rx.prescriptionNumber} · ${rxTypeLabel(rx.prescriptionType)}`}
                subtitle={<Text size="xs" tone="muted" numberOfLines={2} ltr>{powerSummary(rx, t('Plano')) || '—'}</Text>}
                trailing={<Text size="xs" weight="semibold" tone={st.state === 'expired' ? 'danger' : st.state === 'soon' ? 'warning' : 'muted'}>{rxLine(rx)}</Text>}
                chevron onPress={() => router.push(`/optical/prescriptions/${rx.id}` as never)} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={FileText} title={q ? t('"{{q}}" se koi nuskha nahi mila', { q }) : t('Is list me koi nuskha nahi')} message={t('Bahar ka nuskha likhein ya eye test ke result se banayein.')} />}
        fab={{ icon: FilePlus, label: t('Naya nuskha'), onPress: () => router.push('/optical/prescriptions/new' as never) }}
      />
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')}>
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Type')} value={type} onChange={setType} options={[{ value: '', label: t('Sab type') }, ...RX_TYPES.map((x) => ({ value: x.value, label: t(x.label) }))]} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Nuskhe ki date')}</Text>
          <ChipGroup wrap value={range.preset} onChange={(v) => range.setPreset(v as typeof range.preset)} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
          {filtered && <ListRow title={t('Filter saaf karein')} destructive onPress={() => { setType(''); range.setPreset('all'); }} />}
        </View>
      </Sheet>
    </>
  );
}

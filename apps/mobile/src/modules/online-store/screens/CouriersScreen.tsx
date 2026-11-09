/**
 * Every courier in one place: connected ones (with any problem), one-tap
 * API couriers and manual ones; each with parcels on the road, delivered,
 * RTO and COD held for 30 days, plus a side-by-side comparison. A courier
 * opens its own screen. Mirrors the web CouriersPage.
 */

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calculator, PackageCheck, PenLine, PlugZap, Printer, Truck, Wallet, Zap } from 'lucide-react-native';
import { rtoTone, type CourierAccount } from '@nafaa/core/online-store';
import { formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Card, ChipGroup, EmptyState, ErrorState, IconButton, Screen, SearchBar, SkeletonRows, Tabs, Text, useTheme } from '@/design';
import { couriersApi } from '../api/online';
import { CourierLogo } from '../components/BrandLogo';
import { SavedDataNote } from '../components/bits';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { KpiHero } from '../components/CommerceHero';
import { KEYS } from '../lib/online';

type Kind = '' | 'connected' | 'api' | 'manual';

export function CouriersScreen() {
  const th = useTheme();
  const [tab, setTab] = useState<'list' | 'compare'>('list');
  const [kind, setKind] = useState<Kind>('');
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: KEYS.couriers, queryFn: couriersApi.list, refetchInterval: 60_000 });
  const all = q.data ?? [];
  const sum = (k: keyof CourierAccount['stats']) => all.reduce((s, c) => s + (c.stats?.[k] ?? 0), 0);
  const dispatched = sum('dispatched30');
  const rto = dispatched ? Math.round((sum('returned30') / dispatched) * 100) : 0;
  const connected = all.filter((c) => c.connected);
  const problems = connected.filter((c) => c.lastError || c.missingSettings.length);
  const term = search.trim().toLowerCase();
  const shown = useMemo(() => all.filter((c) => (!term || c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term))
    && (!kind || (kind === 'connected' ? c.connected : kind === 'api' ? c.mode === 'api' && !c.connected : c.mode === 'manual'))), [all, term, kind]);
  const groups = [
    { title: t('Jure hue'), hint: t('Booking, label aur tracking khud'), rows: shown.filter((c) => c.connected) },
    { title: t('Ek click se jorein'), hint: t('Courier ki details paste karein — booking, tracking aur RTO sab khud'), rows: shown.filter((c) => c.mode === 'api' && !c.connected) },
    { title: t('Manual'), hint: t('CN khud likhein — tracking link, COD hisaab aur RTO Nafaa sambhalta hai'), rows: shown.filter((c) => c.mode === 'manual') },
  ].filter((g) => g.rows.length);
  const compare = all.filter((c) => c.stats.dispatched30 > 0 || c.stats.active > 0).sort((a, b) => a.stats.rtoRate - b.stats.rtoRate);
  const maxBar = Math.max(1, ...compare.map((c) => c.stats.delivered30 + c.stats.returned30 + c.stats.active));

  return (
    <Screen title={t('Couriers')} actions={<>
      <IconButton icon={Zap} label={t('Auto booking')} onPress={() => router.push('/online/couriers/rules' as never)} />
      <IconButton icon={Calculator} label={t('Rates')} onPress={() => router.push('/online/costs' as never)} />
      <OnlineMenuButton current="/online/couriers" />
    </>} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <SavedDataNote query={q} />
      <KpiHero items={[
        { key: 'a', label: t('Raste me'), icon: Truck, tone: 'info', loading: !q.data, value: String(sum('active')), hint: t('{{sum}} pickup baqi', { sum: sum('awaitingPickup') }) },
        { key: 'c', label: t('Courier ke paas (COD)'), icon: Wallet, tone: 'warning', loading: !q.data, value: <Amount value={sum('codPendingValue')} size="lg" weight="bold" />, hint: t('{{sum}} parcel', { sum: sum('codPending') }), onPress: () => router.push('/online/cod' as never) },
        { key: 'r', label: t('RTO (30 din)'), icon: PackageCheck, tone: rtoTone(rto), loading: !q.data, value: `${rto}%`, hint: `${sum('returned30')} / ${dispatched}` },
        { key: 'k', label: t('Jure hue'), icon: PlugZap, tone: 'success', loading: !q.data, value: String(connected.length), onPress: () => setKind(kind === 'connected' ? '' : 'connected') },
        { key: 'p', label: t('Pickup ka intezar'), icon: Printer, tone: 'warning', loading: !q.data, value: String(sum('awaitingPickup')), hint: t('Label print karke parcel dein') },
        { key: 'm', label: t('Masla'), icon: AlertTriangle, tone: problems.length ? 'danger' : 'success', loading: !q.data, value: String(problems.length), hint: problems.length ? problems.map((p) => p.name).join(', ') : t('Sab theek') },
      ]} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'list', label: t('Couriers'), count: shown.length }, { value: 'compare', label: t('Muqabla') }]} />
      {q.isError && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.isLoading ? <SkeletonRows count={6} /> : tab === 'compare' ? (
        !compare.length ? <EmptyState icon={Truck} title={t('Pichhle 30 din me koi parcel nahi bheja')} message={t('Courier se parcel bhejein — phir yahan muqabla dikhega.')} /> : (
          <Card title={t('Deliver aur wapas (30 din)')} description={t('Kam RTO wala courier behtar')}>
            <View style={{ gap: th.space(3) }}>
              {compare.map((c) => {
                const s = c.stats;
                const total = s.delivered30 + s.returned30 + s.active;
                return (
                  <View key={c.code} style={{ gap: th.space(1) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                      <CourierLogo code={c.code} size={22} />
                      <Text size="sm" weight="semibold" style={{ flex: 1 }}>{c.name}</Text>
                      {s.codPendingValue > 0 && <Text size="xs" tone="warning">{t('{{cod}} paas', { cod: formatMoney(s.codPendingValue) })}</Text>}
                      <Badge tone={rtoTone(s.rtoRate)}>{t('RTO {{rto}}%', { rto: s.rtoRate })}</Badge>
                    </View>
                    <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: th.colors.surfaceMuted, width: `${Math.max(8, (total / maxBar) * 100)}%` }}>
                      <View style={{ flex: s.delivered30, backgroundColor: th.colors.success.solid }} />
                      <View style={{ flex: s.returned30, backgroundColor: th.colors.danger.solid }} />
                      <View style={{ flex: s.active, backgroundColor: th.colors.brand.border }} />
                    </View>
                    <Text size="2xs" tone="muted">{t('{{d}} deliver · {{r}} wapas · {{a}} raste me', { d: s.delivered30, r: s.returned30, a: s.active })}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )
      ) : (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('Courier ka naam…')} />
          <ChipGroup value={kind} onChange={(v) => setKind(v as Kind)} style={{ marginHorizontal: -th.space(4) }}
            options={[{ value: '', label: t('Sab couriers') }, { value: 'connected', label: t('Jure hue') }, { value: 'api', label: t('Ek click wale') }, { value: 'manual', label: t('Manual') }]} />
          {!groups.length ? <EmptyState icon={Truck} title={t('Is filter me koi courier nahi')} /> : groups.map((g) => (
            <View key={g.title} style={{ gap: th.space(2) }}>
              <View>
                <Text size="base" weight="bold">{g.title}</Text>
                <Text size="xs" tone="muted">{g.hint}</Text>
              </View>
              {g.rows.map((c) => <CourierTile key={c.code} c={c} />)}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function CourierTile({ c }: { c: CourierAccount }) {
  const th = useTheme();
  const s = c.stats;
  const status = c.connected
    ? c.lastError ? <Badge tone="danger" dot>{t('Masla')}</Badge>
      : c.missingSettings.length ? <Badge tone="warning" dot>{t('Settings baqi')}</Badge>
        : <Badge tone={c.active ? 'success' : 'neutral'} dot>{c.active ? t('Jura hua') : t('Band')}</Badge>
    : c.mode === 'api' ? <Badge tone="info" icon={Zap}>{t('Ek click')}</Badge> : <Badge icon={PenLine}>{t('Manual')}</Badge>;
  const activity = s.active > 0 || s.dispatched30 > 0 || s.codPending > 0;
  return (
    <Card onPress={() => router.push(`/online/couriers/${c.code.toLowerCase()}` as never)} style={c.connected && c.lastError ? { borderColor: th.colors.danger.border } : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <CourierLogo code={c.code} size={40} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), flexWrap: 'wrap' }}>
            <Text size="base" weight="bold">{c.name}</Text>
            {status}
          </View>
          <Text size="xs" tone={c.connected && c.lastError ? 'danger' : 'muted'} numberOfLines={1}>
            {c.connected
              ? c.lastError ? c.lastError : c.lastSyncAt ? t('Sync {{lastSyncAt}}', { lastSyncAt: formatRelative(c.lastSyncAt) }) : t('Abhi sync nahi hua')
              : c.mode === 'api' ? (c.connect?.features.label ? t('Booking · label · tracking khud') : t('Booking · tracking khud')) : c.code === 'RIDER' ? t('COD ka hisaab Nafaa me') : t('CN khud likhein')}
          </Text>
        </View>
      </View>
      {activity && (
        <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(3) }}>
          <Stat label={t('Raste me')} value={String(s.active)} />
          <Stat label={t('Deliver hue')} value={String(s.delivered30)} />
          <Stat label={t('RTO')} value={`${s.rtoRate}%`} tone={s.rtoRate >= 20 ? 'danger' : undefined} />
          <Stat label={t('COD paas')} value={s.codPending ? formatMoney(s.codPendingValue) : '—'} tone={s.codPending ? 'warning' : undefined} />
        </View>
      )}
      {s.attempted > 0 && <Text size="xs" weight="semibold" tone="warning" style={{ marginTop: th.space(2) }}>{t('{{attempted}} parcel — customer nahi mila', { attempted: s.attempted })}</Text>}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'warning' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text size="sm" weight="bold" tone={tone} ltr numberOfLines={1}>{value}</Text>
      <Text size="2xs" tone="muted" numberOfLines={1}>{label}</Text>
    </View>
  );
}


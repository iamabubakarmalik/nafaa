/**
 * Loyalty points: what the programme costs and returns (points outstanding
 * and their value, points given and used over a period), member levels, every
 * member with history, manual gifts or corrections, WhatsApp, and the rules.
 */

import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Award, BarChart3, Crown, History, MessageCircle, Settings2, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { loyaltyTier, nextTier, pointsValue, LOYALTY_TIERS } from '@nafaa/core/customers';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatMoney, formatNumber } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { settingsApi } from '@/modules/settings/api/settings';
import { Amount, Avatar, Badge, Button, Card, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, StatTile, SwipeRow, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { MiniBars } from '@/modules/sales/components/MiniBars';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { salutationFor } from '@nafaa/core/customers';
import { useBillLanguage } from '@/core/receipt';
import { loyaltyApi, type LoyaltyMember, type MemberSort } from '../api/loyalty';
import { AdjustSheet, HistorySheet, refreshLoyalty, RulesSheet } from '../components/LoyaltySheets';
import { router } from 'expo-router';

type Tab = 'members' | 'analytics' | 'rules';
const SORTS: Array<{ value: MemberSort; label: string }> = [
  { value: 'points', label: 'Zyada points' }, { value: 'spent', label: 'Zyada khareedari' }, { value: 'recent', label: 'Haal hi mein' }, { value: 'name', label: 'Naam (A–Z)' },
];

export function LoyaltyScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Hamari dukaan');
  const canAdjust = can(P.KHATA_MANAGE);
  const canSettings = can(P.SETTINGS_EDIT);
  const [tab, setTab] = useState<Tab>('members');
  const { preset, setPreset, period } = usePeriod('month');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [sort, setSort] = useState<MemberSort>('points');
  const [min, setMin] = useState('');
  const [adjusting, setAdjusting] = useState<LoyaltyMember | null>(null);
  const [historyOf, setHistoryOf] = useState<LoyaltyMember | null>(null);
  const [rules, setRules] = useState(false);

  const range = period.from === 'all' ? { to: period.to } : period;
  const overview = useQuery({ queryKey: ['loyalty', 'overview', range], queryFn: () => loyaltyApi.overview(range), placeholderData: (p) => p });
  const members = useInfiniteQuery({
    queryKey: ['loyalty', 'members', query, sort, min],
    queryFn: ({ pageParam }) => loyaltyApi.members({ search: query || undefined, sort, min: min || undefined, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.hasMore ? l.page + 1 : undefined),
    placeholderData: (p) => p,
    enabled: tab === 'members',
  });
  const o = overview.data;
  const s = o?.settings;
  const rate = s?.redemptionRate ?? 1;
  const expiry = useQuery({ queryKey: ['loyalty', 'expiry'], queryFn: loyaltyApi.expiryPreview, enabled: (s?.expiryDays ?? 0) > 0 });
  const list = useMemo(() => members.data?.pages.flatMap((p) => p.items) ?? [], [members.data]);
  const count = members.data?.pages[0]?.count ?? 0;
  const enable = useMutation({ mutationFn: () => settingsApi.update({ enableLoyalty: true } as never), onSuccess: () => { toast.success(t('Loyalty chalu ho gayi')); refreshLoyalty(); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const expireNow = useMutation({ mutationFn: loyaltyApi.expireNow, onSuccess: (r) => { toast.success(t('{{points}} points khatam hue ({{customers}} customers)', { points: r.points, customers: r.customers })); refreshLoyalty(); }, onError: (e) => toast.error(apiErrorMessage(e)) });
  const usedPct = o && o.period.issued > 0 ? Math.round((o.period.redeemed / o.period.issued) * 100) : null;

  const wa = (m: LoyaltyMember) => {
    const sal = salutationFor(m.name, m.gender);
    const text = lang === 'en'
      ? `Hello ${m.name}! 🎁\n\nYou have *${m.loyaltyPoints} points* at ${shop}, worth ${formatMoney(pointsValue(m.loyaltyPoints, rate))}. Use them on your next purchase!`
      : lang === 'ur'
        ? `السلام علیکم ${m.name}! 🎁\n\n${shop} میں آپ کے *${m.loyaltyPoints} پوائنٹس* جمع ہیں، یعنی ${formatMoney(pointsValue(m.loyaltyPoints, rate))}۔ اگلی خریداری پر استعمال کریں!`
        : `Assalam-o-Alaikum ${m.name}${sal ? ` ${sal}` : ''}! 🎁\n\n${shop} mein aap ke *${m.loyaltyPoints} points* jama hain — yani ${formatMoney(pointsValue(m.loyaltyPoints, rate))}. Agli khareedari par istemal karein!`;
    openWhatsApp(m.phone, text);
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      {o && !o.enabled && (
        <Card tone="warning" title={t('Loyalty abhi band hai')} description={t('Sale par points nahi mil rahe. Chalu karein to har naam wale customer ko khareedari par points milenge.')}
          action={canSettings ? <Button size="sm" loading={enable.isPending} onPress={() => enable.mutate()}>{t('Chalu karein')}</Button> : undefined}>
        </Card>
      )}
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Points baqi (customers ke paas)')} loading={!o} value={formatNumber(o?.outstanding.points ?? 0, { decimals: 0 })} hint={t('qeemat {{formatPKR}}', { formatPKR: formatMoney(o?.outstanding.value ?? 0) })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" icon={Users} label={t('Points wale customers')} loading={!o} value={String(o?.members.withPoints ?? 0)} hint={t('{{customers}} customers mein se', { customers: o?.members.customers ?? 0 })} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'members', label: t('Members'), icon: Users }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }, { value: 'rules', label: t('Usool'), icon: Crown }]} />
      {tab !== 'rules' && <ChipGroup value={preset} onChange={(v) => setPreset(v as typeof preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((x) => x.value !== 'yesterday').map((x) => ({ value: x.value, label: t(x.label) }))} />}
      <CachedNote query={overview} />
      {tab === 'members' && (
        <>
          <ChipGroup value={min} onChange={setMin} style={{ marginHorizontal: -th.space(4) }}
            options={[{ value: '', label: t('Sab darje') }, ...LOYALTY_TIERS.slice(1).map((x) => ({ value: String(x.min), label: t('{{label}} aur upar', { label: x.label }), icon: Crown }))]} />
          <ChipGroup value={sort} onChange={(v) => setSort(v as MemberSort)} style={{ marginHorizontal: -th.space(4) }} options={SORTS.map((x) => ({ value: x.value, label: t(x.label) }))} />
        </>
      )}
      {tab === 'analytics' && o && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Is period mein diye')} value={formatNumber(o.period.issued, { decimals: 0 })} hint={t('{{bills}} bill', { bills: o.period.bills })} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Istemal hue')} value={formatNumber(o.period.redeemed, { decimals: 0 })} hint={t('{{redeemedValue}} ki discount', { redeemedValue: formatMoney(o.period.redeemedValue) })} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" label={t('Khatam hue')} value={formatNumber(o.period.expired, { decimals: 0 })} hint={s?.expiryDays ? t('{{expiryDays}} din baad', { expiryDays: s.expiryDays }) : t('expiry band')} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Diye mein se istemal')} value={usedPct === null ? '—' : `${usedPct}%`} hint={t('Is period mein')} />
          </Row>
          {o.trend.length > 0 && (
            <Card title={t('Points ka aana jana')}>
              <MiniBars points={o.trend.slice(-31).map((x) => ({ key: x.key, value: x.issued }))} />
            </Card>
          )}
          {o.branches.length > 1 && (
            <Card title={t('Branch war')} flush>{o.branches.map((b) => <ListRow key={b.shopId ?? 'none'} dense title={b.name} trailing={<Text size="sm" ltr><Text size="sm" tone="success">{`+${b.issued}`}</Text>{' / '}<Text size="sm" tone="danger">{`−${b.redeemed}`}</Text></Text>} />)}</Card>
          )}
          <Card title={t('Is period ka hisaab')} flush>
            <ListRow dense title={t('Points wale bill')} trailing={<Text weight="semibold" ltr>{String(o.period.bills)}</Text>} />
            <ListRow dense title={t('Un bills ki Sale')} trailing={<Amount value={o.period.salesTotal} />} />
            <ListRow dense title={t('Points se Discount')} trailing={<Amount value={o.period.redeemedValue} />} />
            <ListRow dense title={t('Haath se jore / kaate')} trailing={<Text weight="semibold" ltr>{String(o.period.adjusted)}</Text>} />
          </Card>
        </View>
      )}
      {tab === 'rules' && o && (
        <View style={{ gap: th.space(3) }}>
          <Card title={t('Usool')} action={canSettings ? <IconButton icon={Settings2} label={t('Badlein')} onPress={() => setRules(true)} /> : undefined} flush>
            <ListRow dense title={t('Har {{pointsFor}} ki khareedari par', { pointsFor: formatMoney(Math.round(1 / (s!.pointsPerRupee || 0.01))) })} trailing={<Text weight="semibold">{t('1 point')}</Text>} />
            <ListRow dense title={t('1 point ki qeemat')} trailing={<Amount value={s!.redemptionRate} />} />
            <ListRow dense title={t('Kam se kam istemal')} trailing={<Text weight="semibold">{s!.minRedeem ? t('{{minRedeem}} points', { minRedeem: s!.minRedeem }) : t('Koi had nahi')}</Text>} />
            <ListRow dense title={t('Bill ka zyada se zyada')} trailing={<Text weight="semibold" ltr>{`${s!.maxRedeemPercent}%`}</Text>} />
            <ListRow dense title={t('Points khatam hote hain')} trailing={<Text weight="semibold">{s!.expiryDays ? t('{{expiryDays}} din baad', { expiryDays: s!.expiryDays }) : t('Kabhi nahi')}</Text>} />
          </Card>
          {s!.expiryDays > 0 && expiry.data && expiry.data.points > 0 && (
            <Card tone="warning">
              <Text size="sm">{t('{{points}} points ({{customers}} customers) khatam hone wale hain — har raat khud hota hai.', { points: expiry.data.points, customers: expiry.data.customers })}</Text>
              {canAdjust && <Button size="sm" variant="secondary" loading={expireNow.isPending} onPress={() => expireNow.mutate()} style={{ marginTop: th.space(2) }}>{t('Abhi karein')}</Button>}
            </Card>
          )}
          <Card title={t('Members ke darje')} description={t('Jitne zyada points, utna ooncha darja')} flush>
            {LOYALTY_TIERS.map((x) => (
              <ListRow key={x.id} dense icon={Crown} title={x.label} subtitle={t('{{min}}+ points', { min: x.min })}
                trailing={<Text weight="bold" ltr>{String(o.tiers.find((y) => y.id === x.id)?.count ?? 0)}</Text>}
                onPress={() => { setMin(x.min > 1 ? String(x.min) : ''); setTab('members'); }} />
            ))}
          </Card>
        </View>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<LoyaltyMember>
        title={t('Loyalty points')}
        actions={canSettings ? <IconButton icon={Settings2} label={t('Usool')} onPress={() => setRules(true)} /> : undefined}
        search={tab === 'members' ? { value: search, onChange: setSearch, placeholder: t('Naam ya phone…') } : undefined}
        summary={header}
        data={tab === 'members' ? list : []}
        loading={tab === 'members' && members.isLoading}
        error={tab === 'members' && !members.data ? members.error : undefined}
        onRetry={() => void members.refetch()}
        refreshing={members.isRefetching && !members.isFetchingNextPage}
        onRefresh={() => { void members.refetch(); void overview.refetch(); }}
        onEndReached={() => { if (members.hasNextPage && !members.isFetchingNextPage) void members.fetchNextPage(); }}
        keyExtractor={(m) => m.id}
        renderItem={({ item: m }) => {
          const tier = loyaltyTier(m.loyaltyPoints);
          const nt = nextTier(m.loyaltyPoints);
          return (
            <SwipeRow end={[...(m.phone ? [{ icon: MessageCircle, label: t('WhatsApp'), tone: 'success' as const, onPress: () => wa(m) }] : []), { icon: History, label: t('History'), tone: 'info' as const, onPress: () => setHistoryOf(m) }]}>
              <ListRow avatar={<Avatar name={m.name} url={m.avatarUrl ?? undefined} size={40} />}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{m.name}</Text><Badge icon={Crown} style={{ borderColor: tier.color }}>{tier.label}</Badge></Row>}
                subtitle={`${m.phone ?? '—'} · ${t('khareedari {{totalSpent}}', { totalSpent: formatMoney(m.totalSpent, { compact: true }) })}${nt ? ` · ${t('{{n}} aur → {{tier}}', { n: nt.needed, tier: nt.tier.label })}` : ''}${m.lastActivityAt ? ` · ${formatDate(m.lastActivityAt)}` : ''}`}
                trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{formatNumber(m.loyaltyPoints, { decimals: 0 })}</Text><Amount value={pointsValue(m.loyaltyPoints, rate)} size="2xs" tone="muted" /></View>}
                onPress={canAdjust ? () => setAdjusting(m) : () => setHistoryOf(m)} onLongPress={() => router.push(`/customers/${m.id}` as never)} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={Award} title={query || min ? t('Is filter mein koi nahi') : t('Abhi kisi ke paas points nahi')} message={query || min ? t('Filter hata kar dekhein.') : t('Naam wale customer ke bill par points khud milte hain.')} />}
      />
      <AdjustSheet member={adjusting} onClose={() => setAdjusting(null)} />
      <HistorySheet member={historyOf} onClose={() => setHistoryOf(null)} />
      <RulesSheet overview={o} open={rules} onClose={() => setRules(false)} />
    </>
  );
}

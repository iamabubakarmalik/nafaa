/**
 * Baking (web ProductionPage): the plan of a business day with oven and
 * "made" steps, what to bake that day, the record of plans for a period and
 * analytics of planned, made and failed. Needs the server; the last loaded
 * plans stay readable offline.
 */

import { useQuery } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, ChefHat, Flame, Layers, ListChecks, Plus, Sparkles } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { fmtQty, planStats } from '@nafaa/core/bakery';
import { businessDayKey } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Chip, ChipGroup, DatePicker, EmptyState, IconButton, Row, Screen, SearchBar, Segmented, Skeleton, StatTile, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { keyOfDate, PERIOD_PRESETS, shortKey, usePeriod } from '@/modules/sales/lib/period';
import { productionApi, type ProductionPlan } from '../api';
import { PlanBuilderSheet, PlanCard, PlanRecord, ProductionAnalytics, SuggestView, type BuilderLine } from '../components/Production';
import { PRODUCTION_KEY } from '../meta';

type Tab = 'plan' | 'suggest' | 'record' | 'analytics';

export function ProductionScreen() {
  const th = useTheme();
  const can = usePermission();
  const canManage = can(P.BAKERY_PRODUCTION_MANAGE);
  const rec = usePeriod('month');
  const startHour = rec.startHour;
  const dayKey = (offset: number) => businessDayKey(Date.now() + offset * 86_400_000, startHour);
  const today = dayKey(0);
  const [tab, setTab] = useState<Tab>('plan');
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [builder, setBuilder] = useState<{ plan?: ProductionPlan; lines?: BuilderLine[] } | null>(null);

  const dayQ = useQuery({ queryKey: [PRODUCTION_KEY, 'day', date], queryFn: () => productionApi.listPlans({ from: date, to: date }), refetchInterval: 60_000 });
  const recordQ = useQuery({ queryKey: [PRODUCTION_KEY, 'record', rec.period], queryFn: () => productionApi.listPlans(rec.period.from === 'all' ? { to: rec.period.to } : rec.period), enabled: tab === 'record', placeholderData: (p) => p });
  const suggestQ = useQuery({ queryKey: [PRODUCTION_KEY, 'suggest', date], queryFn: () => productionApi.suggest(date), staleTime: 60_000 });
  const plans = dayQ.data ?? [];
  const stats = useMemo(() => planStats(plans.flatMap((p) => p.items ?? [])), [plans]);
  const s = suggestQ.data;
  const q = search.trim().toLowerCase();
  const shown = q ? plans.filter((p) => p.planNumber.toLowerCase().includes(q) || p.items.some((i) => i.productName.toLowerCase().includes(q))) : plans;
  const dateTitle = date === today ? t('Aaj') : date === dayKey(1) ? t('Kal (aage)') : shortKey(date);

  return (
    <>
      <Screen title={t('Baking')} subtitle={dateTitle} onRefresh={() => { void dayQ.refetch(); void suggestQ.refetch(); void recordQ.refetch(); }} refreshing={dayQ.isRefetching}
        actions={canManage ? <IconButton icon={Plus} variant="primary" label={t('Naya plan')} onPress={() => setBuilder({})} /> : undefined}>
        <View style={{ gap: th.space(3) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Layers} tone="warning" label={t('Banana baqi')} loading={dayQ.isLoading} value={fmtQty(stats.toMake)} hint={t('{{openLines}} cheezein', { openLines: stats.openLines })} onPress={() => setTab('plan')} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Flame} tone="danger" label={t('Oven me')} loading={dayQ.isLoading} value={String(stats.inOven)} hint={t('Abhi bake ho raha')} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Ban gaya')} loading={dayQ.isLoading} value={fmtQty(stats.produced)} hint={t('{{donePct}}% poora', { donePct: stats.donePct })} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Sparkles} tone="accent" label={t('Andaza')} value={s ? fmtQty(s.totals.suggested) : '—'}
              hint={s ? t('{{count}} cheezein banani chahiye', { count: s.rows.filter((r) => r.suggested > 0).length }) : t('Ban raha hai…')} onPress={() => setTab('suggest')} />
          </Row>
          <Segmented value={tab} onChange={setTab} options={[
            { value: 'plan', label: t('Plan'), icon: ChefHat }, { value: 'suggest', label: t('Kya banana hai'), icon: Sparkles },
            { value: 'record', label: t('Record'), icon: ListChecks }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 },
          ]} />
          {(tab === 'plan' || tab === 'suggest') && (
            <Row gap={2} wrap>
              {[0, 1, 2].map((o) => <Chip key={o} label={o === 0 ? t('Aaj') : o === 1 ? t('Kal (aage)') : t('Parson')} selected={date === dayKey(o)} onPress={() => setDate(dayKey(o))} />)}
              <View style={{ flex: 1, minWidth: 140 }}><DatePicker value={new Date(`${date}T12:00:00+05:00`)} onChange={(d) => setDate(keyOfDate(d))} /></View>
            </Row>
          )}
          {(tab === 'record' || tab === 'analytics') && (
            <ChipGroup value={rec.preset} onChange={(v) => rec.setPreset(v as typeof rec.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />
          )}

          {tab === 'plan' && (
            <>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t('Cheez ya plan number…')} />
              <CachedNote query={dayQ} />
              {dayQ.isLoading ? <Skeleton height={180} /> : !shown.length ? (
                <EmptyState icon={ChefHat} title={q ? t('Kuch nahi mila') : t('{{dateTitle}} ka koi plan nahi', { dateTitle })}
                  message={t('"Kya banana hai" se orders aur sale ka andaza dekh kar ek click me plan banayein.')}
                  action={canManage && !q ? <Row gap={2}><Button icon={Sparkles} onPress={() => setTab('suggest')}>{t('Kya banana hai')}</Button><Button variant="secondary" icon={Plus} onPress={() => setBuilder({})}>{t('Khud plan banayein')}</Button></Row> : undefined} />
              ) : shown.map((p) => <PlanCard key={p.id} plan={p} canManage={canManage} onAddItems={(plan) => setBuilder({ plan })} />)}
            </>
          )}
          {tab === 'suggest' && <SuggestView date={date} canManage={canManage} onPlan={(lines) => setBuilder({ lines })} />}
          {tab === 'record' && (recordQ.data ? <PlanRecord plans={recordQ.data} onOpen={(p) => { setDate(businessDayKey(p.planDate, startHour)); setTab('plan'); }} /> : <Skeleton height={160} />)}
          {tab === 'analytics' && <ProductionAnalytics period={rec.period} />}
          {tab === 'plan' && <Text size="xs" tone="muted">{t('Baking me "Recipe ka saamaan ghatayein" on karein to istemal khud likha jata hai.')}</Text>}
        </View>
      </Screen>
      {builder && <PlanBuilderSheet date={date} plan={builder.plan} initial={builder.lines} onClose={() => setBuilder(null)} onDone={() => { setBuilder(null); setTab('plan'); }} />}
    </>
  );
}

/** Quotations (web QuotationsPage): open estimates waiting for the customer, accepted ones waiting for a bill, billed, expired and closed. Counts, search and paging come from the server. */

import { router } from 'expo-router';
import { CalendarClock, CheckCircle2, FileText, Plus, Receipt, Send } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { OfflineNote, useDeskOnline } from '../../_shared/trade/desk';
import { quotationsApi, type Quotation, type QuotationTab } from '../api';
import { KEYS, daysLeft, quoteStatus, shortDate } from '../meta';

const LIMIT = 25;
const TABS: Array<{ value: QuotationTab; label: string }> = [
  { value: 'all', label: t('Sab') }, { value: 'open', label: t('Jawab baqi') }, { value: 'accepted', label: t('Maan li') }, { value: 'converted', label: t('Bill ban gaya') },
  { value: 'expired', label: t('Waqt guzar gaya') }, { value: 'rejected', label: t('Band') },
];

export function QuotationsScreen({ projectId }: { projectId?: string }) {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('hardwareDesk');
  const [tab, setTab] = useState<QuotationTab>('all');
  const [search, setSearch] = useState('');
  const q = search.trim();
  const query = { tab, search: q || undefined, projectId };
  const list = usePaged([KEYS.quotations, query], (page) => quotationsApi.page({ ...query, page, limit: LIMIT }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })));
  const c = list.first?.counts;
  const v = list.first?.values;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Send} tone="info" label={t('Jawab baqi')} loading={list.loading} value={String(c?.open ?? 0)} hint={formatMoney(v?.open ?? 0)} onPress={() => setTab('open')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Maan li')} loading={list.loading} value={String(c?.accepted ?? 0)} hint={formatMoney(v?.accepted ?? 0)} onPress={() => setTab('accepted')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Receipt} tone="accent" label={t('Bill ban gaya')} loading={list.loading} value={String(c?.converted ?? 0)} hint={formatMoney(v?.converted ?? 0)} onPress={() => setTab('converted')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarClock} tone={c?.expired ? 'warning' : 'neutral'} label={t('Waqt guzar gaya')} loading={list.loading} value={String(c?.expired ?? 0)} onPress={() => setTab('expired')} />
      </Row>
      <ChipGroup value={tab} onChange={(x) => setTab(x as QuotationTab)} style={{ marginHorizontal: -th.space(4) }} options={TABS} />
      <OfflineNote feature="hardwareDesk" />
    </View>
  );
  return (
    <ListTemplate<Quotation>
      title={t('Quotations')} grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Number, customer ya phone…') }}
      summary={header} data={list.items} loading={list.loading} error={list.error} onRetry={list.refetch} refreshing={list.refreshing} onRefresh={list.refetch} onEndReached={list.loadMore} keyExtractor={(x) => x.id}
      renderItem={({ item: x }) => {
        const st = quoteStatus(x.status);
        const left = daysLeft(x.validUntil);
        return (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={FileText} iconTone={st.tone} chevron onPress={() => router.push(`/hardware/quotations/${x.id}` as never)}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.customerName}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[x.quotationNumber + (x.revisionNumber ? ` R${x.revisionNumber}` : ''), x.project?.name, shortDate(x.createdAt)].filter(Boolean).join(' · ')}</Text>
                <Row gap={1} wrap><Badge>{t('{{n}} items', { n: x._count?.items ?? x.items?.length ?? 0 })}</Badge>{['DRAFT', 'SENT', 'VIEWED', 'REVISED'].includes(x.status) && <Badge tone={left < 0 ? 'danger' : left <= 3 ? 'warning' : 'neutral'}>{left < 0 ? t('Waqt guzar gaya') : t('{{n}} din baqi', { n: left })}</Badge>}</Row>
              </View>}
              trailing={<Text size="sm" weight="bold" ltr>{formatMoney(x.total)}</Text>} />
          </View>
        );
      }}
      empty={<EmptyState icon={FileText} title={q ? t('Is filter me koi quotation nahi') : t('Abhi koi quotation nahi')} message={t('Bare order ka rate customer ko quotation bana kar dein — maan le to ek tap me bill.')} />}
      fab={can(P.POS_USE) ? { icon: Plus, label: t('Nayi quotation'), onPress: () => guard(() => router.push((projectId ? `/hardware/quotations/new?project=${projectId}` : '/hardware/quotations/new') as never)) } : undefined}
    />
  );
}

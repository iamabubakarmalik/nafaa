/**
 * Goods delivered by network suppliers, waiting to go into stock. Each order
 * shows what actually arrived (returns already taken out) at the invoice's
 * net cost; items not yet matched to the shop's own products are matched
 * once (or made as new products) and remembered. "Mark received" receives
 * the draft purchase into stock.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, Link2, PackageCheck, PackagePlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Button, Card, EmptyState, Icon, ListRow, Row, Screen, SearchBar, Sheet, SkeletonRows, StatTile, Text, ErrorState, toast, useDebouncedValue, useTheme,
} from '@/design';
import { dayTime, packText } from '@/modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type MapChoice, type Receiving } from '../api/trade.api';
import { ORDER_STATUS } from '../lib/meta';
import { BizAvatar, CachedLine, Pill } from '../components/shared';

type Waiting = Receiving['waiting'][number];
type Line = Waiting['lines'][number];
const keyOf = (l: { sellerProductId: string; sellerVariantId: string | null }) => `${l.sellerProductId}|${l.sellerVariantId ?? ''}`;

export function ReceivingScreen() {
  const th = useTheme();
  const { id: focus } = useLocalSearchParams<{ id?: string }>();
  const q = useQuery({ queryKey: [TRADE_KEY, 'receiving'], queryFn: tradeApi.receiving, refetchInterval: 60_000 });
  const waiting = q.data?.waiting ?? [];
  // The focused order goes first so a deep link from "My orders" lands on it.
  const sorted = [...waiting].sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : 0));
  const value = waiting.reduce((s, w) => s + (w.deliveredValue ?? 0), 0);

  return (
    <Screen title={t('Receive goods')} subtitle={t('Receiving')} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm" tone="muted">{t('Supplier ne jo deliver kiya woh yahan Purchase ban kar aata hai — check karein aur stock me daalein')}</Text>
        <CachedLine query={q} />
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={waiting.length ? 'warning' : 'neutral'} icon={PackageCheck} label={t('Receive baqi')} value={String(waiting.length)} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Maal ki qeemat')} value={<Amount value={value} size="xl" weight="bold" />} />
        </Row>
        {q.isLoading ? <SkeletonRows count={3} />
          : !q.data ? <ErrorState error={q.error} onRetry={q.refetch} />
            : !waiting.length ? (
              <EmptyState icon={CircleCheck} title={t('Receive goods')} message={t('Sab maal receive ho chuka. Supplier deliver karega to yahan aa jayega.')}
                action={<Button variant="secondary" onPress={() => router.push('/network/orders')}>{t('Supplier orders')}</Button>} />
            ) : sorted.map((w) => <WaitingCard key={w.id} w={w} focus={focus === w.id} />)}
        {(q.data?.recent.length ?? 0) > 0 && (
          <Card title={t('Haal hi me receive hua')} flush>
            {q.data!.recent.map((r, i) => (
              <ListRow key={r.id} divider={i < q.data!.recent.length - 1} icon={CircleCheck} iconTone="success"
                title={`${r.seller?.name ?? ''} · ${r.orderNumber ?? ''}`} subtitle={`${r.invoiceNumber ?? ''} · ${dayTime(r.receivedAt)}`}
                trailing={<Amount value={r.deliveredValue ?? 0} weight="semibold" />} onPress={() => router.push(`/network/orders/${r.id}`)} />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

function WaitingCard({ w, focus }: { w: Waiting; focus: boolean }) {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canReceive = can(P.TRADE_RECEIVE);
  const unmatched = w.lines.filter((l) => !l.mine);
  const [choices, setChoices] = useState<Record<string, MapChoice>>({});
  const [matching, setMatching] = useState<Line | null>(null);
  const pending = unmatched.filter((l) => !choices[keyOf(l)]);
  const free = w.lines.filter((l) => l.free);
  const receive = useMutation({
    mutationFn: () => tradeApi.receive(w.id, Object.values(choices)),
    onSuccess: (r) => {
      toast.success(r.state === 'RECEIVED' ? t('Maal stock me aa gaya — Purchase receive ho gayi') : t('Save ho gaya'));
      void qc.invalidateQueries({ queryKey: [TRADE_KEY] });
    },
    onError: (e) => toast.error(tradeError(e)),
  });
  const setChoice = (l: Line, c: MapChoice | null) => setChoices((p) => { const n = { ...p }; if (c) n[keyOf(l)] = c; else delete n[keyOf(l)]; return n; });

  return (
    <Card style={focus ? { borderWidth: 2, borderColor: th.colors.brand.solid } : undefined}>
      <Row gap={3} align="start">
        <BizAvatar card={w.seller} />
        <View style={{ flex: 1 }}>
          <Text weight="semibold" numberOfLines={1}>{w.seller?.name}</Text>
          <Text size="xs" tone="muted">{t('Order {{orderNumber}} · Invoice {{value}} · {{deliveredAt}}', { orderNumber: w.orderNumber ?? '', value: w.invoiceNumber ?? '—', deliveredAt: dayTime(w.deliveredAt) })}</Text>
        </View>
        <Pill tone={ORDER_STATUS[w.status].tone}>{ORDER_STATUS[w.status].label}</Pill>
      </Row>
      <View style={{ marginTop: th.space(3) }}>
        {w.lines.map((l, i) => {
          const choice = choices[keyOf(l)];
          return (
            <View key={i} style={{ paddingVertical: th.space(2.5), gap: 6, borderTopWidth: 1, borderTopColor: th.colors.divider }}>
              <Row gap={2} justify="between" align="start">
                <View style={{ flex: 1 }}>
                  <Row gap={2} wrap>
                    <Text weight="semibold" style={{ flexShrink: 1 }}>{l.name}</Text>
                    {l.free && <Pill tone="green">{t('FREE')}</Pill>}
                  </Row>
                  <Text size="xs" tone="muted" ltr>{[l.sku, l.barcode].filter(Boolean).join(' · ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text size="sm" weight="semibold">{packText(l.baseQty, null, null, l.baseUnit)}</Text>
                  <Text size="xs" tone="muted">{l.free ? t('Rs 0') : <Amount value={l.value} size="xs" tone="muted" />}</Text>
                </View>
              </Row>
              {l.mine ? (
                <Row gap={1.5}>
                  <Icon icon={Link2} size={14} color={th.colors.success.text} />
                  <Text size="sm" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>{l.mine.name}</Text>
                </Row>
              ) : choice ? (
                <Row gap={2}>
                  <Pill tone={choice.create ? 'blue' : 'green'}>{choice.create ? t('Naya product banega') : t('Chuna hua')}</Pill>
                  <Button size="sm" variant="ghost" onPress={() => setChoice(l, null)}>{t('Edit')}</Button>
                </Row>
              ) : (
                <Row gap={2}>
                  <Button size="sm" variant="secondary" style={{ flex: 1 }} icon={Link2} onPress={() => setMatching(l)}>{t('Apna product dhoondein')}</Button>
                  <Button size="sm" variant="soft" icon={PackagePlus} onPress={() => setChoice(l, { sellerProductId: l.sellerProductId, sellerVariantId: l.sellerVariantId, create: true })}>{t('New product')}</Button>
                </Row>
              )}
            </View>
          );
        })}
      </View>
      <View style={{ gap: th.space(2), borderTopWidth: 1, borderTopColor: th.colors.divider, paddingTop: th.space(3) }}>
        <Row justify="between">
          <Text size="sm" tone="secondary">{t('Purchase:')}</Text>
          <Amount value={w.deliveredValue ?? 0} weight="bold" />
        </Row>
        {w.returnsValue > 0 && <Text size="xs" tone="muted">{t('· wapas gaya {{returnsValue}}', { returnsValue: `Rs ${Math.round(w.returnsValue).toLocaleString('en-PK')}` })}</Text>}
        {free.length > 0 && <Text size="xs" tone="muted">{t('· {{count}} free item (Rs 0 cost)', { count: free.length })}</Text>}
        {pending.length > 0 && <Text size="xs" weight="medium" tone="warning">{t('{{count}} item milana baqi', { count: pending.length })}</Text>}
        {unmatched.length > 0 && <Text size="xs" tone="muted">{t('Naye items ek dafa apne product se milayein — agli dafa Nafaa khud pehchan lega.')}</Text>}
        {canReceive
          ? <Button size="lg" icon={PackageCheck} loading={receive.isPending} disabled={pending.length > 0} onPress={() => receive.mutate()}>{t('Mark received')}</Button>
          : <Text size="xs" tone="muted">{t('Receive ki permission nahi')}</Text>}
      </View>
      {matching && (
        <MatchSheet line={matching} onClose={() => setMatching(null)} onPick={(c) => { setChoice(matching, c); setMatching(null); }} />
      )}
    </Card>
  );
}

function MatchSheet({ line, onClose, onPick }: { line: Line; onClose: () => void; onPick: (c: MapChoice) => void }) {
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim(), 250);
  const q = useQuery({ queryKey: [TRADE_KEY, 'my-products', term], queryFn: () => tradeApi.myProducts(term), enabled: term.length >= 2, staleTime: 30_000 });
  return (
    <Sheet open onClose={onClose} title={line.name ?? t('Apna product dhoondein')}>
      <View style={{ gap: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Apna product dhoondein')} />
        <View>
          {term.length >= 2 && q.data && !q.data.length && <Text size="sm" tone="muted" align="center">{t('Kuch nahi mila')}</Text>}
          {(q.data ?? []).map((p) => (
            <ListRow key={p.id} title={p.name} subtitle={t('{{value}} · stock {{stock}}', { value: p.sku ?? '', stock: p.stock })} divider
              onPress={() => onPick({ sellerProductId: line.sellerProductId, sellerVariantId: line.sellerVariantId, buyerProductId: p.id })} />
          ))}
        </View>
      </View>
    </Sheet>
  );
}

/**
 * Reorder suggestions: what to buy before it runs out, grouped by branch and
 * supplier. Quantities can be changed; "Purchase banayein" opens the new
 * purchase with the lines filled in (nothing is saved here). A purchase
 * belongs to one branch, so the app switches to it first when needed.
 * `AiReorderPanel` shows data the assistant already sent; `ReorderSuggestions`
 * loads /ai/reorder with its own lead-time chips.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronDown, PackageCheck, ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { usePermission, PERMISSIONS } from '@/core/permissions';
import { Amount, Button, Card, Chip, Icon, Input, PressableScale, SkeletonRows, Text, toast, useTheme } from '@/design';
import { aiApi, type AiReorder, type AiReorderGroup } from '../api/ai';

const qtyText = (n: number) => Number(n.toFixed(2)).toLocaleString('en-US');

function GroupCard({ g, canBuy, onOrder }: { g: AiReorderGroup; canBuy: boolean; onOrder: (g: AiReorderGroup, qty: Record<string, number>) => void }) {
  const th = useTheme();
  const [qty, setQty] = useState<Record<string, string>>({});
  const num = (id: string, fallback: number) => (qty[id] != null ? Math.max(0, Number(qty[id]) || 0) : fallback);
  const total = g.rows.reduce((s, r) => s + (r.lastCost ?? 0) * num(r.productId, r.suggestQty), 0);
  const hasCost = g.rows.some((r) => r.lastCost != null);
  return (
    <Card
      title={g.supplier?.name ?? t('Supplier nahi chuna')}
      description={`${g.shopName} · ${t('{{count}} cheezein', { count: g.rows.length })}`}
      action={hasCost && total > 0 ? <Amount value={total} size="sm" tone="muted" /> : undefined}
      footer={canBuy ? (
        <Button size="md" icon={ShoppingCart} fullWidth onPress={() => onOrder(g, Object.fromEntries(g.rows.map((r) => [r.productId, num(r.productId, r.suggestQty)])))}>{t('Purchase banayein')}</Button>
      ) : undefined}
    >
      <View style={{ gap: th.space(2.5) }}>
        {g.rows.map((r) => (
          <View key={r.productId} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <View style={{ flex: 1 }}>
              <Text size="sm" weight="medium" numberOfLines={2}>{r.name}</Text>
              <Text size="xs" tone="muted">
                {t('Stock {{stock}} {{unit}} · roz {{perDay}} · {{left}}', {
                  stock: qtyText(r.stock), unit: r.unit, perDay: qtyText(r.perDay),
                  left: r.daysLeft == null ? t('bikri nahi') : r.daysLeft <= 0 ? t('khatam') : t('{{days}} din', { days: Math.round(r.daysLeft) }),
                })}{r.onOrder > 0 ? ` · ${t('{{onOrder}} order me', { onOrder: qtyText(r.onOrder) })}` : ''}
              </Text>
            </View>
            <View style={{ width: 80 }}>
              <Input size="md" ltr keyboardType="decimal-pad" accessibilityLabel={t('{{name}} quantity', { name: r.name })}
                value={qty[r.productId] ?? String(r.suggestQty)} onChangeText={(v) => setQty((q) => ({ ...q, [r.productId]: v }))} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Opens the new purchase with the group's lines; switches branch if needed. */
function useOrder() {
  return (g: AiReorderGroup, qty: Record<string, number>) => {
    const lines = g.rows.map((r) => ({ productId: r.productId, qty: qty[r.productId] ?? r.suggestQty })).filter((l) => l.qty > 0);
    if (!lines.length) { toast.error(t('Mangwane ke liye koi quantity nahi')); return; }
    const auth = useAuthStore.getState();
    if (auth.currentShopId !== g.shopId) {
      auth.setCurrentShop(g.shopId);
      toast.success(t('{{shopName}} khul gayi — order isi branch ka banega', { shopName: g.shopName }));
    }
    const prefill = JSON.stringify({ supplierId: g.supplier?.id, supplierName: g.supplier?.name, lines });
    router.push({ pathname: '/purchases/new', params: { order: '1', prefill } } as never);
  };
}

function IdleNote({ idle, days }: { idle: AiReorder['idle']; days: number }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  if (!idle?.length) return null;
  return (
    <Card flush>
      <PressableScale onPress={() => setOpen((v) => !v)} accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(3) }}>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon icon={ChevronDown} size={16} tone="subtle" /></View>
        <Text size="sm" weight="medium" tone="secondary" style={{ flex: 1 }}>{t('Bikri nahi hui — abhi order ki zaroorat nahi ({{count}})', { count: idle.length })}</Text>
      </PressableScale>
      {open && (
        <View style={{ paddingHorizontal: th.space(3), paddingBottom: th.space(3), gap: 2 }}>
          <Text size="xs" tone="subtle">{t('Pichhle {{days}} din me in ki koi sale nahi hui.', { days })}</Text>
          {idle.map((r) => <Text key={r.productId} size="sm" tone="secondary">{`${r.name} · ${qtyText(r.stock)} ${r.unit}`}</Text>)}
        </View>
      )}
    </Card>
  );
}

export function AiReorderPanel({ reorder }: { reorder: AiReorder }) {
  const th = useTheme();
  const can = usePermission();
  const canBuy = can(PERMISSIONS.PURCHASES_CREATE);
  const order = useOrder();
  return (
    <View style={{ gap: th.space(2) }}>
      {reorder.groups.length ? (
        <>
          <Text size="xs" tone="muted">
            {t('Pichhle {{historyDays}} din ki bikri se · supplier {{leadDays}} din me deta hai · {{coverDays}} din ka maal', { historyDays: reorder.historyDays, leadDays: reorder.leadDays, coverDays: reorder.coverDays })}
          </Text>
          {reorder.groups.map((g) => <GroupCard key={`${g.shopId}:${g.supplier?.id ?? 'none'}`} g={g} canBuy={canBuy} onOrder={order} />)}
        </>
      ) : (
        <Text size="sm" tone="secondary">{t('Abhi kuch mangwane ki zaroorat nahi.')}</Text>
      )}
      <IdleNote idle={reorder.idle ?? []} days={reorder.historyDays} />
    </View>
  );
}

const LEAD = [1, 3, 7] as const;
const COVER = [7, 14, 30] as const;

/** Standalone panel with its own data and lead-time chips. */
export function ReorderSuggestions() {
  const th = useTheme();
  const [lead, setLead] = useState<number>(3);
  const [cover, setCover] = useState<number>(14);
  const q = useQuery({ queryKey: ['ai', 'reorder', lead, cover], queryFn: () => aiApi.reorder(lead, cover), staleTime: 60_000, retry: false });
  return (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
        <Icon icon={PackageCheck} size={18} tone="brand" />
        <Text weight="semibold">{t('Kya mangwana hai?')}</Text>
      </View>
      <Text size="xs" tone="muted">{t('Supplier deta hai:')}</Text>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        {LEAD.map((d) => <Chip key={d} label={t('{{d}} din', { d })} selected={lead === d} onPress={() => setLead(d)} />)}
      </View>
      <Text size="xs" tone="muted">{t('Maal chahiye:')}</Text>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        {COVER.map((d) => <Chip key={d} label={t('{{d}} din', { d })} selected={cover === d} onPress={() => setCover(d)} />)}
      </View>
      {q.isLoading ? <SkeletonRows count={2} />
        : q.isError || !q.data ? <Text size="sm" tone="muted">{t('Reorder list abhi nahi khul saki (permission ya internet).')}</Text>
        : <AiReorderPanel reorder={q.data} />}
    </View>
  );
}

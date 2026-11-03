/**
 * The "School sets" tab on the counter (web SchoolSetPicker and the school
 * combos in the bookstore POS config): every active school list sells as a
 * set. Tapping one opens the picker: the whole set at the set price, or only
 * the books a child still needs, at the list's rate.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, GraduationCap, Minus, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { lineRate, setPrice } from '@nafaa/core/industries/bookstore';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { offline } from '@/core/offline';
import { Button, Card, EmptyState, IconButton, ListRow, PressableScale, Row, Sheet, Skeleton, Text, toast, useTheme } from '@/design';
import { usePos, type PosApi } from '@/modules/pos/engine/usePos';
import { schoolListsApi, type PosSchoolList } from '../api';
import { KEYS } from '../meta';

const priceOfSet = (l: PosSchoolList) => setPrice(l.items.map((i) => ({ productId: i.productId, isOptional: i.isOptional, quantity: i.quantity, total: i.total })), l.bundlePrice, l.discountPct);

export function SchoolSets({ padBottom }: { padBottom: number }) {
  const th = useTheme();
  const api = usePos();
  const [open, setOpen] = useState<PosSchoolList | null>(null);
  const q = useQuery({ queryKey: [KEYS.posLists], queryFn: () => schoolListsApi.forPos().catch(() => [] as PosSchoolList[]), staleTime: 60_000 });
  const sets = (q.data ?? []).filter((l) => l.items.some((i) => i.productId && !i.isOptional));
  if (q.isLoading) return <View style={{ padding: th.space(4) }}><Skeleton height={80} /></View>;
  return (
    <>
      <FlatList
        data={sets}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: th.space(3), paddingBottom: padBottom, gap: th.space(2) }}
        onRefresh={() => void q.refetch()}
        refreshing={q.isRefetching}
        ListEmptyComponent={<EmptyState compact icon={GraduationCap} title={t('Koi school list counter par nahi')} message={t('School lists me list "Counter par" karein — set yahan aa jayega.')} />}
        renderItem={({ item: l }) => (
          <View style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={GraduationCap} iconTone="accent" title={`${l.school.name} — ${l.grade}${l.section ? ` ${l.section}` : ''}`} subtitle={`${l.session} · ${t('{{count}} cheezein', { count: l.items.length })}`}
              trailing={<Text weight="bold" ltr>{formatMoney(priceOfSet(l))}</Text>} chevron onPress={() => setOpen(l)} />
          </View>
        )}
      />
      <SetPicker list={open} api={api} onClose={() => setOpen(null)} />
    </>
  );
}

/** The whole set on the bill as one combo line at the set price. */
export async function addSchoolSet(api: PosApi, list: PosSchoolList, sets: number): Promise<boolean> {
  const lines = list.items.filter((i) => i.productId && !i.isOptional);
  const whole = priceOfSet(list);
  const orig = lines.reduce((s, i) => s + (i.currentPrice ?? i.unitPrice) * i.quantity, 0);
  return api.addCombo({ id: `school:${list.id}`, name: `${list.school.name} — ${list.grade}${list.section ? ` ${list.section}` : ''}`, price: whole, savings: Math.max(Math.round((orig - whole) * 100) / 100, 0),
    items: lines.map((i) => ({ productId: i.productId!, quantity: i.quantity, originalPrice: i.currentPrice ?? i.unitPrice })) } as never, sets);
}

/** Only the ticked books, each at the list's rate. */
export async function addPickedBooks(api: PosApi, list: PosSchoolList, picked: Set<string>, sets: number) {
  const lines = list.items.filter((i) => i.productId && picked.has(i.id));
  for (const it of lines) await api.addProduct(it.productId!, { qty: it.quantity * sets, price: lineRate(it, list.discountPct), note: `${list.school.name} — ${list.grade}` });
  toast.success(t('{{count}} kitaben bill par', { count: lines.length }));
}

function SetPicker({ list, api, onClose }: { list: PosSchoolList | null; api: PosApi; onClose: () => void }) {
  const th = useTheme();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sets, setSets] = useState(1);
  const [stock, setStock] = useState<Record<string, number>>({});
  const key = list?.id;
  useMemo(() => {
    if (!list) return;
    setPicked(new Set(list.items.filter((i) => i.productId && !i.isOptional).map((i) => i.id)));
    setSets(1);
    void Promise.all(list.items.filter((i) => i.productId).map(async (i) => [i.productId!, (await offline.products.get(i.productId!, api.shopId).catch(() => null))?.stock] as const))
      .then((rows) => setStock(Object.fromEntries(rows.filter((r): r is readonly [string, number] => typeof r[1] === 'number'))));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  const required = list.items.filter((i) => !i.isOptional);
  const wholeSet = required.every((i) => i.productId && picked.has(i.id)) && list.items.filter((i) => i.isOptional).every((i) => !picked.has(i.id));
  const missing = list.items.filter((i) => !i.productId);
  const custom = list.items.filter((i) => i.productId && picked.has(i.id)).reduce((s, i) => s + lineRate(i, list.discountPct) * i.quantity, 0);
  const whole = priceOfSet(list);
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const addWhole = async () => { if (await addSchoolSet(api, list, sets)) onClose(); };
  const addPicked = async () => { await addPickedBooks(api, list, picked, sets); onClose(); };

  return (
    <Sheet open onClose={onClose} height={0.9} title={`${list.school.name} — ${list.grade}${list.section ? ` (${list.section})` : ''}`} description={t('Session {{session}} · {{count}} cheezein', { session: list.session, count: list.items.length })}
      footer={
        <Row gap={2}>
          <Row gap={1}>
            <IconButton icon={Minus} label={t('Kam')} size="sm" onPress={() => setSets(Math.max(1, sets - 1))} />
            <Text weight="semibold" ltr>{t('{{sets}} set', { sets })}</Text>
            <IconButton icon={Plus} label={t('Zyada')} size="sm" onPress={() => setSets(sets + 1)} />
          </Row>
          {wholeSet
            ? <Button style={{ flex: 1 }} onPress={() => void addWhole()}>{t('Poora set — {{formatPKR}}', { formatPKR: formatMoney(whole * sets) })}</Button>
            : <Button style={{ flex: 1 }} disabled={picked.size === 0} onPress={() => void addPicked()}>{t('Chuni hui {{size}} — {{formatPKR}}', { size: picked.size, formatPKR: formatMoney(custom * sets) })}</Button>}
        </Row>
      }>
      <View style={{ gap: th.space(3) }}>
        <Card flush>
          {list.items.map((it, i) => {
            const st = it.productId ? stock[it.productId] : undefined;
            const short = st !== undefined && st < it.quantity * sets;
            const on = picked.has(it.id);
            return (
              <PressableScale key={it.id} disabled={!it.productId} onPress={() => toggle(it.id)} style={{ opacity: it.productId ? 1 : 0.6 }}>
                <ListRow divider={i < list.items.length - 1}
                  leading={<View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: on ? th.colors.brand.solid : th.colors.border, backgroundColor: on ? th.colors.brand.solid : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on && <Check size={14} color={th.colors.brand.onSolid} />}</View>}
                  title={`${it.itemName}${it.quantity > 1 ? ` × ${it.quantity}` : ''}`}
                  subtitle={[it.subject, it.isOptional ? t('Marzi ki') : null, !it.productId ? t('Catalog me nahi') : st !== undefined ? t('Stock {{stock}}', { stock: st }) : null].filter(Boolean).join(' · ')}
                  trailing={<Row gap={1}>{short && <AlertTriangle size={16} color={th.colors.warning.solid} />}<Text size="sm" weight="semibold" ltr>{formatMoney(lineRate(it, list.discountPct) * it.quantity)}</Text></Row>} />
              </PressableScale>
            );
          })}
        </Card>
        {missing.length > 0 && <Card tone="warning"><Text size="sm">{t('{{value}} catalog me nahi — set ki qeemat in ke bagair hai. School list me product jor dein.', { value: missing.map((m) => m.itemName).join(', ') })}</Text></Card>}
        <Text size="xs" tone="muted">{t('Jo kitab bachay ke paas pehle se hai us ka nishan hata dein — baqi alag alag list ke rate par lagti hain.')}</Text>
      </View>
    </Sheet>
  );
}

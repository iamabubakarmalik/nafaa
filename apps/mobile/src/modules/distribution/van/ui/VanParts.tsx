/**
 * Pieces shared by the van sale and market return screens: the customer
 * picker (instant, from the phone's own customer list), the van stock list
 * and the line editor with pack and quantity.
 */

import { Minus, Plus, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useCustomerSearch } from '@/core/offline';
import { Amount, Avatar, Card, Chip, EmptyState, IconButton, Input, ListRow, PressableScale, Row, SearchBar, Text, useDebouncedValue, useTheme } from '@/design';
import type { VanStockLine } from '@/modules/distribution/api/phase2.api';

export interface PickedCustomer { id: string; name: string; businessName?: string | null; phone?: string | null; balance?: number | null }
export interface PickedLine { key: string; stock: VanStockLine; unitId: string | null; qty: number; condition?: 'GOOD' | 'DAMAGED' | 'EXPIRED' }

const keyOf = (s: VanStockLine) => `${s.productId}:${s.variantId ?? ''}`;
const label = (s: Pick<VanStockLine, 'name' | 'variantName'>) => [s.name, s.variantName].filter(Boolean).join(' · ');

export function CustomerPicker({ value, onChange }: { value: PickedCustomer | null; onChange: (c: PickedCustomer | null) => void }) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q.trim(), 150);
  const { data: hits = [] } = useCustomerSearch({ query, limit: 8 }, { enabled: !value });
  if (value) {
    return (
      <Card flush>
        <ListRow
          avatar={<Avatar name={value.businessName || value.name} size={40} />}
          title={value.businessName || value.name}
          subtitle={value.phone ?? undefined}
          trailing={<View style={{ alignItems: 'flex-end' }}>{value.balance != null && <><Text size="2xs" tone="muted">{t('Khata')}</Text><Amount value={value.balance} size="sm" /></>}</View>}
          onPress={() => onChange(null)}
        />
      </Card>
    );
  }
  return (
    <View style={{ gap: th.space(2) }}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('Customer ka naam ya phone')} />
      {hits.length > 0 && (
        <Card flush>
          {hits.map((c, i) => (
            <ListRow key={c.id} avatar={<Avatar name={c.businessName || c.name} size={40} />} title={c.businessName || c.name} subtitle={c.phone ?? undefined} divider={i < hits.length - 1}
              trailing={c.balance ? <Amount value={c.balance} size="sm" /> : undefined}
              onPress={() => onChange({ id: c.id, name: c.name, businessName: c.businessName, phone: c.phone, balance: c.balance })} />
          ))}
        </Card>
      )}
      {!hits.length && !!query && <Text size="sm" tone="muted" align="center">{t('Koi customer nahi mila')}</Text>}
    </View>
  );
}

/** Van stock to pick from; picked items are marked. */
export function StockList({ stock, picked, onAdd }: { stock: VanStockLine[]; picked: PickedLine[]; onAdd: (s: VanStockLine) => void }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const rows = needle ? stock.filter((s) => label(s).toLowerCase().includes(needle)) : stock;
  if (!stock.length) return <EmptyState compact icon={Search} title={t('Van khaali hai')} />;
  return (
    <View style={{ gap: 8 }}>
      {stock.length > 6 && <SearchBar value={q} onChangeText={setQ} placeholder={t('Search items')} />}
      <Card flush>
        {rows.map((s, i) => {
          const on = picked.some((p) => p.key === keyOf(s));
          return <ListRow key={keyOf(s)} title={label(s)} subtitle={s.text} selected={on} divider={i < rows.length - 1} trailing={<Amount value={s.price} size="sm" tone="muted" />} onPress={() => !on && onAdd(s)} />;
        })}
      </Card>
    </View>
  );
}

export function newLine(s: VanStockLine, withCondition = false): PickedLine {
  const big = [...s.units].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  return { key: keyOf(s), stock: s, unitId: !withCondition && big ? big.id : null, qty: 1, ...(withCondition && { condition: 'GOOD' as const }) };
}

/** Value at the shelf price, only to show a running estimate (the server prices the order). */
export function lineEstimate(l: PickedLine): number {
  const rate = l.unitId ? l.stock.units.find((u) => u.id === l.unitId)?.conversionRate ?? 1 : 1;
  return l.qty * rate * (l.stock.wholesalePrice ?? l.stock.price);
}

export function LineEditor({ line, onChange, onRemove }: { line: PickedLine; onChange: (l: PickedLine) => void; onRemove: () => void }) {
  const th = useTheme();
  const packs = [{ id: null as string | null, unitName: line.stock.baseUnit, conversionRate: 1 }, ...line.stock.units];
  const btn = { height: 52, width: 52, borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted, alignItems: 'center' as const, justifyContent: 'center' as const };
  const CONDITIONS = [{ k: 'GOOD', l: t('Theek') }, { k: 'DAMAGED', l: t('Kharab') }, { k: 'EXPIRED', l: t('Expiry') }] as const;
  return (
    <Card>
      <Row gap={2} justify="between">
        <Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{label(line.stock)}</Text>
        <IconButton icon={X} label={t('Delete')} onPress={onRemove} />
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {packs.map((p) => <Chip key={p.id ?? 'base'} label={`${p.unitName}${p.conversionRate > 1 ? ` (${p.conversionRate})` : ''}`} selected={line.unitId === p.id} onPress={() => onChange({ ...line, unitId: p.id })} />)}
      </View>
      {line.condition && (
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          {CONDITIONS.map((c) => <Chip key={c.k} label={c.l} selected={line.condition === c.k} onPress={() => onChange({ ...line, condition: c.k })} />)}
        </View>
      )}
      <Row gap={2}>
        <PressableScale onPress={() => onChange({ ...line, qty: Math.max(1, line.qty - 1) })} accessibilityLabel={t('Kam')} style={btn}><Minus size={20} color={th.colors.text} /></PressableScale>
        <View style={{ flex: 1 }}>
          <Input size="lg" value={String(line.qty)} onChangeText={(v) => onChange({ ...line, qty: Math.max(0, Number(v.replace(/[^0-9.]/g, '')) || 0) })} keyboardType="decimal-pad" ltr />
        </View>
        <PressableScale onPress={() => onChange({ ...line, qty: line.qty + 1 })} accessibilityLabel={t('Zyada')} style={btn}><Plus size={20} color={th.colors.text} /></PressableScale>
      </Row>
    </Card>
  );
}

/** Picks van stock lines with a pack and quantity; shared by the van sale and return screens. */

import { Pressable, Text, TextInput, View } from 'react-native';
import { Minus, Plus, X } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import type { VanStockLine } from './api';
import { inputCls } from './CustomerPicker';

export interface PickedLine { key: string; stock: VanStockLine; unitId: string | null; qty: number; condition?: 'GOOD' | 'DAMAGED' | 'EXPIRED' }

const keyOf = (s: VanStockLine) => `${s.productId}:${s.variantId ?? ''}`;

export function StockList({ stock, picked, onAdd }: { stock: VanStockLine[]; picked: PickedLine[]; onAdd: (s: VanStockLine) => void }) {
  return (
    <View className="gap-1">
      {stock.map((s) => {
        const on = picked.some((p) => p.key === keyOf(s));
        return (
          <Pressable key={keyOf(s)} onPress={() => !on && onAdd(s)} className={cn('flex-row items-center justify-between rounded-xl px-3 py-2 border', on ? 'border-teal-600 bg-teal-50 dark:bg-teal-950' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900')}>
            <Text className="text-sm font-bold text-neutral-900 dark:text-white flex-1" numberOfLines={1}>{[s.name, s.variantName].filter(Boolean).join(' · ')}</Text>
            <Text className="text-xs text-neutral-500 ml-2">{s.text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function newLine(s: VanStockLine, withCondition = false): PickedLine {
  const big = [...s.units].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  return { key: keyOf(s), stock: s, unitId: !withCondition && big ? big.id : null, qty: 1, ...(withCondition && { condition: 'GOOD' as const }) };
}

export function LineEditor({ line, onChange, onRemove }: { line: PickedLine; onChange: (l: PickedLine) => void; onRemove: () => void }) {
  const packs = [{ id: null as string | null, unitName: line.stock.baseUnit, conversionRate: 1 }, ...line.stock.units];
  return (
    <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-extrabold text-neutral-900 dark:text-white flex-1" numberOfLines={1}>{line.stock.name}</Text>
        <Pressable onPress={onRemove} hitSlop={10}><X size={18} color="#9ca3af" /></Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {packs.map((p) => (
          <Pressable key={p.id ?? 'base'} onPress={() => onChange({ ...line, unitId: p.id })}
            className={cn('h-8 px-3 rounded-full border items-center justify-center', line.unitId === p.id ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-200 dark:border-neutral-700')}>
            <Text className={cn('text-xs font-bold', line.unitId === p.id ? 'text-white' : 'text-neutral-600 dark:text-neutral-300')}>{p.unitName}{p.conversionRate > 1 ? ` (${p.conversionRate})` : ''}</Text>
          </Pressable>
        ))}
      </View>
      {line.condition && (
        <View className="flex-row gap-2">
          {(['GOOD', 'DAMAGED', 'EXPIRED'] as const).map((c) => (
            <Pressable key={c} onPress={() => onChange({ ...line, condition: c })}
              className={cn('h-8 px-3 rounded-full border items-center justify-center', line.condition === c ? 'bg-teal-700 border-teal-700' : 'border-neutral-200 dark:border-neutral-700')}>
              <Text className={cn('text-xs font-bold', line.condition === c ? 'text-white' : 'text-neutral-600 dark:text-neutral-300')}>{c === 'GOOD' ? 'Theek' : c === 'DAMAGED' ? 'Kharab' : 'Expiry'}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View className="flex-row items-center gap-2">
        <Pressable onPress={() => onChange({ ...line, qty: Math.max(1, line.qty - 1) })} className="h-10 w-10 rounded-xl border border-neutral-200 dark:border-neutral-700 items-center justify-center"><Minus size={16} color="#64748b" /></Pressable>
        <TextInput value={String(line.qty)} onChangeText={(t) => onChange({ ...line, qty: Math.max(0, Number(t.replace(/[^0-9.]/g, '')) || 0) })} keyboardType="decimal-pad" className={cn(inputCls, 'flex-1 text-center font-extrabold')} />
        <Pressable onPress={() => onChange({ ...line, qty: line.qty + 1 })} className="h-10 w-10 rounded-xl border border-neutral-200 dark:border-neutral-700 items-center justify-center"><Plus size={16} color="#64748b" /></Pressable>
      </View>
    </View>
  );
}

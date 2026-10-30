/** Customer search for the van screens (online). */

import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { cn } from '@/lib/cn';
import { rs } from '@/features/booker/ui/parts';
import { vanApi, type CustomerHit } from './api';

export const inputCls = 'h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 text-sm text-neutral-900 dark:text-white';

export function CustomerPicker({ value, onChange }: { value: CustomerHit | null; onChange: (c: CustomerHit | null) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<CustomerHit[]>([]);
  useEffect(() => {
    if (value || q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => { vanApi.customers(q.trim()).then(setHits).catch(() => setHits([])); }, 300);
    return () => clearTimeout(t);
  }, [q, value]);
  if (value) {
    return (
      <Pressable onPress={() => onChange(null)} className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3">
        <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">{value.businessName || value.name}</Text>
        <Text className="text-xs text-neutral-500">{[value.phone, value.balance != null ? `Khata ${rs(value.balance)}` : null].filter(Boolean).join(' · ')} · badalne ke liye tap</Text>
      </Pressable>
    );
  }
  return (
    <View>
      <TextInput value={q} onChangeText={setQ} placeholder="Customer ka naam ya phone" placeholderTextColor="#9ca3af" className={inputCls} />
      {hits.map((c) => (
        <Pressable key={c.id} onPress={() => onChange(c)} className={cn('mt-1 rounded-xl bg-white dark:bg-neutral-900 px-3 py-2 border border-neutral-100 dark:border-neutral-800')}>
          <Text className="text-sm font-bold text-neutral-900 dark:text-white">{c.businessName || c.name}</Text>
          {!!c.phone && <Text className="text-xs text-neutral-500">{c.phone}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

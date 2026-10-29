/**
 * Old-balance money taken on the trip. Saved on the phone against the load
 * sheet and synced as a pending recovery; the office counts it in the
 * van's cash at settlement and verifies it into the khata.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Check, HandCoins } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { useDeliveryQuery, useDeliveryStore } from '@/features/delivery/store';
import { listSheets, queueRecovery, sheetRecoveries } from '@/features/delivery/core/repo';
import type { MoneyMethod, RecoveryPayload } from '@/features/delivery/core/types';
import { currentGps, newClientRef } from '@/features/booker/native/device';
import { ActionButton, Card, ScreenHeader, Tag, rs } from '@/features/booker/ui/parts';

const METHODS: { key: MoneyMethod; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'JAZZCASH', label: 'JazzCash' },
  { key: 'EASYPAISA', label: 'Easypaisa' },
  { key: 'BANK_TRANSFER', label: 'Bank' },
];
const inputCls = 'h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 text-sm text-neutral-900 dark:text-white';

export default function DeliveryRecovery() {
  const { sheetId } = useLocalSearchParams<{ sheetId?: string }>();
  const router = useRouter();
  const { db, me, bump, sync } = useDeliveryStore();
  const { data } = useDeliveryQuery(async (d) => {
    const sheets = await listSheets(d);
    const sheet = sheets.find((s) => s.id === sheetId) ?? sheets[0] ?? null;
    return { sheet, done: sheet ? await sheetRecoveries(d, sheet) : [] };
  }, [sheetId]);
  const sheet = data?.sheet ?? null;
  const customers = useMemo(() => {
    const m = new Map<string, { id: string; name: string; sub: string; balance?: number }>();
    sheet?.invoices.forEach((i) => { if (i.customer) m.set(i.customer.id, { id: i.customer.id, name: i.customer.businessName || i.customer.name, sub: i.customer.area ?? '', balance: i.customer.balance }); });
    return [...m.values()];
  }, [sheet]);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<MoneyMethod>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const value = Number(amount.replace(/,/g, ''));
  const ok = !!customerId && Number.isFinite(value) && value >= 0.01;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/delivery'));

  const save = async () => {
    if (!db || !sheet || !customerId || !ok) return;
    setSaving(true);
    try {
      const gps = await currentGps(4000);
      const p: RecoveryPayload = { clientRef: newClientRef(), loadSheetId: sheet.id, customerId, amount: Math.round(value * 100) / 100, method, collectedAt: new Date().toISOString() };
      if (reference.trim()) p.reference = reference.trim().slice(0, 80);
      if (note.trim()) p.note = note.trim().slice(0, 300);
      if (gps.ok) { p.latitude = gps.gps.latitude; p.longitude = gps.gps.longitude; }
      await queueRecovery(db, p);
      Toast.show({ type: 'success', text1: 'Recovery save ho gayi', text2: 'Office check karega' });
      bump();
      sync({ quiet: true });
      back();
    } finally {
      setSaving(false);
    }
  };

  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? 'Customer';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScreenHeader title="Recovery likhein" subtitle={sheet ? `${sheet.number} · purane udhaar ka paisa` : null} onBack={back} />
      {!me?.canCollect ? (
        <Text className="px-6 text-sm text-neutral-500">Recovery likhne ki permission nahi. Malik se "Recovery / cash collect" ki permission lein.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text className="text-[11px] font-extrabold uppercase text-neutral-400">Kis dukaan se?</Text>
          <View className="gap-2">
            {customers.map((c) => (
              <Pressable key={c.id} onPress={() => setCustomerId(c.id)}
                className={cn('rounded-2xl border px-4 py-3 flex-row items-center gap-3', customerId === c.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-950' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900')}>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm font-extrabold text-neutral-900 dark:text-white">{c.name}</Text>
                  {!!c.sub && <Text numberOfLines={1} className="text-[11px] text-neutral-500">{c.sub}</Text>}
                </View>
                {c.balance != null && <Text className={cn('text-xs font-extrabold', c.balance > 0 ? 'text-red-600' : 'text-neutral-400')}>{rs(c.balance)}</Text>}
                {customerId === c.id && <Check size={18} color="#115e59" />}
              </Pressable>
            ))}
          </View>

          <TextInput value={amount} onChangeText={setAmount} placeholder="Amount (Rs)" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" className={cn(inputCls, 'text-lg font-extrabold')} />
          <View className="flex-row flex-wrap gap-2">
            {METHODS.map((m) => (
              <Pressable key={m.key} onPress={() => setMethod(m.key)}
                className={cn('h-10 px-4 rounded-full border items-center justify-center', method === m.key ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white' : 'border-neutral-200 dark:border-neutral-700')}>
                <Text className={cn('text-xs font-extrabold', method === m.key ? 'text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300')}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
          {method !== 'CASH' && <TextInput value={reference} onChangeText={setReference} placeholder="Reference / TID" placeholderTextColor="#9ca3af" className={inputCls} maxLength={80} />}
          <TextInput value={note} onChangeText={setNote} placeholder="Note" placeholderTextColor="#9ca3af" className={inputCls} maxLength={300} />
          <Text className="text-[11px] text-neutral-500">Ye paisa gaari ke cash me ginta hai. Office check karega, phir khata me jama hoga.</Text>

          {!!data?.done.length && (
            <Card>
              <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-2">Is trip ki recovery</Text>
              {data.done.map((r) => (
                <View key={r.key} className="flex-row items-center gap-2 py-1.5">
                  <HandCoins size={14} color="#2563eb" />
                  <Text numberOfLines={1} className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">{nameOf(r.customerId)} · {rs(r.amount)}</Text>
                  {r.state === 'sent' ? <Tag tone="green">Office pohanch gayi</Tag> : r.state === 'issue' ? <Tag tone="red">Nahi gayi</Tag> : <Tag tone="amber">Sync hona hai</Tag>}
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
      )}
      {me?.canCollect && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-neutral-50/95 dark:bg-neutral-950/95">
          <ActionButton label={ok ? `${rs(value)} save karein` : 'Save karein'} disabled={!ok} loading={saving} onPress={save} />
        </View>
      )}
    </SafeAreaView>
  );
}

/**
 * Spot sale from the van: customer, items off the van, cash taken now (the
 * rest goes on the khata). The server prices it with the customer's price
 * list and schemes, makes the invoice out of the van's stock and marks it
 * delivered. Over the credit limit it asks for the manager PIN.
 */

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { CheckCircle2 } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { newClientRef } from '@/features/booker/native/device';
import { ActionButton, Card, ScreenHeader } from '@/features/booker/ui/parts';
import { vanApi, type CustomerHit, type MyVan } from '@/features/van/api';
import { CustomerPicker, inputCls } from '@/features/van/CustomerPicker';
import { LineEditor, newLine, StockList, type PickedLine } from '@/features/van/LinePicker';

export default function VanSell() {
  const router = useRouter();
  const { vanId } = useLocalSearchParams<{ vanId: string }>();
  const [van, setVan] = useState<MyVan | null>(null);
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [cash, setCash] = useState('');
  const [cheque, setCheque] = useState(false);
  const [bank, setBank] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().slice(0, 10));
  const [pin, setPin] = useState('');
  const [needsPin, setNeedsPin] = useState(false);
  const [saving, setSaving] = useState(false);
  // One id per sale: a resend after a lost reply is saved once.
  const clientRef = useMemo(() => newClientRef(), []);

  useEffect(() => { if (vanId) vanApi.van(vanId).then(setVan).catch(() => undefined); }, [vanId]);

  const valid = !!customer && lines.some((l) => l.qty > 0) && (!cheque || (!!bank.trim() && !!chequeNo.trim()));
  const save = async () => {
    if (!van || !customer) return;
    setSaving(true);
    try {
      const amount = Number(cash.replace(/,/g, '')) || 0;
      const r = await vanApi.sell(van.id, {
        clientRef, customerId: customer.id,
        items: lines.filter((l) => l.qty > 0).map((l) => ({ productId: l.stock.productId, ...(l.stock.variantId && { variantId: l.stock.variantId }), ...(l.unitId && { unitId: l.unitId }), qty: l.qty })),
        ...(amount > 0 && { cashReceived: amount, method: cheque ? 'CHEQUE' : 'CASH' }),
        ...(cheque && amount > 0 && { bankName: bank.trim(), chequeNo: chequeNo.trim(), chequeDate }),
        ...(pin && { managerPin: pin }),
      });
      Toast.show({ type: 'success', text1: `${r.invoice?.saleNumber ?? r.order.orderNumber} — Rs ${Math.round(r.order.total).toLocaleString('en-US')}`, text2: r.warnings[0] });
      router.back();
    } catch (e) {
      const msg = (e as Error).message;
      if (/PIN/i.test(msg)) setNeedsPin(true);
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScreenHeader title="New sale" subtitle={van?.name} onBack={() => router.back()} />
      <ScrollView contentContainerClassName="p-4 gap-3" keyboardShouldPersistTaps="handled">
        <CustomerPicker value={customer} onChange={setCustomer} />
        {lines.map((l) => (
          <LineEditor key={l.key} line={l} onChange={(n) => setLines((all) => all.map((x) => (x.key === l.key ? n : x)))} onRemove={() => setLines((all) => all.filter((x) => x.key !== l.key))} />
        ))}
        <Card>
          <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-2">Van se item chunein</Text>
          <StockList stock={van?.stock ?? []} picked={lines} onAdd={(s) => setLines((all) => [...all, newLine(s)])} />
        </Card>
        <Card>
          <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-2">Abhi mila (baqi khata me)</Text>
          <TextInput value={cash} onChangeText={setCash} placeholder="Amount (Rs)" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" className={cn(inputCls, 'font-extrabold')} />
          <View className="flex-row gap-2 mt-2">
            {[{ k: false, l: 'Cash' }, { k: true, l: 'Cheque' }].map((m) => (
              <Pressable key={m.l} onPress={() => setCheque(m.k)} className={cn('h-9 px-4 rounded-full border items-center justify-center', cheque === m.k ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-200 dark:border-neutral-700')}>
                <Text className={cn('text-xs font-extrabold', cheque === m.k ? 'text-white' : 'text-neutral-600 dark:text-neutral-300')}>{m.l}</Text>
              </Pressable>
            ))}
          </View>
          {cheque && (
            <View className="gap-2 mt-2">
              <TextInput value={bank} onChangeText={setBank} placeholder="Bank" placeholderTextColor="#9ca3af" className={inputCls} />
              <TextInput value={chequeNo} onChangeText={setChequeNo} placeholder="Cheque number" placeholderTextColor="#9ca3af" className={inputCls} />
              <TextInput value={chequeDate} onChangeText={setChequeDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9ca3af" className={inputCls} />
            </View>
          )}
        </Card>
        {needsPin && (
          <Card>
            <Text className="text-xs text-neutral-500 mb-2">Udhaar limit se zyada — manager PIN likhein</Text>
            <TextInput value={pin} onChangeText={setPin} placeholder="Manager PIN" placeholderTextColor="#9ca3af" secureTextEntry keyboardType="number-pad" className={inputCls} />
          </Card>
        )}
        <ActionButton label="Save" icon={CheckCircle2} disabled={!valid} loading={saving} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

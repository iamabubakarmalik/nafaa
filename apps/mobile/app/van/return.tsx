/**
 * Market return on the route: goods a shop hands back (good, damaged or
 * expired). It waits for the office to approve; then the khata is credited
 * and damaged / expired goods are written off (and claimed from the company).
 */

import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { CheckCircle2 } from 'lucide-react-native';
import { newClientRef } from '@/features/booker/native/device';
import { ActionButton, Card, ScreenHeader } from '@/features/booker/ui/parts';
import { vanApi, type CustomerHit, type MyVan } from '@/features/van/api';
import { CustomerPicker, inputCls } from '@/features/van/CustomerPicker';
import { LineEditor, newLine, StockList, type PickedLine } from '@/features/van/LinePicker';

export default function VanReturn() {
  const router = useRouter();
  const { vanId } = useLocalSearchParams<{ vanId: string }>();
  const [van, setVan] = useState<MyVan | null>(null);
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const clientRef = useMemo(() => newClientRef(), []);

  useEffect(() => { if (vanId) vanApi.van(vanId).then(setVan).catch(() => undefined); }, [vanId]);

  const save = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      const r = await vanApi.marketReturn({
        clientRef, customerId: customer.id, ...(vanId && { vanId }), ...(note.trim() && { note: note.trim() }),
        items: lines.filter((l) => l.qty > 0).map((l) => ({
          productId: l.stock.productId, ...(l.stock.variantId && { variantId: l.stock.variantId }), ...(l.unitId && { unitId: l.unitId }), qty: l.qty, condition: l.condition ?? 'GOOD',
        })),
      });
      Toast.show({ type: 'success', text1: `${r.marketReturn.number} save ho gaya`, text2: 'Office approve karega' });
      router.back();
    } catch (e) {
      Toast.show({ type: 'error', text1: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScreenHeader title="Market return" subtitle={van?.name} onBack={() => router.back()} />
      <ScrollView contentContainerClassName="p-4 gap-3" keyboardShouldPersistTaps="handled">
        <CustomerPicker value={customer} onChange={setCustomer} />
        {lines.map((l) => (
          <LineEditor key={l.key} line={l} onChange={(n) => setLines((all) => all.map((x) => (x.key === l.key ? n : x)))} onRemove={() => setLines((all) => all.filter((x) => x.key !== l.key))} />
        ))}
        <Card>
          <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-2">Item chunein</Text>
          <StockList stock={van?.stock ?? []} picked={lines} onAdd={(s) => setLines((all) => [...all, newLine(s, true)])} />
          {!van?.stock.length && <Text className="text-xs text-neutral-500">Van khaali hai — return office se likhwayein</Text>}
        </Card>
        <TextInput value={note} onChangeText={setNote} placeholder="Note" placeholderTextColor="#9ca3af" className={inputCls} />
        <ActionButton label="Save" icon={CheckCircle2} disabled={!customer || !lines.some((l) => l.qty > 0)} loading={saving} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

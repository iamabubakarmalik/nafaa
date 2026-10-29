/**
 * One invoice on the trip: the shop's contact, the goods on the bill, and
 * the delivery man's report: delivered, partly returned (pieces per line,
 * damaged or not) or all returned with a reason, and the money taken. The
 * report is saved on the phone first and synced; the office checks it when
 * the van is settled.
 */

import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { CheckCircle2, Gift, Info, MapPin, Minus, Navigation, Phone, Plus, Save } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { useDeliveryQuery, useDeliveryStore } from '@/features/delivery/store';
import { effectiveReport, getInvoice, queueReport, reportsByOrder, returnsValue, type LocalReport } from '@/features/delivery/core/repo';
import type { DeliveryOutcome, Invoice, MoneyMethod, ReportPayload, ReturnLine, Sheet } from '@/features/delivery/core/types';
import { currentGps, newClientRef, openMap } from '@/features/booker/native/device';
import { ACCENT, ActionButton, Card, Row, ScreenHeader, rs } from '@/features/booker/ui/parts';
import { DeliverySyncButton, OUTCOME_LABEL, packText, RETURN_REASONS, ReportTag } from '@/features/delivery/ui/parts';

const METHODS: { key: MoneyMethod; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'JAZZCASH', label: 'JazzCash' },
  { key: 'EASYPAISA', label: 'Easypaisa' },
  { key: 'BANK_TRANSFER', label: 'Bank' },
];

interface LineDraft { back: string; freeBack: string; damaged: boolean }
interface Loaded { sheet: Sheet; invoice: Invoice; report: LocalReport | null }

const num = (v: string) => {
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) && v.trim() !== '' ? n : 0;
};
const str = (n?: number | null) => (n ? String(n) : '');
const inputCls = 'h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 text-sm text-neutral-900 dark:text-white';

export default function DeliveryInvoice() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { db, bump, sync } = useDeliveryStore();
  const { data } = useDeliveryQuery(async (d) => {
    const found = await getInvoice(d, orderId);
    if (!found) return null;
    const local = (await reportsByOrder(d)).get(orderId);
    return { ...found, report: effectiveReport(found.invoice, local) };
  }, [orderId]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/delivery'));

  if (data === null) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
        <ScreenHeader title="Invoice" onBack={back} />
        <Text className="px-6 text-sm text-neutral-500">Ye invoice ab aap ki load sheet par nahi.</Text>
      </SafeAreaView>
    );
  }
  if (!data || !db) return <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}><ScreenHeader title="Invoice" onBack={back} /></SafeAreaView>;
  return <InvoiceForm key={`${data.invoice.orderId}:${data.report?.reportedAt ?? ''}`} data={data} onBack={back} onSaved={() => { bump(); sync({ quiet: true }); back(); }} />;
}

function InvoiceForm({ data, onBack, onSaved }: { data: Loaded; onBack: () => void; onSaved: () => void }) {
  const { db } = useDeliveryStore();
  const { sheet, invoice: inv, report } = data;
  const c = inv.customer;
  const locked = inv.settled;

  const [outcome, setOutcome] = useState<DeliveryOutcome | null>(report?.outcome ?? null);
  const [lines, setLines] = useState<Record<string, LineDraft>>(() => Object.fromEntries(inv.lines.map((l) => {
    const r = report?.lines.find((x) => x.orderItemId === l.orderItemId);
    return [l.orderItemId, { back: str(r?.returnBaseQty), freeBack: str(r?.returnFreeQty), damaged: !!r?.damaged }];
  })));
  const [cash, setCash] = useState(str(report?.cashCollected));
  const [method, setMethod] = useState<MoneyMethod>(report?.method ?? 'CASH');
  const [reason, setReason] = useState(report?.returnReason ?? '');
  const [note, setNote] = useState(report?.note ?? '');
  const [saving, setSaving] = useState(false);

  const retLines: ReturnLine[] = useMemo(() => inv.lines
    .map((l) => ({ orderItemId: l.orderItemId, returnBaseQty: Math.min(num(lines[l.orderItemId]?.back ?? ''), l.baseQty), returnFreeQty: Math.min(num(lines[l.orderItemId]?.freeBack ?? ''), l.freeBaseQty), damaged: !!lines[l.orderItemId]?.damaged }))
    .filter((l) => (l.returnBaseQty ?? 0) > 0 || (l.returnFreeQty ?? 0) > 0), [inv.lines, lines]);
  const backValue = outcome ? returnsValue(inv, outcome, retLines) : 0;
  const due = Math.max(0, Math.round((inv.total - backValue) * 100) / 100);
  const cashValue = outcome === 'RETURNED' ? 0 : num(cash);

  useEffect(() => { if (outcome === 'RETURNED') setCash(''); }, [outcome]);

  const problem = !outcome ? 'Pehle batayein maal ka kya hua'
    : outcome === 'PARTIAL' && !retLines.length ? 'Kam se kam ek cheez ki wapsi likhein'
      : cashValue > due + 0.5 ? `Cash bill se zyada hai (lena ${rs(due)})`
        : outcome === 'RETURNED' && !reason ? 'Wapsi ki wajah chunein'
          : null;

  const save = async () => {
    if (!db || !outcome || problem) return;
    setSaving(true);
    try {
      const gps = await currentGps(4000);
      const p: ReportPayload = { clientRef: newClientRef(), orderId: inv.orderId, outcome, reportedAt: new Date().toISOString() };
      if (outcome === 'PARTIAL') p.lines = retLines;
      if (cashValue > 0) { p.cashCollected = Math.round(cashValue * 100) / 100; p.method = method; }
      if (outcome !== 'DELIVERED' && reason) p.returnReason = reason.slice(0, 200);
      if (note.trim()) p.note = note.trim().slice(0, 300);
      if (gps.ok) { p.latitude = gps.gps.latitude; p.longitude = gps.gps.longitude; if (gps.gps.accuracy != null) p.accuracyM = gps.gps.accuracy; }
      await queueReport(db, sheet.id, inv, p);
      Toast.show({ type: 'success', text1: 'Report save ho gayi', text2: 'Office settlement par check karega' });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const setLine = (id: string, patch: Partial<LineDraft>) => setLines((m) => ({ ...m, [id]: { ...m[id], ...patch } }));

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScreenHeader title={c?.businessName || c?.name || 'Invoice'} subtitle={`Stop ${inv.stop} · ${inv.saleNumber ?? inv.orderNumber}`} onBack={onBack} right={<DeliverySyncButton />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          {!!c?.businessName && <Text className="text-sm font-extrabold text-neutral-800 dark:text-neutral-100">{c.name}</Text>}
          {!!(c?.address || c?.area) && (
            <View className="flex-row gap-1.5 mt-1">
              <MapPin size={13} color="#9ca3af" />
              <Text className="flex-1 text-xs text-neutral-500">{[c?.address, c?.area, c?.city].filter(Boolean).join(', ')}</Text>
            </View>
          )}
          <View className="flex-row gap-2 mt-3">
            {!!c?.phone && <SmallButton icon={Phone} label="Call" onPress={() => Linking.openURL(`tel:${c.phone}`)} />}
            {c?.latitude != null && c?.longitude != null && <SmallButton icon={Navigation} label="Raasta" onPress={() => openMap(c.latitude!, c.longitude!)} />}
            <View className="flex-1 items-end justify-center"><ReportTag report={report} /></View>
          </View>
          {c?.balance != null && <Row label="Khata (pehle ka)" value={rs(c.balance)} />}
        </Card>

        {locked && (
          <View className="rounded-2xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 p-3 flex-row gap-2">
            <Info size={16} color="#2563eb" />
            <Text className="flex-1 text-xs text-blue-800 dark:text-blue-200">Office ne ye invoice settle kar di ({OUTCOME_LABEL[inv.deliveryStatus ?? 'DELIVERED']}). Ab report nahi badal sakti.</Text>
          </View>
        )}
        {report?.state === 'issue' && !!report.issue && (
          <View className="rounded-2xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-3">
            <Text className="text-xs font-extrabold text-red-700 dark:text-red-300">Pichli report server ne nahi li</Text>
            <Text className="text-xs text-red-700 dark:text-red-300 mt-0.5">{report.issue}</Text>
          </View>
        )}

        {!locked && (
          <View>
            <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-2">Maal ka kya hua?</Text>
            <View className="flex-row gap-2">
              {(['DELIVERED', 'PARTIAL', 'RETURNED'] as DeliveryOutcome[]).map((k) => {
                const on = outcome === k;
                const tone = k === 'DELIVERED' ? 'bg-emerald-600 border-emerald-600' : k === 'PARTIAL' ? 'bg-teal-700 border-teal-700' : 'bg-red-600 border-red-600';
                return (
                  <Pressable key={k} onPress={() => setOutcome(k)}
                    className={cn('flex-1 h-14 rounded-2xl border items-center justify-center px-1', on ? tone : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800')}>
                    <Text className={cn('text-[13px] font-extrabold text-center', on ? 'text-white' : 'text-neutral-700 dark:text-neutral-200')}>{OUTCOME_LABEL[k]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Card className="p-0">
          <View className="px-4 pt-3.5 pb-2 flex-row items-center justify-between">
            <Text className="text-[11px] font-extrabold uppercase text-neutral-400">Bill ka maal</Text>
            {outcome === 'PARTIAL' && !locked && <Text className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300">Wapas aane wale pcs likhein</Text>}
          </View>
          {inv.lines.map((l, i) => {
            const d = lines[l.orderItemId];
            const partial = outcome === 'PARTIAL' && !locked;
            const over = num(d.back) > l.baseQty;
            return (
              <View key={l.orderItemId} className={cn('px-4 py-3', i > 0 && 'border-t border-neutral-100 dark:border-neutral-800')}>
                <View className="flex-row items-start gap-2">
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">{l.name}{l.variantName ? ` · ${l.variantName}` : ''}</Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">{packText(l)}</Text>
                    {l.freeBaseQty > 0 && (
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Gift size={11} color="#7c3aed" />
                        <Text className="text-[11px] font-extrabold text-violet-700 dark:text-violet-300">+{l.freeBaseQty} {l.freeProductName ?? l.baseUnit} free</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm font-extrabold text-neutral-800 dark:text-neutral-100">{rs(l.total)}</Text>
                </View>
                {partial && (
                  <View className="mt-2.5 gap-2">
                    <QtyStepper label={`Wapas (${l.baseUnit})`} value={d.back} max={l.baseQty} invalid={over} onChange={(v) => setLine(l.orderItemId, { back: v })} />
                    {l.freeBaseQty > 0 && <QtyStepper label="Free wapas" value={d.freeBack} max={l.freeBaseQty} onChange={(v) => setLine(l.orderItemId, { freeBack: v })} />}
                    {(num(d.back) > 0 || num(d.freeBack) > 0) && (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-neutral-600 dark:text-neutral-300">Kharab / toota hua (stock me nahi jayega)</Text>
                        <Switch value={d.damaged} onValueChange={(v) => setLine(l.orderItemId, { damaged: v })} />
                      </View>
                    )}
                    {num(d.back) > 0 && <Text className="text-[11px] font-extrabold text-red-600">−{rs(Math.min(num(d.back), l.baseQty) * l.netPerBase)}</Text>}
                  </View>
                )}
              </View>
            );
          })}
        </Card>

        {!locked && (outcome === 'RETURNED' || outcome === 'PARTIAL') && (
          <View>
            <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-2">Wapsi ki wajah{outcome === 'PARTIAL' ? ' (zaroori nahi)' : ''}</Text>
            <View className="flex-row flex-wrap gap-2">
              {RETURN_REASONS.map((r) => (
                <Pressable key={r} onPress={() => setReason(reason === r ? '' : r)}
                  className={cn('h-10 px-3.5 rounded-full border items-center justify-center', reason === r ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900')}>
                  <Text className={cn('text-xs font-extrabold', reason === r ? 'text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300')}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!locked && outcome && outcome !== 'RETURNED' && (
          <Card>
            <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-1">Paisa</Text>
            <Row label="Bill" value={rs(inv.total)} />
            {backValue > 0 && <Row label="Wapas maal" value={`−${rs(backValue)}`} tone="red" />}
            <Row label="Is bill ka lena" value={rs(due)} strong />
            <View className="flex-row gap-2 mt-3">
              <TextInput value={cash} onChangeText={(v) => setCash(v.replace(/[^\d.]/g, ''))} placeholder="Kitna mila (Rs)" placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad" className={cn(inputCls, 'flex-1 text-lg font-extrabold')} />
              <Pressable onPress={() => setCash(String(due))} className="h-12 px-4 rounded-2xl bg-neutral-900 dark:bg-white items-center justify-center">
                <Text className="text-xs font-extrabold text-white dark:text-neutral-900">Poora</Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap gap-2 mt-3">
              {METHODS.map((m) => (
                <Pressable key={m.key} onPress={() => setMethod(m.key)}
                  className={cn('h-9 px-3.5 rounded-full border items-center justify-center', method === m.key ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white' : 'border-neutral-200 dark:border-neutral-700')}>
                  <Text className={cn('text-xs font-extrabold', method === m.key ? 'text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300')}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
            {cashValue > 0 && cashValue < due && <Text className="text-[11px] text-neutral-500 mt-2">Bacha hua {rs(due - cashValue)} customer ke khate me udhaar rahega.</Text>}
            {!cashValue && <Text className="text-[11px] text-neutral-500 mt-2">Paisa nahi mila to khali chhor dein — poora bill khate me jayega.</Text>}
          </Card>
        )}

        {!locked && (
          <TextInput value={note} onChangeText={setNote} placeholder="Note (zaroori nahi)" placeholderTextColor="#9ca3af" className={inputCls} maxLength={300} />
        )}
      </ScrollView>

      {!locked && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-neutral-50/95 dark:bg-neutral-950/95">
          {!!problem && outcome && <Text className="text-[11px] font-extrabold text-red-600 text-center mb-2">{problem}</Text>}
          <ActionButton label={report && report.state !== 'issue' ? 'Report badal kar save karein' : 'Report save karein'} icon={report ? Save : CheckCircle2}
            disabled={!!problem} loading={saving} onPress={save} />
        </View>
      )}
    </SafeAreaView>
  );
}

function QtyStepper({ label, value, max, invalid, onChange }: { label: string; value: string; max: number; invalid?: boolean; onChange: (v: string) => void }) {
  const n = num(value);
  const step = (d: number) => onChange(String(Math.max(0, Math.min(max, n + d))));
  return (
    <View className="flex-row items-center gap-2">
      <Text className="flex-1 text-xs font-extrabold text-neutral-600 dark:text-neutral-300">{label} <Text className="font-normal text-neutral-400">/ {max}</Text></Text>
      <Pressable onPress={() => step(-1)} className="h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"><Minus size={16} color={ACCENT} /></Pressable>
      <TextInput value={value} onChangeText={(v) => onChange(v.replace(/[^\d.]/g, ''))} placeholder="0" placeholderTextColor="#9ca3af" keyboardType="decimal-pad"
        className={cn('h-10 w-16 rounded-xl border bg-white dark:bg-neutral-900 text-center text-base font-extrabold text-neutral-900 dark:text-white', invalid ? 'border-red-400' : 'border-neutral-200 dark:border-neutral-700')} />
      <Pressable onPress={() => step(1)} className="h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"><Plus size={16} color={ACCENT} /></Pressable>
    </View>
  );
}

function SmallButton({ icon: Icon, label, onPress }: { icon: typeof Phone; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="h-9 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex-row items-center gap-1.5">
      <Icon size={14} color={ACCENT} />
      <Text className="text-xs font-extrabold text-neutral-700 dark:text-neutral-200">{label}</Text>
    </Pressable>
  );
}

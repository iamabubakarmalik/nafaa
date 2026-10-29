/**
 * One shop on the route: contact and khata, GPS check-in with the distance
 * to the shop, and the three things a booker does there (order, no order,
 * recovery), plus what was already done today.
 */

import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import {
  AlertTriangle, Ban, CheckCircle2, Crosshair, MapPin, MessageCircle, Navigation, Phone, ShoppingCart, Wallet,
} from 'lucide-react-native';
import { useBookerStore, useDbQuery } from '@/features/booker/store';
import { customerDay, getCheckIn, getCustomer, queueCollection, queueVisit } from '@/features/booker/core/repo';
import { creditFor } from '@/features/booker/core/order';
import type { CollectionPayload, MoneyMethod } from '@/features/booker/core/types';
import { checkIn, checkInOrNow, visitPayload } from '@/features/booker/visit';
import { newClientRef, openMap, openWhatsApp } from '@/features/booker/native/device';
import { ActionButton, Card, ACCENT, Row, ScreenHeader, SyncButton, Tag, daysSince, rs } from '@/features/booker/ui/parts';
import { NoOrderSheet, RecoverySheet } from '@/features/booker/ui/sheets';

export default function BookerCustomer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { db, manifest, today, bump, sync } = useBookerStore();
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'none' | 'noOrder' | 'recovery'>('none');
  const [sheetKey, setSheetKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: customer } = useDbQuery((d) => getCustomer(d, id), [id]);
  const { data: checkin } = useDbQuery((d) => getCheckIn(d, id, today), [id, today]);
  const { data: day } = useDbQuery((d) => customerDay(d, id, today), [id, today]);

  if (!db || !customer || !manifest) {
    return <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950"><ScreenHeader title="Customer" /></SafeAreaView>;
  }

  const radius = manifest.settings.checkInRadiusM || 150;
  const route = manifest.routes.find((r) => r.id === customer.routeId);
  const credit = manifest.settings.creditMode !== 'OFF' ? creditFor(customer, 0) : null;
  const due = daysSince(customer.oldestDueAt);
  const hasLocation = customer.latitude != null && customer.longitude != null;

  const doCheckIn = async () => {
    setLocating(true);
    setGpsError(null);
    const res = await checkIn(db, customer, today, radius);
    setLocating(false);
    if (res.error) setGpsError(res.error);
    bump();
  };

  const openSheet = (s: 'noOrder' | 'recovery') => { setSheetKey((k) => k + 1); setSheet(s); };

  const saveNoOrder = async (code: string, note: string) => {
    setSaving(true);
    try {
      const c = await checkInOrNow(db, customer, today, radius);
      await queueVisit(db, visitPayload({
        clientRef: newClientRef(), customer, outcome: code === 'SHOP_CLOSED' ? 'CLOSED' : 'NO_ORDER', checkin: c, noOrderReason: code, note,
      }), today, c?.distanceM ?? null);
      setSheet('none');
      Toast.show({ type: 'success', text1: 'Visit save ho gaya' });
      bump();
      sync({ quiet: true });
    } finally {
      setSaving(false);
    }
  };

  const saveRecovery = async (v: { amount: number; method: MoneyMethod; reference: string; note: string }) => {
    setSaving(true);
    try {
      const c = await checkInOrNow(db, customer, today, radius);
      const payload: CollectionPayload = { clientRef: newClientRef(), customerId: customer.id, amount: v.amount, method: v.method, collectedAt: new Date().toISOString() };
      if (v.reference.trim()) payload.reference = v.reference.trim().slice(0, 80);
      if (v.note.trim()) payload.note = v.note.trim().slice(0, 300);
      if (c?.latitude != null && c.longitude != null) { payload.latitude = c.latitude; payload.longitude = c.longitude; }
      const visitedAlready = !!(day?.visits.length || day?.orders.length);
      await queueCollection(db, payload, today, visitedAlready ? null : {
        payload: visitPayload({ clientRef: newClientRef(), customer, outcome: 'RECOVERY_ONLY', checkin: c }),
        distanceM: c?.distanceM ?? null,
      });
      setSheet('none');
      Toast.show({ type: 'success', text1: 'Recovery save ho gayi', text2: 'Office check karega' });
      bump();
      sync({ quiet: true });
    } finally {
      setSaving(false);
    }
  };

  const reasonLabel = (code: string | null) => manifest.noOrderReasons.find((r) => r.code === code)?.label ?? code ?? '';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScreenHeader title={customer.businessName || customer.name} subtitle={route?.name ?? null} right={<SyncButton />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}>
        {/* Contact */}
        <Card>
          {customer.businessName && <Text className="text-sm font-extrabold text-neutral-800 dark:text-neutral-100">{customer.name}</Text>}
          {(customer.address || customer.area) && (
            <View className="flex-row gap-1.5 mt-1">
              <MapPin size={13} color="#9ca3af" />
              <Text className="flex-1 text-xs text-neutral-500">{[customer.address, customer.area, customer.city].filter(Boolean).join(', ')}</Text>
            </View>
          )}
          <View className="flex-row gap-2 mt-3">
            {!!customer.phone && (
              <>
                <SmallButton icon={Phone} label="Call" onPress={() => Linking.openURL(`tel:${customer.phone}`)} />
                <SmallButton icon={MessageCircle} label="WhatsApp" onPress={() => openWhatsApp('', customer.phone)} />
              </>
            )}
            {hasLocation && <SmallButton icon={Navigation} label="Raasta" onPress={() => openMap(customer.latitude!, customer.longitude!)} />}
          </View>
        </Card>

        {/* Khata */}
        {manifest.me.canSeeBalance && customer.balance != null && (
          <Card>
            <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-1">Khata</Text>
            <Row label="Balance (udhaar)" value={rs(customer.balance)} strong tone={customer.balance > 0 ? 'red' : undefined} />
            {!!customer.creditLimit && <Row label="Credit limit" value={rs(customer.creditLimit)} />}
            {due != null && <Row label="Sab se purana udhaar" value={`${due} din${customer.creditDays ? ` (had ${customer.creditDays} din)` : ''}`} />}
            {credit?.message && (
              <View className="mt-2 rounded-xl bg-red-50 dark:bg-red-950 p-2.5 flex-row gap-2">
                <AlertTriangle size={14} color="#dc2626" />
                <Text className="flex-1 text-xs text-red-700 dark:text-red-300">{credit.message}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Check-in */}
        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-[11px] font-extrabold uppercase text-neutral-400">Check-in</Text>
              {checkin ? (
                <Text className="text-sm font-extrabold text-neutral-800 dark:text-neutral-100 mt-1">
                  {new Date(checkin.at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  {checkin.distanceM != null ? ` · dukaan se ${checkin.distanceM} m` : checkin.latitude == null ? ' · location nahi mili' : ''}
                </Text>
              ) : (
                <Text className="text-xs text-neutral-500 mt-1">Dukaan par pohanch kar check-in karein</Text>
              )}
            </View>
            <ActionButton label={checkin ? 'Dobara' : 'Check-in'} icon={Crosshair} tone="white" loading={locating} onPress={doCheckIn} />
          </View>
          {!!checkin?.far && (
            <View className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950 p-2.5 flex-row gap-2">
              <AlertTriangle size={14} color="#d97706" />
              <Text className="flex-1 text-xs text-amber-800 dark:text-amber-200">
                Aap dukaan se {checkin.distanceM} m door hain (had {radius} m). Kaam ho jayega, lekin office ko door wala visit dikhega.
              </Text>
            </View>
          )}
          {checkin && !hasLocation && <Text className="text-[11px] text-neutral-500 mt-2">Is dukaan ki location save nahi, is liye faasla nahi nap sakte.</Text>}
          {!!gpsError && <Text className="text-[11px] text-red-600 mt-2">{gpsError}</Text>}
        </Card>

        {/* Actions */}
        <ActionButton label="Order banayein" icon={ShoppingCart} onPress={() => router.push(`/booker/order/${customer.id}`)} />
        <View className="flex-row gap-3">
          <ActionButton label="Order nahi mila" icon={Ban} tone="white" className="flex-1" onPress={() => openSheet('noOrder')} />
          {manifest.me.canCollect && <ActionButton label="Recovery" icon={Wallet} tone="white" className="flex-1" onPress={() => openSheet('recovery')} />}
        </View>

        {/* Today */}
        {!!day && (day.orders.length > 0 || day.visits.length > 0 || day.collections.length > 0) && (
          <Card>
            <Text className="text-[11px] font-extrabold uppercase text-neutral-400 mb-2">Aaj</Text>
            <View className="gap-3">
              {day.orders.map((o) => (
                <View key={o.clientRef}>
                  <View className="flex-row items-center gap-2">
                    <ShoppingCart size={14} color={ACCENT} />
                    <Text className="flex-1 text-sm font-extrabold text-neutral-800 dark:text-neutral-100">
                      Order {o.number ?? ''} · {rs(o.serverTotal ?? o.localTotal)}
                    </Text>
                    <StatusTag status={o.status} />
                  </View>
                  {o.serverTotal != null && Math.abs(o.serverTotal - o.localTotal) > 0.01 && (
                    <Text className="text-[11px] text-amber-700 ml-6 mt-0.5">Phone par {rs(o.localTotal)} tha, office ka total {rs(o.serverTotal)}</Text>
                  )}
                  {(o.warnings ? (JSON.parse(o.warnings) as string[]) : []).map((w, i) => (
                    <Text key={i} className="text-[11px] text-amber-700 ml-6 mt-0.5">{w}</Text>
                  ))}
                  {o.status === 'CONFLICT' && <Text className="text-[11px] text-red-600 ml-6 mt-0.5">{o.reason}</Text>}
                </View>
              ))}
              {day.visits.filter((v) => v.outcome !== 'ORDER').map((v) => (
                <View key={v.clientRef} className="flex-row items-center gap-2">
                  {v.outcome === 'RECOVERY_ONLY' ? <CheckCircle2 size={14} color="#2563eb" /> : <Ban size={14} color="#737373" />}
                  <Text className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">
                    {v.outcome === 'RECOVERY_ONLY' ? 'Sirf recovery' : `No order · ${reasonLabel(v.noOrderReason)}`}
                  </Text>
                  <StatusTag status={v.status} />
                </View>
              ))}
              {day.collections.map((c) => (
                <View key={c.clientRef} className="flex-row items-center gap-2">
                  <Wallet size={14} color="#2563eb" />
                  <Text className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">Recovery {rs(c.amount)} · {c.method === 'BANK_TRANSFER' ? 'Bank' : c.method === 'CASH' ? 'Cash' : c.method}</Text>
                  <StatusTag status={c.status} />
                </View>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>

      <NoOrderSheet key={`n${sheetKey}`} visible={sheet === 'noOrder'} reasons={manifest.noOrderReasons} onClose={() => setSheet('none')} onSave={saveNoOrder} saving={saving} />
      <RecoverySheet key={`r${sheetKey}`} visible={sheet === 'recovery'} balance={manifest.me.canSeeBalance ? customer.balance : null} onClose={() => setSheet('none')} onSave={saveRecovery} saving={saving} />
    </SafeAreaView>
  );
}

function StatusTag({ status }: { status: string }) {
  if (status === 'SYNCED') return <Tag tone="green">Sync ho gaya</Tag>;
  if (status === 'CONFLICT') return <Tag tone="red">Nahi gaya</Tag>;
  return <Tag tone="amber">Sync baqi</Tag>;
}

function SmallButton({ icon: Icon, label, onPress }: { icon: typeof Phone; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="h-9 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex-row items-center gap-1.5">
      <Icon size={14} color={ACCENT} />
      <Text className="text-xs font-extrabold text-neutral-700 dark:text-neutral-200">{label}</Text>
    </Pressable>
  );
}

/** Counter pieces of the electronics shop: the serial / IMEI unit picker, the unit picker for a bundle, and the Bundles tab. */

import { useQuery } from '@tanstack/react-query';
import { Barcode, Layers } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { addComboLine, type PosComboSerial } from '@nafaa/core/pos';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, EmptyState, ListRow, Row, SearchBar, Sheet, Skeleton, Text, toast, useTheme } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { usePos, type AddOptions } from '@/modules/pos/engine/usePos';
import { create } from 'zustand';
import { useShopId } from '../../mobile/components/kit';
import { electronicsPosApi, type PosBundle, type PosSerial } from '../api';
import { daysLeft } from '@nafaa/core/industries/electronics';

interface SerialPick { productId: string; name: string; opts: AddOptions; warrantyMonths?: number }
interface BundlePick { bundle: PosBundle; needs: Array<{ productId: string; name: string; count: number }> }
interface State { serial: SerialPick | null; bundle: BundlePick | null }
export const useElectronicsPos = create<State>(() => ({ serial: null, bundle: null }));
export const setElectronicsPos = (p: Partial<State>) => useElectronicsPos.setState(p);
export const CATALOG_KEY = 'electronics-pos-catalog';

export function useElectronicsCatalog() {
  const shopId = useShopId();
  return useQuery({ queryKey: [CATALOG_KEY, shopId], queryFn: () => electronicsPosApi.catalog({ shopId: shopId ?? undefined }), enabled: !!shopId, staleTime: 20_000, retry: 1 });
}

/** Serial units already on the bill, so a picker does not offer them twice. */
export function takenSerials(): Set<string> {
  return new Set(useBill.getState().lines.flatMap((l) => [...(l.serialId ? [l.serialId] : []), ...(l.comboSerials ?? []).map((s) => s.id)]));
}

function UnitRow({ u, onPress, selected }: { u: PosSerial; onPress: () => void; selected?: boolean }) {
  const left = u.warrantyEndDate ? daysLeft(u.warrantyEndDate) : null;
  return (
    <ListRow dense selected={selected} icon={Barcode} title={<Text ltr weight="semibold">{u.serialNumber}</Text>}
      subtitle={<Row gap={1} wrap>{u.imei ? <Text size="xs" tone="muted" ltr>{u.imei}</Text> : null}{u.physicalCondition ? <Text size="xs" tone="muted">{u.physicalCondition}</Text> : null}{u.batteryHealthPct != null ? <Badge tone="neutral">{u.batteryHealthPct}%</Badge> : null}{left != null ? <Badge tone={left < 0 ? 'neutral' : 'success'}>{left < 0 ? t('Warranty khatam') : t('{{left}} din warranty', { left })}</Badge> : null}</Row>}
      onPress={onPress} />
  );
}

/** Which exact unit is being sold. */
function SerialPickerSheet() {
  const th = useTheme();
  const pick = useElectronicsPos((s) => s.serial);
  const api = usePos();
  const cat = useElectronicsCatalog();
  const [q, setQ] = useState('');
  const taken = takenSerials();
  const units = useMemo(() => {
    const item = cat.data?.items.find((i) => i.id === pick?.productId);
    const term = q.trim().toLowerCase();
    return (item?.serials ?? []).filter((u) => !taken.has(u.id) && (!term || [u.serialNumber, u.imei, u.macAddress].some((v) => (v ?? '').toLowerCase().includes(term))));
  }, [cat.data, pick?.productId, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setQ(''); setElectronicsPos({ serial: null }); };
  return (
    <Sheet open={!!pick} onClose={close} height={0.8} title={pick?.name} description={t('Unit chunein · {{count}}', { count: units.length })} scrollable={false}>
      <View style={{ flex: 1, gap: th.space(2) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Serial ya IMEI scan karein ya likhein')} />
        {cat.isLoading ? <Skeleton height={70} /> : (
          <FlatList data={units} keyExtractor={(u) => u.id} contentContainerStyle={{ gap: th.space(2), paddingBottom: th.space(6) }}
            ListEmptyComponent={<EmptyState compact title={t('Koi unit nahi mila')} />}
            renderItem={({ item: u }) => (
              <View style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
                <UnitRow u={u} onPress={() => { const p = pick!; close(); void api.addProduct(p.productId, { ...p.opts, serial: { id: u.id, serialNumber: u.serialNumber, imei: u.imei }, warrantyMonths: p.warrantyMonths }); }} />
              </View>
            )} />
        )}
      </View>
    </Sheet>
  );
}

/** Units for the serial products inside a bundle, then the bundle goes on the bill. */
function BundleUnitsSheet() {
  const th = useTheme();
  const pick = useElectronicsPos((s) => s.bundle);
  const cat = useElectronicsCatalog();
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const taken = takenSerials();
  const close = () => { setChosen({}); setElectronicsPos({ bundle: null }); };
  const ready = !!pick && pick.needs.every((n) => (chosen[n.productId]?.length ?? 0) === n.count);
  const done = () => {
    if (!pick) return;
    const serials: PosComboSerial[] = [];
    for (const n of pick.needs) {
      const item = cat.data?.items.find((i) => i.id === n.productId);
      for (const id of chosen[n.productId] ?? []) { const u = item?.serials.find((x) => x.id === id); if (u) serials.push({ productId: n.productId, id: u.id, serialNumber: u.serialNumber, imei: u.imei }); }
    }
    const b = pick.bundle;
    const r = addComboLine(useBill.getState().lines, { id: b.id, name: b.name, price: Number(b.bundlePrice), image: b.imageUrl, savings: Number(b.savings || 0), items: b.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), originalPrice: Number(i.unitPrice) || 0 })) }, 1, serials);
    useBill.getState().setLines(() => r.lines, r.lineId);
    close();
  };
  return (
    <Sheet open={!!pick} onClose={close} height={0.85} title={pick?.bundle.name} description={t('Har serial wali cheez ka unit chunein')}
      footer={<Button fullWidth size="lg" disabled={!ready} onPress={done}>{t('Bill me daalein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {pick?.needs.map((n) => {
          const item = cat.data?.items.find((i) => i.id === n.productId);
          const sel = chosen[n.productId] ?? [];
          return (
            <View key={n.productId} style={{ gap: 4 }}>
              <Text weight="semibold">{n.name} <Text size="xs" tone="muted">({sel.length}/{n.count})</Text></Text>
              {(item?.serials ?? []).filter((u) => !taken.has(u.id)).map((u) => (
                <UnitRow key={u.id} u={u} selected={sel.includes(u.id)} onPress={() => setChosen((c) => { const cur = c[n.productId] ?? []; return { ...c, [n.productId]: cur.includes(u.id) ? cur.filter((x) => x !== u.id) : cur.length < n.count ? [...cur, u.id] : cur }; })} />
              ))}
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

export function ElectronicsOverlay() {
  return <><SerialPickerSheet /><BundleUnitsSheet /></>;
}

/** The "Bundles" tab on the counter. */
export function BundlesTab({ padBottom }: { padBottom: number }) {
  const th = useTheme();
  const api = usePos();
  const cat = useElectronicsCatalog();
  const bundles = cat.data?.bundles ?? [];
  const add = async (b: PosBundle) => {
    const needs = new Map<string, { productId: string; name: string; count: number }>();
    for (const it of b.items) {
      const item = cat.data?.items.find((i) => i.id === it.productId);
      if (!(item?.requiresSerial || item?.hasImei)) continue;
      const n = needs.get(item.id) ?? { productId: item.id, name: item.name, count: 0 };
      n.count += Number(it.quantity);
      needs.set(item.id, n);
    }
    if (needs.size) { setElectronicsPos({ bundle: { bundle: b, needs: [...needs.values()] } }); return; }
    const ok = await api.addCombo({ id: b.id, name: b.name, price: Number(b.bundlePrice), image: b.imageUrl, savings: Number(b.savings || 0), items: b.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), originalPrice: Number(i.unitPrice) || 0 })) });
    if (!ok) toast.warning(t('Bundle bill me nahi gaya'));
  };
  return (
    <FlatList data={bundles} keyExtractor={(b) => b.id} contentContainerStyle={{ padding: th.space(3), paddingBottom: padBottom, gap: th.space(2) }} onRefresh={() => void cat.refetch()} refreshing={cat.isRefetching}
      ListEmptyComponent={cat.isLoading ? <Skeleton height={70} /> : <EmptyState compact icon={Layers} title={t('Abhi koi bundle nahi')} message={t('Pehle Bundles me deal banayein.')} />}
      renderItem={({ item: b }) => (
        <View style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
          <ListRow icon={Layers} iconTone="brand" title={b.name} subtitle={`${b.items.map((i) => `${i.quantity} × ${i.name ?? ''}`).join(', ')}${b.validUntil ? ` · ${t('Tak')} ${formatDate(b.validUntil)}` : ''}`}
            trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{formatMoney(b.bundlePrice)}</Text>{b.savings > 0 ? <Text size="2xs" tone="success">{t('Bachat {{n}}', { n: formatMoney(b.savings) })}</Text> : null}</View>}
            onPress={() => void add(b)} />
        </View>
      )} />
  );
}

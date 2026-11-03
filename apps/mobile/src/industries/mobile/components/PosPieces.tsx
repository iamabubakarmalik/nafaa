/**
 * Counter pieces of the mobile shop: the IMEI picker (the exact phone on the
 * bill), the used phone and repair hand-over tab, the notes in the bill panel
 * and the qist offer after a phone is sold on udhaar.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Recycle, Smartphone, Wrench, WifiOff, ClipboardCheck } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { create } from 'zustand';
import { repairDue } from '@nafaa/core/industries/mobile';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, EmptyState, ListRow, Row, SearchBar, Segmented, Sheet, Skeleton, Text, confirm, toast, useTheme } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { useLastSale } from '@/modules/pos/engine/checkout';
import { usePos, type AddOptions } from '@/modules/pos/engine/usePos';
import { mobilePosApi, repairsApi, type PosPhone, type RepairTicket, type UsedPhone } from '../api';
import { DeliverSheet } from './RepairSheets';
import { QistPlanPrompt, type QistSale } from './EmiSheets';
import { useShopId } from './kit';
import { CATALOG_KEY, REPAIR_KEY, conditionOf, metaText, ptaOf, ptaWarn, refreshMobile, repairStatusOf } from '../meta';
import { router } from 'expo-router';

interface ImeiPick { productId: string; name: string; opts: AddOptions }
interface Pos { imei: ImeiPick | null; repair: RepairTicket | null; qist: QistSale | null }
export const useMobilePos = create<Pos>(() => ({ imei: null, repair: null, qist: null }));
export const setMobilePos = (p: Partial<Pos>) => useMobilePos.setState(p);

export function useLiveCatalog() {
  const shopId = useShopId();
  return useQuery({ queryKey: [CATALOG_KEY, shopId], queryFn: () => mobilePosApi.catalog({ shopId: shopId ?? undefined }), enabled: !!shopId, staleTime: 15_000 });
}

/** Puts one exact phone on the bill, after a check when it is not PTA approved. */
export async function addPhone(productId: string, p: PosPhone, add: (id: string, opts: AddOptions) => Promise<boolean>, opts: AddOptions = {}) {
  if (ptaWarn(p.ptaStatus) && !(await confirm({ title: t('{{name}} ({{imei1}}) {{value}} hai. Customer ko bata diya?', { name: p.productName, imei1: p.imei1, value: t(ptaOf(p.ptaStatus).label) }), message: t('Bill me daalein?'), confirmLabel: t('Haan, daalein') }))) return false;
  return add(productId, {
    ...opts, imei: { id: p.id, imei1: p.imei1, imei2: p.imei2 ?? null },
    ...(p.variantId && { variant: { id: p.variantId, name: p.variant?.name ?? 'Variant', price: Number(p.salePrice) || null, stock: 1 } }),
    price: Number(p.salePrice) || undefined, warrantyMonths: p.warrantyMonths || undefined, note: t(ptaOf(p.ptaStatus).label),
  });
}

/** Puts a used phone on the bill (checked on the server when sold). */
export function addUsedPhone(u: UsedPhone) {
  const name = [`${u.brand} ${u.model}`, u.storage].filter(Boolean).join(' ');
  const price = Number(u.resalePrice) || 0;
  const bill = useBill.getState();
  if (bill.lines.some((l) => l.usedPhoneId === u.id)) { toast.warning(t('Ye phone bill me pehle se hai')); return; }
  const id = `l-used-${u.id}`;
  bill.setLines((lines) => [...lines, {
    id, type: 'product', name: `${name} (Used)`, unitName: 'pcs', unitLabel: 'pcs', emoji: '📱', unitPrice: price, basePrice: price, quantity: 1, baseQuantity: 1, conversionRate: 1, baseUnit: 'pcs', baseStock: 1,
    lineTotal: price, usedPhoneId: u.id, lockQty: true, fixedPrice: true, priceTier: 'RETAIL',
    note: `Used · ${u.usedPhoneCode} · IMEI: ${u.imei1} · ${conditionOf(u.condition).label} · ${ptaOf(u.ptaStatus).label}`,
  }], id);
}

/** The exact phone for the bill: every in-stock IMEI of the model in this branch, by variant. */
function ImeiPickerSheet() {
  const th = useTheme();
  const pick = useMobilePos((s) => s.imei);
  const api = usePos();
  const cat = useLiveCatalog();
  const [q, setQ] = useState('');
  const inCart = new Set(useBill((s) => s.lines).map((l) => l.imeiId).filter(Boolean));
  const close = () => { setQ(''); setMobilePos({ imei: null }); };
  const phones = useMemo(() => (cat.data?.phones ?? []).filter((p) => p.productId === pick?.productId), [cat.data, pick?.productId]);
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = phones.filter((p) => !term || [p.imei1, p.imei2, p.serialNumber, p.color, p.variant?.name].some((v) => (v ?? '').toLowerCase().includes(term)));
    const m = new Map<string, { label: string; price: number; rows: PosPhone[] }>();
    for (const p of list) { const g = m.get(p.variantId ?? '') ?? { label: p.variant?.name ?? t('Phone'), price: Number(p.salePrice) || 0, rows: [] }; g.rows.push(p); m.set(p.variantId ?? '', g); }
    return [...m.values()];
  }, [phones, q]);
  return (
    <Sheet open={!!pick} onClose={close} height={0.85} title={pick?.name} description={t('IMEI chunein · {{count}} phone', { count: phones.length })} scrollable={false}>
      <View style={{ flex: 1, gap: th.space(2) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('IMEI scan karein ya likhein')} />
        {cat.isLoading ? <Skeleton height={80} /> : (
          <FlatList data={groups} keyExtractor={(g) => g.label} contentContainerStyle={{ gap: th.space(3), paddingBottom: th.space(6) }}
            ListEmptyComponent={<EmptyState compact title={phones.length ? t('Is IMEI ka phone nahi mila') : t('Is branch me is model ka koi phone stock me nahi')} />}
            renderItem={({ item: g }) => (
              <View style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}><Text size="xs" weight="semibold" tone="muted">{g.label} · {g.rows.length}</Text><Text size="xs" tone="muted" ltr>{formatMoney(g.price)}</Text></Row>
                {g.rows.map((p) => {
                  const taken = inCart.has(p.id);
                  return (
                    <View key={p.id} style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: taken ? 0.5 : 1 }}>
                      <ListRow icon={Smartphone} title={<Text weight="semibold" ltr>{p.imei1}</Text>}
                        subtitle={<Row gap={1} wrap>{p.imei2 ? <Text size="xs" tone="muted" ltr>{p.imei2}</Text> : null}{p.color ? <Text size="xs" tone="muted">{p.color}</Text> : null}<Badge tone={ptaOf(p.ptaStatus).tone}>{metaText(ptaOf(p.ptaStatus))}</Badge>{p.warrantyMonths ? <Badge tone="neutral">{t('{{n}} mahine', { n: p.warrantyMonths })}</Badge> : null}</Row>}
                        trailing={taken ? <Text size="xs" tone="muted">{t('Bill me hai')}</Text> : undefined}
                        onPress={taken ? undefined : () => { close(); void addPhone(p.productId, p, api.addProduct, pick?.opts ?? {}); }} />
                    </View>
                  );
                })}
              </View>
            )} />
        )}
      </View>
    </Sheet>
  );
}

/** Hands a repaired phone back from the counter: takes what is left, closes the job and posts its bill. */
function RepairHandoverSheet() {
  const tk = useMobilePos((s) => s.repair);
  const deliver = useMutation({
    mutationFn: (v: { amount: number; method: string }) => repairsApi.deliver(tk!.id, { amount: v.amount, paymentMethod: v.method }),
    onSuccess: (r) => { toast.success(r.sale ? t('{{ticketNumber}} wapas — bill {{saleNumber}}', { ticketNumber: tk!.ticketNumber, saleNumber: r.sale.saleNumber }) : t('{{ticketNumber}} wapas de diya', { ticketNumber: tk!.ticketNumber })); refreshMobile([REPAIR_KEY, 'repair-stats'], true); setMobilePos({ repair: null }); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Wapas nahi hua'))),
  });
  return <DeliverSheet ticket={tk} pending={deliver.isPending} onClose={() => setMobilePos({ repair: null })} onConfirm={(amount, method) => { if (!deliver.isPending) deliver.mutate({ amount, method }); }} />;
}

/** Everything the counter opens by itself: pickers and the qist offer. */
export function MobileOverlay() {
  const qist = useMobilePos((s) => s.qist);
  const last = useLastSale((s) => s.sale);
  const canPlan = usePermission()(P.KHATA_MANAGE);
  const seen = useRef<number>(0);
  const cat = useLiveCatalog();
  useEffect(() => {
    if (!last || last.at === seen.current) return;
    seen.current = last.at;
    if (!canPlan || !last.customerId || !(last.credit > 0)) return;
    const phoneIds = new Set(cat.data?.phoneProductIds ?? []);
    if (!last.lines.some((l) => l.usedPhoneId || (l.productId && phoneIds.has(l.productId)))) return;
    setMobilePos({ qist: { id: last.saleId, saleNumber: last.doc.saleNumber, total: last.total, creditAmount: last.credit, customer: { id: last.customerId, name: last.customerName ?? '', phone: last.customerPhone } } });
  }, [last]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <ImeiPickerSheet />
      <RepairHandoverSheet />
      <QistPlanPrompt sale={qist} onClose={() => setMobilePos({ qist: null })} />
    </>
  );
}

/** The "Used / Repairs" tab: used phones ready to sell and repaired phones waiting to go back. */
export function UsedRepairTab({ padBottom }: { padBottom: number }) {
  const th = useTheme();
  const shopId = useShopId();
  const online = useOnlineStatus();
  const canHandOver = usePermission()(P.MOBILE_REPAIRS_MANAGE);
  const [tab, setTab] = useState<'used' | 'repair'>('used');
  const [q, setQ] = useState('');
  const cat = useLiveCatalog();
  const repairs = useQuery({ queryKey: [REPAIR_KEY, 'handover', shopId], queryFn: () => repairsApi.list({ view: 'handover', shopId: shopId ?? undefined, limit: 200 }), enabled: !!shopId && canHandOver, staleTime: 15_000 });
  const term = q.trim().toLowerCase();
  const used = (cat.data?.usedPhones ?? []).filter((u) => !term || [u.usedPhoneCode, u.brand, u.model, u.imei1, u.imei2, u.color].some((v) => (v ?? '').toLowerCase().includes(term)));
  const jobs = (repairs.data?.items ?? []).filter((r) => !term || [r.ticketNumber, r.customerName, r.customerPhone, r.deviceModel, r.imei1].some((v) => (v ?? '').toLowerCase().includes(term)));
  const need = (what: string) => { toast.warning(t('Internet nahi — {{what}} sirf online hota hai. Accessories offline bik sakti hain.', { what })); };
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: th.space(3), gap: th.space(2) }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'used', label: t('Used phone') }, ...(canHandOver ? [{ value: 'repair' as const, label: t('Repair wapsi') }] : [])]} />
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Code, model, job ya IMEI')} />
      </View>
      {tab === 'used' ? (
        <FlatList data={used} keyExtractor={(u) => u.id} contentContainerStyle={{ paddingHorizontal: th.space(3), paddingBottom: padBottom, gap: th.space(2) }} onRefresh={() => void cat.refetch()} refreshing={cat.isRefetching}
          ListEmptyComponent={<EmptyState compact icon={Recycle} title={t('Koi used phone bikne ko tayyar nahi')} message={(cat.data?.usedPhonesPendingInspection ?? 0) > 0 ? t('{{waiting}} used phone check ke intezar me — check ke baad yahan bikenge', { waiting: cat.data?.usedPhonesPendingInspection }) : undefined} />}
          renderItem={({ item: u }) => (
            <View style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <ListRow icon={Recycle} title={`${u.brand} ${u.model}${u.storage ? ` ${u.storage}` : ''}`} subtitle={`${u.usedPhoneCode} · ${metaText(conditionOf(u.condition))} · ${metaText(ptaOf(u.ptaStatus))}`}
                trailing={<Text weight="bold" ltr>{formatMoney(u.resalePrice)}</Text>} onPress={() => (online ? addUsedPhone(u) : need(t('used phone bechna')))} />
            </View>
          )} />
      ) : (
        <FlatList data={jobs} keyExtractor={(r) => r.id} contentContainerStyle={{ paddingHorizontal: th.space(3), paddingBottom: padBottom, gap: th.space(2) }} onRefresh={() => void repairs.refetch()} refreshing={repairs.isRefetching}
          ListEmptyComponent={<EmptyState compact icon={Wrench} title={t('Koi repair wapas dene ke liye tayyar nahi')} />}
          renderItem={({ item: r }) => {
            const due = repairDue({ totalCost: Number(r.totalCost) > 0 ? r.totalCost : r.estimatedCost, paidAmount: r.paidAmount });
            return (
              <View style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
                <ListRow icon={Wrench} iconTone={r.status === 'READY' ? 'success' : 'warning'} title={`${r.deviceBrand} ${r.deviceModel} — ${r.customerName}`} subtitle={`${r.ticketNumber} · ${t(repairStatusOf(r.status).label)}`}
                  trailing={<Text weight="bold" ltr>{due > 0 ? formatMoney(due) : t('Baqi nahi')}</Text>} onPress={() => (online ? setMobilePos({ repair: r }) : need(t('repair wapas dena')))} />
              </View>
            );
          }} />
      )}
    </View>
  );
}

/** Notes on the bill panel: offline limits and used phones still waiting for their check. */
export function CounterNotes() {
  const th = useTheme();
  const online = useOnlineStatus();
  const waiting = useLiveCatalog().data?.usedPhonesPendingInspection ?? 0;
  if (online && !waiting) return null;
  return (
    <View style={{ gap: th.space(1.5) }}>
      {!online && (
        <Row gap={2} style={{ padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors.warning.soft }}>
          <WifiOff size={14} color={th.colors.warning.text} />
          <Text size="xs" tone="warning" style={{ flex: 1 }}>{t('Internet nahi: accessories ka bill ban jayega aur net aate hi chala jayega. Naya phone (IMEI), used phone aur repair wapsi ke liye internet chahiye.')}</Text>
        </Row>
      )}
      {waiting > 0 && (
        <Row gap={2} style={{ padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
          <ClipboardCheck size={14} color={th.colors.textMuted} />
          <Text size="xs" tone="secondary" style={{ flex: 1 }} onPress={() => router.push('/mobile/used-phones' as never)}>{t('{{waiting}} used phone check ke intezar me — check ke baad yahan bikenge', { waiting })}</Text>
        </Row>
      )}
    </View>
  );
}


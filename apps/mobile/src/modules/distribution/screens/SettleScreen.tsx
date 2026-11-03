/**
 * Settles a load sheet when the van comes back. For each invoice: delivered,
 * partly returned (quantities per line, damaged or not) or all returned with
 * a reason, and the cash taken at the door. When the delivery man sent his
 * report from the phone, every invoice starts from it and the office only
 * checks and changes what is wrong; the cash is counted here, once. Old dues
 * collected on the trip are added as recoveries. Finish posts returns through
 * the bill, cash to the khata and closes the sheet. Returns that need the
 * refund PIN ask for it and resend.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, ChevronRight, Plus, RotateCcw, Smartphone, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { askManagerPin } from '@/core/security/ManagerPin';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Button, Card, Checkbox, EmptyState, Input, MoneyInput, Row, Screen, SectionHeader, Segmented, Select, Sheet, SkeletonRows, StatusPill, Text, toast, useTheme,
} from '@/design';
import {
  DIST_KEY, distError, distributionApi, type DeliveryOutcome, type DeliveryReportSummary, type MoneyMethod, type SettleBody, type SettleOrderRow, type SettleResult,
} from '../api/distribution.api';
import { DistributionGate } from '../components/DistributionGate';
import { FactRow, StatusChip } from '../components/parts';
import { METHOD_LABEL, METHODS, OUTCOME, partyName, partySub, RETURN_REASONS, rs, trim } from '../lib/meta';

interface LineDraft { ret: string; freeRet: string; damaged: boolean }
interface Draft { outcome: DeliveryOutcome; cash: string; method: MoneyMethod; reason: string; lines: Record<string, LineDraft> }
interface Recovery { key: string; customerId: string; amount: string; method: MoneyMethod }

const num = (v: string) => (Number.isFinite(Number(v)) && v.trim() !== '' ? Number(v) : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
const str = (n?: number | null) => (n ? String(n) : '');
const methodOptions = () => METHODS.map((m) => ({ value: m, label: t(METHOD_LABEL[m]) }));

/** A fresh draft for an invoice: the delivery man's report when there is one, else "delivered, no cash". */
function draftFor(o: SettleOrderRow): Draft {
  const r = o.report;
  const lines = Object.fromEntries(o.items.map((i) => {
    const l = r?.outcome === 'PARTIAL' ? r.lines.find((x) => x.orderItemId === i.id) : undefined;
    return [i.id, { ret: str(l?.returnBaseQty), freeRet: str(l?.returnFreeQty), damaged: !!l?.damaged }];
  }));
  if (!r) return { outcome: 'DELIVERED', cash: '', method: 'CASH', reason: '', lines };
  return { outcome: r.outcome, cash: str(r.cashCollected), method: r.method, reason: r.returnReason ?? '', lines };
}

/** True while the office's draft still says what the phone report said. */
function matchesReport(o: SettleOrderRow, d: Draft): boolean {
  const r = o.report;
  if (!r) return false;
  if (d.outcome !== r.outcome || r2(num(d.cash)) !== r2(r.cashCollected) || (num(d.cash) > 0 && d.method !== r.method)) return false;
  if (d.outcome !== 'PARTIAL') return true;
  return o.items.every((i) => {
    const l = r.lines.find((x) => x.orderItemId === i.id);
    const dl = d.lines[i.id];
    return num(dl?.ret ?? '') === (l?.returnBaseQty ?? 0) && num(dl?.freeRet ?? '') === (l?.returnFreeQty ?? 0) && !!dl?.damaged === !!l?.damaged;
  });
}

export function SettleScreen() {
  return <DistributionGate title={t('Settle now')}><Settle /></DistributionGate>;
}

function Settle() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const canVerify = usePermission()(P.DISTRIBUTION_COLLECTIONS_VERIFY);
  const q = useQuery({ queryKey: [DIST_KEY, 'settlement', id], queryFn: () => distributionApi.settlement(id), enabled: !!id });
  const p = q.data;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [handedIn, setHandedIn] = useState<number | null>(null);
  const [verifyNow, setVerifyNow] = useState(canVerify);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineFor, setLineFor] = useState<string | null>(null);

  const pending = useMemo(() => (p?.orders ?? []).filter((o) => !o.settled), [p]);
  useEffect(() => {
    if (!p) return;
    setDrafts((d) => {
      const n = { ...d };
      p.orders.filter((o) => !o.settled && !n[o.id]).forEach((o) => { n[o.id] = draftFor(o); });
      return n;
    });
  }, [p]);

  const set = (orderId: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [orderId]: { ...d[orderId], ...patch } }));
  const setLine = (orderId: string, itemId: string, patch: Partial<LineDraft>) =>
    setDrafts((d) => ({ ...d, [orderId]: { ...d[orderId], lines: { ...d[orderId].lines, [itemId]: { ...d[orderId].lines[itemId], ...patch } } } }));

  const returnsOf = (o: SettleOrderRow, d?: Draft) => {
    if (!d || d.outcome === 'DELIVERED') return 0;
    if (d.outcome === 'RETURNED') return o.total;
    return r2(o.items.reduce((a, i) => a + Math.min(num(d.lines[i.id]?.ret ?? ''), i.baseQty) * i.netPerBase, 0));
  };
  const dueOf = (o: SettleOrderRow, d?: Draft) => Math.max(0, r2(o.total - returnsOf(o, d)));

  const newCash = pending.reduce((a, o) => { const d = drafts[o.id]; return a + (d && d.method === 'CASH' && d.outcome !== 'RETURNED' ? num(d.cash) : 0); }, 0)
    + recoveries.reduce((a, r) => a + (r.method === 'CASH' ? num(r.amount) : 0), 0);
  const expected = r2((p?.money.expectedCash ?? 0) + newCash);
  const diff = handedIn == null ? null : r2(expected - handedIn);
  const customers = useMemo(() => {
    const m = new Map<string, string>();
    (p?.orders ?? []).forEach((o) => { if (o.customer) m.set(o.customer.id, partyName(o.customer)); });
    return [...m.entries()];
  }, [p]);

  const body = (pin?: string, only?: Set<string>): SettleBody => ({
    orders: pending.filter((o) => !only || only.has(o.id)).map((o) => {
      const d = drafts[o.id];
      return {
        orderId: o.id,
        outcome: d.outcome,
        ...(d.outcome === 'PARTIAL' ? {
          lines: o.items.map((i) => ({ orderItemId: i.id, returnBaseQty: num(d.lines[i.id]?.ret ?? ''), returnFreeQty: num(d.lines[i.id]?.freeRet ?? ''), damaged: d.lines[i.id]?.damaged || undefined }))
            .filter((l) => (l.returnBaseQty ?? 0) > 0 || (l.returnFreeQty ?? 0) > 0),
        } : {}),
        ...(d.outcome !== 'RETURNED' && num(d.cash) > 0 ? { cashCollected: num(d.cash), method: d.method } : {}),
        ...(d.outcome !== 'DELIVERED' && d.reason ? { returnReason: d.reason } : {}),
      };
    }),
    recoveries: only ? [] : recoveries.filter((r) => r.customerId && num(r.amount) > 0).map((r) => ({ customerId: r.customerId, amount: num(r.amount), method: r.method })),
    ...(handedIn != null ? { handedIn } : {}),
    ...(canVerify && verifyNow && !only ? { verifyRecoveries: true } : {}),
    ...(pin ? { managerPin: pin } : {}),
  });

  const settle = useMutation({
    mutationFn: async (): Promise<SettleResult> => {
      for (const o of pending) {
        const d = drafts[o.id];
        if (d.outcome === 'PARTIAL' && !o.items.some((i) => num(d.lines[i.id]?.ret ?? '') > 0 || num(d.lines[i.id]?.freeRet ?? '') > 0)) throw new Error(t('{{customer}}: wapas aane wala maal likhein', { customer: partyName(o.customer) }));
        if (num(d.cash) > dueOf(o, d) + 0.5) throw new Error(t('{{customer}}: cash invoice se zyada hai', { customer: partyName(o.customer) }));
      }
      let r = await distributionApi.settle(id, body());
      const pinFails = r.results.filter((x) => !x.ok && /PIN/i.test(x.error ?? ''));
      if (pinFails.length) {
        const pin = await askManagerPin(t('{{count}} invoice ka maal wapas — Return', { count: pinFails.length }), 'refund');
        if (pin) {
          const again = await distributionApi.settle(id, body(pin, new Set(pinFails.map((x) => x.orderId))));
          const byId = new Map(again.results.map((x) => [x.orderId, x]));
          r = { ...again, results: r.results.map((x) => byId.get(x.orderId) ?? x), recoveries: r.recoveries };
        }
      }
      return r;
    },
    onSuccess: (r) => {
      const bad = r.results.filter((x) => !x.ok);
      setErrors(Object.fromEntries(bad.map((x) => [x.orderId, x.error ?? t('Settle nahi hua')])));
      void qc.invalidateQueries({ queryKey: [DIST_KEY] });
      if (!bad.length) setRecoveries([]);
      r.recoveries.filter((x) => !x.ok).forEach((x) => toast.error(x.error ?? t('Recovery save nahi hui')));
      if (r.sheet.status === 'SETTLED') {
        toast.success(t('{{number}} settle ho gayi{{value}}', { number: r.sheet.number, value: r.sheet.shortAmount ? ` · ${r.sheet.shortAmount > 0 ? t('Kam') : t('Zyada')} ${rs(Math.abs(r.sheet.shortAmount))}` : '' }));
        router.replace(`/distribution/load-sheets/${id}` as never);
      } else if (bad.length) toast.error(t('{{count}} invoice settle nahi hui — neeche dekhein', { count: bad.length }));
      else toast.success(handedIn == null ? t('Invoices settle — ab jama hua cash likh kar Finish karein') : t('Save ho gaya'));
    },
    onError: (e) => toast.error(distError(e, t('Settle nahi hua'))),
  });

  if (!p) return <Screen title={t('Settle now')}>{q.isError ? <EmptyState title={t('Kaam nahi hua, dobara koshish karein')} action={<Button onPress={() => void q.refetch()}>{t('Retry')}</Button>} /> : <SkeletonRows count={5} />}</Screen>;
  const sheet = p.sheet;
  if (sheet.status === 'SETTLED' || sheet.status === 'CANCELLED') {
    return (
      <Screen title={t('{{number}} settle', { number: sheet.number })}>
        <EmptyState icon={CheckCircle2} title={t('Ye load sheet {{value}}.', { value: sheet.status === 'SETTLED' ? t('settle ho chuki hai') : t('cancel hai') })}
          action={<Button onPress={() => router.replace(`/distribution/load-sheets/${id}` as never)}>{t('Load sheet')}</Button>} />
      </Screen>
    );
  }

  const settledCount = p.orders.length - pending.length;
  const pendingCollections = p.collections.filter((c) => c.status === 'PENDING');
  const lineOrder = pending.find((o) => o.id === lineFor);

  return (
    <Screen title={t('{{number}} settle', { number: sheet.number })} subtitle={[sheet.deliveryUserName, sheet.driverName, sheet.vehicleNo].filter(Boolean).join(' · ') || sheet.routeName || undefined}
      onBack={() => router.back()} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}
      footer={<Button fullWidth size="xl" icon={Wallet} loading={settle.isPending} onPress={() => settle.mutate()}>{handedIn == null ? t('Invoices settle karein') : t('Finish — sheet band karein')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        <Row gap={2} justify="between">
          <Text size="sm" tone="muted">{t('Invoices')}: {settledCount}/{p.orders.length} · {rs(sheet.totalValue)}</Text>
          <Text size="sm" weight="semibold">{t('Expected cash')}: <Text size="sm" weight="semibold" ltr>{rs(expected)}</Text></Text>
        </Row>

        {p.deliveryReport && <ReportBanner r={p.deliveryReport} />}

        {p.orders.map((o, idx) => {
          const d = drafts[o.id];
          if (o.settled || !d) {
            return (
              <Card key={o.id}>
                <Row gap={2}>
                  <CheckCircle2 size={20} color={th.colors.success.text} />
                  <View style={{ flex: 1 }}>
                    <Text size="sm" weight="semibold" numberOfLines={1}>{partyName(o.customer)}</Text>
                    <Text size="xs" tone="muted">{t('{{saleNumber}} · cash {{cashCollected}}{{value}}', { saleNumber: o.saleNumber, cashCollected: rs(o.cashCollected), value: o.returnsValue ? ` · ${t('wapas −{{ret}}', { ret: rs(o.returnsValue) })}` : '' })}</Text>
                  </View>
                  {o.deliveryStatus && <StatusChip meta={OUTCOME[o.deliveryStatus]} />}
                </Row>
              </Card>
            );
          }
          const ret = returnsOf(o, d);
          const due = dueOf(o, d);
          const retOpts = [{ value: '', label: t('Wajah chunein') }, ...RETURN_REASONS.map((x) => ({ value: x, label: t(x) }))];
          return (
            <Card key={o.id} tone={errors[o.id] ? 'danger' : 'default'}>
              <View style={{ gap: th.space(3) }}>
                <Row gap={2} justify="between" align="start">
                  <View style={{ flex: 1 }}>
                    <Text size="md" weight="semibold" numberOfLines={1}>{idx + 1}. {partyName(o.customer)}</Text>
                    <Text size="xs" tone="muted" numberOfLines={1}>{o.saleNumber} · {o.orderNumber}{partySub(o.customer) ? ` · ${partySub(o.customer)}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Amount value={o.total} weight="bold" />
                    {ret > 0 && <Text size="xs" tone="danger" ltr>−{rs(ret)}</Text>}
                  </View>
                </Row>
                {errors[o.id] && <Text size="sm" tone="danger">{errors[o.id]}</Text>}
                {o.report ? (
                  <View style={{ backgroundColor: matchesReport(o, d) ? th.colors.info.soft : th.colors.warning.soft, borderRadius: th.radius('md'), padding: th.space(2.5), gap: 4 }}>
                    <Row gap={1.5}>
                      <Smartphone size={14} color={th.colors.textMuted} />
                      <Text size="xs" style={{ flex: 1 }}><Text size="xs" weight="bold">{t('Phone report:')}</Text> {t(OUTCOME[o.report.outcome].label)}
                        {o.report.cashCollected > 0 ? ` · ${t(METHOD_LABEL[o.report.method])} ${rs(o.report.cashCollected)}` : ''}{o.report.returnReason ? ` · ${o.report.returnReason}` : ''}{o.report.note ? ` · “${o.report.note}”` : ''}</Text>
                    </Row>
                    {matchesReport(o, d) ? <Text size="xs" weight="semibold">{t('Report ke mutabiq')}</Text> : (
                      <Text size="xs" weight="semibold" tone="brand" onPress={() => set(o.id, draftFor(o))}>{t('Aap ne badla — report wala lagayein')}</Text>
                    )}
                  </View>
                ) : p.deliveryReport ? <Text size="xs" tone="muted">{t('Is invoice ki phone report nahi aayi — khud bharein')}</Text> : null}

                <Segmented value={d.outcome} onChange={(k) => set(o.id, { outcome: k, ...(k === 'RETURNED' ? { cash: '' } : {}) })}
                  options={(['DELIVERED', 'PARTIAL', 'RETURNED'] as DeliveryOutcome[]).map((k) => ({ value: k, label: t(OUTCOME[k].label) }))} />

                {d.outcome !== 'RETURNED' && (
                  <View style={{ gap: th.space(2) }}>
                    <Row gap={2} align="end">
                      <MoneyInput containerStyle={{ flex: 1 }} label={t('Cash mila')} value={d.cash === '' ? null : num(d.cash)} onChangeValue={(v) => set(o.id, { cash: v == null ? '' : String(v) })} />
                      <Button variant="soft" onPress={() => set(o.id, { cash: String(due) })}>{t('Full amount')}</Button>
                    </Row>
                    <Select label={t('Tareeqa')} value={d.method} onChange={(m) => set(o.id, { method: m as MoneyMethod })} options={methodOptions()} />
                  </View>
                )}
                {d.outcome !== 'DELIVERED' && (
                  <Select label={t('Wapsi ki wajah')} value={d.reason} onChange={(v) => set(o.id, { reason: v })} placeholder={t('Wajah chunein')} options={retOpts} />
                )}
                {d.outcome === 'PARTIAL' && (
                  <Button variant="secondary" iconEnd={ChevronRight} iconEndFlip onPress={() => setLineFor(o.id)}>{t('Kya wapas aaya (pcs me)')}</Button>
                )}
                <Row justify="between">
                  <Text size="xs" tone="muted">{t('Khata me jayega')}</Text>
                  <Amount value={Math.max(0, due - (d.outcome === 'RETURNED' ? 0 : num(d.cash)))} weight="semibold" />
                </Row>
              </View>
            </Card>
          );
        })}

        <View style={{ gap: th.space(2) }}>
          <SectionHeader title={t('Recovery (purana udhaar)')} action={<Button size="sm" variant="soft" icon={Plus} onPress={() => setRecoveries((l) => [...l, { key: String(Date.now()) + l.length, customerId: '', amount: '', method: 'CASH' }])}>{t('Recovery')}</Button>} />
          <Card>
            {pendingCollections.length > 0 && <Text size="xs" tone="warning" style={{ marginBottom: 8 }}>{t('{{count}} recovery phone se aayi, verify baqi ({{rs}})', { count: pendingCollections.length, rs: rs(pendingCollections.reduce((a, c) => a + c.amount, 0)) })}</Text>}
            {!recoveries.length ? <Text size="sm" tone="muted">{t('Koi recovery nahi likhi.')}</Text> : (
              <View style={{ gap: th.space(4) }}>
                {recoveries.map((r) => (
                  <View key={r.key} style={{ gap: th.space(2) }}>
                    <Select label={t('Customer')} value={r.customerId} onChange={(v) => setRecoveries((l) => l.map((x) => (x.key === r.key ? { ...x, customerId: v } : x)))} placeholder={t('Chunein')} options={customers.map(([cid, name]) => ({ value: cid, label: name }))} searchable />
                    <Row gap={2} align="end">
                      <MoneyInput containerStyle={{ flex: 1 }} label={t('Amount')} value={r.amount === '' ? null : num(r.amount)} onChangeValue={(v) => setRecoveries((l) => l.map((x) => (x.key === r.key ? { ...x, amount: v == null ? '' : String(v) } : x)))} />
                      <View style={{ flex: 1 }}><Select label={t('Tareeqa')} value={r.method} onChange={(m) => setRecoveries((l) => l.map((x) => (x.key === r.key ? { ...x, method: m as MoneyMethod } : x)))} options={methodOptions()} /></View>
                      <Button variant="ghost" icon={Trash2} onPress={() => setRecoveries((l) => l.filter((x) => x.key !== r.key))}>{''}</Button>
                    </Row>
                  </View>
                ))}
              </View>
            )}
            {canVerify && <View style={{ marginTop: th.space(3) }}><Checkbox value={verifyNow} onChange={setVerifyNow} label={t('Abhi verify karein — seedha khata me jaye')} /></View>}
          </Card>
        </View>

        <View style={{ gap: th.space(2) }}>
          <SectionHeader title={t('Cash ka hisaab')} />
          <Card>
            {(p.money.invoiceCollected > 0 || p.money.recoveries > 0) && <FactRow label={t('Pehle se likha (phone recovery waghera)')}><Amount value={p.money.expectedCash} /></FactRow>}
            <FactRow label={t('Abhi likha cash')}><Amount value={newCash} /></FactRow>
            <FactRow label={t('Expected')}><Amount value={expected} weight="bold" /></FactRow>
            <View style={{ marginTop: th.space(2), gap: th.space(2) }}>
              <MoneyInput label={t('Delivery wale ne jama karaya')} value={handedIn} onChangeValue={setHandedIn} placeholder={String(expected)} />
              {diff != null && (
                <Text size="sm" weight="semibold" tone={diff > 0 ? 'danger' : diff < 0 ? 'success' : 'default'}>
                  {diff > 0 ? t('{{diff}} kam hai', { diff: rs(diff) }) : diff < 0 ? t('{{rs}} zyada hai', { rs: rs(-diff) }) : t('Poora — koi farq nahi')}
                </Text>
              )}
            </View>
            <Text size="xs" tone="muted" style={{ marginTop: th.space(2) }}>{t('Wapsi bill se hoti hai aur khata kam karti hai. Cash usi waqt khata me jama hota hai.')}</Text>
          </Card>
        </View>
      </View>

      <Sheet open={!!lineOrder} onClose={() => setLineFor(null)} title={t('Kya wapas aaya (pcs me)')} description={lineOrder ? partyName(lineOrder.customer) : undefined}
        footer={<Button fullWidth size="lg" onPress={() => setLineFor(null)}>{t('Done')}</Button>}>
        {lineOrder && drafts[lineOrder.id] && (
          <View style={{ gap: th.space(4) }}>
            {lineOrder.items.map((i) => {
              const l = drafts[lineOrder.id].lines[i.id] ?? { ret: '', freeRet: '', damaged: false };
              return (
                <View key={i.id} style={{ gap: th.space(2) }}>
                  <Text size="sm" weight="semibold">{i.productName}</Text>
                  <Text size="xs" tone="muted">{t('Gaya')}: {trim(i.baseQty)} {i.baseUnit}</Text>
                  <Row gap={2}>
                    <Input containerStyle={{ flex: 1 }} label={t('Wapas pcs')} keyboardType="decimal-pad" ltr value={l.ret} onChangeText={(v) => setLine(lineOrder.id, i.id, { ret: v.replace(/[^\d.]/g, '') })} />
                    {i.freeBaseQty > 0 && <Input containerStyle={{ flex: 1 }} label={t('+{{freeBaseQty}} free', { freeBaseQty: trim(i.freeBaseQty) })} keyboardType="decimal-pad" ltr value={l.freeRet} onChangeText={(v) => setLine(lineOrder.id, i.id, { freeRet: v.replace(/[^\d.]/g, '') })} />}
                  </Row>
                  <Checkbox value={l.damaged} onChange={(v) => setLine(lineOrder.id, i.id, { damaged: v })} label={t('Kharab')} />
                </View>
              );
            })}
            <Text size="xs" tone="muted">{t('Kharab maal stock me wapas nahi jata. Baqi wapsi godown ke stock me jati hai.')}</Text>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

function ReportBanner({ r }: { r: DeliveryReportSummary }) {
  const th = useTheme();
  return (
    <Card tone="info">
      <Text size="md" weight="semibold">{t('Delivery wale ki report')}</Text>
      <Text size="sm" tone="muted">{t('{{value}} ne phone se {{reported}}/{{invoices}} invoices ki report bheji', { value: r.reportedByName ?? t('Delivery wala'), reported: r.reported, invoices: r.invoices })}</Text>
      <Row gap={4} style={{ marginTop: th.space(2) }}>
        <View><Text size="xs" tone="muted">{t('Cash bataya')}</Text><Amount value={r.cash} weight="bold" /></View>
        {r.otherMoney > 0 && <View><Text size="xs" tone="muted">{t('Bank / wallet')}</Text><Amount value={r.otherMoney} /></View>}
      </Row>
      <Text size="xs" tone="muted" style={{ marginTop: th.space(2) }}>{t('Neeche har invoice isi report se bhari hai. Maal aur cash gin kar check karein, jo ghalat ho badlein, phir Finish.')}</Text>
    </Card>
  );
}

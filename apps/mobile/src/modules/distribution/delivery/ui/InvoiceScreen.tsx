/**
 * One invoice on the trip: the shop's contact, the goods on the bill, and
 * the delivery man's report: delivered, partly returned (pieces per line,
 * damaged or not) or all returned with a reason, and the money taken: cash
 * or wallet on the report, and a cheque (bank, number, date) which is queued
 * as a trip recovery. The report is saved on the phone first and synced.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Gift, Info, MapPin, Minus, Navigation, Phone, Plus, Save } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { businessDayKey } from '@/core/format';
import { t } from '@/core/i18n';
import {
  Amount, Button, Card, Chip, DatePicker, EmptyState, Input, MoneyInput, PressableScale, Row, Screen, SectionHeader, Switch, Text, TextArea, useTheme,
} from '@/design';
import { toast } from '@/design';
import { currentGps, newClientRef, openMap } from '../../booker/native/device';
import { effectiveReport, getInvoice, queueRecovery, queueReport, reportsByOrder, returnsValue, type LocalReport } from '../core/repo';
import type { DeliveryOutcome, Invoice, MoneyMethod, RecoveryPayload, ReportPayload, ReturnLine, Sheet } from '../core/types';
import { useDeliveryQuery, useDeliveryStore } from '../store';
import { DeliverySyncButton, FIELD_METHODS, OUTCOME_LABEL, OUTCOME_TONE, packText, RETURN_REASONS, ReportPill } from './parts';

interface LineDraft { back: string; freeBack: string; damaged: boolean }
interface Loaded { sheet: Sheet; invoice: Invoice; report: LocalReport | null }

const num = (v: string) => {
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) && v.trim() !== '' ? n : 0;
};
const str = (n?: number | null) => (n ? String(n) : '');
const REPORT_METHODS = FIELD_METHODS.filter((m) => m.value !== 'CHEQUE');

export function InvoiceScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { db, bump, sync } = useDeliveryStore();
  const { data } = useDeliveryQuery(async (d) => {
    const found = await getInvoice(d, orderId);
    if (!found) return null;
    const local = (await reportsByOrder(d)).get(orderId);
    return { ...found, report: effectiveReport(found.invoice, local) };
  }, [orderId]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/delivery'));

  if (data === null) return <Screen title={t('Invoice')} onBack={back}><EmptyState icon={Info} title={t('Ye invoice ab aap ki load sheet par nahi.')} /></Screen>;
  if (!data || !db) return <Screen title={t('Invoice')} onBack={back}><View /></Screen>;
  return <InvoiceForm key={`${data.invoice.orderId}:${data.report?.reportedAt ?? ''}`} data={data} onBack={back} onSaved={() => { bump(); sync({ quiet: true }); back(); }} />;
}

function InvoiceForm({ data, onBack, onSaved }: { data: Loaded; onBack: () => void; onSaved: () => void }) {
  const th = useTheme();
  const { db, me } = useDeliveryStore();
  const { sheet, invoice: inv, report } = data;
  const c = inv.customer;
  const locked = inv.settled;
  const canCollect = !!me?.canCollect;

  const [outcome, setOutcome] = useState<DeliveryOutcome | null>(report?.outcome ?? null);
  const [lines, setLines] = useState<Record<string, LineDraft>>(() => Object.fromEntries(inv.lines.map((l) => {
    const r = report?.lines.find((x) => x.orderItemId === l.orderItemId);
    return [l.orderItemId, { back: str(r?.returnBaseQty), freeBack: str(r?.returnFreeQty), damaged: !!r?.damaged }];
  })));
  const [cash, setCash] = useState<number | null>(report?.cashCollected || null);
  const [method, setMethod] = useState<MoneyMethod>(report?.method ?? 'CASH');
  const [reason, setReason] = useState(report?.returnReason ?? '');
  const [note, setNote] = useState(report?.note ?? '');
  const [cheque, setCheque] = useState(false);
  const [chequeAmount, setChequeAmount] = useState<number | null>(null);
  const [bank, setBank] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  const retLines: ReturnLine[] = useMemo(() => inv.lines
    .map((l) => ({ orderItemId: l.orderItemId, returnBaseQty: Math.min(num(lines[l.orderItemId]?.back ?? ''), l.baseQty), returnFreeQty: Math.min(num(lines[l.orderItemId]?.freeBack ?? ''), l.freeBaseQty), damaged: !!lines[l.orderItemId]?.damaged }))
    .filter((l) => (l.returnBaseQty ?? 0) > 0 || (l.returnFreeQty ?? 0) > 0), [inv.lines, lines]);
  const backValue = outcome ? returnsValue(inv, outcome, retLines) : 0;
  const due = Math.max(0, Math.round((inv.total - backValue) * 100) / 100);
  const cashValue = outcome === 'RETURNED' ? 0 : cash ?? 0;
  const chequeValue = cheque && outcome !== 'RETURNED' ? chequeAmount ?? 0 : 0;

  useEffect(() => { if (outcome === 'RETURNED') setCash(null); }, [outcome]);

  const problem = !outcome ? t('Pehle batayein maal ka kya hua')
    : outcome === 'PARTIAL' && !retLines.length ? t('Kam se kam ek cheez ki wapsi likhein')
      : cashValue > due + 0.5 ? t('Cash bill se zyada hai (lena {{due}})', { due: `Rs ${Math.round(due).toLocaleString('en-US')}` })
        : cashValue + chequeValue > due + 0.5 ? t('Cash aur cheque bill se zyada hain')
          : outcome === 'RETURNED' && !reason ? t('Wapsi ki wajah chunein')
            : cheque && outcome !== 'RETURNED' && (chequeValue <= 0 || !bank.trim() || !chequeNo.trim()) ? t('Cheque ki amount, bank aur number likhein')
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
      if (chequeValue > 0 && c) {
        const r: RecoveryPayload = {
          clientRef: newClientRef(), loadSheetId: sheet.id, customerId: c.id, amount: Math.round(chequeValue * 100) / 100, method: 'CHEQUE',
          bankName: bank.trim().slice(0, 80), chequeNo: chequeNo.trim().slice(0, 40), chequeDate: businessDayKey(chequeDate),
          note: t('Invoice {{number}}', { number: inv.saleNumber ?? inv.orderNumber }), collectedAt: new Date().toISOString(),
        };
        if (gps.ok) { r.latitude = gps.gps.latitude; r.longitude = gps.gps.longitude; }
        await queueRecovery(db, r);
      }
      toast.success(t('Report save ho gayi'), { message: t('Office settlement par check karega') });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const setLine = (id: string, patch: Partial<LineDraft>) => setLines((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
  const today = businessDayKey(new Date());
  const postDated = businessDayKey(chequeDate) > today;

  return (
    <Screen
      title={c?.businessName || c?.name || t('Invoice')}
      subtitle={`${t('Stop {{stop}}', { stop: inv.stop })} · ${inv.saleNumber ?? inv.orderNumber}`}
      onBack={onBack}
      actions={<DeliverySyncButton />}
      keyboard
      narrow
      footer={!locked ? (
        <View style={{ gap: th.space(2) }}>
          {!!problem && outcome && <Text size="xs" weight="semibold" tone="danger" align="center">{problem}</Text>}
          <Button size="xl" fullWidth style={{ flex: 1 }} icon={report ? Save : CheckCircle2} disabled={!!problem} loading={saving} onPress={save}>
            {report && report.state !== 'issue' ? t('Report badal kar save karein') : t('Report save karein')}
          </Button>
        </View>
      ) : undefined}
    >
      <Card>
        {!!c?.businessName && <Text weight="semibold">{c.name}</Text>}
        {!!(c?.address || c?.area) && (
          <Row gap={1.5} align="start">
            <MapPin size={14} color={th.colors.textMuted} />
            <Text size="sm" tone="muted" style={{ flex: 1 }}>{[c?.address, c?.area, c?.city].filter(Boolean).join(', ')}</Text>
          </Row>
        )}
        <Row gap={2} style={{ marginTop: th.space(2) }}>
          {!!c?.phone && <Button size="md" variant="soft" icon={Phone} onPress={() => Linking.openURL(`tel:${c.phone}`)}>{t('Call')}</Button>}
          {c?.latitude != null && c?.longitude != null && <Button size="md" variant="soft" icon={Navigation} onPress={() => openMap(c.latitude!, c.longitude!)}>{t('Raasta')}</Button>}
          <View style={{ flex: 1, alignItems: 'flex-end' }}><ReportPill report={report} /></View>
        </Row>
        {c?.balance != null && <Row justify="between"><Text size="sm" tone="muted">{t('Khata (pehle ka)')}</Text><Amount value={c.balance} size="sm" /></Row>}
      </Card>

      {locked && (
        <Card tone="info"><Row gap={2} align="start"><Info size={16} color={th.colors.info.text} /><Text size="sm" style={{ flex: 1 }}>{t('Office ne ye invoice settle kar di ({{outcome}}). Ab report nahi badal sakti.', { outcome: t(OUTCOME_LABEL[inv.deliveryStatus ?? 'DELIVERED']) })}</Text></Row></Card>
      )}
      {report?.state === 'issue' && !!report.issue && (
        <Card tone="danger"><Text size="sm" weight="semibold" tone="danger">{t('Pichli report server ne nahi li')}</Text><Text size="sm" tone="danger">{report.issue}</Text></Card>
      )}

      {!locked && (
        <View style={{ gap: th.space(2) }}>
          <SectionHeader title={t('Maal ka kya hua?')} />
          <Row gap={2}>
            {(['DELIVERED', 'PARTIAL', 'RETURNED'] as DeliveryOutcome[]).map((k) => {
              const on = outcome === k;
              const tone = th.colors[OUTCOME_TONE[k]];
              return (
                <PressableScale key={k} onPress={() => setOutcome(k)} haptic="select" accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={{ flex: 1, minHeight: 60, borderRadius: th.radius('lg'), borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: th.space(1.5), backgroundColor: on ? tone.solid : th.colors.surface, borderColor: on ? tone.solid : th.colors.border }}>
                  <Text weight="semibold" align="center" size="sm" color={on ? '#fff' : th.colors.text}>{t(OUTCOME_LABEL[k])}</Text>
                </PressableScale>
              );
            })}
          </Row>
        </View>
      )}

      <Card title={t('Bill ka maal')} flush>
        {inv.lines.map((l, i) => {
          const d = lines[l.orderItemId];
          const partial = outcome === 'PARTIAL' && !locked;
          return (
            <View key={l.orderItemId} style={{ padding: th.space(3.5), gap: th.space(2), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.border }}>
              <Row gap={2} align="start">
                <View style={{ flex: 1 }}>
                  <Text weight="semibold">{l.name}{l.variantName ? ` · ${l.variantName}` : ''}</Text>
                  <Text size="sm" tone="muted">{packText(l)}</Text>
                  {l.freeBaseQty > 0 && (
                    <Row gap={1}><Gift size={12} color={th.colors.accent.text} /><Text size="xs" weight="semibold" tone="info">{t('+{{qty}} {{name}} free', { qty: l.freeBaseQty, name: l.freeProductName ?? l.baseUnit })}</Text></Row>
                  )}
                </View>
                <Amount value={l.total} weight="semibold" />
              </Row>
              {partial && (
                <View style={{ gap: th.space(2) }}>
                  <Stepper label={t('Wapas ({{unit}})', { unit: l.baseUnit })} value={d.back} max={l.baseQty} onChange={(v) => setLine(l.orderItemId, { back: v })} />
                  {l.freeBaseQty > 0 && <Stepper label={t('Free wapas')} value={d.freeBack} max={l.freeBaseQty} onChange={(v) => setLine(l.orderItemId, { freeBack: v })} />}
                  {(num(d.back) > 0 || num(d.freeBack) > 0) && <Switch value={d.damaged} onChange={(v) => setLine(l.orderItemId, { damaged: v })} label={t('Kharab / toota hua (stock me nahi jayega)')} />}
                  {num(d.back) > 0 && <Amount value={-Math.min(num(d.back), l.baseQty) * l.netPerBase} size="sm" weight="semibold" tone="danger" />}
                </View>
              )}
            </View>
          );
        })}
      </Card>

      {!locked && (outcome === 'RETURNED' || outcome === 'PARTIAL') && (
        <View style={{ gap: th.space(2) }}>
          <SectionHeader title={outcome === 'PARTIAL' ? `${t('Wapsi ki wajah')} (${t('zaroori nahi')})` : t('Wapsi ki wajah')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {RETURN_REASONS.map((r) => <Chip key={r} label={t(r)} selected={reason === r} onPress={() => setReason(reason === r ? '' : r)} />)}
          </View>
        </View>
      )}

      {!locked && outcome && outcome !== 'RETURNED' && (
        <Card title={t('Paisa')}>
          <Row justify="between"><Text size="sm" tone="muted">{t('Bill')}</Text><Amount value={inv.total} size="sm" /></Row>
          {backValue > 0 && <Row justify="between"><Text size="sm" tone="muted">{t('Wapas maal')}</Text><Amount value={-backValue} size="sm" tone="danger" /></Row>}
          <Row justify="between"><Text weight="semibold">{t('Is bill ka lena')}</Text><Amount value={due} weight="bold" /></Row>
          <Row gap={2} align="end">
            <MoneyInput containerStyle={{ flex: 1 }} label={t('Kitna mila (Rs)')} value={cash} onChangeValue={setCash} />
            <Button size="lg" variant="secondary" onPress={() => setCash(due)}>{t('Poora')}</Button>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {REPORT_METHODS.map((m) => <Chip key={m.value} label={t(m.label)} selected={method === m.value} onPress={() => setMethod(m.value as MoneyMethod)} />)}
          </View>
          {cashValue > 0 && cashValue < due && !chequeValue && <Text size="xs" tone="muted">{t('Bacha hua {{rest}} customer ke khate me udhaar rahega.', { rest: `Rs ${Math.round(due - cashValue).toLocaleString('en-US')}` })}</Text>}
          {!cashValue && !chequeValue && <Text size="xs" tone="muted">{t('Paisa nahi mila to khali chhor dein — poora bill khate me jayega.')}</Text>}
        </Card>
      )}

      {!locked && outcome && outcome !== 'RETURNED' && canCollect && c && (
        <Card title={t('Cheque')}>
          <Switch value={cheque} onChange={(v) => { setCheque(v); if (v && chequeAmount == null) setChequeAmount(Math.max(0, due - cashValue) || null); }} label={t('Cheque mila')} description={t('Office cheque verify karega, phir khata se kam hoga')} />
          {cheque && (
            <View style={{ gap: th.space(3) }}>
              <MoneyInput label={t('Cheque amount')} value={chequeAmount} onChangeValue={setChequeAmount} />
              <Input label={t('Bank')} value={bank} onChangeText={setBank} maxLength={80} />
              <Input label={t('Cheque number')} value={chequeNo} onChangeText={setChequeNo} maxLength={40} ltr />
              <DatePicker label={t('Cheque ki date')} value={chequeDate} onChange={setChequeDate} hint={postDated ? t('Aage ki date: post-dated cheque') : undefined} />
            </View>
          )}
        </Card>
      )}

      {!locked && <TextArea label={t('Note')} labelHint={`(${t('zaroori nahi')})`} value={note} onChangeText={setNote} maxLength={300} />}
    </Screen>
  );
}

function Stepper({ label, value, max, onChange }: { label: string; value: string; max: number; onChange: (v: string) => void }) {
  const th = useTheme();
  const n = num(value);
  const step = (d: number) => onChange(String(Math.max(0, Math.min(max, n + d))));
  const btn = { height: 48, width: 48, borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted, alignItems: 'center' as const, justifyContent: 'center' as const };
  return (
    <Row gap={2}>
      <Text size="sm" weight="semibold" tone="secondary" style={{ flex: 1 }}>{label} <Text size="sm" tone="muted" ltr>{`/ ${max}`}</Text></Text>
      <PressableScale onPress={() => step(-1)} accessibilityLabel={t('Kam')} style={btn}><Minus size={18} color={th.colors.text} /></PressableScale>
      <View style={{ width: 72 }}><Input size="lg" value={value} onChangeText={(v) => onChange(v.replace(/[^\d.]/g, ''))} placeholder="0" keyboardType="decimal-pad" ltr /></View>
      <PressableScale onPress={() => step(1)} accessibilityLabel={t('Zyada')} style={btn}><Plus size={18} color={th.colors.text} /></PressableScale>
    </Row>
  );
}

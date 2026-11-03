/**
 * COD reconciliation: pick a courier's payment statement (CSV or Excel)
 * from Files, WhatsApp or email. Columns are found by their headers and can
 * be fixed by hand; rows are matched to orders by CN (else order number)
 * in three groups: matched (with any difference), in the statement but not
 * in Nafaa, and delivered in Nafaa but missing from the statement. "Paisa
 * mil gaya" settles the ticked rows and keeps the courier's charges as each
 * order's actual costs. Mirrors the web CodReconcilePage.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, HelpCircle, Hourglass, Upload } from 'lucide-react-native';
import {
  COURIER_CODES, COURIER_NAMES, STATEMENT_FIELDS, sheetTable, type ColumnMap, type ReconcileResult, type StatementField,
} from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, Checkbox, EmptyState, Input, PressableScale, Screen, Select, Switch, Tabs, Text, toast, useTheme,
} from '@/design';
import { apiErrorMessage, moneyApi } from '../api/online';
import { CourierLogo } from '../components/BrandLogo';
import { KpiStrip, Note } from '../components/bits';
import { STATEMENT_FIELD_LABEL } from '../lib/labels';
import { refreshOrders, useOnlineGuard } from '../lib/online';

type Tab = 'matched' | 'unknown' | 'missing';
type Sheet = { name: string; headers: string[]; rows: string[][] };
const STATEMENT_COURIERS = COURIER_CODES.filter((c) => c !== 'RIDER' && c !== 'OTHER');

async function readFile(uri: string): Promise<{ headers: string[]; rows: string[][] }> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const wb = XLSX.read(b64, { type: 'base64' });
  const all = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false }) as unknown[][];
  const table = sheetTable(all);
  if (!table) throw new Error(t('File me column wali row nahi mili'));
  return table;
}

export function CodReconcileScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const { guard } = useOnlineGuard();
  const [file, setFile] = useState<Sheet | null>(null);
  const [courier, setCourier] = useState('');
  const [mapping, setMapping] = useState<ColumnMap | undefined>();
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [tab, setTab] = useState<Tab>('matched');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reference, setReference] = useState('');
  const [withCharges, setWithCharges] = useState(true);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const match = useMutation({
    mutationFn: (v: { file: Sheet; courier: string; mapping?: ColumnMap }) =>
      moneyApi.reconcile({ headers: v.file.headers, rows: v.file.rows, mapping: v.mapping, courier: v.courier || undefined }),
    onSuccess: (r) => {
      setResult(r);
      setMapping(r.mapping);
      if (r.courier && !courier) setCourier(r.courier.code);
      setPicked(new Set((r.matched ?? []).filter((m) => (m.ok || m.returned) && !(m.settled && !m.charge)).map((m) => m.orderId)));
      setTab((r.matched?.length ?? 0) > 0 ? 'matched' : (r.missing?.length ?? 0) > 0 ? 'missing' : 'unknown');
      if (r.needs.length) setColumnsOpen(true);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Statement nahi mili'))),
  });
  const settle = useMutation({
    mutationFn: () => moneyApi.settleStatement({
      reference: reference.trim() || undefined,
      withCharges,
      items: (result?.matched ?? []).filter((m) => picked.has(m.orderId)).map((m) => ({
        orderId: m.orderId, received: m.received, charge: result?.hasCharges ? m.charge : null, codFee: result?.hasCodFee ? m.codFee : null,
      })),
    }),
    onSuccess: (r) => {
      haptic('success');
      toast.success(t('{{settled}} order ka paisa mil gaya{{value}}', { settled: r.settled, value: r.charged ? t(' · {{charged}} par courier charges likhe', { charged: r.charged }) : '' }));
      refreshOrders(qc);
      if (file) match.mutate({ file, courier, mapping });
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const parsed = await readFile(a.uri);
      if (!parsed.rows.length) throw new Error(t('File me koi row nahi'));
      const next = { name: a.name, ...parsed };
      setFile(next); setMapping(undefined); setResult(null);
      match.mutate({ file: next, courier });
    } catch (e) {
      toast.error((e as Error).message || t('File nahi parhi gayi'));
    }
  };

  const matched = result?.matched ?? [];
  const pickedRows = matched.filter((m) => picked.has(m.orderId));
  const toSettle = pickedRows.filter((m) => !m.settled && !m.returned).length;
  const diffs = matched.filter((m) => !m.ok);
  const tot = result?.totals;
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Screen title={t('Statement milayein')} keyboard>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
          <View style={{ width: 44, height: 44, borderRadius: th.radius('lg'), backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
            <FileSpreadsheet size={22} color={th.colors.brand.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text size="sm" weight="bold" numberOfLines={1}>{file ? file.name : t('Courier ki statement (CSV ya Excel)')}</Text>
            <Text size="xs" tone="muted">{file ? t('{{count}} rows', { count: file.rows.length }) : t('TCS, Leopards, PostEx, Trax, M&P… — Files, WhatsApp ya email se chunein')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(3) }}>
          <Button icon={Upload} style={{ flex: 1 }} loading={match.isPending} onPress={guard(pickFile)}>{file ? t('Doosri file') : t('File chunein')}</Button>
          {file && <Button variant="secondary" onPress={() => setColumnsOpen((v) => !v)}>{t('Columns')}</Button>}
        </View>
        <View style={{ marginTop: th.space(3) }}>
          <Select label={t('Courier')} value={courier} placeholder={t('Khud pehchane')} title={t('Courier')}
            onChange={(v) => { setCourier(v); if (file) match.mutate({ file, courier: v, mapping }); }}
            options={STATEMENT_COURIERS.map((c) => ({ value: c, label: COURIER_NAMES[c] }))} />
        </View>
      </Card>

      {file && result && columnsOpen && (
        <Card title={t('Columns')} description={result.needs.length ? t('Kuch zaroori columns nahi mile — file ke column chunein.') : t('Nafaa ne khud pehchane. Ghalat ho to badal dein.')}>
          <View style={{ gap: th.space(2) }}>
            {STATEMENT_FIELDS.map((f: StatementField) => (
              <Select key={f} label={t(STATEMENT_FIELD_LABEL[f])} value={mapping?.[f] != null ? String(mapping[f]) : ''} placeholder={t('— nahi —')} title={t(STATEMENT_FIELD_LABEL[f])}
                error={result.needs.includes(f) ? t('Zaroori') : undefined}
                onChange={(v) => setMapping((m) => ({ ...(m ?? {}), [f]: v === '' ? undefined : Number(v) }))}
                options={[{ value: '', label: t('— nahi —') }, ...file.headers.map((h, i) => ({ value: String(i), label: h || `#${i + 1}` }))]} />
            ))}
            <Button onPress={() => match.mutate({ file, courier, mapping })} loading={match.isPending}>{t('Dobara milayein')}</Button>
          </View>
        </Card>
      )}

      {!file && <EmptyState icon={FileSpreadsheet} title={t('Statement chunein')} message={t('Nafaa har CN milata hai, farq dikhata hai aur courier charges order ki cost me likhta hai.')} />}

      {result && tot && (
        <>
          <KpiStrip items={[
            { key: 's', label: t('Statement me'), icon: FileSpreadsheet, value: <Amount value={tot.statement} size="lg" weight="bold" />, hint: t('Charges {{value}}', { value: formatMoney(tot.charges) }) },
            { key: 'm', label: t('Mil gaye'), icon: CheckCircle2, tone: 'success', value: <Amount value={tot.matchedReceived} size="lg" weight="bold" />, hint: t('{{count}} order', { count: matched.length }), onPress: () => setTab('matched') },
            { key: 'd', label: t('Farq'), icon: AlertTriangle, tone: 'warning', value: String(diffs.length), hint: t('Amount barabar nahi'), onPress: () => setTab('matched') },
            { key: 'u', label: t('Nafaa me nahi'), icon: HelpCircle, tone: 'neutral', value: <Amount value={tot.unknownValue} size="lg" weight="bold" />, hint: t('{{count}} rows', { count: result.unknown?.length ?? 0 }), onPress: () => setTab('unknown') },
            { key: 'x', label: t('Statement me nahi'), icon: Hourglass, tone: 'danger', value: <Amount value={tot.missingValue} size="lg" weight="bold" />, hint: t('{{count}} order courier ke paas', { count: result.missing?.length ?? 0 }), onPress: () => setTab('missing') },
          ]} />
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'matched', label: t('Mil gaye'), count: matched.length },
            { value: 'unknown', label: t('Nafaa me nahi'), count: result.unknown?.length ?? 0 },
            { value: 'missing', label: t('Statement me nahi'), count: result.missing?.length ?? 0 },
          ]} />

          {tab === 'matched' && (!matched.length ? <EmptyState compact title={t('Koi order nahi mila')} /> : (
            <Card flush>
              {canManage && (
                <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(2) }}>
                  <Checkbox value={matched.every((m) => picked.has(m.orderId))} onChange={(v) => setPicked(v ? new Set(matched.map((m) => m.orderId)) : new Set())} label={t('Sab chunein')} />
                </View>
              )}
              {matched.map((m) => (
                <PressableScale key={m.orderId} onPress={() => (canManage ? toggle(m.orderId) : router.push(`/online/orders/${m.orderId}` as never))} onLongPress={() => router.push(`/online/orders/${m.orderId}` as never)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
                  {canManage && <Checkbox value={picked.has(m.orderId)} onChange={() => toggle(m.orderId)} />}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text size="sm" weight="semibold" numberOfLines={1}>#{m.number} <Text size="sm" tone="secondary">· {m.customerName}{m.city ? ` · ${m.city}` : ''}</Text></Text>
                    <Text size="xs" tone="muted" ltr numberOfLines={1}>{m.cn ?? ''}{m.charge ? ` · ${t('charge')} ${formatMoney(m.charge)}` : ''}{m.codFee ? ` · COD fee ${formatMoney(m.codFee)}` : ''}</Text>
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                      {m.settled && <Badge tone="success">{t('Pehle se mila')}</Badge>}
                      {m.returned && <Badge tone="danger">{t('Wapas (RTO)')}</Badge>}
                      {!m.ok && <Badge tone="warning">{t('Farq {{value}}', { value: formatMoney(m.diff) })}</Badge>}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Amount value={m.received} weight="bold" size="sm" />
                    {!m.ok && <Text size="2xs" tone="muted" ltr>{t('Hona tha {{value}}', { value: formatMoney(m.expected) })}</Text>}
                  </View>
                </PressableScale>
              ))}
            </Card>
          ))}
          {tab === 'unknown' && (!(result.unknown?.length) ? <EmptyState compact title={t('Sab rows Nafaa me mil gayin')} /> : (
            <Card flush>
              {result.unknown!.map((u, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                  <View style={{ flex: 1 }}>
                    <Text size="sm" weight="semibold" ltr>{u.cn ?? u.orderRef ?? `#${u.line}`}</Text>
                    <Text size="xs" tone="muted">{[t('Line {{line}}', { line: u.line }), u.status].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Amount value={u.amount} size="sm" weight="semibold" />
                </View>
              ))}
            </Card>
          ))}
          {tab === 'missing' && (!(result.missing?.length) ? <EmptyState compact title={t('Har deliver order statement me hai')} /> : (
            <Card flush>
              {result.missing!.map((x, i) => (
                <PressableScale key={x.orderId} onPress={() => router.push(`/online/orders/${x.orderId}` as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight="semibold" numberOfLines={1}>#{x.number} <Text size="sm" tone="secondary">· {x.customerName}{x.city ? ` · ${x.city}` : ''}</Text></Text>
                    <Text size="xs" tone="muted" ltr>{[x.cn, x.deliveredAt ? formatDate(x.deliveredAt) : null, x.days != null ? t('{{d}} din', { d: x.days }) : null].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Amount value={x.expected} size="sm" weight="semibold" />
                </PressableScale>
              ))}
            </Card>
          ))}

          {canManage && matched.length > 0 && (
            <Card tone="brand" title={t('{{count}} chune · {{value}}', { count: picked.size, value: formatMoney(pickedRows.reduce((a, m) => a + m.received, 0)) })}>
              <View style={{ gap: th.space(3) }}>
                <Input label={t('Settlement / cheque ref (zaroori nahi)')} value={reference} onChangeText={setReference} ltr />
                {(result.hasCharges || result.hasCodFee) && (
                  <Switch value={withCharges} onChange={setWithCharges} label={t('Courier charges orders ki cost me likhein')} description={t('Statement ke charge aur COD fee har order ke asli profit me lagenge.')} />
                )}
                {toSettle < pickedRows.length && <Note tone="info">{t('Jo pehle se mil chuke ya wapas aaye, un par sirf charges likhe jayenge.')}</Note>}
                <Button size="lg" variant="success" icon={CheckCircle2} disabled={!picked.size} loading={settle.isPending} onPress={guard(() => settle.mutate())}>{t('Paisa mil gaya')}</Button>
              </View>
            </Card>
          )}
          {result.courier && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
              <CourierLogo code={result.courier.code} size={18} />
              <Text size="xs" tone="muted">{t('{{name}} ki statement', { name: result.courier.name })}</Text>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

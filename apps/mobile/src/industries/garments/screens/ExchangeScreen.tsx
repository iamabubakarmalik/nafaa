/**
 * Exchange at the counter (web ExchangePage; the shoe pack uses the same
 * screen): find the earlier bill, choose the pieces coming back, add the new
 * size or colour, and only the difference changes hands. Past the shop's
 * exchange days the owner's PIN is asked (as on the web). Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Minus, Plus, ReceiptText, Search, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { exchangeDiff, r2 } from '@nafaa/core/industries/garments';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useApiQuery, useSalesHistory } from '@/core/offline';
import { PinCancelled } from '@/core/security/ManagerPin';
import { Amount, Badge, Button, Card, ChipGroup, EmptyState, FormSection, FormTemplate, IconButton, Input, ListGroup, ListRow, Row, Screen, SearchBar, Switch, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { ProductPicker, type PickedProduct } from '@/modules/inventory/components/ProductPicker';
import { CameraScan } from '@/modules/pos/components/CameraScan';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { exchangeApi, type ExchangeResult } from '../api';
import { HOLD_KEY, opt, refreshGarments } from '../meta';

interface NewLine { key: string; productId: string; variantId?: string; name: string; price: number; quantity: number }

function FindBill({ onPick }: { onPick: (id: string) => void }) {
  const th = useTheme();
  const { online } = useDeskOnline('garmentsDesk');
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const query = useDebouncedValue(q.trim(), 200);
  const local = useSalesHistory({ query: query || undefined, limit: 30 });
  const remote = useApiQuery<Array<{ id: string; saleNumber: string; soldAt: string; total: number; customer?: { name: string } | null }>>('/returns/find-bill', { q: query }, { enabled: online && query.length >= 2 });
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ id: string; saleNumber: string; soldAt: string; total: number; customer: string | null; pending?: boolean; status?: string }> = [];
    for (const s of local.data ?? []) { seen.add(s.id); out.push({ id: s.id, saleNumber: s.saleNumber, soldAt: s.soldAt, total: s.total, customer: s.customerName, pending: s.pending, status: s.status }); }
    for (const s of remote.data ?? []) if (!seen.has(s.id)) out.push({ id: s.id, saleNumber: s.saleNumber, soldAt: s.soldAt, total: Number(s.total), customer: s.customer?.name ?? null });
    return out.filter((s) => s.status !== 'VOIDED');
  }, [local.data, remote.data]);
  return (
    <Screen title={t('Exchange')} padding={0}>
      <View style={{ paddingHorizontal: th.space(4), gap: th.space(3) }}>
        <OfflineNote feature="garmentsDesk" />
        <Text size="sm" tone="muted">{t('Purane bill ka maal wapas, naya maal usi waqt — sirf farq lein ya dein')}</Text>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Bill number or customer')} onScan={() => setScan(true)} />
      </View>
      <View style={{ padding: th.space(4) }}>
        {rows.length === 0 ? <EmptyState compact icon={Search} title={q ? t('No bill found') : t('Recent bills show here')} /> : (
          <ListGroup>
            {rows.map((s) => (
              <ListRow key={s.id} icon={ReceiptText} title={s.saleNumber} subtitle={[s.customer ?? t('Walk-in customer'), formatDateTime(s.soldAt)].join(' · ')}
                trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={s.total} weight="bold" />{s.pending && <Badge tone="warning" size="sm">{t('Not synced')}</Badge>}</View>}
                disabled={s.pending} chevron onPress={() => onPick(s.id)} />
            ))}
          </ListGroup>
        )}
      </View>
      {scan && <CameraScan onCode={(code) => { setScan(false); setQ(code); }} onClose={() => setScan(false)} title={t('Scan the bill barcode')} />}
    </Screen>
  );
}

function ExchangeForm({ saleId, onBack }: { saleId: string; onBack: () => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('garmentsDesk');
  const [back, setBack] = useState<Record<string, { qty: number; damaged: boolean }>>({});
  const [lines, setLines] = useState<NewLine[]>([]);
  const [picking, setPicking] = useState(false);
  const [method, setMethod] = useState('CASH');
  const [reason, setReason] = useState('');
  const [done, setDone] = useState<ExchangeResult | null>(null);
  const q = useQuery({ queryKey: ['garments-exchange', saleId], queryFn: () => exchangeApi.preview(saleId) });
  const p = q.data;
  const returning = Object.entries(back).filter(([, v]) => v.qty > 0);
  const { credit, diff } = exchangeDiff((p?.lines ?? []).map((l) => ({ qty: back[l.saleItemId]?.qty ?? 0, unitRefund: l.unitRefund })), r2(lines.reduce((s, l) => s + l.price * l.quantity, 0)));

  const save = useMutation({
    mutationFn: () => exchangeApi.create({
      saleId, returnItems: returning.map(([saleItemId, v]) => ({ saleItemId, quantity: v.qty, restock: !v.damaged })),
      items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })), paymentMethod: method, reason: opt(reason),
    }),
    onSuccess: (r) => { setDone(r); toast.success(t('Exchange ho gaya — naya bill {{saleNumber}}', { saleNumber: r.sale.saleNumber })); refreshGarments([HOLD_KEY, 'garments-exchange', 'returns'], true); },
    onError: (e) => { if (!(e instanceof PinCancelled)) toast.error(apiErrorMessage(e, t('Exchange nahi hua'))); },
  });
  const problem = !returning.length ? t('Wapas aane wala maal chunein') : !lines.length ? t('Naya maal jorein') : null;

  const addLine = (pk: PickedProduct) => {
    const key = `${pk.product.id}:${pk.variantId ?? ''}`;
    const price = Number(pk.product.price ?? 0);
    setLines((prev) => (prev.some((l) => l.key === key) ? prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l))
      : [...prev, { key, productId: pk.product.id, variantId: pk.variantId ?? undefined, name: `${pk.product.name}${pk.variantName ? ` · ${pk.variantName}` : ''}`, price, quantity: 1 }]));
    setPicking(false);
  };

  if (done) {
    return (
      <Screen title={t('Exchange')}>
        <Card title={t('Exchange ho gaya')}>
          <View style={{ gap: th.space(2) }}>
            <Row style={{ justifyContent: 'space-between' }}><Text size="sm" tone="secondary">{t('Wapas aaye maal ki value')}</Text><Amount value={done.refundAmount} /></Row>
            <Row style={{ justifyContent: 'space-between' }}><Text size="sm" tone="secondary">{t('Naye bill me laga credit')}</Text><Amount value={Math.min(done.credit, done.sale.total)} /></Row>
            <Row style={{ justifyContent: 'space-between' }}><Text size="sm" tone="secondary">{t('Naya bill')}</Text><Text size="sm" weight="bold">{done.sale.saleNumber} · {formatMoney(done.sale.total)}</Text></Row>
            {done.sale.creditAmount > 0 && <Row style={{ justifyContent: 'space-between' }}><Text size="sm" weight="bold">{t('Khate me (udhaar)')}</Text><Amount value={done.sale.creditAmount} tone="danger" /></Row>}
          </View>
        </Card>
        <View style={{ gap: th.space(2), marginTop: th.space(3) }}>
          <Button onPress={() => router.replace(`/sales/${done.sale.id}` as never)}>{t('Bill dekhein')}</Button>
          <Button variant="soft" onPress={onBack}>{t('Naya exchange')}</Button>
        </View>
      </Screen>
    );
  }

  return (
    <FormTemplate title={p ? t('Exchange · {{n}}', { n: p.sale.saleNumber }) : t('Exchange')} saving={save.isPending} saveDisabled={!!problem || q.isLoading}
      saveLabel={problem ?? t('Exchange karein')} onSave={() => guard(() => save.mutate())}
      actions={<IconButton icon={Search} label={t('Doosra bill')} onPress={onBack} />}>
      {p?.late && <Text size="sm" tone="warning">{t('Exchange ki muddat ({{days}} din) guzar chuki — owner ya manager ka PIN lagega.', { days: p.exchangeDays })}</Text>}
      <FormSection title={t('Wapas aane wala maal')}>
        {(p?.lines ?? []).filter((l) => l.returnable > 0).map((l) => {
          const cur = back[l.saleItemId] ?? { qty: 0, damaged: false };
          const set = (qty: number) => setBack({ ...back, [l.saleItemId]: { ...cur, qty: Math.max(0, Math.min(l.returnable, qty)) } });
          return (
            <View key={l.saleItemId} style={{ gap: th.space(2) }}>
              <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}><Text weight="semibold">{l.name}{l.variantName ? ` · ${l.variantName}` : ''}</Text><Text size="xs" tone="muted">{t('{{n}} wapas ho sakte hain · {{rate}} har ek', { n: l.returnable, rate: formatMoney(l.unitRefund) })}</Text></View>
                <Row gap={2} style={{ alignItems: 'center' }}>
                  <IconButton icon={Minus} label={t('Kam')} onPress={() => set(cur.qty - 1)} />
                  <Text weight="bold" ltr>{cur.qty}</Text>
                  <IconButton icon={Plus} label={t('Zyada')} onPress={() => set(cur.qty + 1)} />
                </Row>
              </Row>
              {cur.qty > 0 && <Switch value={cur.damaged} onChange={(v) => setBack({ ...back, [l.saleItemId]: { ...cur, damaged: v } })} label={t('Kharab hai — stock me wapas na dalein')} />}
            </View>
          );
        })}
      </FormSection>
      <FormSection title={t('Naya maal')}>
        {lines.map((l) => (
          <Row key={l.key} gap={2} style={{ alignItems: 'center' }}>
            <View style={{ flex: 1 }}><Text weight="semibold">{l.name}</Text><Text size="xs" tone="muted">{formatMoney(l.price)}</Text></View>
            <IconButton icon={Minus} label={t('Kam')} onPress={() => setLines(lines.map((x) => (x.key === l.key ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))} />
            <Text weight="bold" ltr>{l.quantity}</Text>
            <IconButton icon={Plus} label={t('Zyada')} onPress={() => setLines(lines.map((x) => (x.key === l.key ? { ...x, quantity: x.quantity + 1 } : x)))} />
            <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => setLines(lines.filter((x) => x.key !== l.key))} />
          </Row>
        ))}
        <Button variant="soft" icon={Plus} onPress={() => setPicking(true)}>{t('Naya maal jorein')}</Button>
      </FormSection>
      <FormSection title={t('Hisaab')}>
        <Row style={{ justifyContent: 'space-between' }}><Text size="sm" tone="secondary">{t('Wapsi credit')}</Text><Amount value={credit} /></Row>
        <Row style={{ justifyContent: 'space-between' }}><Text size="sm" tone="secondary">{t('Naya maal')}</Text><Amount value={r2(lines.reduce((s, l) => s + l.price * l.quantity, 0))} /></Row>
        {returning.length > 0 && lines.length > 0 && (
          <Row style={{ justifyContent: 'space-between' }}>
            <Text weight="bold">{diff > 0 ? t('Customer dega') : diff < 0 ? t('Customer ko wapas (cash)') : t('Barabar')}</Text>
            <Amount value={Math.abs(diff)} weight="bold" tone={diff > 0 ? 'danger' : 'success'} />
          </Row>
        )}
        {diff > 0 && (
          <ChipGroup wrap value={method} onChange={setMethod} options={[['CASH', t('Cash')], ['JAZZCASH', t('JazzCash')], ['EASYPAISA', t('EasyPaisa')], ['BANK_TRANSFER', t('Bank')], ['CARD', t('Card')]].map(([value, label]) => ({ value, label }))} />
        )}
        <Input label={t('Wajah')} value={reason} onChangeText={setReason} placeholder={t('Size chhota tha…')} />
      </FormSection>
      <ProductPicker open={picking} onClose={() => setPicking(false)} title={t('Naya maal jorein')} includeRaw={false} onPick={addLine} />
    </FormTemplate>
  );
}

export function ExchangeScreen() {
  const [saleId, setSaleId] = useState<string | null>(null);
  return saleId ? <ExchangeForm key={saleId} saleId={saleId} onBack={() => setSaleId(null)} /> : <FindBill onPick={setSaleId} />;
}

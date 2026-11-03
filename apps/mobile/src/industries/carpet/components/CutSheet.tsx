/**
 * Roll cut and piece picker for one carpet product, used by the counter
 * (web CutModal). Roll tab: pick a roll, write the width the customer takes
 * (full width by default) and the length; sqft, rate in the product's unit,
 * total and the strip left beside the cut are worked out live. Piece tab:
 * remnants and returned pieces of this product, sold whole.
 *
 * Rolls and pieces come from the server, or from the last saved list when
 * there is no internet (the bill is then cut from stock once it syncs).
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, Layers, MapPin, Scissors } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { create } from 'zustand';
import { rollCut as workOut } from '@nafaa/core/industries/carpet';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { Amount, Button, Card, EmptyState, ListRow, PressableScale, Row, Segmented, Sheet, Skeleton, Switch, Text, useTheme } from '@/design';
import { MoneyInput } from '@/design';
import { OfflineNote } from '../../_shared/deskKit';
import { carpetCutPiecesApi, carpetRollsApi, type CarpetCutPiece, type CarpetRoll } from '../api';
import { PIECES_KEY, ROLLS_KEY, ftIn, pieceNote, qtyInUnit, r2, realFt, rollCutNote, splitFt, unitLabel } from '../meta';
import { SizeInput } from './SizeInput';

export interface RollCut {
  roll: CarpetRoll; widthFt: number; widthInch: number; lengthFt: number; lengthInch: number;
  /** Customer's area. */
  sqft: number;
  /** Quantity in the product's unit, and the rate for one unit. */
  qty: number; rate: number; keepLeftover: boolean; note: string;
}
export interface PieceSale { piece: CarpetCutPiece; qty: number; rate: number; note: string }

export interface CutAsk {
  product: { id: string; name: string; unit: string; price?: number };
  variantId?: string | null;
  preSelectedRollId?: string;
  onRoll: (cut: RollCut) => void;
  onPiece: (sale: PieceSale) => void;
}

interface CutState { ask: CutAsk | null }
export const useCutAsk = create<CutState>(() => ({ ask: null }));
export const askCut = (ask: CutAsk) => useCutAsk.setState({ ask });
const close = () => useCutAsk.setState({ ask: null });

function useRollsAndPieces(productId: string, variantId: string | null | undefined, enabled: boolean) {
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const rolls = useQuery({
    queryKey: [ROLLS_KEY, 'cut', productId, variantId ?? '', shopId ?? ''],
    queryFn: async () => (await carpetRollsApi.list({ productId, variantId: variantId ?? undefined, inStockOnly: true, shopId, limit: 200 })).items.filter((r) => r.status === 'ACTIVE' || r.status === 'RESERVED'),
    enabled, staleTime: 15_000,
  });
  const pieces = useQuery({
    queryKey: [PIECES_KEY, 'cut', productId, variantId ?? '', shopId ?? ''],
    queryFn: async () => (await carpetCutPiecesApi.list({ productId, variantId: variantId ?? undefined, status: 'AVAILABLE', shopId, limit: 200 })).items,
    enabled, staleTime: 15_000,
  });
  return { rolls, pieces };
}

/** Rendered by the shared counter through PosIndustryConfig.Overlay. */
export function CarpetOverlay() {
  const ask = useCutAsk((s) => s.ask);
  return ask ? <CutSheet key={ask.product.id} ask={ask} /> : null;
}

function CutSheet({ ask }: { ask: CutAsk }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const { product } = ask;
  const { rolls, pieces } = useRollsAndPieces(product.id, ask.variantId, true);
  const rollList = useMemo(() => rolls.data ?? [], [rolls.data]);
  const pieceList = pieces.data ?? [];
  const [tab, setTab] = useState<'roll' | 'piece'>('roll');
  const [rollId, setRollId] = useState<string | undefined>(ask.preSelectedRollId);
  const roll = rollList.find((r) => r.id === rollId) ?? (rollList.length === 1 ? rollList[0] : undefined);

  // Once rolls load with nothing chosen, an empty roll tab moves to pieces.
  useEffect(() => {
    if (rolls.isSuccess && pieces.isSuccess && rollList.length === 0 && pieceList.length > 0) setTab('piece');
  }, [rolls.isSuccess, pieces.isSuccess, rollList.length, pieceList.length]);

  return (
    <Sheet open onClose={close} title={product.name} height={0.9} description={t('Roll se kaatein ya tukra chunein · bill {{unit}} me banega', { unit: unitLabel(product.unit) })}>
      <View style={{ gap: th.space(3) }}>
        {!online && <OfflineNote feature="carpetDesk" />}
        <Segmented value={tab} onChange={setTab} options={[{ value: 'roll', label: `${t('Roll se kaatein')} · ${rollList.length}`, icon: Layers }, { value: 'piece', label: `${t('Tukre')} · ${pieceList.length}`, icon: Scissors }]} />
        {tab === 'roll' ? (
          rolls.isLoading ? <Skeleton height={160} />
            : rollList.length === 0 ? <EmptyState icon={Layers} title={t('Is product ka koi chalu roll nahi.')} message={t('Carpet Rolls se roll daalein ya purchase karein.')} />
              : (
                <View style={{ gap: th.space(3) }}>
                  <View style={{ gap: th.space(2) }}>
                    {rollList.map((r) => {
                      const on = roll?.id === r.id;
                      return (
                        <PressableScale key={r.id} onPress={() => setRollId(r.id)} haptic="select"
                          style={{ padding: th.space(3), borderRadius: th.radius('lg'), borderWidth: on ? 1.5 : 1, borderColor: on ? th.colors.brand.solid : th.colors.border, backgroundColor: on ? th.colors.brand.soft : th.colors.surface, gap: 2 }}>
                          <Row justify="between">
                            <Text weight="semibold" ltr>{r.rollNumber}</Text>
                            {on ? <Check size={16} color={th.colors.brand.solid} /> : r.status === 'RESERVED' ? <Text size="2xs" weight="semibold" tone="brand">{t('Reserved')}</Text> : null}
                          </Row>
                          {r.variant?.name ? <Row gap={1.5}>{r.variant.colorHex ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: r.variant.colorHex }} /> : null}<Text size="xs" tone="secondary">{r.variant.name}</Text></Row> : null}
                          <Text size="sm" ltr>{t('{{widthFt}} chaurai · {{remainingLengthFt}} bacha', { widthFt: ftIn(r.widthFt, r.widthInch), remainingLengthFt: ftIn(r.remainingLengthFt, r.remainingLengthInch) })}</Text>
                          <Text size="xs" tone="muted" ltr>{t('{{remainingSqft}} sqft · {{salePricePerSqft}}/sqft{{value}}', { remainingSqft: r2(r.remainingSqft), salePricePerSqft: formatMoney(r.salePricePerSqft), value: r.rackNumber ? ` · ${r.rackNumber}` : '' })}</Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                  {roll ? <RollCutForm key={roll.id} roll={roll} product={product} onDone={(c) => { close(); ask.onRoll(c); }} /> : <Text size="sm" tone="muted" align="center">{t('Roll chunein')}</Text>}
                </View>
              )
        ) : (
          pieces.isLoading ? <Skeleton height={160} />
            : pieceList.length === 0 ? <EmptyState icon={Scissors} title={t('Is product ka koi tukra nahi.')} message={t('Roll kaatne par bacha tukra yahan khud aata hai.')} />
              : (
                <Card flush>
                  {pieceList.map((p, i) => {
                    const w = realFt(p.widthFt, p.widthInch ?? 0);
                    const l = realFt(p.lengthFt, p.lengthInch ?? 0);
                    const qty = qtyInUnit(product.unit, w, l);
                    const price = Number(p.salePrice) || r2(Number(p.pricePerSqft ?? 0) * Number(p.totalSqft));
                    const ok = price > 0 && qty > 0;
                    return (
                      <ListRow key={p.id} divider={i < pieceList.length - 1} disabled={!ok}
                        title={<Text weight="semibold" ltr>{p.pieceCode}</Text>}
                        subtitle={[t('{{widthFt}} × {{lengthFt}} · {{totalSqft}} sqft', { widthFt: ftIn(p.widthFt, p.widthInch ?? 0), lengthFt: ftIn(p.lengthFt, p.lengthInch ?? 0), totalSqft: r2(p.totalSqft) }), p.condition, p.rackNumber && `Rack ${p.rackNumber}`, p.sourceRoll?.rollNumber && `Roll ${p.sourceRoll.rollNumber}`].filter(Boolean).join(' · ')}
                        trailing={ok ? <Amount value={price} weight="bold" /> : <Text size="xs" tone="danger">{t('Rate nahi')}</Text>}
                        onPress={ok ? () => { close(); ask.onPiece({ piece: p, qty, rate: r2(price / qty), note: pieceNote(p.pieceCode, p.widthFt, p.widthInch ?? 0, p.lengthFt, p.lengthInch ?? 0) }); } : undefined} />
                    );
                  })}
                </Card>
              )
        )}
      </View>
    </Sheet>
  );
}

function RollCutForm({ roll, product, onDone }: { roll: CarpetRoll; product: CutAsk['product']; onDone: (c: RollCut) => void }) {
  const th = useTheme();
  const fullW = realFt(roll.widthFt, roll.widthInch);
  const leftLen = realFt(roll.remainingLengthFt, roll.remainingLengthInch);
  const fw = splitFt(fullW);
  const [wFt, setWFt] = useState<number | null>(fw.ft);
  const [wIn, setWIn] = useState<number | null>(fw.inch || null);
  const [lFt, setLFt] = useState<number | null>(null);
  const [lIn, setLIn] = useState<number | null>(null);
  const [keep, setKeep] = useState(true);
  const [rateText, setRateText] = useState<number | null>(null);

  const width = realFt(wFt ?? 0, wIn ?? 0);
  const length = realFt(lFt ?? 0, lIn ?? 0);
  const w = workOut({ rollWidth: fullW, rollLeft: leftLen, width, length, perSqft: Number(roll.salePricePerSqft) || 0, unit: product.unit, rateText, productPrice: product.price });
  const error = (wIn ?? 0) >= 12 || (lIn ?? 0) >= 12 ? t('Inch 12 se kam likhein')
    : w.error === 'width' ? t('Chaurai likhein')
      : w.error === 'widthTooBig' ? t('Chaurai roll se zyada hai (roll {{widthFt}})', { widthFt: ftIn(roll.widthFt, roll.widthInch) })
        : w.error === 'length' ? t('Lambai likhein')
          : w.error === 'lengthTooBig' ? t('Roll me sirf {{remainingLengthFt}} bacha hai', { remainingLengthFt: ftIn(roll.remainingLengthFt, roll.remainingLengthInch) })
            : w.error === 'rate' ? t('Rate likhein') : null;

  const submit = () => {
    if (error) return;
    const a = splitFt(width);
    const b = splitFt(length);
    onDone({ roll, widthFt: a.ft, widthInch: a.inch, lengthFt: b.ft, lengthInch: b.inch, sqft: w.area, qty: w.qty, rate: w.rate, keepLeftover: keep, note: rollCutNote(roll.rollNumber, a.ft, a.inch, b.ft, b.inch, w.strip > 0.1 ? keep : true) });
  };
  const strip = splitFt(w.strip);
  const len = splitFt(length);
  return (
    <View style={{ gap: th.space(3), padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surfaceMuted, borderWidth: 1, borderColor: th.colors.border }}>
      <Text size="sm" weight="semibold" ltr>{roll.rollNumber} · {ftIn(roll.widthFt, roll.widthInch)} × {ftIn(roll.remainingLengthFt, roll.remainingLengthInch)}</Text>
      <SizeInput label={t('Chaurai (customer kitni chaurai le raha hai)')} ft={wFt} inch={wIn} onChange={(f, i) => { setWFt(f); setWIn(i); }} />
      <Button size="sm" variant="link" onPress={() => { setWFt(fw.ft); setWIn(fw.inch || null); }}>{t('Poori chaurai ({{widthFt}})', { widthFt: ftIn(roll.widthFt, roll.widthInch) })}</Button>
      <SizeInput label={t('Lambai')} ft={lFt} inch={lIn} onChange={(f, i) => { setLFt(f); setLIn(i); }} />
      <MoneyInput label={t('Rate / {{unit}}', { unit: unitLabel(product.unit) })} value={rateText} onChangeValue={setRateText} placeholder={String(w.rate)}
        hint={t('Khaali chhorein to roll ka rate ({{formatPKR}}/sqft) lagega.', { formatPKR: formatMoney(Number(roll.salePricePerSqft)) })} />
      {w.strip > 0.1 && length > 0 && (
        <Switch value={keep} onChange={setKeep} label={t('Bacha tukra {{width}} × {{length}} ({{sqft}} sqft) piece ban kar stock me rahega. Waste hai to tick hata dein.', { width: ftIn(strip.ft, strip.inch), length: ftIn(len.ft, len.inch), sqft: String(w.leftoverSqft) })} />
      )}
      <View style={{ gap: 2 }}>
        <Row justify="between"><Text size="sm" tone="secondary">{t('Customer ka area')}</Text><Text size="sm" ltr>{t('{{area}} sqft', { area: w.area })}</Text></Row>
        {product.unit !== 'sqft' && <Row justify="between"><Text size="sm" tone="secondary">{t('Bill me')}</Text><Text size="sm" ltr>{w.qty} {unitLabel(product.unit)}</Text></Row>}
        <Row justify="between"><Text weight="bold">{t('Total')}</Text><Amount value={w.total} weight="bold" size="lg" /></Row>
      </View>
      {error && length > 0 ? <Row gap={1.5}><AlertTriangle size={16} color={th.colors.danger.text} /><Text size="sm" weight="medium" tone="danger" style={{ flex: 1 }}>{error}</Text></Row> : null}
      {roll.rackNumber ? <Row gap={1}><MapPin size={14} color={th.colors.textMuted} /><Text size="xs" tone="muted">{t('Rack {{rackNumber}}', { rackNumber: roll.rackNumber })}</Text></Row> : null}
      <Button size="lg" fullWidth disabled={!!error} onPress={submit}>{t('Bill me dalein')}</Button>
    </View>
  );
}


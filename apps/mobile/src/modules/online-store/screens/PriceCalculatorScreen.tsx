/**
 * Price calculator for online selling: the product cost and the wanted
 * profit, courier (from the shop's rate card), packaging, delivery charge,
 * ads per order, tax and each channel's fees and RTO give a suggested price,
 * break-even and profit per channel, with where every rupee goes. Any price
 * can be checked. The inputs can become the shop's defaults. Mirrors the web
 * PriceCalculator (modules/growth/price-calculator).
 */

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, Package, Save, Settings2 } from 'lucide-react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Button, Card, Chip, EmptyState, ErrorState, Input, PressableScale, Screen, Segmented, Select, Sheet, SkeletonRows, Switch, Text, toast,
  useDebouncedValue, useTheme,
} from '@/design';
import {
  CHANNEL_KINDS, priceCalcApi, type CalcContext, type ChannelFees, type ChannelKind, type ChannelResult, type QuoteBody, type TargetMode,
} from '../api/growth';
import { apiErrorMessage } from '../api/online';
import { BrandLogo, type BrandName } from '../components/BrandLogo';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { ProductPicker } from '../components/ProductPicker';
import { BREAKDOWN_LABEL, KIND_LABEL } from '../lib/labels';

const KIND_BRAND: Record<ChannelKind, BrandName> = { DARAZ: 'daraz', SHOPIFY: 'shopify', WOOCOMMERCE: 'woocommerce', WEBSITE: 'website' };
const str = (n: number | null | undefined) => (n == null ? '' : String(Math.round(n * 100) / 100));
const num = (s: string): number | null => (s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s));

interface State {
  cost: string; courierCode: string; city: string; weightKg: string; courierCharge: string; codPct: string; returnPct: string; packaging: string;
  deliveryCharge: string; adsPerOrder: string; taxPct: string; targetMode: TargetMode; targetValue: string; endWith9: boolean;
  kinds: ChannelKind[]; fees: Record<ChannelKind, ChannelFees>; rto: Record<ChannelKind, string>; checkPrice: string;
}

function initial(ctx: CalcContext): State {
  const d = ctx.settings.price;
  const startRto = (k: ChannelKind) => d.rtoPct ?? ctx.rto[k]?.pct ?? ctx.rto.ALL?.pct ?? 10;
  return {
    cost: str(ctx.product?.cost ?? null), courierCode: d.courier.code ?? ctx.courierCode ?? '', city: d.courier.city, weightKg: str(ctx.product?.weightKg ?? d.courier.weightKg),
    courierCharge: '', codPct: '', returnPct: '', packaging: str(d.packaging ?? ctx.packaging ?? 0), deliveryCharge: str(d.deliveryCharge),
    adsPerOrder: str(d.adsPerOrder ?? ctx.ads.value ?? 0), taxPct: str(d.taxPct ?? ctx.tax.pricePct), targetMode: d.target.mode, targetValue: str(d.target.value),
    endWith9: d.endWith9, kinds: ctx.kinds.length ? ctx.kinds : ['WEBSITE', 'DARAZ'], fees: { ...d.channels },
    rto: Object.fromEntries(CHANNEL_KINDS.map((k) => [k, str(startRto(k))])) as Record<ChannelKind, string>, checkPrice: '',
  };
}

const quoteBody = (s: State): QuoteBody => ({
  cost: num(s.cost) ?? 0,
  courier: { code: s.courierCode || null, city: s.city || null, weightKg: num(s.weightKg), charge: num(s.courierCharge), codPct: num(s.codPct), returnPct: num(s.returnPct) },
  packaging: num(s.packaging), deliveryCharge: num(s.deliveryCharge), adsPerOrder: num(s.adsPerOrder), taxPct: num(s.taxPct),
  target: { mode: s.targetMode, value: num(s.targetValue) ?? 0 }, endWith9: s.endWith9,
  channels: s.kinds.map((kind) => ({ kind, fees: s.fees[kind], rtoPct: num(s.rto[kind]) })), checkPrice: num(s.checkPrice),
});

export function PriceCalculatorScreen() {
  const th = useTheme();
  const can = usePermission();
  const canDefaults = can(PERMISSIONS.SETTINGS_EDIT);
  const [productId, setProductId] = useState<string | undefined>();
  const [productName, setProductName] = useState('');
  const [picking, setPicking] = useState(false);
  const [feesFor, setFeesFor] = useState<ChannelKind | null>(null);
  const ctxQ = useQuery({ queryKey: ['price-calculator', 'context', productId], queryFn: () => priceCalcApi.context(productId) });
  const [state, setState] = useState<State | null>(null);
  useEffect(() => { if (ctxQ.data) setState(initial(ctxQ.data)); }, [ctxQ.data]);
  const set = (p: Partial<State>) => setState((s) => (s ? { ...s, ...p } : s));
  const body = useMemo(() => (state ? quoteBody(state) : null), [state]);
  const debounced = useDebouncedValue(body, 350);
  const quoteQ = useQuery({ queryKey: ['price-calculator', 'quote', debounced], queryFn: () => priceCalcApi.quote(debounced!), enabled: !!debounced && (debounced.cost ?? 0) > 0, placeholderData: (p) => p });
  const save = useMutation({
    mutationFn: () => {
      const b = quoteBody(state!);
      return priceCalcApi.saveDefaults({
        channels: state!.fees, packaging: b.packaging ?? null, adsPerOrder: b.adsPerOrder ?? null, deliveryCharge: b.deliveryCharge ?? 0, taxPct: b.taxPct ?? null,
        target: b.target!, endWith9: state!.endWith9,
        courier: { code: state!.courierCode || null, city: state!.city, weightKg: num(state!.weightKg) ?? 0.5, charge: 0, codPct: 0, codFixed: 0, returnPct: 100 },
      });
    },
    onSuccess: () => toast.success(t('Ye inputs dukaan ke default ban gaye')),
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });

  const ctx = ctxQ.data;
  const courier = quoteQ.data?.courier;
  const field = (label: string, key: keyof State, opts: { hint?: string; placeholder?: string; suffix?: string } = {}) => (
    <Input key={String(key)} containerStyle={{ width: '48%' }} label={label} hint={opts.hint} value={String(state?.[key] ?? '')} placeholder={opts.placeholder}
      keyboardType="decimal-pad" ltr trailing={opts.suffix ? <Text size="xs" tone="muted">{opts.suffix}</Text> : undefined} onChangeText={(v) => set({ [key]: v } as Partial<State>)} />
  );

  return (
    <Screen title={t('Price calculator')} actions={<OnlineMenuButton current="/online/price-calculator" />} keyboard>
      {ctxQ.isError ? <ErrorState error={ctxQ.error} onRetry={ctxQ.refetch} /> : !ctx || !state ? <SkeletonRows count={8} /> : (
        <>
          <Card title={t('Product aur target')}>
            <View style={{ gap: th.space(3) }}>
              <Button variant="secondary" icon={Package} onPress={() => setPicking(true)}>{productName || t('Product chunein (optional)')}</Button>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), justifyContent: 'space-between' }}>
                {field(t('Product cost (ek piece)'), 'cost', { hint: ctx.product ? t('Product ki Cost: {{cost}}', { cost: formatMoney(ctx.product.cost) }) : t('Maal kitne ka para'), suffix: 'Rs' })}
                {field(state.targetMode === 'MARGIN' ? t('Margin (Price ka %)') : t('Profit har piece par'), 'targetValue', { suffix: state.targetMode === 'MARGIN' ? '%' : 'Rs' })}
              </View>
              <Segmented value={state.targetMode} onChange={(v: TargetMode) => set({ targetMode: v })} options={[{ value: 'MARGIN', label: t('Margin %') }, { value: 'RUPEES', label: t('Rupees') }]} />
              <Switch value={state.endWith9} onChange={(v) => set({ endWith9: v })} label={t('9 par khatam')} description="1234 → 1239" />
            </View>
          </Card>

          <Results results={quoteQ.data?.results ?? []} loading={quoteQ.isFetching && !quoteQ.data} hasCost={(num(state.cost) ?? 0) > 0}
            checkPrice={state.checkPrice} onCheckPrice={(v) => set({ checkPrice: v })} delivery={num(state.deliveryCharge) ?? 0} />

          <Card title={t('Courier aur packing')}>
            <View style={{ gap: th.space(3) }}>
              <Select label={t('Courier')} value={state.courierCode} title={t('Courier')} onChange={(v) => set({ courierCode: v, courierCharge: '' })}
                options={[{ value: '', label: t('Rate card ke baghair') }, ...ctx.couriers.map((c) => ({ value: c.code, label: `${c.name}${c.rateCard ? t(' · rate card') : ''}` }))]} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), justifyContent: 'space-between' }}>
                <Input containerStyle={{ width: '48%' }} label={t('Shehar')} value={state.city} placeholder={t('Sab')} onChangeText={(v) => set({ city: v })} />
                {field(t('Wazan'), 'weightKg', { suffix: 'kg' })}
                {field(t('Courier charge'), 'courierCharge', { placeholder: courier ? String(courier.charge) : '', hint: state.courierCharge ? t('Aap ne khud likha') : courier?.source === 'RATE_CARD' ? t('Rate card se') : undefined, suffix: 'Rs' })}
                {field(t('COD fee'), 'codPct', { placeholder: courier ? String(courier.codPct) : '', suffix: '%' })}
                {field(t('Packaging (har order)'), 'packaging', { suffix: 'Rs' })}
                {field(t('Wapsi ka courier'), 'returnPct', { placeholder: courier ? String(courier.returnPct) : '100', hint: t('Jane wale charge ka kitna %'), suffix: '%' })}
                {field(t('Customer se delivery charge'), 'deliveryCharge', { hint: t('Free delivery ho to 0'), suffix: 'Rs' })}
              </View>
            </View>
          </Card>

          <Card title={t('Ads, wapsi aur tax')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), justifyContent: 'space-between' }}>
              {field(t('Ads har order par'), 'adsPerOrder', { hint: ctx.ads.value !== null ? t('Pichle 30 din: {{rs}} ({{orders}} orders)', { rs: formatMoney(ctx.ads.value), orders: ctx.ads.orders }) : t('Ads ka kharcha likhne par khud aayega'), suffix: 'Rs' })}
              {field(t('{{label}} Price me shamil', { label: ctx.tax.label }), 'taxPct', { hint: ctx.tax.enabled ? (ctx.tax.inclusive ? t('Dukaan ki setting: {{rate}}%', { rate: ctx.tax.rate }) : t('Tax upar se lagta hai — 0 rakhein')) : t('Tax nahi lagta to 0'), suffix: '%' })}
            </View>
          </Card>

          <Card title={t('Channels')} description={t('Andaza — apne contract ke mutabiq badlein')}>
            <View style={{ gap: th.space(2) }}>
              {CHANNEL_KINDS.map((k) => {
                const on = state.kinds.includes(k);
                const f = state.fees[k];
                return (
                  <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                    <PressableScale onPress={() => set({ kinds: on ? state.kinds.filter((x) => x !== k) : CHANNEL_KINDS.filter((x) => x === k || state.kinds.includes(x)) })} haptic="select"
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: th.space(2), opacity: on ? 1 : 0.5 }}>
                      <BrandLogo name={KIND_BRAND[k]} size={28} />
                      <View style={{ flex: 1 }}>
                        <Text size="sm" weight="semibold">{t(KIND_LABEL[k])}</Text>
                        <Text size="2xs" tone="muted" numberOfLines={1}>{[f.commissionPct ? t('Commission {{commissionPct}}%', { commissionPct: f.commissionPct }) : null, f.ownCourier ? t('Apna courier · COD {{codShare}}%', { codShare: f.codShare }) : t('Shipping Rs {{shippingFee}}', { shippingFee: f.shippingFee }), `RTO ${state.rto[k] || 0}%`].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </PressableScale>
                    <Chip label={on ? t('On') : t('Off')} selected={on} onPress={() => set({ kinds: on ? state.kinds.filter((x) => x !== k) : CHANNEL_KINDS.filter((x) => x === k || state.kinds.includes(x)) })} />
                    <Button size="sm" variant="secondary" icon={Settings2} onPress={() => setFeesFor(k)} accessibilityLabel={t('Fees')} />
                  </View>
                );
              })}
            </View>
          </Card>
          {canDefaults && <Button variant="ghost" icon={Save} loading={save.isPending} onPress={() => save.mutate()}>{t('Ye sab default bana dein')}</Button>}

          <Sheet open={picking} onClose={() => setPicking(false)} height={0.85} title={t('Product chunein')}>
            <ProductPicker onPick={(p) => { setProductId(p.productId); setProductName(p.label); setPicking(false); }} />
          </Sheet>
          {feesFor && <FeesSheet kind={feesFor} ctx={ctx} fees={state.fees[feesFor]} rto={state.rto[feesFor]} onClose={() => setFeesFor(null)}
            onSave={(fees, rto) => { set({ fees: { ...state.fees, [feesFor]: fees }, rto: { ...state.rto, [feesFor]: rto } }); setFeesFor(null); }} />}
        </>
      )}
    </Screen>
  );
}

function Results({ results, loading, hasCost, checkPrice, onCheckPrice, delivery }: {
  results: ChannelResult[]; loading: boolean; hasCost: boolean; checkPrice: string; onCheckPrice: (v: string) => void; delivery: number;
}) {
  const th = useTheme();
  if (!hasCost) return <EmptyState compact icon={Package} title={t('Product ki Cost likhein')} message={t('Har channel ki Price, break-even aur Profit yahan aayega.')} />;
  return (
    <View style={{ gap: th.space(3) }}>
      <Input label={t('Apni Price check karein')} hint={t('har channel par is Price ka Profit dikhega')} value={checkPrice} onChangeText={(v) => onCheckPrice(v.replace(/[^\d.]/g, ''))} placeholder={t('Maslan 1999')} keyboardType="decimal-pad" ltr />
      {loading && <ActivityIndicator />}
      {results.map((r) => <ResultCard key={r.kind} r={r} delivery={delivery} />)}
    </View>
  );
}

function ResultCard({ r, delivery }: { r: ChannelResult; delivery: number }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  const total = r.breakdown.reduce((a, b) => a + Math.max(0, b.value), 0) || 1;
  const COLORS: Record<string, string> = { cost: '#64748b', tax: '#a855f7', packaging: '#94a3b8', shipping: '#0ea5e9', codFee: '#06b6d4', commission: '#f97316', paymentFee: '#f59e0b', fixedFee: '#eab308', ads: '#ec4899', rto: '#ef4444', profit: '#16a34a' };
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
        <BrandLogo name={KIND_BRAND[r.kind]} size={28} />
        <View style={{ flex: 1 }}>
          <Text size="sm" weight="bold">{t(KIND_LABEL[r.kind])}</Text>
          <Text size="2xs" tone="muted">{t('RTO {{rtoPct}}% ke hisaab se', { rtoPct: r.rtoPct })}</Text>
        </View>
      </View>
      {r.problem ? (
        <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(2), backgroundColor: th.colors.danger.soft, borderRadius: th.radius('md'), padding: th.space(2.5) }}>
          <AlertTriangle size={16} color={th.colors.danger.text} />
          <Text size="xs" color={th.colors.danger.text} style={{ flex: 1 }}>{r.problem === 'FEES_TOO_HIGH' ? t('Fees itni zyada hain ke kisi Price par Profit nahi bachta. Fees check karein.') : t('Itna Margin is channel ki fees ke saath mumkin nahi — kam karein.')}</Text>
        </View>
      ) : (
        <View style={{ marginTop: th.space(2), gap: 2 }}>
          <Text size="xs" tone="muted">{t('Suggested Price')}</Text>
          <Text size="2xl" weight="heavy" ltr>{formatMoney(r.price ?? 0)}</Text>
          <Text size="xs" tone="secondary">{t('Profit')} <Text size="xs" weight="bold" tone={(r.profit ?? 0) >= 0 ? 'success' : 'danger'} ltr>{formatMoney(r.profit ?? 0)}</Text> · {t('Margin')} <Text size="xs" weight="bold" ltr>{r.margin ?? 0}%</Text> · {t('Break-even')} <Text size="xs" weight="bold" ltr>{formatMoney(r.breakEven ?? 0)}</Text></Text>
        </View>
      )}
      {r.check && (
        <Text size="xs" style={{ marginTop: th.space(2) }} tone={r.check.profit >= 0 ? 'success' : 'danger'}>
          {t('{{price}} par: Profit', { price: formatMoney(r.check.price) })} <Text size="xs" weight="bold" ltr>{formatMoney(r.check.profit)}</Text> ({r.check.margin ?? 0}%)
        </Text>
      )}
      {r.breakdown.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: th.space(3) }}>
            {r.breakdown.filter((b) => b.value > 0).map((b) => <View key={b.key} style={{ flex: b.value / total, backgroundColor: COLORS[b.key] }} />)}
          </View>
          <PressableScale onPress={() => setOpen((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: th.space(2) }}>
            <Text size="xs" weight="semibold" tone="brand">{t('Har rupee kahan gaya')}</Text>
            <ChevronDown size={14} color={th.colors.brand.text} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
          </PressableScale>
          {open && (
            <View style={{ gap: 4, marginTop: th.space(2) }}>
              <View style={{ flexDirection: 'row' }}><Text size="xs" style={{ flex: 1 }}>{t('Customer ne diya (Price + delivery)')}</Text><Text size="xs" weight="semibold" ltr>{formatMoney((r.price ?? 0) + delivery)}</Text></View>
              {r.breakdown.map((b) => (
                <View key={b.key} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS[b.key] }} />
                  <Text size="xs" tone="secondary" style={{ flex: 1 }}>{t(BREAKDOWN_LABEL[b.key])}</Text>
                  <Text size="xs" ltr>{formatMoney(b.value)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Card>
  );
}

function FeesSheet({ kind, ctx, fees, rto, onClose, onSave }: { kind: ChannelKind; ctx: CalcContext; fees: ChannelFees; rto: string; onClose: () => void; onSave: (f: ChannelFees, rto: string) => void }) {
  const th = useTheme();
  const [f, setF] = useState(fees);
  const [r, setR] = useState(rto);
  const hist = ctx.rto[kind];
  const s = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <Sheet open onClose={onClose} title={t('{{value}} ki fees', { value: t(KIND_LABEL[kind]) })}
      footer={<View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <Button variant="ghost" onPress={() => setF(ctx.presets[kind])}>{t('Shuru wale numbers')}</Button>
        <Button style={{ flex: 1 }} onPress={() => onSave(f, r)}>{t('Theek hai')}</Button>
      </View>}>
      <View style={{ gap: th.space(3) }}>
        {f.categories.length > 0 && (
          <Select label={t('Category (commission is se)')} value={f.category ?? ''} title={t('Category')}
            onChange={(v) => { const c = f.categories.find((x) => x.key === v); setF({ ...f, category: v || null, commissionPct: c ? c.pct : f.commissionPct }); }}
            options={f.categories.map((c) => ({ value: c.key, label: `${c.label} · ${c.pct}%` }))} />
        )}
        <Input label={t('Commission')} hint={t('Item ki Price par')} value={String(f.commissionPct)} keyboardType="decimal-pad" ltr onChangeText={(v) => setF({ ...f, commissionPct: s(v) })} />
        <Input label={t('Payment / gateway fee')} hint={f.ownCourier ? t('Sirf online paid orders par') : t('Har order par')} value={String(f.paymentFeePct)} keyboardType="decimal-pad" ltr onChangeText={(v) => setF({ ...f, paymentFeePct: s(v) })} />
        <Input label={t('Fixed fee (har order)')} value={String(f.fixedFee)} keyboardType="decimal-pad" ltr onChangeText={(v) => setF({ ...f, fixedFee: s(v) })} />
        <Input label={t('RTO (wapas aane wale orders)')} hint={hist?.pct != null ? t('Aap ka record: {{pct}}% ({{parcels}} parcel)', { pct: hist.pct, parcels: hist.parcels }) : t('Record kam hai — andaza likhein')} value={r} keyboardType="decimal-pad" ltr onChangeText={setR} />
        <Switch value={f.ownCourier} onChange={(v) => setF({ ...f, ownCourier: v })} label={t('Courier main khud book karta hoon')}
          description={f.ownCourier ? t('Courier charge aur COD fee upar wale inputs se') : t('Channel khud bhejta hai aur shipping fee leta hai')} />
        {f.ownCourier
          ? <Input label={t('COD orders')} hint={t('Baqi online paid')} value={String(f.codShare)} keyboardType="decimal-pad" ltr onChangeText={(v) => setF({ ...f, codShare: Math.min(100, s(v)) })} />
          : <Input label={t('Shipping fee (aap ka hissa)')} value={String(f.shippingFee)} keyboardType="decimal-pad" ltr onChangeText={(v) => setF({ ...f, shippingFee: s(v) })} />}
      </View>
    </Sheet>
  );
}


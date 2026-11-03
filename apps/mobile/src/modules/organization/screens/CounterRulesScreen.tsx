/**
 * Settings → Counter rules: the payment the checkout starts with, a customer
 * on every bill, hand Discount and its ceiling, which actions need the
 * owner's PIN, industry rules (dine-in service charge, exchange days), the
 * counter layout and price tiers. Changes save as they are made; the POS
 * follows them and the server checks them again on every bill.
 */

import { router } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { msg, t } from '@/core/i18n';
import { formatMoney } from '@/core/format';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import {
  Chip, ChipGroup, Input, SettingLink, SettingSwitch, SettingsGroup, SettingsTemplate, Select, Text, toast, useTheme,
} from '@/design';
import { settingsApi, type CounterRulePatch, type CounterRules } from '../api/organization';
import { POS_COUNTER_DEFAULTS, POS_LAYOUTS, PRICE_TIERS, PRICE_TIER_LABEL, normalizePosCounter, type PosCounterConfig, type PriceTier } from '../lib/posCounter';

const KEY = ['settings', 'counter'];
const QUICK_LIMITS = [5, 10, 15, 20, 25];
const QUICK_PCT = [2, 5, 10, 15, 20, 25];
const PAYMENTS = [
  { value: 'CASH', label: msg('Cash') }, { value: 'CARD', label: msg('Card') }, { value: 'JAZZCASH', label: msg('JazzCash') },
  { value: 'EASYPAISA', label: msg('EasyPaisa') }, { value: 'BANK_TRANSFER', label: msg('Bank') }, { value: 'RAAST', label: msg('Raast') },
];

const TOGGLES: Array<{ key: keyof PosCounterConfig; label: string; desc: string }> = [
  { key: 'showImages', label: msg('Products ki tasveerein'), desc: msg('Band karein to cards aur bill me sirf naam — tez aur saaf') },
  { key: 'showCategories', label: msg('Categories ki patti'), desc: msg('Search ke neeche category chips') },
  { key: 'showQuickKeys', label: msg('Quick keys'), desc: msg('Quick keys ka tab aur patti') },
  { key: 'recentItems', label: msg('Aksar bikne wali cheezein'), desc: msg('Is counter par sab se zyada bikne wali 9 cheezein (Alt 1–9)') },
  { key: 'showStock', label: msg('Tiles par stock'), desc: msg('Har card par kitna baqi hai') },
  { key: 'showReceiver', label: msg('Lene wala (maal kis ne liya)'), desc: msg('Customer chunne par chhota "+ Lene wala" button') },
  { key: 'showDelivery', label: msg('Delivery'), desc: msg('Bill par Delivery ka button') },
  { key: 'showDiscount', label: msg('Discount ka button'), desc: msg('Band ho to counter par Discount nahi dikhta (F4 bhi band)') },
  { key: 'lineNotes', label: msg('Har line ka note'), desc: msg('Cashier kisi cheez par note likh sake (N key)') },
  { key: 'priceEdit', label: msg('Cashier rate badal sake'), desc: msg('Band ho to sirf "Had se zyada Discount" wale staff rate badal sakte hain') },
  { key: 'changeDue', label: msg('Wapas dene wali raqam'), desc: msg('Sale ke baad khaali bill me pichhle bill ka change dikhe') },
  { key: 'sounds', label: msg('Awaaz'), desc: msg('Cheez add hone par beep, ghalti par alag awaaz') },
  { key: 'autoPrint', label: msg('Bill khud print ho'), desc: msg('Naye counters ke liye; har counter apna chun sakta hai') },
];

export function CounterRulesScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const canEdit = usePermission()(P.SETTINGS_EDIT);
  const industry = useIndustry().id;
  const q = useQuery({ queryKey: KEY, queryFn: settingsApi.counter, staleTime: 5 * 60_000 });
  const rules = q.data;

  const [cfg, setCfg] = useState<PosCounterConfig>(POS_COUNTER_DEFAULTS);
  const pending = useRef<Partial<PosCounterConfig>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (!Object.keys(pending.current).length) setCfg(normalizePosCounter(rules?.posCounter)); }, [rules]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const saveRule = useMutation({
    mutationFn: (patch: CounterRulePatch) => settingsApi.update(patch),
    onMutate: (patch) => {
      const prev = qc.getQueryData<CounterRules | null>(KEY);
      qc.setQueryData(KEY, (old: CounterRules | null | undefined) => (old ? { ...old, ...patch } : old));
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(KEY, ctx.prev); },
    onSuccess: () => toast.success(t('Save ho gaya')),
  });
  const savePos = useMutation({
    mutationFn: (patch: Partial<PosCounterConfig>) => settingsApi.updatePosCounter(patch),
    onSuccess: (c) => {
      qc.setQueryData(KEY, (old: CounterRules | null | undefined) => (old ? { ...old, posCounter: c } : old));
      toast.success(t('POS counter save ho gaya'));
    },
  });

  const setPos = <K extends keyof PosCounterConfig>(key: K, value: PosCounterConfig[K]) => {
    if (!canEdit) return;
    setCfg((d) => ({ ...d, [key]: value }));
    pending.current = { ...pending.current, [key]: value };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { const p = pending.current; pending.current = {}; savePos.mutate(p); }, 600);
  };

  // Typed numbers (Discount limit and similar) save after a short pause.
  const [max, setMax] = useState('');
  const [service, setService] = useState('');
  const [exchange, setExchange] = useState('');
  useEffect(() => {
    if (!rules) return;
    setMax(String(rules.maxDiscountPercent ?? 0)); setService(String(rules.serviceChargePct ?? 0)); setExchange(String(rules.exchangeDays ?? 0));
  }, [rules?.maxDiscountPercent, rules?.serviceChargePct, rules?.exchangeDays]); // eslint-disable-line react-hooks/exhaustive-deps
  const numTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveNumber = (patch: CounterRulePatch) => {
    if (numTimer.current) clearTimeout(numTimer.current);
    numTimer.current = setTimeout(() => saveRule.mutate(patch), 700);
  };
  useEffect(() => () => { if (numTimer.current) clearTimeout(numTimer.current); }, []);

  const hasPin = !!rules?.hasManagerPin;
  const maxN = Math.min(100, Math.max(0, Number(max) || 0));
  const serviceN = Number(service) || 0;
  const toggleTier = (tier: PriceTier) => {
    if (tier === cfg.defaultPriceTier) return toast.info(t('Default price tier band nahi ho sakti — pehle default badlein'));
    const has = cfg.priceTierList.includes(tier);
    setPos('priceTierList', PRICE_TIERS.filter((x) => (x === tier ? !has : cfg.priceTierList.includes(x))));
  };
  const togglePct = (p: number) => setPos('quickDiscounts', (cfg.quickDiscounts.includes(p) ? cfg.quickDiscounts.filter((x) => x !== p) : [...cfg.quickDiscounts, p]).sort((a, b) => a - b));

  return (
    <SettingsTemplate title={t('Counter rules')} description={t('Payment, Discount ki had, PIN kab maangein — POS in par chalta hai aur server har bill par dobara check karta hai.')}
      loading={q.isLoading} error={q.error} onRetry={q.refetch}>
      {rules && (
        <>
          <SettingsGroup title={t('Payment')} footnote={t('Cashier har bill par badal sakta hai; yeh sirf shuru ka chunao hai.')}>
            <View style={{ padding: th.space(3), gap: th.space(2) }}>
              <Text size="sm" weight="medium">{t('Pehle se chuna payment')}</Text>
              <ChipGroup wrap value={rules.defaultPaymentMethod} onChange={(v) => canEdit && saveRule.mutate({ defaultPaymentMethod: v })}
                options={PAYMENTS.map((p) => ({ value: p.value, label: t(p.label) }))} />
            </View>
            <SettingSwitch label={t('Har bill par customer zaroori')} description={t("Bagair customer chune bill nahi banega. Walk-in ke liye ek 'Walk-in' customer bana lein.")}
              value={rules.requireCustomerForSale} disabled={!canEdit} onChange={(v) => saveRule.mutate({ requireCustomerForSale: v })} />
          </SettingsGroup>

          <SettingsGroup title={t('Discount')} footnote={t('Cashier haath se kitna Discount de sakta hai (codes aur points ke apne usool hain)')}>
            <SettingSwitch label={t('Haath se Discount')} value={rules.allowDiscount} disabled={!canEdit}
              description={rules.allowDiscount ? t('Cashier bill par Discount de sakta hai') : t('Band — counter par Discount ka button kaam nahi karega')}
              onChange={(v) => saveRule.mutate({ allowDiscount: v })} />
            {rules.allowDiscount && (
              <View style={{ padding: th.space(3), gap: th.space(2) }}>
                <Input label={t('Zyada se zyada Discount')} value={max} keyboardType="number-pad" ltr trailing={<Text tone="muted">%</Text>} disabled={!canEdit}
                  hint={hasPin ? t('Is se zyada sirf malik ke PIN se') : t('Is se zyada bilkul nahi (malik ka PIN lagayein to PIN se ho sakega)')}
                  onChangeText={(v) => { const c = v.replace(/\D/g, '').slice(0, 3); setMax(c); saveNumber({ maxDiscountPercent: Math.min(100, Number(c) || 0) }); }} />
                <Text size="sm" weight="medium">{t('Jaldi chunein')}</Text>
                <ChipGroup wrap value={String(maxN)} onChange={(v) => { if (!canEdit) return; setMax(v); saveRule.mutate({ maxDiscountPercent: Number(v) }); }}
                  options={QUICK_LIMITS.map((p) => ({ value: String(p), label: `${p}%` }))} />
                <Text size="xs" tone="muted">{t('Misaal: {{value}} ke bill par {{value2}} tak Discount.', { value: formatMoney(1000), value2: formatMoney((1000 * maxN) / 100) })}</Text>
              </View>
            )}
          </SettingsGroup>

          {industry === 'restaurant' && (
            <SettingsGroup title={t('Service charge')} footnote={t('Har naya dine-in order isi % se shuru hota hai; waiter ek order par badal sakta hai. 0 = koi service charge nahi.')}>
              <View style={{ padding: th.space(3), gap: th.space(2) }}>
                <Input label={t('Dine-in service charge')} value={service} keyboardType="decimal-pad" ltr trailing={<Text tone="muted">%</Text>} disabled={!canEdit}
                  onChangeText={(v) => { const c = v.replace(/[^\d.]/g, '').slice(0, 5); setService(c); saveNumber({ serviceChargePct: Math.min(100, Number(c) || 0) }); }} />
                {serviceN > 0 && <Text size="xs" tone="muted">{t('Misaal: {{value}} ke khane par {{value2}} service charge.', { value: formatMoney(1000), value2: formatMoney((1000 * serviceN) / 100) })}</Text>}
              </View>
            </SettingsGroup>
          )}
          {industry === 'garments' && (
            <SettingsGroup title={t('Exchange')} footnote={t('Bill ke itne din baad tak maal badla ja sakta hai. 0 = koi had nahi.')}>
              <View style={{ padding: th.space(3) }}>
                <Input label={t('Exchange ke din')} value={exchange} keyboardType="number-pad" ltr trailing={<Text tone="muted">{t('din')}</Text>} disabled={!canEdit}
                  onChangeText={(v) => { const c = v.replace(/\D/g, '').slice(0, 3); setExchange(c); saveNumber({ exchangeDays: Math.min(365, Number(c) || 0) }); }} />
              </View>
            </SettingsGroup>
          )}

          <SettingsGroup title={t('Malik ka PIN kab maangein')} footnote={t('Customer ki credit limit se zyada udhaar par bhi PIN maanga jata hai.')}>
            {!hasPin && (
              <SettingLink icon={KeyRound} label={t('Abhi PIN nahi laga')} description={t('PIN ke bagair yeh usool kaam nahi karte (sirf Discount ki had band rehti hai).')} value={t('PIN lagayein')} onPress={() => router.push('/settings/security' as never)} />
            )}
            <SettingSwitch label={t('Bill cancel par PIN')} description={t('Bana hua bill cancel karne se pehle')} value={rules.requirePinForVoid} disabled={!canEdit} onChange={(v) => saveRule.mutate({ requirePinForVoid: v })} />
            <SettingSwitch label={t('Return par PIN')} description={t('Maal wapas le kar paise lautane se pehle')} value={rules.requirePinForRefund} disabled={!canEdit} onChange={(v) => saveRule.mutate({ requirePinForRefund: v })} />
            <SettingSwitch label={t('Har Discount par PIN')} description={t('Had ke andar bhi, har haath ke Discount par')} value={rules.requirePinForDiscount} disabled={!canEdit} onChange={(v) => saveRule.mutate({ requirePinForDiscount: v })} />
          </SettingsGroup>

          <SettingsGroup title={t('POS counter')} footnote={t('Counter ki shakal aur us par kya dikhe — har cashier apna layout counter se badal sakta hai')}>
            <View style={{ padding: th.space(3), gap: th.space(3) }}>
              <Select label={t('Dukaan ka layout')} value={cfg.layout} disabled={!canEdit} onChange={(v) => setPos('layout', v)}
                options={POS_LAYOUTS.map((l) => ({ value: l.id, label: t(l.label), description: t(l.hint) }))}
                hint={t('Naye aur purane sab counters isi se khulte hain, jab tak cashier apna na chune.')} />
              <Text size="sm" weight="medium">{t('Bill ki lines')}</Text>
              <ChipGroup value={cfg.density} onChange={(v) => setPos('density', v as PosCounterConfig['density'])} options={[{ value: 'compact', label: t('Patli') }, { value: 'comfortable', label: t('Khuli') }]} />
              <Text size="sm" weight="medium">{t('Jaldi Discount buttons')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
                {QUICK_PCT.map((p) => <Chip key={p} label={`${p}%`} selected={cfg.quickDiscounts.includes(p)} onPress={() => canEdit && togglePct(p)} />)}
              </View>
              <Text size="xs" tone="muted">{t('Bill par ek click wale Discount; cashier ko sirf apni had tak wale dikhte hain.')}</Text>
            </View>
          </SettingsGroup>

          <SettingsGroup title={t('Counter par kya dikhe')}>
            {TOGGLES.map((x) => (
              <SettingSwitch key={x.key} label={t(x.label)} description={t(x.desc)} value={cfg[x.key] as boolean} disabled={!canEdit} onChange={(v) => setPos(x.key, v as never)} />
            ))}
          </SettingsGroup>

          <SettingsGroup title={t('Price tiers — Retail / Wholesale / Credit')} footnote={t('Hath se Wholesale / Credit chunne ke liye staff ko “Price tier badalna” permission chahiye (Owner aur Manager ke paas pehle se hai). Wholesale aur Credit price Discount nahi ginti.')}>
            <SettingSwitch label={t('Price tiers on karein')} description={t('Ek hi cheez Retail, Wholesale aur Credit (udhaar) price par. Band ho to counter pehle jaisa retail price par chalta hai.')}
              value={cfg.priceTiers} disabled={!canEdit} onChange={(v) => setPos('priceTiers', v)} />
            {cfg.priceTiers && (
              <>
                <View style={{ padding: th.space(3), gap: th.space(2) }}>
                  <Text size="sm" weight="medium">{t('Counter par kaun si prices')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
                    {PRICE_TIERS.map((x) => <Chip key={x} label={t(PRICE_TIER_LABEL[x])} selected={cfg.priceTierList.includes(x)} onPress={() => canEdit && toggleTier(x)} />)}
                  </View>
                  <Text size="sm" weight="medium">{t('Har naya bill kis price par')}</Text>
                  <ChipGroup value={cfg.defaultPriceTier} onChange={(v) => {
                    if (!canEdit) return;
                    const tier = v as PriceTier;
                    setPos('defaultPriceTier', tier);
                    if (!cfg.priceTierList.includes(tier)) setPos('priceTierList', PRICE_TIERS.filter((x) => x === tier || cfg.priceTierList.includes(x)));
                  }} options={PRICE_TIERS.map((x) => ({ value: x, label: t(PRICE_TIER_LABEL[x]) }))} />
                </View>
                <SettingSwitch label={t('Udhaar par Credit price')} description={t('Checkout me Udhaar ya Kuch paisa chunte hi bill Credit price par — total pehle hi badal jata hai')} value={cfg.tierCreditOnUdhaar} disabled={!canEdit} onChange={(v) => setPos('tierCreditOnUdhaar', v)} />
                <SettingSwitch label={t('Customer ki apni price')} description={t('Customer ke form me Default price ho (jaise Wholesale) to usay chunte hi wohi lagti hai')} value={cfg.tierFromCustomer} disabled={!canEdit} onChange={(v) => setPos('tierFromCustomer', v)} />
                <SettingSwitch label={t('Ek line alag price par')} description={t('Bill ki kisi ek line par doosri price (line par chip ya T key)')} value={cfg.tierLineOverride} disabled={!canEdit} onChange={(v) => setPos('tierLineOverride', v)} />
                <SettingSwitch label={t('Bill par price tier chhape')} description={t('Raseed par likha aaye ke Retail, Wholesale ya Credit price lagi')} value={cfg.tierOnReceipt} disabled={!canEdit} onChange={(v) => setPos('tierOnReceipt', v)} />
              </>
            )}
          </SettingsGroup>
        </>
      )}
    </SettingsTemplate>
  );
}

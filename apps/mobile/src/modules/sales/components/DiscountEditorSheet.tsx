/** Create or edit a discount code: percent or fixed amount, conditions, dates, branches, with a live example of what it takes off. */

import { Percent, Wallet, Wand2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { discountAmount, normalizeCode } from '@nafaa/core/customers';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Button, Chip, DatePicker, IconButton, Input, MoneyInput, Row, Segmented, Select, Sheet, Switch, Text, toast, useTheme } from '@/design';
import { keyOfDateLocal } from '@/modules/customers/lib/dates';
import { queryClient } from '@/core/query/client';
import { discountsApi, type DiscountCode, type DiscountPayload, type DiscountType } from '../api/discounts';

const PRESETS: Array<{ code: string; description: string; type: DiscountType; value: number; minPurchase?: number; maxDiscount?: number }> = [
  { code: 'EID2026', description: msg('Eid special'), type: 'PERCENTAGE', value: 20, minPurchase: 1000, maxDiscount: 1000 },
  { code: 'SALE10', description: msg('Har cheez par 10%'), type: 'PERCENTAGE', value: 10 },
  { code: 'NEW500', description: msg('Naye customer ke liye'), type: 'FIXED_AMOUNT', value: 500, minPurchase: 3000 },
  { code: 'BULK15', description: msg('Bari khareedari par'), type: 'PERCENTAGE', value: 15, minPurchase: 10000 },
  { code: 'FLASH50', description: msg('Aaj ka flash sale'), type: 'PERCENTAGE', value: 50, maxDiscount: 2000 },
];
const SAMPLES = [500, 1000, 5000, 20000];
const toDay = (v?: string | null) => (v ? new Date(v) : null);

interface Form { code: string; description: string; type: DiscountType; value: number | null; minPurchase: number | null; maxDiscount: number | null; usageLimit: number | null; perCustomerLimit: number | null; validFrom: Date | null; validUntil: Date | null; shopIds: string[]; isActive: boolean }
const EMPTY: Form = { code: '', description: '', type: 'PERCENTAGE', value: null, minPurchase: null, maxDiscount: null, usageLimit: null, perCustomerLimit: null, validFrom: null, validUntil: null, shopIds: [], isActive: true };

export function DiscountEditorSheet({ code, open, shops, onClose }: { code: DiscountCode | null; open: boolean; shops: Array<{ id: string; name: string }>; onClose: () => void }) {
  const th = useTheme();
  const [f, setF] = useState<Form>(EMPTY);
  const [sample, setSample] = useState(5000);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  useEffect(() => {
    if (!open) return;
    setTried(false);
    setF(code ? { code: code.code, description: code.description ?? '', type: code.type, value: code.value, minPurchase: code.minPurchase || null, maxDiscount: code.maxDiscount ?? null,
      usageLimit: code.usageLimit ?? null, perCustomerLimit: code.perCustomerLimit ?? null, validFrom: toDay(code.validFrom), validUntil: toDay(code.validUntil), shopIds: code.shopIds ?? [], isActive: code.isActive } : EMPTY);
  }, [open, code]);

  const errors = {
    code: f.code.trim().length < 3 ? t('Code kam se kam 3 harf ka ho') : undefined,
    value: !((f.value ?? 0) > 0) ? t('Discount 0 se zyada likhein') : f.type === 'PERCENTAGE' && (f.value ?? 0) > 100 ? t('100% se zyada nahi ho sakta') : undefined,
    validUntil: f.validFrom && f.validUntil && f.validFrom > f.validUntil ? t('"Kab tak" ki date "Kab se" ke baad honi chahiye') : undefined,
  };
  const show = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  const preview = (f.value ?? 0) > 0 && sample >= (f.minPurchase ?? 0) ? discountAmount({ type: f.type, value: f.value ?? 0, maxDiscount: f.maxDiscount }, sample) : null;

  const save = async () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    const body: DiscountPayload = {
      code: normalizeCode(f.code), description: f.description.trim() || undefined, type: f.type, value: f.value ?? 0, minPurchase: f.minPurchase ?? 0,
      maxDiscount: f.type === 'PERCENTAGE' ? f.maxDiscount : null, usageLimit: f.usageLimit, perCustomerLimit: f.perCustomerLimit,
      validFrom: f.validFrom ? keyOfDateLocal(f.validFrom) : null, validUntil: f.validUntil ? keyOfDateLocal(f.validUntil) : null, shopIds: f.shopIds, isActive: f.isActive,
    };
    try {
      if (code) await discountsApi.update(code.id, body); else await discountsApi.create(body);
      toast.success(code ? t('Code badal diya') : t('Code ban gaya'));
      void queryClient.invalidateQueries({ queryKey: ['discounts'] });
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={code ? t('Badlein: {{code}}', { code: code.code }) : t('Naya discount code')} height={0.92}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{code ? t('Save karein') : t('Bana dein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {!code && (
          <View style={{ gap: th.space(1.5) }}>
            <Text size="xs" tone="muted">{t('Tayyar misalein')}</Text>
            <Row gap={2} wrap>{PRESETS.map((p) => <Chip key={p.code} label={p.code} onPress={() => set({ code: p.code, description: t(p.description), type: p.type, value: p.value, minPurchase: p.minPurchase ?? null, maxDiscount: p.maxDiscount ?? null })} />)}</Row>
          </View>
        )}
        <Input label={t('Code')} value={f.code} onChangeText={(v) => set({ code: normalizeCode(v) })} autoCapitalize="characters" maxLength={40} placeholder="EID2026" error={show('code')} hint={t('Customer yahi bolega; khali jagah nahi')}
          trailing={<IconButton icon={Wand2} label={t('Khud banayein')} onPress={() => set({ code: `NF${Math.random().toString(36).slice(2, 7).toUpperCase()}` })} />} />
        <Input label={t('Details')} value={f.description} onChangeText={(v) => set({ description: v })} placeholder={t('Eid special')} hint={t('Sirf aap ke liye — kis liye banaya')} />
        <Segmented value={f.type} onChange={(v) => set({ type: v })} options={[{ value: 'PERCENTAGE', label: t('Percent (%)'), icon: Percent }, { value: 'FIXED_AMOUNT', label: t('Seedhi amount'), icon: Wallet }]} />
        {f.type === 'PERCENTAGE'
          ? <Input label={t('Kitna %')} value={f.value == null ? '' : String(f.value)} onChangeText={(v) => set({ value: v.replace(/[^\d.]/g, '') ? Number(v.replace(/[^\d.]/g, '')) : null })} keyboardType="decimal-pad" error={show('value')} />
          : <MoneyInput label={t('Kitne rupay')} value={f.value} onChangeValue={(v) => set({ value: v })} error={show('value')} />}
        <MoneyInput label={t('Kam se kam khareedari')} value={f.minPurchase} onChangeValue={(v) => set({ minPurchase: v })} hint={t('Khali = koi had nahi')} />
        {f.type === 'PERCENTAGE' && <MoneyInput label={t('Zyada se zyada Discount')} value={f.maxDiscount} onChangeValue={(v) => set({ maxDiscount: v })} hint={t('Khali = koi had nahi')} />}
        <Input label={t('Kul kitni dafa chalega')} value={f.usageLimit == null ? '' : String(f.usageLimit)} onChangeText={(v) => set({ usageLimit: v.replace(/\D/g, '') ? Number(v.replace(/\D/g, '')) : null })} keyboardType="number-pad" placeholder={t('Koi had nahi')} />
        <Input label={t('Ek customer kitni dafa')} value={f.perCustomerLimit == null ? '' : String(f.perCustomerLimit)} onChangeText={(v) => set({ perCustomerLimit: v.replace(/\D/g, '') ? Number(v.replace(/\D/g, '')) : null })} keyboardType="number-pad" placeholder={t('Koi had nahi')} />
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker label={t('Kab se')} value={f.validFrom} onChange={(d) => set({ validFrom: d })} placeholder={t('Abhi se')} /></View>
          <View style={{ flex: 1 }}><DatePicker label={t('Kab tak')} value={f.validUntil} onChange={(d) => set({ validUntil: d })} placeholder={t('Kabhi nahi')} error={show('validUntil')} /></View>
        </Row>
        {shops.length > 1 && (
          <Select multiple label={t('Kis branch par chalega')} value={f.shopIds} onChange={(v) => set({ shopIds: v })} options={shops.map((s) => ({ value: s.id, label: s.name }))} hint={t('Khali = sab branches')} />
        )}
        <Switch value={f.isActive} onChange={(v) => set({ isActive: v })} label={t('Chalu')} />
        <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.brand.soft, gap: th.space(2) }}>
          <Text size="sm" weight="semibold" color={th.colors.brand.text}>{t('Agar bill ho')} {formatMoney(sample)}</Text>
          <Row gap={2} wrap>{SAMPLES.map((n) => <Chip key={n} label={formatMoney(n, { compact: true })} selected={sample === n} onPress={() => setSample(n)} />)}</Row>
          <Text size="sm" color={th.colors.brand.text}>{preview === null ? t('Kam se kam {{formatPKR}} ki khareedari par chalega', { formatPKR: formatMoney(f.minPurchase ?? 0) }) : t('Discount {{x}} → bill {{y}}', { x: formatMoney(preview), y: formatMoney(sample - preview) })}</Text>
        </View>
      </View>
    </Sheet>
  );
}

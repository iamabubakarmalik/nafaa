/**
 * New / edit combo (same fields and rules as the web form): name, tag line,
 * category, photo, the parts with quantity, pack and an optional normal
 * price each, the combo price with quick discounts, barcode, status,
 * featured, validity dates and limits. A live summary shows the separate
 * total, the customer's saving, cost, profit and how many can be made.
 * Saving needs internet.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Minus, Plus, ScanLine, ShoppingBag, Trash2, Upload, Wand2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { inStoreEan13 } from '@nafaa/core/inventory';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { offline, onlineNeededText, type ProductDetail } from '@/core/offline';
import {
  Button, Card, Chip, DatePicker, DetailRow, ErrorState, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, Select, SkeletonRows, Switch, Text, TextArea, toast, useTheme,
} from '@/design';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { Scanner } from '@/core/hardware/scanner';
import { uploadsApi } from '../../api/products';
import { CategorySelect } from '../../components/Pickers';
import { ProductPicker, type PickedProduct } from '../../components/ProductPicker';
import { ProductThumb } from '../../components/ProductThumb';
import { INV, qty, useCostMask, useOnline } from '../../lib/shared';
import { combosApi, type ComboPayload, type ComboStatus } from '../api/combos';
import { COMBO_STATUS, nameExample, STATUS_ORDER, tagIdeas } from '../lib/combos';

interface Part {
  key: string; productId: string; name: string; image?: string | null; category?: string | null; baseUnit: string; hasVariants: boolean;
  variantId: string | null; unitId: string | null; unitName: string; rate: number; quantity: string; price: string;
}

interface Form {
  name: string; tagLine: string; description: string; imageUrl: string; categoryId: string | null; comboPrice: number | null; barcode: string; sku: string;
  status: ComboStatus; isFeatured: boolean; validFrom: string; validTo: string; stockAvailable: string; maxPurchasePerCustomer: string;
}

const EMPTY: Form = {
  name: '', tagLine: '', description: '', imageUrl: '', categoryId: null, comboPrice: null, barcode: '', sku: '', status: 'ACTIVE',
  isFeatured: false, validFrom: '', validTo: '', stockAvailable: '', maxPurchasePerCustomer: '',
};
let seq = 0;
const partKey = () => `p${++seq}`;
const dateIn = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function ComboFormScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const online = useOnline();
  const { costHidden, cost: costMoney } = useCostMask();
  const { id: industryId } = useIndustry();
  const [f, setF] = useState<Form>(EMPTY);
  const [parts, setParts] = useState<Part[]>([]);
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState(false);
  const [scan, setScan] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setDirty(true); setF((x) => ({ ...x, [k]: v })); };

  const existing = useQuery({ queryKey: [INV, 'combos', 'one', id], queryFn: () => combosApi.getOne(id!), enabled: editing, staleTime: Infinity });
  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setF({
      name: c.name, tagLine: c.tagLine ?? '', description: c.description ?? '', imageUrl: c.imageUrl ?? '', categoryId: c.categoryId ?? null,
      comboPrice: Number(c.comboPrice), barcode: c.barcode ?? '', sku: c.sku ?? '', status: c.status, isFeatured: c.isFeatured,
      validFrom: dateIn(c.validFrom), validTo: dateIn(c.validTo), stockAvailable: c.stockAvailable == null ? '' : String(c.stockAvailable),
      maxPurchasePerCustomer: c.maxPurchasePerCustomer == null ? '' : String(c.maxPurchasePerCustomer),
    });
    setParts(c.items.map((i) => ({
      key: partKey(), productId: i.productId, name: i.product?.name ?? 'Product', image: i.product?.images?.[0]?.url ?? null, category: i.product?.category?.name ?? null,
      baseUnit: i.product?.unit ?? 'pcs', hasVariants: !!i.product?.hasVariants, variantId: i.variantId ?? null, unitId: i.unitId ?? null,
      unitName: i.unit?.unitName ?? i.unitName ?? i.product?.unit ?? 'pcs', rate: Number(i.unit?.conversionRate) || 1, quantity: String(i.quantity), price: i.originalPrice ? String(i.originalPrice) : '',
    })));
  }, [existing.data]);

  // Today's prices, packs, variants and stock of every part, from the phone.
  const ids = [...new Set(parts.map((p) => p.productId))];
  const details = useQuery({
    queryKey: ['offline', 'products', 'combo-parts', ids],
    queryFn: async () => Object.fromEntries((await Promise.all(ids.map(async (pid) => [pid, await offline.products.get(pid)] as const))).filter(([, d]) => d)) as Record<string, ProductDetail>,
    enabled: ids.length > 0,
    placeholderData: (p) => p,
  });

  const figures = (p: Part) => {
    const d = details.data?.[p.productId];
    const v = p.variantId ? d?.variants.find((x) => x.id === p.variantId) : undefined;
    const basePrice = v ? Number(v.price) : Number(d?.price ?? 0);
    const baseCost = v ? Number(v.costPrice || d?.costPrice || 0) : Number(d?.costPrice ?? 0);
    const stock = v ? Number(v.stock ?? 0) : Number(d?.stock ?? 0);
    const pack = p.unitId ? d?.packs.find((u) => u.id === p.unitId) : undefined;
    const today = pack && pack.price > 0 ? pack.price : basePrice * p.rate;
    const q = Number(p.quantity) || 0;
    const price = p.price.trim() ? Number(p.price) || 0 : today;
    const baseQty = q * p.rate;
    return { today, price, line: price * q, cost: baseCost * baseQty, stock, canMake: baseQty > 0 ? Math.floor(stock / baseQty + 1e-9) : 0 };
  };
  const rows = parts.map((p) => ({ p, x: figures(p) }));
  const separate = rows.reduce((s, r) => s + r.x.line, 0);
  const cost = rows.reduce((s, r) => s + r.x.cost, 0);
  const price = f.comboPrice ?? NaN;
  const saving = Number.isFinite(price) ? separate - price : 0;
  const profit = Number.isFinite(price) ? price - cost : 0;
  const margin = Number.isFinite(price) && price > 0 ? (profit / price) * 100 : 0;
  const limit = f.stockAvailable.trim() === '' ? NaN : Number(f.stockAvailable);
  const fromStock = rows.length ? Math.min(...rows.map((r) => r.x.canMake)) : 0;
  const canMake = Number.isFinite(limit) ? Math.min(limit, fromStock) : fromStock;
  const limiting = rows.length ? rows.reduce((a, b) => (b.x.canMake < a.x.canMake ? b : a)).p.name : '';
  const oneThing = parts.length === 1 && (Number(parts[0].quantity) || 0) <= 1;
  const datesWrong = !!f.validFrom && !!f.validTo && f.validTo < f.validFrom;
  const problems = [
    f.name.trim().length < 2 && t('Combo ka naam likhein'),
    !parts.length && t('Kam az kam ek cheez daalein'),
    oneThing && t('Do cheezein daalein, ya ek cheez ki quantity 1 se zyada rakhein'),
    parts.some((p) => !(Number(p.quantity) > 0)) && t('Har cheez ki quantity 0 se zyada honi chahiye'),
    !(price > 0) && t('Combo ki qeemat likhein'),
    datesWrong && t('Khatam ki date shuru se pehle hai'),
  ].filter(Boolean) as string[];

  const add = (picked: PickedProduct) => {
    setDirty(true);
    const pack = picked.pack;
    const unitId = pack?.id ?? null;
    setParts((list) => {
      const same = list.find((p) => p.productId === picked.product.id && p.unitId === unitId && p.variantId === picked.variantId);
      if (same) return list.map((p) => (p === same ? { ...p, quantity: String((Number(p.quantity) || 0) + 1) } : p));
      return [...list, {
        key: partKey(), productId: picked.product.id, name: picked.product.name, image: picked.product.imageUrl, category: picked.product.categoryName,
        baseUnit: picked.product.unit, hasVariants: picked.product.hasVariants, variantId: picked.variantId, unitId,
        unitName: pack?.unitName ?? picked.product.unit, rate: pack ? Number(pack.conversionRate) || 1 : 1, quantity: '1', price: '',
      }];
    });
  };
  const patch = (key: string, p: Partial<Part>) => { setDirty(true); setParts((list) => list.map((x) => (x.key === key ? { ...x, ...p } : x))); };

  const payload = (): ComboPayload => ({
    name: f.name.trim(), tagLine: f.tagLine.trim() || null, description: f.description.trim() || null, imageUrl: f.imageUrl || null,
    categoryId: f.categoryId || null, comboPrice: price, barcode: f.barcode.trim() || null, sku: f.sku.trim() || null, status: f.status, isFeatured: f.isFeatured,
    validFrom: f.validFrom ? new Date(`${f.validFrom}T00:00:00`).toISOString() : null,
    validTo: f.validTo ? new Date(`${f.validTo}T23:59:59`).toISOString() : null,
    stockAvailable: Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : null,
    maxPurchasePerCustomer: Number(f.maxPurchasePerCustomer) >= 1 ? Math.floor(Number(f.maxPurchasePerCustomer)) : null,
    items: parts.map((p) => ({
      productId: p.productId, variantId: p.variantId, unitId: p.unitId, quantity: Number(p.quantity), unitName: p.unitName,
      ...(p.price.trim() && Number(p.price) > 0 ? { originalPrice: Number(p.price) } : {}),
    })),
  });

  const save = useMutation({
    mutationFn: () => (editing ? combosApi.update(id!, payload()) : combosApi.create(payload())),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: [INV, 'combos'] });
      toast.success(editing ? t('Combo save ho gaya') : t('{{name}} ban gaya{{value}}', { name: c.name, value: c.status === 'ACTIVE' ? t(' — POS par dikhega') : '' }));
      setDirty(false);
      setTimeout(() => router.back(), 0);
    },
  });
  const submit = () => {
    if (!online) { toast.warning(onlineNeededText('settings')); return; }
    if (problems.length) { toast.error(problems[0]); return; }
    save.mutate();
  };
  const priceAt = (off: number) => {
    if (!(separate > 0)) return;
    const raw = separate * (1 - off / 100);
    set('comboPrice', raw >= 100 ? Math.round(raw / 10) * 10 : Math.round(raw));
  };
  const upload = async () => {
    if (!online) { toast.warning(onlineNeededText('imageUpload')); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    try {
      const a = res.assets[0];
      const r = await uploadsApi.single({ uri: a.uri, name: a.fileName || 'combo.jpg', type: a.mimeType || 'image/jpeg' }, { purpose: 'product-image' });
      set('imageUrl', r.url);
    } catch { toast.error(t('Tasveer upload nahi hui')); } finally { setUploading(false); }
  };

  if (editing && (existing.isLoading || existing.error)) {
    return (
      <FormTemplate title={t('Combo')} onSave={() => undefined} saveDisabled>
        {existing.error ? <ErrorState error={existing.error} onRetry={existing.refetch} title={t('Combo nahi mila')} /> : <SkeletonRows count={6} />}
      </FormTemplate>
    );
  }

  return (
    <FormTemplate title={editing ? t('Combo badlein') : t('Naya combo')} subtitle={t('Kai cheezein ek qeemat par — POS par ek line, stock har cheez ka apna ghatta hai')}
      dirty={dirty} saving={save.isPending} onSave={submit} saveLabel={editing ? t('Save karein') : t('Combo banayein')}>
      <FormSection title={t('Combo')}>
        <Input label={t('Naam *')} value={f.name} onChangeText={(v) => set('name', v)} maxLength={120} placeholder={t(nameExample(industryId))} hint={t('Customer aur cashier ko yahi naam dikhega — bill par bhi')} />
        <Input label={t('Chhota tag')} value={f.tagLine} onChangeText={(v) => set('tagLine', v)} maxLength={60} placeholder={t('Best deal')} hint={t('POS card par chhota sa label — neeche se jaldi chunein')} />
        <Row gap={1.5} wrap>{tagIdeas(industryId).map((x) => <Chip key={x} label={x} selected={f.tagLine === x} onPress={() => set('tagLine', x)} />)}</Row>
        <CategorySelect value={f.categoryId} onChange={(v) => set('categoryId', v)} hint={t('Reports aur POS me chhantne ke liye (ikhtiyari)')} />
        <Row gap={3}>
          {f.imageUrl ? <Image source={{ uri: f.imageUrl }} style={{ width: 64, height: 64, borderRadius: th.radius('lg') }} /> : null}
          <View style={{ flex: 1, gap: 4 }}>
            <Row gap={2}>
              <Button size="sm" variant="secondary" icon={Upload} loading={uploading} onPress={() => void upload()}>{f.imageUrl ? t('Badlein') : t('Tasveer lagayein')}</Button>
              {!!f.imageUrl && <Button size="sm" variant="ghost" onPress={() => set('imageUrl', '')}>{t('Hatayein')}</Button>}
            </Row>
            <Text size="xs" tone="muted">{t('Na lagayein to pehli cheez ki tasveer dikhegi')}</Text>
          </View>
        </Row>
        <TextArea label={t('Details')} value={f.description} onChangeText={(v) => set('description', v)} hint={t('Andar kya hai, kab tak — print sheet par aata hai (ikhtiyari)')} />
      </FormSection>

      <FormSection title={t('Is combo me kya hai')} description={t('{{count}} cheezein', { count: parts.length })}>
        <Button variant="soft" icon={Plus} onPress={() => setPicker(true)}>{t('Cheez daalein')}</Button>
        <Text size="xs" tone="muted">{t('Pack ka barcode scan karein to wohi pack (dozen, carton) jur jata hai. Dobara same cheez daalein to quantity barh jati hai.')}</Text>
        {!parts.length && <Card tone="muted"><Row gap={2}><ShoppingBag size={18} color={th.colors.textMuted} /><Text size="sm" tone="muted">{t('Misaal: 1 tel + 5 kg chawal + 1 kg cheeni')}</Text></Row></Card>}
        {rows.map(({ p, x }) => {
          const d = details.data?.[p.productId];
          const unitOptions = [{ value: '', label: p.baseUnit }, ...(d?.packs ?? []).filter((u) => !u.isBase).map((u) => ({ value: u.id, label: `${u.unitName} (${qty(u.conversionRate)})` }))];
          return (
            <Card key={p.key}>
              <View style={{ gap: th.space(2) }}>
                <Row gap={2}>
                  <ProductThumb name={p.name} category={p.category} url={p.image} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold" numberOfLines={1}>{p.name}</Text>
                    <Text size="xs" tone={x.canMake === 0 ? 'danger' : 'muted'}>{t('Stock {{stock}} {{baseUnit}} · {{canMake}} combo', { stock: qty(x.stock), baseUnit: p.baseUnit, canMake: x.canMake })}</Text>
                  </View>
                  <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => { setDirty(true); setParts((l) => l.filter((y) => y.key !== p.key)); }} />
                </Row>
                {p.hasVariants && (d?.variants.length ?? 0) > 0 && (
                  <Select label={t('Type')} value={p.variantId ?? ''} onChange={(v) => patch(p.key, { variantId: v || null })}
                    options={[{ value: '', label: t('Koi bhi type') }, ...(d?.variants ?? []).map((v) => ({ value: v.id, label: v.name }))]} />
                )}
                <Row gap={2} align="end">
                  {unitOptions.length > 1 && (
                    <View style={{ flex: 1 }}>
                      <Select label={t('Unit')} value={p.unitId ?? ''} options={unitOptions}
                        onChange={(v) => { const u = d?.packs.find((pk) => pk.id === v); patch(p.key, { unitId: u?.id ?? null, unitName: u?.unitName ?? p.baseUnit, rate: u ? Number(u.conversionRate) || 1 : 1, price: '' }); }} />
                    </View>
                  )}
                  <Row gap={1}>
                    <IconButton icon={Minus} label={t('Kam')} variant="secondary" onPress={() => patch(p.key, { quantity: String(Math.max(0, (Number(p.quantity) || 0) - 1)) })} />
                    <Input containerStyle={{ width: 64 }} value={p.quantity} onChangeText={(v) => patch(p.key, { quantity: v.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" ltr accessibilityLabel={t('Quantity')} />
                    <IconButton icon={Plus} label={t('Zyada')} variant="secondary" onPress={() => patch(p.key, { quantity: String((Number(p.quantity) || 0) + 1) })} />
                  </Row>
                </Row>
                <MoneyInput label={t('Alag qeemat')} value={p.price.trim() ? Number(p.price) : null} placeholder={String(Math.round(x.today))}
                  onChangeValue={(v) => patch(p.key, { price: v == null ? '' : String(v) })} hint={t('Ek unit ki normal qeemat — khali chhorein to aaj ki qeemat')} />
              </View>
            </Card>
          );
        })}
      </FormSection>

      <FormSection title={t('Qeemat')}>
        <MoneyInput label={t('Combo ki qeemat *')} value={f.comboPrice} onChangeValue={(v) => set('comboPrice', v)} size="lg"
          hint={separate > 0 ? t('Alag alag lene par {{separate}} — is se kam rakhein taake customer ko bachat dikhe', { separate: formatPKR(separate) }) : undefined} />
        <Row gap={1.5} wrap>
          <Text size="xs" tone="muted">{t('Jaldi qeemat')}</Text>
          {[5, 10, 15, 20].map((off) => <Chip key={off} label={t('{{off}}% kam', { off })} disabled={!(separate > 0)} onPress={() => priceAt(off)} />)}
        </Row>
        <Card tone={profit < 0 ? 'danger' : 'muted'}>
          <DetailRow label={t('Alag alag lene par')} value={formatPKR(separate)} />
          <DetailRow label={t('Combo ki qeemat')} value={Number.isFinite(price) ? formatPKR(price) : '—'} />
          <DetailRow label={t('Customer ki bachat')} value={Number.isFinite(price) && separate > 0 ? `${formatPKR(Math.max(saving, 0))} (${Math.max(0, Math.round((saving / separate) * 100))}%)` : '—'} />
          {!costHidden && <DetailRow label={t('Cost')} value={costMoney(cost)} />}
          {!costHidden && <DetailRow label={t('Profit')} value={Number.isFinite(price) ? `${costMoney(profit)} · ${Math.round(margin)}%` : '—'} />}
          <DetailRow label={t('Ban sakte')} value={parts.length ? `${canMake}${limiting && canMake === fromStock ? ` · ${limiting}` : ''}` : '—'} last />
        </Card>
      </FormSection>

      <FormSection title={t('Barcode aur POS')}>
        <Input label={t('Barcode')} value={f.barcode} onChangeText={(v) => set('barcode', v)} ltr keyboardType="number-pad"
          hint={t('Combo par label lagayein to POS par scan ho jata hai — kisi aur cheez wala nahi ho sakta')}
          trailing={<Row gap={1}>
            <IconButton icon={ScanLine} label={t('Scan')} size="sm" variant="soft" onPress={() => setScan(true)} />
            <IconButton icon={Wand2} label={t('Naya barcode banayein')} size="sm" variant="soft" onPress={() => set('barcode', inStoreEan13())} />
          </Row>} />
        <Input label={t('SKU / code')} value={f.sku} onChangeText={(v) => set('sku', v)} ltr autoCapitalize="characters" hint={t('Apna chhota code — search me kaam aata hai (ikhtiyari)')} />
        <Select label={t('Haal')} value={f.status} onChange={(v) => set('status', v as ComboStatus)} options={STATUS_ORDER.map((s) => ({ value: s, label: t(COMBO_STATUS[s].label) }))}
          hint={t('Sirf "Chalu" combo POS par dikhta hai. Kacha = abhi tayyar ho raha hai. Band = kuch der ke liye roka hua.')} />
        <Switch label={t('Featured')} description={t('POS par sab se upar')} value={f.isFeatured} onChange={(v) => set('isFeatured', v)} />
      </FormSection>

      <FormSection title={t('Period aur had')}>
        <DatePicker label={t('Kab se')} hint={t('Khali = abhi se')} value={f.validFrom ? new Date(`${f.validFrom}T00:00:00`) : null} onChange={(d) => set('validFrom', ymd(d))} />
        <DatePicker label={t('Kab tak')} error={datesWrong ? t('Ye date shuru se pehle hai') : undefined} hint={t('Khali = hamesha. Is din ke baad POS se khud hat jata hai')}
          value={f.validTo ? new Date(`${f.validTo}T00:00:00`) : null} onChange={(d) => set('validTo', ymd(d))} />
        {(f.validFrom || f.validTo) && <Button size="sm" variant="ghost" onPress={() => { set('validFrom', ''); set('validTo', ''); }}>{t('Dates hatayein')}</Button>}
        <Input label={t('Zyada se zyada kitne bechne hain')} value={f.stockAvailable} onChangeText={(v) => set('stockAvailable', v.replace(/[^\d]/g, ''))} keyboardType="number-pad" ltr
          placeholder={t('Koi had nahi')} hint={t('Offer sirf itne combo tak — khali = jitne stock se ban sakein')} />
        <Input label={t('Ek customer kitne le sakta hai')} value={f.maxPurchasePerCustomer} onChangeText={(v) => set('maxPurchasePerCustomer', v.replace(/[^\d]/g, ''))} keyboardType="number-pad" ltr
          placeholder={t('Koi had nahi')} hint={t('Yaad dihani ke liye — khali = koi had nahi')} />
      </FormSection>

      <ProductPicker open={picker} onClose={() => setPicker(false)} onPick={add} keepOpen pickedIds={new Set(ids)} title={t('Cheez daalein')} />
      {scan && <Scanner title={t('Combo ka barcode')} onClose={() => setScan(false)} onCode={(c) => { set('barcode', c.trim()); }} />}
    </FormTemplate>
  );
}


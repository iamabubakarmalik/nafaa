/**
 * Create or edit a trade scheme. The form changes with the type (free goods,
 * percent, rupees per pack, slabs); below come the items, brands, categories
 * and price lists it is limited to, the dates, the company that pays for it
 * and on/off. The plain-language rule updates as you type.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Search, Trash2, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import {
  Button, Chip, DatePicker, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, Select, Skeleton, Switch, Text, TextArea, toast, useTheme,
} from '@/design';
import { DIST_KEY, distSetupApi, type SaveScheme, type SchemeRow, type SchemeSlab, type SchemeType } from '../../api/distribution.api';
import { lookups, type ProductHit } from '../../api/setup-lookups';
import { DistributionGate } from '../../components/DistributionGate';
import { SchemePreviewBox } from '../../components/SchemePreviewBox';
import { PickChips, ProductPickSheet } from '../../components/SetupPickers';
import { digits, fromYmd, isoToDayKey, num, PRICE_LISTS_KEY, SCHEME_TYPE, SCHEMES_KEY, schemeRuleText, ymd } from '../../lib/setup';

const PACKS = ['Carton', 'Box', 'Dozen', 'Pack', 'Bag', 'Bundle'];
const EMPTY_SLAB = { minQty: '', percent: '', amountPerUnit: '', freeQty: '' };

interface Draft {
  name: string; type: SchemeType; supplierId: string;
  products: ProductHit[]; brandIds: string[]; categoryIds: string[]; priceListIds: string[];
  buyQty: string; buyUnitName: string; freeQty: string; freeProduct: ProductHit | null; value: string;
  slabs: Array<{ minQty: string; percent: string; amountPerUnit: string; freeQty: string }>;
  minOrderValue: string; startsAt: string; endsAt: string; isClaimable: boolean; isMix: boolean; isActive: boolean; note: string;
}

const fromScheme = (s: SchemeRow | null): Draft => ({
  name: s?.name ?? '', type: s?.type ?? 'FREE_QTY', supplierId: s?.supplierId ?? '',
  products: (s?.productIds ?? []).map((id, i) => ({ id, name: s?.productNames[i] ?? 'Item' })),
  brandIds: s?.brandIds ?? [], categoryIds: s?.categoryIds ?? [], priceListIds: s?.priceListIds ?? [],
  buyQty: s?.buyQty ? String(s.buyQty) : '', buyUnitName: s ? s.buyUnitName ?? '' : 'Carton', freeQty: s?.freeQty ? String(s.freeQty) : '',
  freeProduct: s?.freeProductId ? { id: s.freeProductId, name: s.freeProductName ?? 'Item' } : null, value: s?.value ? String(s.value) : '',
  slabs: (s?.slabs ?? []).map((x) => ({ minQty: String(x.minQty), percent: x.percent ? String(x.percent) : '', amountPerUnit: x.amountPerUnit ? String(x.amountPerUnit) : '', freeQty: x.freeQty ? String(x.freeQty) : '' })),
  minOrderValue: s?.minOrderValue ? String(s.minOrderValue) : '', startsAt: isoToDayKey(s?.startsAt), endsAt: isoToDayKey(s?.endsAt),
  isClaimable: s?.isClaimable ?? false, isMix: s?.isMix ?? false, isActive: s?.isActive ?? true, note: s?.note ?? '',
});

function toBody(d: Draft): SaveScheme {
  const slabs: SchemeSlab[] = d.slabs.map((x) => ({
    minQty: num(x.minQty) ?? 0, ...(num(x.percent) ? { percent: num(x.percent)! } : {}),
    ...(num(x.amountPerUnit) ? { amountPerUnit: num(x.amountPerUnit)! } : {}), ...(num(x.freeQty) ? { freeQty: num(x.freeQty)! } : {}),
  })).filter((x) => x.minQty > 0);
  return {
    name: d.name.trim(), type: d.type, supplierId: d.supplierId || null,
    productIds: d.products.map((p) => p.id), brandIds: d.brandIds, categoryIds: d.categoryIds, priceListIds: d.priceListIds,
    buyQty: num(d.buyQty) ?? 0, buyUnitName: d.buyUnitName.trim() || null,
    freeQty: d.type === 'FREE_QTY' ? num(d.freeQty) ?? 0 : 0, freeProductId: d.type === 'FREE_QTY' ? d.freeProduct?.id ?? null : null,
    value: d.type === 'PERCENT_OFF' || d.type === 'AMOUNT_PER_UNIT' ? num(d.value) ?? 0 : 0,
    slabs: d.type === 'SLAB' ? slabs : [],
    minOrderValue: num(d.minOrderValue), startsAt: d.startsAt || null, endsAt: d.endsAt || null,
    isClaimable: d.isClaimable, isMix: d.isMix, isActive: d.isActive, note: d.note.trim() || undefined,
  };
}

function problem(d: Draft): string | null {
  if (!d.name.trim()) return t('Scheme ka naam likhein');
  if (d.type === 'FREE_QTY' && (!(num(d.buyQty)! > 0) || !(num(d.freeQty)! > 0))) return t('Kitne par kitna free — dono likhein');
  if (d.type === 'PERCENT_OFF' && !((num(d.value) ?? 0) > 0 && (num(d.value) ?? 0) <= 100)) return t('Discount % (1 se 100) likhein');
  if (d.type === 'AMOUNT_PER_UNIT' && !((num(d.value) ?? 0) > 0)) return t('Har pack par kitne rupay kam — likhein');
  if (d.type === 'SLAB' && !d.slabs.some((x) => (num(x.minQty) ?? 0) > 0 && ((num(x.percent) ?? 0) > 0 || (num(x.amountPerUnit) ?? 0) > 0 || (num(x.freeQty) ?? 0) > 0))) return t('Kam az kam ek slab poora likhein');
  if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) return t('Khatam ki date shuru se pehle hai');
  return null;
}

export function SchemeEditorScreen() {
  return <DistributionGate title={t('Schemes')}><Body /></DistributionGate>;
}

function Body() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const q = useQuery({ queryKey: SCHEMES_KEY, queryFn: () => distSetupApi.schemes(), enabled: !isNew });
  if (!isNew && q.isLoading) return <FormTemplate title={t('Schemes')} onSave={() => {}}><Skeleton height={200} /></FormTemplate>;
  return <Editor scheme={isNew ? null : q.data?.find((s) => s.id === id) ?? null} />;
}

function Editor({ scheme }: { scheme: SchemeRow | null }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [d, setD] = useState<Draft>(() => fromScheme(scheme));
  const [tried, setTried] = useState(false);
  const [pick, setPick] = useState<'items' | 'free' | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const brandsQ = useQuery({ queryKey: ['brands', 'names'], queryFn: lookups.brands, staleTime: 5 * 60_000 });
  const catsQ = useQuery({ queryKey: ['categories', 'names'], queryFn: lookups.categories, staleTime: 5 * 60_000 });
  const listsQ = useQuery({ queryKey: PRICE_LISTS_KEY, queryFn: distSetupApi.priceLists });
  const suppliersQ = useQuery({ queryKey: ['suppliers', 'dist-principals'], queryFn: lookups.suppliers, staleTime: 5 * 60_000 });
  const err = problem(d);
  const dirty = useMemo(() => JSON.stringify(toBody(d)) !== JSON.stringify(toBody(fromScheme(scheme))), [d, scheme]);

  const save = useMutation({
    mutationFn: () => (scheme ? distSetupApi.updateScheme(scheme.id, toBody(d)) : distSetupApi.createScheme(toBody(d))),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SCHEMES_KEY });
      void qc.invalidateQueries({ queryKey: [DIST_KEY, 'scheme-preview'] });
      toast.success(scheme ? t('Scheme save ho gayi') : t('Scheme ban gayi'));
      router.back();
    },
  });
  const submit = () => { setTried(true); if (!err) save.mutate(); };

  const unit = d.buyUnitName.trim() || 'pcs';
  const m = SCHEME_TYPE[d.type];
  const setSlab = (i: number, k: keyof Draft['slabs'][number], v: string) => set('slabs', d.slabs.map((x, j) => (j === i ? { ...x, [k]: digits(v) } : x)));
  const dateOf = (s: string) => (s ? fromYmd(s) : null);

  return (
    <>
      <FormTemplate
        title={scheme ? t('{{name}} — badlein', { name: scheme.name }) : t('Nayi scheme')}
        dirty={dirty} saving={save.isPending} onSave={submit} saveLabel={scheme ? t('Save karein') : t('Scheme banayein')}
      >
        <FormSection>
          <Row gap={2} wrap>
            {(Object.keys(SCHEME_TYPE) as SchemeType[]).map((k) => (
              <Chip key={k} icon={SCHEME_TYPE[k].icon} label={t(SCHEME_TYPE[k].label)} selected={d.type === k}
                onPress={() => setD((x) => ({ ...x, type: k, slabs: k === 'SLAB' && !x.slabs.length ? [EMPTY_SLAB, EMPTY_SLAB] : x.slabs }))} />
            ))}
          </Row>
          <Text size="xs" tone="muted">{t(m.hint)}</Text>
          <Input label={t('Naam')} value={d.name} onChangeText={(v) => set('name', v)} maxLength={100} placeholder={d.type === 'FREE_QTY' ? t('10+1 Carton') : t('November offer')} />
        </FormSection>

        <FormSection title={t('Rule')}>
          <Input label={t('Pack')} value={d.buyUnitName} onChangeText={(v) => set('buyUnitName', v)} placeholder={t('Carton')} hint={t('Khali = khule pcs')} />
          <Row gap={2} wrap>
            {PACKS.map((p) => <Chip key={p} label={p} selected={d.buyUnitName === p} onPress={() => set('buyUnitName', p)} />)}
          </Row>
          {d.type !== 'SLAB' && (
            <Input ltr label={d.type === 'FREE_QTY' ? t('Kitne {{unit}} par', { unit }) : t('Kam az kam {{unit}}', { unit })} value={d.buyQty} onChangeText={(v) => set('buyQty', digits(v))}
              keyboardType="decimal-pad" placeholder={d.type === 'FREE_QTY' ? '10' : t('0 = koi had nahi')} />
          )}
          {d.type === 'FREE_QTY' && (
            <>
              <Input ltr label={d.freeProduct ? t('Kitne free (khule)') : t('Kitne {{unit}} free', { unit })} value={d.freeQty} onChangeText={(v) => set('freeQty', digits(v))} keyboardType="decimal-pad" placeholder="1" />
              <View style={{ gap: th.space(1.5) }}>
                <Text size="sm" weight="medium">{t('Free me kya milega')}</Text>
                {d.freeProduct ? (
                  <Row gap={2} style={{ padding: th.space(2), paddingStart: th.space(3), borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted }}>
                    <Text weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{d.freeProduct.name}</Text>
                    <IconButton icon={X} label={t('Wohi item free')} size="sm" onPress={() => set('freeProduct', null)} />
                  </Row>
                ) : <Button variant="secondary" icon={Search} onPress={() => setPick('free')}>{t('Wohi item (ya doosra item chunein…)')}</Button>}
              </View>
            </>
          )}
          {d.type === 'PERCENT_OFF' && <Input ltr label={t('Discount %')} value={d.value} onChangeText={(v) => set('value', digits(v))} keyboardType="decimal-pad" placeholder="3" />}
          {d.type === 'AMOUNT_PER_UNIT' && <Input ltr label={t('Rs kam (har {{unit}})', { unit })} value={d.value} onChangeText={(v) => set('value', digits(v))} keyboardType="decimal-pad" placeholder="50" />}
          {d.type === 'SLAB' && (
            <View style={{ gap: th.space(3) }}>
              {d.slabs.map((x, i) => (
                <View key={i} style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
                  <Row gap={2} justify="between">
                    <Text size="sm" weight="semibold">{t('Slab')} {i + 1}</Text>
                    <IconButton icon={Trash2} label={t('Slab hatayein')} size="sm" variant="danger" onPress={() => set('slabs', d.slabs.filter((_, j) => j !== i))} />
                  </Row>
                  <Row gap={2} align="start">
                    <Input containerStyle={{ flex: 1 }} ltr label={t('{{unit}} se', { unit })} value={x.minQty} onChangeText={(v) => setSlab(i, 'minQty', v)} keyboardType="decimal-pad" placeholder="5" />
                    <Input containerStyle={{ flex: 1 }} ltr label="%" value={x.percent} onChangeText={(v) => setSlab(i, 'percent', v)} keyboardType="decimal-pad" placeholder="2" />
                  </Row>
                  <Row gap={2} align="start">
                    <Input containerStyle={{ flex: 1 }} ltr label={t('Rs/{{unit}}', { unit })} value={x.amountPerUnit} onChangeText={(v) => setSlab(i, 'amountPerUnit', v)} keyboardType="decimal-pad" />
                    <Input containerStyle={{ flex: 1 }} ltr label={t('Free')} value={x.freeQty} onChangeText={(v) => setSlab(i, 'freeQty', v)} keyboardType="decimal-pad" />
                  </Row>
                </View>
              ))}
              <Button size="sm" variant="secondary" icon={Plus} onPress={() => set('slabs', [...d.slabs, EMPTY_SLAB])}>{t('Slab')}</Button>
              <Text size="xs" tone="muted">{t('Jo sab se bara slab poora ho wohi lagta hai. Free qty seedhi milti hai (har slab par ek baar).')}</Text>
            </View>
          )}
          <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
            <Text size="sm" weight="semibold" style={{ color: m.color }}>{schemeRuleText(toBody(d), d.freeProduct?.name)}</Text>
          </View>
        </FormSection>

        <FormSection title={t('Items')} description={d.products.length || d.brandIds.length || d.categoryIds.length ? undefined : t('Koi item, brand ya category nahi chuni — scheme har item par lagegi.')}>
          {d.products.length > 0 && (
            <Row gap={2} wrap>
              {d.products.map((p) => <Chip key={p.id} icon={X} label={p.name} selected onPress={() => set('products', d.products.filter((x) => x.id !== p.id))} />)}
            </Row>
          )}
          <Button variant="secondary" icon={Plus} onPress={() => setPick('items')}>{t('Item jorein…')}</Button>
          {(brandsQ.data?.length ?? 0) > 0 && (
            <PickChips label={t('Brand')} items={(brandsQ.data ?? []).slice(0, 40).map((b) => ({ value: b.id, label: b.name }))} picked={d.brandIds} onChange={(v) => set('brandIds', v)} />
          )}
          {(catsQ.data?.length ?? 0) > 0 && (
            <PickChips label={t('Category')} items={(catsQ.data ?? []).slice(0, 40).map((c) => ({ value: c.id, label: c.name }))} picked={d.categoryIds} onChange={(v) => set('categoryIds', v)} />
          )}
          {(listsQ.data?.length ?? 0) > 0 && (
            <PickChips label={t('Sirf in price list wale customers')} anyText={t('sab customers')} items={(listsQ.data ?? []).map((l) => ({ value: l.id, label: l.name }))} picked={d.priceListIds} onChange={(v) => set('priceListIds', v)} />
          )}
        </FormSection>

        <FormSection title={t('Waqt aur company')}>
          <DatePicker label={t('Shuru')} hint={t('Khali = abhi se')} value={dateOf(d.startsAt)} onChange={(x) => set('startsAt', ymd(x))} />
          {d.startsAt ? <Button size="sm" variant="ghost" onPress={() => set('startsAt', '')}>{t('Hatayein')}</Button> : null}
          <DatePicker label={t('Khatam')} hint={t('Khali = jab tak band na karein')} value={dateOf(d.endsAt)} onChange={(x) => set('endsAt', ymd(x))} />
          {d.endsAt ? <Button size="sm" variant="ghost" onPress={() => set('endsAt', '')}>{t('Hatayein')}</Button> : null}
          <MoneyInput label={t('Order kam az kam (Rs)')} placeholder={t('Koi had nahi')} value={num(d.minOrderValue)} onChangeValue={(v) => set('minOrderValue', v ? String(v) : '')} />
          <Select label={t('Company (principal)')} value={d.supplierId} onChange={(v) => set('supplierId', v)} searchable
            options={[{ value: '', label: t('— Apni scheme —') }, ...(suppliersQ.data ?? []).map((s) => ({ value: s.id, label: s.name }))]}
            hint={t('Jo company scheme ka kharcha deti hai')} />
          <Switch value={d.isClaimable} onChange={(v) => set('isClaimable', v)} label={t('Company se claim hoga')} description={t('Claims page par company ke hisaab me aayega')} />
          <Switch value={d.isMix} onChange={(v) => set('isMix', v)} label={t('Mix scheme')} description={t('Chune hue items mil kar quantity poori karein (jaise koi bhi 10 carton juice)')} />
          <Switch value={d.isActive} onChange={(v) => set('isActive', v)} label={t('Chalu')} />
          <TextArea label={t('Note')} value={d.note} onChangeText={(v) => set('note', v)} maxLength={300} />
        </FormSection>

        {tried && err && <Text size="sm" tone="warning" weight="medium">{err}</Text>}

        {scheme && (
          <SchemePreviewBox title={t('Test karein')} initialProduct={d.products[0] ?? null} hint={t('Order par jo chalti schemes lagti hain wohi yahan.')}
            note={dirty ? t('Yeh test save ki hui schemes par chalta hai — nayi tabdeeli save ke baad nazar aayegi.') : undefined} />
        )}
      </FormTemplate>
      {pick && (
        <ProductPickSheet open onClose={() => setPick(null)} exclude={pick === 'items' ? d.products.map((p) => p.id) : []}
          onPick={(p) => (pick === 'items' ? set('products', [...d.products, p]) : set('freeProduct', p))} />
      )}
    </>
  );
}

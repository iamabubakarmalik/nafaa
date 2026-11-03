/** New or edit bundle (web BundleFormPage): products and quantities, then the deal price; saving, cost and profit are worked out live. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { bundleSavings } from '@nafaa/core/industries/electronics';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, DatePicker, EmptyState, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, Skeleton, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { useCostMask } from '@/modules/sales/lib/mask';
import { dateToKey, keyToDate } from '../../_shared/deskKit';
import { electronicsBundlesApi, type BundlePayload } from '../api';
import { BUNDLE_KEY, opt, refreshElectronics } from '../meta';

interface Line { productId: string; name: string; quantity: number; unitPrice: number | null; cost: number; serial?: boolean }
const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export function BundleFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { cost: money } = useCostMask();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [picker, setPicker] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [touched, setTouched] = useState(false);
  const existing = useQuery({ queryKey: [BUNDLE_KEY, 'one', id], queryFn: () => electronicsBundlesApi.getOne(id!), enabled: editing });
  useEffect(() => {
    const b = existing.data;
    if (!b) return;
    setName(b.name); setDescription(b.description ?? '');
    setLines(b.items.map((i) => ({ productId: i.productId, name: i.product?.name ?? t('Product hata diya gaya'), quantity: i.quantity, unitPrice: Number(i.unitPrice) || null, cost: Number(i.product?.costPrice) || 0, serial: i.serial })));
    setPrice(Number(b.bundlePrice) || null); setFrom(day(b.validFrom)); setUntil(day(b.validUntil)); setIsActive(b.isActive); setIsFeatured(b.isFeatured); setDirty(false);
  }, [existing.data]);
  const mark = <T,>(fn: (v: T) => void) => (v: T) => { setDirty(true); fn(v); };
  const sv = bundleSavings(lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice ?? 0 })), price ?? 0);
  const cost = Math.round(lines.reduce((s, l) => s + l.quantity * l.cost, 0) * 100) / 100;
  const deal = price ?? 0;
  const problems = useMemo(() => {
    const p: string[] = [];
    if (name.trim().length < 2) p.push(t('Bundle ka naam likhein'));
    if (!lines.length) p.push(t('Kam az kam ek product jorein'));
    else if (lines.length === 1 && lines[0].quantity <= 1) p.push(t('Do cheezein, ya ek cheez ki ek se zyada quantity'));
    if (!(deal > 0)) p.push(t('Deal ka rate likhein'));
    else if (deal > sv.original) p.push(t('Deal ka rate alag alag rate se zyada hai'));
    if (from && until && until < from) p.push(t('Khatam ki date shuru se pehle hai'));
    return p;
  }, [name, lines, deal, sv.original, from, until]);
  const save = useMutation({
    mutationFn: () => {
      const body: BundlePayload = { name: name.trim(), description: opt(description) ?? null, items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice ?? undefined })), bundlePrice: deal, isActive, isFeatured, validFrom: from || null, validUntil: until || null };
      return editing ? electronicsBundlesApi.update(id!, body) : electronicsBundlesApi.create(body);
    },
    onSuccess: () => { toast.success(editing ? t('Bundle save ho gaya') : t('Bundle ban gaya')); refreshElectronics([BUNDLE_KEY, 'electronics-pos-catalog']); setDirty(false); router.replace('/electronics/bundles' as never); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  if (editing && existing.isLoading) return <FormTemplate title={t('Bundle')} onSave={() => undefined}><Skeleton height={200} /></FormTemplate>;
  if (editing && !existing.data) return <FormTemplate title={t('Bundle')} onSave={() => undefined}><EmptyState title={t('Bundle nahi mila')} /></FormTemplate>;
  const setLine = (pid: string, patch: Partial<Line>) => { setDirty(true); setLines((ls) => ls.map((l) => (l.productId === pid ? { ...l, ...patch } : l))); };
  return (
    <FormTemplate title={editing ? t('Bundle badlein') : t('Naya bundle')} dirty={dirty} saving={save.isPending} onSave={() => { setTouched(true); if (problems.length) { toast.error(problems[0]); return; } save.mutate(); }}>
      <FormSection title={t('Bundle')}>
        <Input label={t('Naam')} value={name} onChangeText={mark(setName)} placeholder={t('Charger + cable + cover')} error={touched && name.trim().length < 2 ? t('Bundle ka naam likhein') : undefined} />
        <TextArea label={t('Tafseel')} value={description} onChangeText={mark(setDescription)} />
      </FormSection>
      <FormSection title={t('Cheezein')}>
        {lines.map((l) => (
          <Card key={l.productId}>
            <Row gap={2} style={{ justifyContent: 'space-between' }}><Text weight="semibold" style={{ flex: 1 }} numberOfLines={2}>{l.name}</Text><IconButton icon={Trash2} label={t('Hatayein')} size="sm" variant="danger" onPress={() => { setDirty(true); setLines((ls) => ls.filter((x) => x.productId !== l.productId)); }} /></Row>
            <Row gap={2}>
              <NumberInput containerStyle={{ flex: 1 }} label={t('Kitne')} integer value={l.quantity} onChangeValue={(v) => setLine(l.productId, { quantity: Math.max(Math.round(v ?? 1), 1) })} />
              <MoneyInput containerStyle={{ flex: 2 }} label={t('Alag rate (ek)')} value={l.unitPrice} onChangeValue={(v) => setLine(l.productId, { unitPrice: v })} />
            </Row>
            {l.serial ? <Text size="xs" tone="muted">{t('Serial wali cheez — bundle bechte waqt unit chunna padega')}</Text> : null}
          </Card>
        ))}
        <Button variant="soft" icon={Plus} onPress={() => setPicker(true)}>{t('Product jorein')}</Button>
      </FormSection>
      <FormSection title={t('Deal')}>
        <MoneyInput label={t('Deal ka rate')} value={price} onChangeValue={mark(setPrice)} size="xl" error={touched && deal > sv.original ? t('Deal ka rate alag alag rate se zyada hai') : undefined} />
        <Row gap={2} style={{ justifyContent: 'space-between' }}>
          <View><Text size="xs" tone="muted">{t('Alag alag')}</Text><Text weight="bold" ltr>{formatMoney(sv.original)}</Text></View>
          <View><Text size="xs" tone="muted">{t('Bachat')}</Text><Text weight="bold" tone="success" ltr>{formatMoney(sv.savings)} ({sv.pct}%)</Text></View>
          <View><Text size="xs" tone="muted">{t('Profit')}</Text><Text weight="bold" ltr>{money(Math.round((deal - cost) * 100) / 100)}</Text></View>
        </Row>
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker label={t('Shuru')} value={keyToDate(from)} onChange={(d) => { setDirty(true); setFrom(dateToKey(d)); }} /></View>
          <View style={{ flex: 1 }}><DatePicker label={t('Khatam')} value={keyToDate(until)} onChange={(d) => { setDirty(true); setUntil(dateToKey(d)); }} /></View>
        </Row>
        <Switch value={isActive} onChange={mark(setIsActive)} label={t('Chalu')} />
        <Switch value={isFeatured} onChange={mark(setIsFeatured)} label={t('Khaas (counter par pehle)')} />
      </FormSection>
      <ProductPicker open={picker} onClose={() => setPicker(false)} keepOpen variants={false} includeRaw={false} title={t('Product jorein')} pickedIds={new Set(lines.map((l) => l.productId))}
        onPick={(p) => { setDirty(true); setLines((ls) => ls.some((l) => l.productId === p.product.id) ? ls.map((l) => (l.productId === p.product.id ? { ...l, quantity: l.quantity + 1 } : l)) : [...ls, { productId: p.product.id, name: p.product.name, quantity: 1, unitPrice: Number(p.product.price) || null, cost: Number((p.product as { costPrice?: number }).costPrice) || 0 }]); }} />
    </FormTemplate>
  );
}

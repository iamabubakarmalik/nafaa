/**
 * Report damaged goods (web DamageReportForm): one or many products with
 * quantity in any pack, the variant, the batch for expiry goods and any
 * money got back; one reason, photos and a note for the whole report.
 * Nothing leaves stock until a manager approves; a manager can approve on
 * the spot (online). Reporting works offline. Rolls and devices are written
 * off on the Adjustments screen.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { PackageSearch, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { toBaseQty } from '@nafaa/core/inventory';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { enqueueDamage, offline, OfflineRuleError, type PackRow } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Button, Card, Chip, EmptyState, FormTemplate, IconButton, Input, MoneyInput, Row, Select, Switch, Text, TextArea, toast, useTheme,
} from '@/design';
import { BranchSelect } from '../../components/Pickers';
import { NumberInput } from '../../components/fields';
import { PhotoField, type ImageDraft } from '../../components/PhotoField';
import { ProductPicker, type PickedProduct } from '../../components/ProductPicker';
import { INV, qty, useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';
import { damageApi } from '../api';
import { DAMAGE_REASONS } from '../meta';

interface Line {
  key: string; productId: string; name: string; unit: string; variantId: string | null; variantName: string | null;
  cost: number; stock: number; expiryTracked: boolean; packs: PackRow[]; pack: PackRow | null; qty: string; batchId: string; salvage: number | null;
}

export function DamageReportScreen() {
  const th = useTheme();
  const can = usePermission();
  const online = useOnline();
  const refresh = useRefreshInventory();
  const { cost } = useCostMask();
  const activeShop = useAuthStore((s) => s.currentShopId);
  const canApprove = can(P.STOCK_ADJUSTMENTS_MANAGE);
  const [shopId, setShopId] = useState<string | null>(activeShop);
  const [lines, setLines] = useState<Line[]>([]);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [photos, setPhotos] = useState<ImageDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [claim, setClaim] = useState(false);
  const [approveNow, setApproveNow] = useState(false);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = async (p: PickedProduct) => {
    const d = await offline.products.get(p.product.id, shopId);
    const v = p.variantId ? d?.variants.find((x) => x.id === p.variantId) : null;
    setLines((prev) => {
      const same = prev.findIndex((l) => l.productId === p.product.id && l.variantId === p.variantId && (l.pack?.id ?? null) === (p.pack?.id ?? null));
      if (same >= 0) return prev.map((l, i) => (i === same ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l));
      return [...prev, {
        key: `${p.product.id}-${Date.now()}`, productId: p.product.id, name: p.product.name, unit: p.product.unit, variantId: p.variantId, variantName: p.variantName,
        cost: Number(v?.costPrice ?? p.product.costPrice) || 0, stock: Number(p.stock ?? 0), expiryTracked: p.product.expiryTracked,
        packs: (d?.packs ?? []).filter((x) => !x.isBase && (x.variantId ?? null) === (p.variantId ?? null)), pack: p.pack, qty: '1', batchId: '', salvage: null,
      }];
    });
  };
  const patch = (key: string, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const reason = DAMAGE_REASONS.find((r) => r.id === reasonId);
  const problems: string[] = [];
  if (!shopId) problems.push(t('Pehle branch chunein'));
  if (!lines.length) problems.push(t('Kam se kam ek product jorein'));
  if (!reason) problems.push(t('Wajah chunein'));
  if (reason?.id === 'OTHER' && !otherText.trim()) problems.push(t('"Kuch aur" ke sath wajah likhein'));
  for (const l of lines) if (!(Number(l.qty) > 0)) problems.push(t('{{n}}: quantity likhein', { n: l.name }));
  const total = lines.reduce((s, l) => s + toBaseQty(Number(l.qty) || 0, l.pack?.conversionRate ?? 1) * l.cost - (l.salvage ?? 0), 0);

  const save = async () => {
    if (problems.length) { haptic('error'); toast.error(problems[0]); return; }
    if (saving || !reason) return;
    setSaving(true);
    const text = reason.id === 'OTHER' ? otherText.trim() : reason.label;
    try {
      const ops: string[] = [];
      for (const l of lines) {
        ops.push(await enqueueDamage({
          productId: l.productId, variantId: l.variantId ?? undefined, unitId: l.pack?.id, shopId: shopId ?? undefined, quantity: Number(l.qty),
          reason: text, reasonCode: reason.code, notes: notes.trim() || undefined, salvageValue: l.salvage ?? undefined, supplierClaim: claim || undefined,
          ...(l.batchId ? { batchId: l.batchId } : {}), ...(photos.length ? { photos: photos.map((p) => p.url) } : {}),
        } as Parameters<typeof enqueueDamage>[0]));
      }
      if (approveNow && canApprove && online) {
        const ids: string[] = [];
        for (const id of ops) {
          const op = await offline.outbox.waitFor(id, 15_000);
          const sid = (op?.result as { id?: string } | null)?.id;
          if (op?.status === 'issue') throw new Error(op.serverMessage || op.explanation || t('Save nahi hua'));
          if (sid) ids.push(sid);
        }
        if (ids.length) await damageApi.approveMany(ids);
        toast.success(t('{{count}} report approve — stock se nikal gaya', { count: ids.length }));
      } else {
        toast.success(online ? t('{{count}} report save — manager ki approval ka intezar', { count: lines.length }) : t('Phone par save ho gaya — internet aane par bhej diya jayega'));
      }
      haptic('success');
      void refresh();
      setLines([]);
      router.back();
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : e instanceof Error && !(e as { response?: unknown }).response ? e.message : apiErrorMessage(e, t('Save nahi hua')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormTemplate title={t('Kharab maal report karein')} subtitle={t('Toota, expiry, kharab ya chuhe ka kaata maal — approval ke baad stock se nikalta hai')}
      dirty={lines.length > 0} saving={saving} onSave={() => void save()} saveLabel={approveNow && canApprove ? t('Report aur approve') : t('Report karein')}>
      <View style={{ gap: th.space(4) }}>
        {!activeShop && <BranchSelect value={shopId} onChange={setShopId} />}
        <Button variant="soft" icon={Plus} onPress={() => setPicker(true)}>{t('Upar se kharab product search')}</Button>
        {!lines.length
          ? <EmptyState compact icon={PackageSearch} title={t('Upar se kharab product search')} message={t('Har product ki quantity, type aur batch yahan aayega')} />
          : lines.map((l) => <DamageLine key={l.key} line={l} cost={cost} online={online} onChange={(p) => patch(l.key, p)} onRemove={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} />)}
        <View style={{ gap: th.space(2) }}>
          <Text weight="semibold">{t('Kya hua?')}</Text>
          <Row gap={1.5} wrap>
            {DAMAGE_REASONS.map((r) => <Chip key={r.id} icon={r.icon} label={t(r.label)} selected={reasonId === r.id} onPress={() => setReasonId(r.id)} />)}
          </Row>
          {reason?.id === 'OTHER' && <Input value={otherText} onChangeText={setOtherText} placeholder={t('Maslan: Garmi se pighal gaya')} hint={t('Chhoti si wajah likhein, report me yahi dikhegi.')} />}
          <Text size="xs" tone="muted">{t('Sahi wajah chunein — Analytics me isi se pata chalta hai sab se zyada nuqsan kahan se ho raha hai. "Chori / gum" approval par "Gum" me jata hai, baqi sab "Kharab" me.')}</Text>
        </View>
        <PhotoField value={photos} onChange={setPhotos} max={6} hint={t('Shows the manager what was damaged')} />
        <TextArea label={t('Details')} value={notes} onChangeText={setNotes} placeholder={t('Zaroorat ho to — kahan mila, kis ne dekha…')} hint={t('Marzi hai. Manager ko faisla karne me madad milti hai.')} />
        <Switch value={claim} onChange={setClaim} label={t('Supplier se claim ho sakta hai')} description={t('Company ka nuqs ya expiry return wala maal — baad me supplier se paise ya maal wapas lene ke liye nishan.')} />
        {canApprove && online && (
          <Switch value={approveNow} onChange={setApproveNow} label={t('Sath hi approve karein')} description={t('Aap ke paas approval ki permission hai. On karein to report save hote hi stock se nikal jayega aur Adjustments me aa jayega.')} />
        )}
        {lines.length > 0 && (
          <Card tone="danger">
            <Row justify="between">
              <Text size="sm">{t('{{count}} line · andaazan nuqsan (cost par)', { count: lines.length })}</Text>
              <Text weight="bold" ltr>{cost(Math.max(0, total))}</Text>
            </Row>
          </Card>
        )}
      </View>
      <ProductPicker open={picker} onClose={() => setPicker(false)} keepOpen title={t('Damage report')} pickedIds={new Set(lines.map((l) => l.productId))} onPick={(p) => void add(p)} />
    </FormTemplate>
  );
}

function DamageLine({ line: l, cost, online, onChange, onRemove }: { line: Line; cost: (n: number) => string; online: boolean; onChange: (p: Partial<Line>) => void; onRemove: () => void }) {
  const th = useTheme();
  const opts = useQuery({ queryKey: [INV, 'damage', 'options', l.productId], queryFn: () => damageApi.options(l.productId), enabled: online && l.expiryTracked, staleTime: 30_000 });
  const batches = (opts.data?.batches ?? []).filter((b) => (b.variantId ?? '') === (l.variantId ?? '') && b.quantity > 0);
  const base = toBaseQty(Number(l.qty) || 0, l.pack?.conversionRate ?? 1);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card>
      <View style={{ gap: th.space(3) }}>
        <Row gap={2} align="start">
          <View style={{ flex: 1 }}>
            <Text weight="semibold" numberOfLines={2}>{l.variantName ? `${l.name} · ${l.variantName}` : l.name}</Text>
            <Text size="xs" tone="muted">{t('Branch stock {{qtyText}} {{baseUnit}}', { qtyText: qty(l.stock), baseUnit: l.unit })}</Text>
          </View>
          <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={onRemove} />
        </Row>
        <Row gap={2} align="end">
          <NumberInput containerStyle={{ flex: 1 }} label={t('Quantity')} value={Number(l.qty) || null} onChangeValue={(v) => onChange({ qty: v == null ? '' : String(v) })} />
          {l.packs.length > 0 && (
            <View style={{ flex: 1 }}>
              <Select label={t('Unit')} value={l.pack?.id ?? ''} onChange={(id) => onChange({ pack: l.packs.find((p) => p.id === id) ?? null })}
                options={[{ value: '', label: l.unit }, ...l.packs.map((p) => ({ value: p.id, label: `${p.unitLabel || p.unitName} (${qty(p.conversionRate)} ${l.unit})` }))]} />
            </View>
          )}
        </Row>
        {batches.length > 0 && (
          <Select label={t('Batch')} value={l.batchId} onChange={(batchId) => onChange({ batchId })} hint={t('Expiry wala maal ho to us ka batch chunein — approval par usi batch ki ginti bhi kam hogi. Laal date = expire ho chuka.')}
            options={[{ value: '', label: t('Koi khaas nahi') }, ...batches.map((b) => ({ value: b.id, label: `${b.batchNumber} · ${qty(b.quantity)}`, description: b.expiryDate ? `${b.expiryDate.slice(0, 10)}${b.expiryDate.slice(0, 10) < today ? ' ⚠' : ''}` : undefined }))]} />
        )}
        <MoneyInput label={t('Kuch paise wapas mile?')} value={l.salvage} onChangeValue={(salvage) => onChange({ salvage })} hint={t('Sasta bech diya ya kabari ko diya to amount likhein — asal nuqsan us se kam ginta hai.')} />
        {base > l.stock && <Text size="xs" tone="warning">{t('Branch me itna stock nahi. Report ho jayegi, magar approval tab hogi jab stock theek ho.')}</Text>}
        <Text size="xs" tone="muted" ltr>{`${qty(base)} ${l.unit} · ${cost(base * l.cost)}`}</Text>
      </View>
    </Card>
  );
}

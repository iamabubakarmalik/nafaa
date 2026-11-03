/**
 * Send stock to another branch (web TransferForm): pick the sending and the
 * receiving branch, add items by search or scan with quantity in any pack,
 * see "now X, after sending Y" per line, then confirm. The stock leaves the
 * sending branch at once and reaches the other branch when it receives.
 * Needs internet. Rolls and devices are sent from the industry screens.
 */

import { router } from 'expo-router';
import { ArrowRight, PackageSearch, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { toBaseQty } from '@nafaa/core/inventory';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { offline, type PackRow } from '@/core/offline';
import { Button, Card, EmptyState, FormTemplate, Icon, IconButton, Input, Row, Select, Text, confirm, toast, useTheme } from '@/design';
import { BranchSelect, useBranches } from '../../components/Pickers';
import { DevicePickerSheet, useDeviceSources, type DeviceRow, type DeviceSource } from '../../industry/devices';
import { NumberInput } from '../../components/fields';
import { ProductPicker, type PickedProduct } from '../../components/ProductPicker';
import { qty, useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';
import { transfersApi } from '../api';
import { OnlineOnly } from '../components/parts';
import { useTransferRights } from './TransfersScreen';

interface Line { device?: { field: DeviceSource['transferField']; id: string }; key: string; productId: string; variantId: string | null; name: string; unit: string; cost: number; stock: number | null; packs: PackRow[]; pack: PackRow | null; qty: string; note: string }

export function TransferFormScreen() {
  const th = useTheme();
  const online = useOnline();
  const refresh = useRefreshInventory();
  const { cost } = useCostMask();
  const rights = useTransferRights();
  const current = useAuthStore((s) => s.currentShopId);
  const branches = useBranches();
  const [from, setFrom] = useState<string | null>(rights.locked ?? current);
  const [to, setTo] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState('');
  const [picker, setPicker] = useState(false);
  const sources = useDeviceSources();
  const [devicesFor, setDevicesFor] = useState<DeviceSource | null>(null);
  const [saving, setSaving] = useState(false);

  // Stock of each line in the sending branch, from the phone (refreshed when the branch changes).
  useEffect(() => {
    if (!from) return;
    void Promise.all(lines.map(async (l) => ({ key: l.key, stock: await offline.products.stock(from, l.productId, l.variantId).catch(() => null) })))
      .then((r) => setLines((prev) => prev.map((l) => ({ ...l, stock: r.find((x) => x.key === l.key)?.stock ?? l.stock }))));
  }, [from]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!online) return <FormTemplate title={t('Maal bhejein')} onSave={() => undefined} saveDisabled><OnlineOnly feature="transfers" /></FormTemplate>;

  const add = async (p: PickedProduct) => {
    const d = await offline.products.get(p.product.id, from);
    const stock = from ? await offline.products.stock(from, p.product.id, p.variantId).catch(() => null) : p.stock;
    const v = p.variantId ? d?.variants.find((x) => x.id === p.variantId) : null;
    setLines((prev) => {
      const same = prev.findIndex((l) => l.productId === p.product.id && l.variantId === p.variantId);
      if (same >= 0) return prev.map((l, i) => (i === same ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l));
      return [...prev, {
        key: `${p.product.id}-${Date.now()}`, productId: p.product.id, variantId: p.variantId, name: p.variantName ? `${p.product.name} · ${p.variantName}` : p.product.name,
        unit: p.product.unit, cost: Number(v?.costPrice ?? p.product.costPrice) || 0, stock: stock ?? null,
        packs: (d?.packs ?? []).filter((x) => !x.isBase && (x.variantId ?? null) === (p.variantId ?? null)), pack: p.pack, qty: '1', note: '',
      }];
    });
  };
  const patch = (key: string, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const base = (l: Line) => (l.device ? 1 : toBaseQty(Number(l.qty) || 0, l.pack?.conversionRate ?? 1));
  const addDevice = (src: DeviceSource, r: DeviceRow) => setLines((prev) => (prev.some((l) => l.device?.id === r.id) ? prev : [...prev, { key: `${r.id}-${Date.now()}`, device: { field: src.transferField, id: r.id }, productId: r.productId, variantId: null, name: `${r.name} · ${r.ref}`, unit: 'pcs', cost: r.cost, stock: null, packs: [], pack: null, qty: '1', note: '' }]));

  const problems: string[] = [];
  if (!from) problems.push(t('Pehle bhejne wali branch chunein'));
  if (!to) problems.push(t('Kis branch ko bhejna hai, chunein'));
  if (from && to && from === to) problems.push(t('Dono branch alag honi chahiye'));
  if (!lines.length) problems.push(t('Kam se kam ek cheez jorein'));
  if (lines.some((l) => !l.device && !(Number(l.qty) > 0))) problems.push(t('Har line ki quantity likhein'));
  for (const l of lines) if (l.stock !== null && base(l) > l.stock) problems.push(t('{{n}}: itna stock nahi (abhi {{before}} {{baseUnit}})', { n: l.name, before: qty(l.stock), baseUnit: l.unit }));
  const total = lines.reduce((s, l) => s + base(l) * l.cost, 0);
  const toName = branches.data.find((b) => b.id === to)?.name ?? '';

  const save = async () => {
    if (problems.length) { haptic('error'); toast.error(problems[0]); return; }
    if (!(await confirm({ title: t('Pakka karein'), message: t('Bhejte hi maal bhejne wali branch ke stock se nikal jayega'), confirmLabel: t('Haan, bhej dein') }))) return;
    setSaving(true);
    try {
      const r = await transfersApi.create({
        fromShopId: from!, toShopId: to!, notes: notes.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId || undefined, variantId: l.variantId ?? undefined, quantity: base(l), notes: l.note.trim() || undefined, ...(l.device ? { [l.device.field]: l.device.id } : {}) })),
      });
      haptic('success');
      toast.success(t('{{number}} raste me — {{to}} receive karegi', { number: r.transferNumber, to: toName }));
      void refresh();
      setLines([]);
      router.replace(`/transfers/${r.id}` as never);
    } catch (e) {
      toast.error(apiErrorMessage(e, t('Transfer nahi hua')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormTemplate title={t('Maal bhejein')} subtitle={t('Dusri branch ko stock bhejein — wahan receive hone par stock barhega')}
      dirty={lines.length > 0} saving={saving} onSave={() => void save()} saveLabel={t('Aage · {{count}} cheezein', { count: lines.length })}>
      <View style={{ gap: th.space(4) }}>
        {rights.locked
          ? <Text size="sm" tone="muted">{t('Aap sirf apni branch se bhej sakte hain')}</Text>
          : <BranchSelect label={t('Kahan se (bhejne wali branch)')} value={from} onChange={(id) => { setFrom(id); if (id === to) setTo(null); }} hint={t('Jis branch ka maal ja raha hai — stock yahin se kam hoga')} />}
        <BranchSelect label={t('Kahan (lene wali branch)')} value={to} onChange={setTo} exclude={from} />
        <Button variant="soft" icon={Plus} onPress={() => setPicker(true)} disabled={!from}>{t('Cheez search')}</Button>
        {sources.map((src) => <Button key={src.kind} variant="soft" icon={src.icon} onPress={() => setDevicesFor(src)} disabled={!from}>{t(src.label)}</Button>)}
        {!lines.length
          ? <EmptyState compact icon={PackageSearch} title={t('Abhi koi cheez nahi')} message={t('Product ka naam, SKU ya barcode…')} />
          : lines.map((l) => (
            <Card key={l.key}>
              <View style={{ gap: th.space(2) }}>
                <Row gap={2} align="start">
                  <Text weight="semibold" style={{ flex: 1 }} numberOfLines={2}>{l.name}</Text>
                  <IconButton icon={Trash2} label={t('Hatayein')} size="sm" variant="danger" onPress={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} />
                </Row>
                {l.device ? <Text size="xs" tone="muted">{t('Ek unit')}</Text> : <Row gap={2} align="end">
                  <NumberInput containerStyle={{ flex: 1 }} label={t('Kitne {{name}}', { name: l.pack?.unitName ?? l.unit })} value={Number(l.qty) || null} onChangeValue={(v) => patch(l.key, { qty: v == null ? '' : String(v) })} />
                  {l.packs.length > 0 && (
                    <View style={{ flex: 1 }}>
                      <Select label={t('Pcs, carton ya box')} value={l.pack?.id ?? ''} onChange={(id) => patch(l.key, { pack: l.packs.find((p) => p.id === id) ?? null })}
                        options={[{ value: '', label: l.unit }, ...l.packs.map((p) => ({ value: p.id, label: `${p.unitLabel || p.unitName} (${qty(p.conversionRate)} ${l.unit})` }))]} />
                    </View>
                  )}
                </Row>}
                {l.stock !== null && (
                  <Row gap={2}>
                    <Text size="xs" tone="muted">{t('Abhi')}</Text>
                    <Text size="xs" weight="semibold" ltr>{qty(l.stock)}</Text>
                    <Icon icon={ArrowRight} size={12} tone="muted" flip />
                    <Text size="xs" tone="muted">{t('Bhejne ke baad')}</Text>
                    <Text size="xs" weight="bold" tone={l.stock - base(l) < 0 ? 'danger' : 'default'} ltr>{`${qty(l.stock - base(l))} ${l.unit}`}</Text>
                  </Row>
                )}
              </View>
            </Card>
          ))}
        <Input label={t('Note (ikhtiyari)')} value={notes} onChangeText={setNotes} placeholder={t('Note — misaal: rider Ali le ja raha hai, shaam tak pohanchega')} hint={t('Note slip par chhapta hai aur dono branch ko dikhta hai')} />
        {lines.length > 0 && (
          <Card tone="muted">
            <Row justify="between"><Text size="sm">{t('Kul qeemat (cost par)')}</Text><Text weight="bold" ltr>{cost(total)}</Text></Row>
            <Text size="xs" tone="muted">{t('Cost par hisaab — yeh sale nahi, sirf maal ki jagah badalti hai')}</Text>
          </Card>
        )}
        {lines.length > 0 && problems.length > 0 && <Card tone="warning"><Text size="sm">{problems[0]}</Text></Card>}
      </View>
      <DevicePickerSheet source={devicesFor} shopId={from} taken={new Set(lines.map((l) => l.device?.id).filter(Boolean) as string[])} onPick={(r) => { if (devicesFor) addDevice(devicesFor, r); }} onClose={() => setDevicesFor(null)} />
      <ProductPicker open={picker} onClose={() => setPicker(false)} keepOpen title={t('Maal scan karein')} pickedIds={new Set(lines.map((l) => l.productId))} onPick={(p) => void add(p)} />
    </FormTemplate>
  );
}

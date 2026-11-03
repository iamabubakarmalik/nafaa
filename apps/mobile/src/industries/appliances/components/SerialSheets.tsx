/** Serial register sheets: add a shipment of serials in one go, move units to a branch, and the warranty check. */

import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Package, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { parseSerials } from '@nafaa/core/industries/appliances';
import { t } from '@/core/i18n';
import { Button, ChipGroup, DatePicker, Input, ListRow, MoneyInput, Select, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { dateToKey, errText, keyToDate, opt, todayKey } from '../../_shared/trade/desk';
import { applianceSerialApi } from '../api';
import { SerialLookup } from './kit';
import { KEYS, dayOnly, refreshAppliances } from '../meta';

export function AddSerialsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [product, setProduct] = useState<{ id: string; name: string; costPrice: number } | null>(null);
  const [pick, setPick] = useState(false);
  const [text, setText] = useState('');
  const [model, setModel] = useState('');
  const [batch, setBatch] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [date, setDate] = useState(todayKey());
  const [supplier, setSupplier] = useState('');
  const [shopId, setShopId] = useState('');
  const [busy, setBusy] = useState(false);
  const branches = useQuery({ queryKey: [KEYS.serial, 'branches'], queryFn: () => applianceSerialApi.branches(), staleTime: 60_000, enabled: open });
  const shops = branches.data?.shops ?? [];
  const list = parseSerials(text);
  useEffect(() => { if (open) { setProduct(null); setText(''); setModel(''); setBatch(''); setPrice(null); setDate(todayKey()); setSupplier(''); setShopId(''); } }, [open]);
  const run = async () => {
    if (!product) return;
    setBusy(true);
    try {
      const r = await applianceSerialApi.bulkCreate({ productId: product.id, serialNumbers: list, modelNumber: opt(model), batchNumber: opt(batch), purchasePrice: price ?? (product.costPrice || undefined), purchaseDate: date || undefined, supplierRef: opt(supplier), shopId: shopId || undefined });
      toast.success(r.message || t('{{created}} serial jur gaye', { created: r.created }));
      if (r.skipped) toast.info(t('{{skipped}} pehle se the: {{value}}', { skipped: r.skipped, value: r.skippedSerials.slice(0, 5).join(', ') }));
      refreshAppliances([KEYS.serial]);
      onClose();
    } catch (e) { toast.error(errText(e, t('Serial nahi jure'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Serial jorein')} description={t('Ek product ke saare units ek saath — scanner se ek ke baad ek, ya Excel column paste karein')}
      footer={<Button fullWidth size="lg" icon={Plus} loading={busy} disabled={!product || !list.length} onPress={() => void run()}>{t('{{count}} serial jorein', { count: list.length })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ListRow icon={Package} iconTone="brand" title={product?.name ?? t('Product chunein')} subtitle={product ? undefined : t('Kis product ke ye units hain')} chevron onPress={() => setPick(true)} />
        <TextArea label={t('Serial numbers')} value={text} onChangeText={setText} placeholder={'SN12345\nSN12346\nSN12347'} hint={t('Har line me ek — scanner har scan ke baad khud nayi line deta hai')} />
        <Text size="xs" tone="muted">{t('Ye sirf number likhta hai, stock nahi badhata — stock Purchase se aata hai.')}</Text>
        <Input label={t('Model number')} value={model} onChangeText={setModel} placeholder={t('HSU-18HFCM')} />
        <Input label={t('Batch / lot')} value={batch} onChangeText={setBatch} />
        <MoneyInput label={t('Khareed qeemat (ek unit)')} value={price} onChangeValue={setPrice} />
        <DatePicker label={t('Kab aaya')} value={keyToDate(date)} maximumDate={new Date()} onChange={(d) => setDate(dateToKey(d))} />
        <Input label={t('Dealer / bill number')} value={supplier} onChangeText={setSupplier} placeholder={t('Haier distributor · INV-221')} />
        {shops.length > 1 && <Select label={t('Branch')} value={shopId} onChange={setShopId} placeholder={t('Jo branch abhi khuli hai')} options={shops.map((x) => ({ value: x.id, label: x.name }))} hint={t('Jis branch me ye dabbe rakhe hain — POS sirf apni branch ke serial dikhata hai')} />}
      </View>
      <ProductPicker open={pick} onClose={() => setPick(false)} includeRaw={false} variants={false} title={t('Product chunein')}
        onPick={(p) => { setProduct({ id: p.product.id, name: p.product.name, costPrice: p.product.costPrice ?? 0 }); if (price == null && p.product.costPrice) setPrice(p.product.costPrice); }} />
    </Sheet>
  );
}

/** Puts in-stock units in a branch: with a received stock transfer, or a first placement for units entered before branches were tracked. */
export function MoveSerialsSheet({ preset, open, onClose }: { preset: string[]; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [KEYS.serial, 'branches'], queryFn: () => applianceSerialApi.branches(), staleTime: 60_000, enabled: open });
  const [mode, setMode] = useState<'transfer' | 'place'>('transfer');
  const [transferId, setTransferId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMode('transfer'); setTransferId(''); setToShopId(''); setText(''); } }, [open]);
  const numbers = parseSerials(text);
  const transfers = q.data?.transfers ?? [];
  const shops = q.data?.shops ?? [];
  const tr = transfers.find((x) => x.id === transferId);
  const okTarget = mode === 'transfer' ? !!transferId : !!toShopId;
  const okSerials = preset.length > 0 || numbers.length > 0;
  const run = async () => {
    setBusy(true);
    try {
      const r = await applianceSerialApi.move({ ...(preset.length ? { serialIds: preset } : { serialNumbers: numbers }), ...(mode === 'transfer' ? { transferId } : { toShopId }) });
      toast.success(r.message || t('{{moved}} unit badal gaye', { moved: r.moved }));
      refreshAppliances([KEYS.serial]);
      onClose();
    } catch (e) { toast.error(errText(e, t('Branch nahi badli'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Serial ki branch')} description={t('Stock transfer se aaye units us branch me likhein — POS sirf apni branch ke serial bechta hai')}
      footer={<Button fullWidth size="lg" icon={ArrowLeftRight} loading={busy} disabled={!okTarget || !okSerials} onPress={() => void run()}>{t('Branch badlein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup value={mode} onChange={(v) => setMode(v as 'transfer' | 'place')} options={[{ value: 'transfer', label: t('Stock transfer se') }, { value: 'place', label: t('Pehli dafa branch likhein') }]} />
        {mode === 'transfer' ? (
          <>
            <Select label={t('Transfer')} value={transferId} onChange={setTransferId} placeholder={transfers.length ? t('Receive hua transfer chunein') : t('Pichle 60 din me koi transfer receive nahi hua')}
              options={transfers.map((x) => ({ value: x.id, label: `${x.transferNumber} · ${x.fromShop.name} → ${x.toShop.name} · ${dayOnly(x.receivedAt)}` }))} hint={t('Pehle Inventory → Stock transfer se maal bhejein aur receive karein')} />
            {tr && <Text size="xs" tone="muted">{t('{{value}} unit receive hue — itne hi serial {{name}} me ja sakte hain.', { value: tr.items.reduce((n, i) => n + Number(i.receivedQty), 0), name: tr.toShop.name })}</Text>}
          </>
        ) : (
          <Select label={t('Branch')} value={toShopId} onChange={setToShopId} placeholder={t('Branch chunein')} options={shops.map((x) => ({ value: x.id, label: x.name }))} hint={t('Sirf un units ke liye jo abhi kisi branch me nahi (purane units)')} />
        )}
        {!preset.length && <TextArea label={t('Serial numbers')} value={text} onChangeText={setText} placeholder={'SN12345\nSN12346'} hint={t('Har line me ek — scanner har scan ke baad khud nayi line deta hai')} />}
      </View>
    </Sheet>
  );
}

export function WarrantyCheckSheet({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: (id: string) => void }) {
  const [code, setCode] = useState('');
  const [found, setFound] = useState<string | null>(null);
  useEffect(() => { if (open) { setCode(''); setFound(null); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={t('Warranty check')} description={t('Customer ka serial likhein ya scan karein')}
      footer={found ? <Button fullWidth size="lg" onPress={() => onOpen(found)}>{t('Unit kholein')}</Button> : undefined}>
      <SerialLookup value={code} onChange={(v) => { setCode(v); setFound(null); }} onFound={(r) => setFound(r.serial?.id ?? null)} />
    </Sheet>
  );
}

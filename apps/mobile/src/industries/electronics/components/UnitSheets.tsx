/** Serial register sheets (web AddUnitsModal, EditUnitModal, TradeInModal): add units by serial or IMEI, edit one unit, take a used unit in. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { ScanLine } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { parseSerialLines } from '@nafaa/core/industries/electronics';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, ChipGroup, Input, MoneyInput, Row, Segmented, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { CameraScan } from '@/modules/pos/components/CameraScan';
import { CustomerBox, ProductField, emptyCustomer, useShopId, type CustomerValue } from '../../mobile/components/kit';
import { serialTrackingApi, type ElectronicsSerial, type SerialPage, type SerialStatus, type TradeInPayload } from '../api';
import { CONDITION_META, SERIAL_KEYS, opt, refreshElectronics } from '../meta';
import { conditionLabel } from '../meta';

type Row = SerialPage['items'][number];

/** Adds units to a product: one per line as "serial, imei, imei 2, mac", or scanned one after another. */
export function AddUnitsSheet({ open, product: fixed, expected, costPrice, supplierRef, alreadyHave, onClose }: {
  open: boolean; product?: { id: string; name: string }; expected?: number; costPrice?: number; supplierRef?: string; alreadyHave?: number; onClose: () => void;
}) {
  const th = useTheme();
  const shopId = useShopId();
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const product = fixed ?? picked;
  const [text, setText] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [ref, setRef] = useState('');
  const [scan, setScan] = useState(false);
  useEffect(() => { if (open) { setText(''); setPicked(null); setPrice(costPrice ? Math.round(costPrice * 100) / 100 : null); setRef(supplierRef ?? ''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const { entries, repeated } = useMemo(() => parseSerialLines(text), [text]);
  const left = expected != null ? expected - (alreadyHave ?? 0) - entries.length : null;
  const problem = !product ? t('Product chunein') : !entries.length ? t('Kam az kam ek serial likhein') : null;
  const save = useMutation({
    mutationFn: () => serialTrackingApi.bulkCreate({ productId: product!.id, shopId: shopId ?? undefined, entries, purchasePrice: price ?? undefined, supplierRef: opt(ref) }),
    onSuccess: (r) => {
      toast.success(t('{{count}} unit darj ho gaye', { count: r.created }));
      if (r.skipped) toast.warning(t('{{count}} serial pehle se the — chhor diye', { count: r.skipped }));
      refreshElectronics([...SERIAL_KEYS, 'electronics-serials']);
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Units save nahi hue'))),
  });
  return (
    <Sheet open={open} onClose={onClose} height={0.92} title={t('Serial daalein')} description={product?.name}
      footer={<View style={{ gap: 4 }}><Text size="xs" tone="muted">{problem ?? t('{{count}} unit darj honge', { count: entries.length })}</Text><Button fullWidth size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('Darj karein')}</Button></View>}>
      <View style={{ gap: th.space(3) }}>
        {!fixed && <ProductField label={t('Product')} value={picked} onChange={(p) => setPicked({ id: p.product.id, name: p.product.name })} />}
        {expected != null && (
          <Row gap={2} style={{ justifyContent: 'space-between' }}>
            <View><Text size="xs" tone="muted">{t('Bill mein')}</Text><Text weight="bold" ltr>{expected}</Text></View>
            <View><Text size="xs" tone="muted">{t('Pehle darj')}</Text><Text weight="bold" ltr>{alreadyHave ?? 0}</Text></View>
            <View><Text size="xs" tone="muted">{t('Baqi')}</Text><Text weight="bold" tone={(left ?? 0) < 0 ? 'danger' : 'default'} ltr>{Math.max(left ?? 0, 0)}</Text></View>
          </Row>
        )}
        <TextArea label={t('Serial numbers')} value={text} onChangeText={setText} ltr placeholder={'SN123456, 356789012345678\nSN123457'} hint={t('Har line me ek unit: serial, IMEI, IMEI 2, MAC (comma se alag)')} />
        <Button variant="secondary" icon={ScanLine} onPress={() => setScan(true)}>{t('Scan karein')}</Button>
        {repeated > 0 && <Text size="xs" tone="warning">{t('{{count}} serial do dafa likhe the', { count: repeated })}</Text>}
        <Row gap={2}>
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Cost (1 unit)')} value={price} onChangeValue={setPrice} />
          <Input containerStyle={{ flex: 1 }} label={t('Bill / supplier ref')} value={ref} onChangeText={setRef} placeholder={t('PO-…')} ltr />
        </Row>
      </View>
      {scan && <CameraScan title={t('Serial scan karein')} continuous onClose={() => setScan(false)} onCode={(c) => { const code = c.trim(); if (!code || entries.some((e) => e.serialNumber.toLowerCase() === code.toLowerCase())) return false; setText((x) => `${x}${x && !x.endsWith('\n') ? '\n' : ''}${code}`); return true; }} footer={<Text size="sm" tone="inverse">{t('{{count}} unit', { count: entries.length })}</Text>} />}
    </Sheet>
  );
}

export function EditUnitSheet({ unit, onClose }: { unit: Row | null; onClose: () => void }) {
  const th = useTheme();
  const [f, setF] = useState({ serialNumber: '', imei: '', imei2: '', macAddress: '', physicalCondition: '', notes: '', status: 'IN_STOCK' as SerialStatus });
  useEffect(() => { if (unit) setF({ serialNumber: unit.serialNumber, imei: unit.imei ?? '', imei2: unit.imei2 ?? '', macAddress: unit.macAddress ?? '', physicalCondition: unit.physicalCondition ?? '', notes: unit.notes ?? '', status: unit.status }); }, [unit]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const shelf = unit?.status === 'IN_STOCK' || unit?.status === 'RESERVED';
  const save = useMutation({
    mutationFn: () => serialTrackingApi.update(unit!.id, { productId: unit!.productId, serialNumber: f.serialNumber.trim(), imei: f.imei.trim(), imei2: f.imei2.trim(), macAddress: f.macAddress.trim(), physicalCondition: f.physicalCondition.trim(), notes: f.notes, ...(shelf && { status: f.status }) } as Partial<ElectronicsSerial>),
    onSuccess: () => { toast.success(t('Save ho gaya')); refreshElectronics(['electronics-serials']); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={!!unit} onClose={onClose} height={0.9} title={unit ? t('Unit {{serialNumber}}', { serialNumber: unit.serialNumber }) : undefined} description={unit?.product?.name}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!f.serialNumber.trim()} onPress={() => save.mutate()}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Serial number')} value={f.serialNumber} onChangeText={(v) => set({ serialNumber: v })} ltr />
        <Input label={t('IMEI')} value={f.imei} onChangeText={(v) => set({ imei: v })} ltr />
        <Input label={t('IMEI 2')} value={f.imei2} onChangeText={(v) => set({ imei2: v })} ltr />
        <Input label={t('MAC')} value={f.macAddress} onChangeText={(v) => set({ macAddress: v })} ltr />
        <Input label={t('Dikhne mein kaisa')} value={f.physicalCondition} onChangeText={(v) => set({ physicalCondition: v })} hint={t('Maslan: halki kharoch, dabba nahi')} />
        {shelf && (
          <>
            <Text size="sm" weight="medium" tone="secondary">{t('Haal')}</Text>
            <ChipGroup wrap value={f.status} onChange={(status) => set({ status })} options={[{ value: 'IN_STOCK', label: t('Stock mein (bik sakta hai)') }, { value: 'RESERVED', label: t('Kisi ke liye rakha (POS par nahi aayega)') }]} />
            <Text size="xs" tone="muted">{t('Bika, kharab ya gum — wo bill, Return ya Stock adjustment se hi hota hai')}</Text>
          </>
        )}
        <TextArea label={t('Note')} value={f.notes} onChangeText={(v) => set({ notes: v })} hint={t('Sirf andar ke liye')} />
      </View>
    </Sheet>
  );
}

const TRADE_CONDITIONS = ['OPEN_BOX', 'REFURBISHED', 'USED', 'DAMAGED', 'FOR_PARTS'] as const;

/** A used unit bought from a customer: stock in, cash out of the drawer. */
export function TradeInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [imei, setImei] = useState('');
  const [condition, setCondition] = useState<NonNullable<TradeInPayload['condition']>>('USED');
  const [value, setValue] = useState<number | null>(null);
  const [salePrice, setSalePrice] = useState<number | null>(null);
  const [cust, setCust] = useState<CustomerValue>(emptyCustomer);
  const [look, setLook] = useState('');
  const [notes, setNotes] = useState('');
  const [scan, setScan] = useState(false);
  useEffect(() => { if (open) { setMode('new'); setProduct(null); setName(''); setSerial(''); setImei(''); setCondition('USED'); setValue(null); setSalePrice(null); setCust(emptyCustomer); setLook(''); setNotes(''); } }, [open]);
  const problem = mode === 'existing' && !product ? t('Product chunein') : mode === 'new' && !name.trim() ? t('Cheez ka naam likhein') : !serial.trim() ? t('Serial number likhein') : !((value ?? 0) > 0) ? t('Kitne mein liya — likhein') : !cust.customerId && (!cust.name.trim() || !cust.phone.trim()) ? t('Bechne wale ka naam aur phone likhein') : null;
  const save = useMutation({
    mutationFn: () => serialTrackingApi.tradeIn({
      ...(mode === 'existing' ? { productId: product!.id } : { name: name.trim(), salePrice: salePrice ?? undefined }), serialNumber: serial.trim(), imei: opt(imei), condition, value: value ?? 0,
      customerId: cust.customerId || undefined, customerName: opt(cust.name), customerPhone: opt(cust.phone), physicalCondition: opt(look), notes: opt(notes),
    }),
    onSuccess: (r) => { toast.success(t('{{number}} darj — {{paid}} galle se niklay', { number: r.number, paid: formatMoney(r.value) })); refreshElectronics([...SERIAL_KEYS, 'electronics-serials'], true); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Trade-in save nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} height={0.94} title={t('Purani cheez khareedein')} description={t('Trade-in: stock mein aati hai, paise galle se jate hain')}
      footer={<View style={{ gap: 4 }}><Text size="xs" tone="muted">{problem ?? t('Galle se {{paid}} niklenge', { paid: formatMoney(value ?? 0) })}</Text><Button fullWidth size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('Darj karein')}</Button></View>}>
      <View style={{ gap: th.space(3) }}>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'new', label: t('Nayi cheez') }, { value: 'existing', label: t('Maujooda product') }]} />
        {mode === 'existing' ? <ProductField label={t('Product')} value={product} onChange={(p) => setProduct({ id: p.product.id, name: p.product.name })} />
          : <><Input label={t('Cheez ka naam')} value={name} onChangeText={setName} placeholder={t('Samsung LED 32')} hint={t('Product "Used …" naam se ban jayega')} /><MoneyInput label={t('Bechne ka rate')} value={salePrice} onChangeValue={setSalePrice} /></>}
        <Input label={t('Serial number')} value={serial} onChangeText={setSerial} ltr hint={t('Unit ke peeche ya dabbe par')} trailing={undefined} />
        <Button variant="soft" icon={ScanLine} onPress={() => setScan(true)}>{t('Scan karein')}</Button>
        <Input label={t('IMEI')} value={imei} onChangeText={(v) => setImei(v.replace(/\s/g, ''))} ltr hint={t('Marzi hai')} />
        <Text size="sm" weight="medium" tone="secondary">{t('Halat')}</Text>
        <ChipGroup wrap value={condition} onChange={setCondition} options={TRADE_CONDITIONS.map((c) => ({ value: c, label: conditionLabel(c) }))} />
        <Text size="xs" tone="muted">{t(CONDITION_META[condition].hint)}</Text>
        <MoneyInput label={t('Kitne mein liya (Rs)')} value={value} onChangeValue={setValue} size="xl" />
        <Input label={t('Dikhne mein kaisa')} value={look} onChangeText={setLook} placeholder={t('Halki kharoch, dabba nahi')} hint={t('Marzi hai')} />
        <Card><Text size="sm" weight="semibold" tone="secondary">{t('Kis se liya')}</Text><Text size="xs" tone="muted">{t('Chori ka maal na ho — naam aur phone zaroor likhein')}</Text><CustomerBox value={cust} onChange={setCust} nameLabel={t('Naam')} /></Card>
        <TextArea label={t('Note')} value={notes} onChangeText={setNotes} placeholder={t('CNIC number, kis cheez ke badle liya…')} hint={t('Sirf andar ke liye')} />
      </View>
      {scan && <CameraScan title={t('Serial scan karein')} onClose={() => setScan(false)} onCode={(c) => { setSerial(c.trim()); setScan(false); return true; }} />}
    </Sheet>
  );
}

/**
 * Book or change a bulk order (web BakeryBulkOrderFormPage): who it is for,
 * the event (kind, date, time, place, guests), the lines with rates (linked
 * to own products so the bill takes stock), delivery and setup, and the
 * price with advance and balance. Money already received changes only
 * through payments. Needs the server.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { bulkLines, isClosedOrder } from '@nafaa/core/bakery';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { Amount, Button, Card, Chip, ChipGroup, DatePicker, EmptyState, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { bulkOrdersApi, type BulkOrder, type OrderPayMethod } from '../api';
import { BULK_KEY, BULK_TYPES, PAY_METHODS, refreshBakery } from '../meta';

interface Line { key: string; productId?: string; name: string; qty: number | null; rate: number | null; unit?: string }
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function BulkOrderFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const online = useOnlineStatus();
  const orderQ = useQuery({ queryKey: [BULK_KEY, 'one', id], queryFn: () => bulkOrdersApi.getOne(id!), enabled: editing });
  const [f, setF] = useState({
    organizationName: '', contactPerson: '', contactPhone: '', contactEmail: '', orderType: 'WEDDING', eventDate: null as Date | null, eventTime: '', venue: '', totalGuests: null as number | null,
    requiresDelivery: true, deliveryAddress: '', requiresSetup: false, setupTime: '', specialInstructions: '', finalPrice: null as number | null, advancePaid: null as number | null,
    payMethod: 'CASH' as OrderPayMethod, confirmed: true,
  });
  const [lines, setLines] = useState<Line[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [free, setFree] = useState('');
  const lock = useRef(false);
  const set = (p: Partial<typeof f>) => { setDirty(true); setF((x) => ({ ...x, ...p })); };
  useEffect(() => {
    const o = orderQ.data as BulkOrder | undefined;
    if (!o || loaded) return;
    const d = new Date(o.eventDate);
    setF((x) => ({
      ...x, organizationName: o.organizationName ?? '', contactPerson: o.contactPerson ?? '', contactPhone: o.contactPhone ?? '', contactEmail: o.contactEmail ?? '',
      orderType: o.orderType || 'OTHER', eventDate: d, eventTime: o.eventTime ?? hhmm(d), venue: o.venue ?? '', totalGuests: o.totalGuests ?? null,
      requiresDelivery: !!o.requiresDelivery, deliveryAddress: o.deliveryAddress ?? '', requiresSetup: !!o.requiresSetup, setupTime: o.setupTime ?? '',
      specialInstructions: o.specialInstructions ?? '', finalPrice: o.finalPrice ?? null,
    }));
    setLines(bulkLines(o.items).map((l, i) => ({ key: `${l.productId ?? 'free'}-${i}`, productId: l.productId, name: l.name, qty: l.qty || null, rate: l.rate || null, unit: l.unit })));
    setLoaded(true);
  }, [orderQ.data, loaded]);

  const linesTotal = lines.reduce((s, l) => s + (l.qty ?? 0) * (l.rate ?? 0), 0);
  const price = (f.finalPrice ?? 0) > 0 ? f.finalPrice! : linesTotal;
  const paid = editing ? Number(orderQ.data?.paidAmount || 0) : f.advancePaid ?? 0;
  const balance = Math.max(price - paid, 0);
  const picked = useMemo(() => new Set(lines.map((l) => l.productId).filter(Boolean) as string[]), [lines]);
  const update = (key: string, patch: Partial<Line>) => { setDirty(true); setLines((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x))); };

  const problems = useMemo(() => {
    const out: string[] = [];
    if (editing && orderQ.data && isClosedOrder(orderQ.data.status)) out.push(t('Mukammal ya cancel order badla nahi ja sakta'));
    if (!f.organizationName.trim()) out.push(t('Kis ka order hai — naam likhein'));
    if (f.contactPhone.replace(/\D/g, '').length < 10) out.push(t('Poora phone number likhein'));
    if (!f.eventDate) out.push(t('Event ki date chunein'));
    if (!lines.length) out.push(t('Kam se kam ek cheez daalein'));
    for (const l of lines) {
      if (!l.name.trim()) { out.push(t('Har line ka naam likhein')); break; }
      if (!((l.qty ?? 0) > 0)) { out.push(t('"{{name}}" ki quantity likhein', { name: l.name })); break; }
      if (!((l.rate ?? 0) > 0)) { out.push(t('"{{name}}" ka rate likhein', { name: l.name })); break; }
    }
    if (f.requiresDelivery && !f.deliveryAddress.trim() && !f.venue.trim()) out.push(t('Pahunchana hai to pata ya jagah likhein'));
    if (!editing && paid > price) out.push(t('Advance kul rakam se zyada nahi ho sakta'));
    if (editing && price + 0.005 < paid) out.push(t('{{paid}} pehle mil chuka — kul rakam is se kam nahi ho sakti', { paid: formatMoney(paid) }));
    return out;
  }, [f, lines, editing, orderQ.data, paid, price]);

  const submit = async () => {
    if (lock.current || saving) return;
    if (!online) { toast.warning(onlineNeededText('bakeryOrders')); return; }
    if (problems.length) { toast.error(problems[0]); return; }
    lock.current = true;
    setSaving(true);
    const d = new Date(f.eventDate!);
    const [hh, mm] = (f.eventTime || '23:59').split(':').map(Number);
    d.setHours(hh || 0, mm || 0, 0, 0);
    const body: Record<string, unknown> = {
      organizationName: f.organizationName.trim(), contactPerson: f.contactPerson.trim(), contactPhone: f.contactPhone.trim(), contactEmail: f.contactEmail.trim(),
      orderType: f.orderType, eventDate: d.toISOString(), eventTime: f.eventTime, venue: f.venue.trim(), totalGuests: f.totalGuests || undefined,
      items: lines.map((l) => ({ productId: l.productId, name: l.name.trim(), qty: l.qty, rate: l.rate, unit: l.unit, total: (l.qty ?? 0) * (l.rate ?? 0) })),
      quotedPrice: Math.round(linesTotal * 100) / 100, finalPrice: (f.finalPrice ?? 0) > 0 ? f.finalPrice : null,
      requiresDelivery: f.requiresDelivery, deliveryAddress: f.requiresDelivery ? f.deliveryAddress.trim() || f.venue.trim() : '',
      requiresSetup: f.requiresSetup, setupTime: f.requiresSetup ? f.setupTime : '', specialInstructions: f.specialInstructions.trim(),
    };
    try {
      const o = editing ? await bulkOrdersApi.update(id!, body)
        : await bulkOrdersApi.create({ ...body, advancePaid: paid, ...(paid > 0 && { paymentMethod: f.payMethod }), status: f.confirmed || paid > 0 ? 'CONFIRMED' : 'QUOTED' });
      toast.success(editing ? t('Order save ho gaya') : t('Order {{orderNumber}} ban gaya', { orderNumber: o.orderNumber }));
      refreshBakery([BULK_KEY], paid > 0 && !editing);
      setDirty(false);
      router.back();
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setSaving(false); lock.current = false; }
  };

  if (editing && !orderQ.data) return <FormTemplate title={t('Bara order')} onSave={() => undefined} saveDisabled>{orderQ.isLoading ? <View /> : <EmptyState title={t('Yeh order nahi mila')} />}</FormTemplate>;

  return (
    <>
      <FormTemplate title={editing ? t('{{orderNumber}} — badlein', { orderNumber: orderQ.data?.orderNumber }) : t('Naya bara order')}
        subtitle={editing ? t('Mila hua paisa yahan se nahi badalta — order ki list me "Paisa mila" se') : undefined}
        dirty={dirty} saving={saving} onSave={() => void submit()} saveLabel={editing ? t('Save karein') : t('Order banayein')}>
        {!online && <Card tone="warning"><Text size="sm">{onlineNeededText('bakeryOrders')}</Text></Card>}
        <FormSection title={t('Kis ka order')}>
          <Input label={t('Idara / naam')} value={f.organizationName} onChangeText={(organizationName) => set({ organizationName })} placeholder={t('Ahmed sahib ki shadi, ABC School…')} />
          <Input label={t('Rabta (kis se baat hui)')} value={f.contactPerson} onChangeText={(contactPerson) => set({ contactPerson })} placeholder={t('Ahmed')} hint={t('Marzi hai')} />
          <Input label={t('Phone')} value={f.contactPhone} onChangeText={(contactPhone) => set({ contactPhone })} keyboardType="phone-pad" ltr placeholder="03001234567" hint={t('WhatsApp isi par')} />
          <Input label={t('Email')} value={f.contactEmail} onChangeText={(contactEmail) => set({ contactEmail })} keyboardType="email-address" autoCapitalize="none" ltr hint={t('Marzi hai')} />
        </FormSection>
        <FormSection title={t('Event')}>
          <ChipGroup wrap value={f.orderType} onChange={(orderType) => set({ orderType })} options={BULK_TYPES.map((x) => ({ value: x.value, label: `${x.emoji} ${t(x.label)}` }))} />
          <Row gap={2}>
            <View style={{ flex: 1 }}><DatePicker label={t('Date')} value={f.eventDate} onChange={(eventDate) => set({ eventDate })} /></View>
            <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Waqt')} value={f.eventTime ? new Date(`2000-01-01T${f.eventTime}:00`) : null} onChange={(d) => set({ eventTime: hhmm(d) })} hint={t('Na likhein to din ke aakhir tak')} /></View>
          </Row>
          <NumberInput integer label={t('Mehmaan')} value={f.totalGuests} onChangeValue={(totalGuests) => set({ totalGuests })} hint={t('Marzi hai')} />
          <Input label={t('Jagah')} value={f.venue} onChangeText={(venue) => set({ venue })} placeholder={t('Hall ka naam, ghar ka pata')} />
        </FormSection>
        <FormSection title={t('Cheezein')} description={t('Apne maal se jorein — bill me stock khud ghatega aur kitchen list me stock milega')}>
          {lines.map((l) => (
            <Card key={l.key} tone="muted">
              <View style={{ gap: th.space(2) }}>
                <Row gap={2}>
                  {l.productId ? <Text weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{l.name}</Text>
                    : <Input containerStyle={{ flex: 1 }} value={l.name} onChangeText={(name) => update(l.key, { name })} placeholder={t('Cheez ka naam')} />}
                  <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => { setDirty(true); setLines((xs) => xs.filter((x) => x.key !== l.key)); }} />
                </Row>
                <Row gap={2}>
                  <NumberInput containerStyle={{ flex: 1 }} label={t('Kitne')} value={l.qty} onChangeValue={(qty) => update(l.key, { qty })} />
                  <MoneyInput containerStyle={{ flex: 1 }} label={t('Rate')} value={l.rate} onChangeValue={(rate) => update(l.key, { rate })} />
                </Row>
                <Text size="xs" tone="muted" align="end">{l.unit ? `${l.unit} · ` : ''}{formatMoney((l.qty ?? 0) * (l.rate ?? 0))}{!l.productId ? t(' · maal se nahi juri') : ''}</Text>
              </View>
            </Card>
          ))}
          <Button variant="secondary" icon={Plus} onPress={() => setPicking(true)}>{t('Cheez search — naam, SKU, barcode…')}</Button>
          <Row gap={2}>
            <Input containerStyle={{ flex: 1 }} value={free} onChangeText={setFree} placeholder={t('Cheez ka naam')} />
            <Button variant="ghost" disabled={!free.trim()} onPress={() => { setDirty(true); setLines((xs) => [...xs, { key: `free-${Date.now()}`, name: free.trim(), qty: null, rate: null }]); setFree(''); }}>{t('"{{value}}" — bina maal ke', { value: free.trim() || '…' })}</Button>
          </Row>
        </FormSection>
        <FormSection title={t('Pahunchana aur setup')}>
          <Switch value={f.requiresDelivery} onChange={(requiresDelivery) => set({ requiresDelivery })} label={t('Hum pahunchayenge')} description={t('Band ho to customer khud le jayega')} />
          {f.requiresDelivery && <TextArea label={t('Pata')} value={f.deliveryAddress} onChangeText={(deliveryAddress) => set({ deliveryAddress })} placeholder={t('Khali chhorein to jagah wala pata')} />}
          <Switch value={f.requiresSetup} onChange={(requiresSetup) => set({ requiresSetup })} label={t('Wahan setup karna hai')} description={t('Table, stand, sajawat')} />
          {f.requiresSetup && <DatePicker mode="time" label={t('Setup ka waqt')} value={f.setupTime ? new Date(`2000-01-01T${f.setupTime}:00`) : null} onChange={(d) => set({ setupTime: hhmm(d) })} />}
          <TextArea label={t('Hidayat')} value={f.specialInstructions} onChangeText={(specialInstructions) => set({ specialInstructions })} maxLength={1000} placeholder={t('Packing, naam ki chit, alag dabbe…')} hint={t('Parchi par chhapti hai')} />
        </FormSection>
        <FormSection title={t('Rakam')}>
          <Card tone="muted"><Row justify="between"><Text tone="secondary">{t('Cheezon ka jor')}</Text><Amount value={linesTotal} /></Row><Row justify="between"><Text weight="semibold">{t('Kul')}</Text><Amount value={price} weight="bold" size="lg" /></Row></Card>
          <MoneyInput label={t('Pakki rakam')} value={f.finalPrice} onChangeValue={(finalPrice) => set({ finalPrice })} placeholder={String(Math.round(linesTotal))} hint={t('Sirf tab likhein jab tay hui rakam jor se alag ho (discount ya extra)')} />
          {editing ? <Text size="sm" tone="secondary">{t('Ab tak mila:')} {formatMoney(paid)}</Text> : (
            <>
              <MoneyInput label={t('Advance mila')} value={f.advancePaid} onChangeValue={(advancePaid) => set({ advancePaid })} hint={t('Advance aate hi order pakka ho jata hai')} />
              <Row gap={2} wrap>{[25, 50, 100].map((p) => <Chip key={p} label={`${p}% · ${formatMoney(Math.round((price * p) / 100))}`} selected={paid === Math.round((price * p) / 100) && paid > 0} onPress={() => set({ advancePaid: Math.round((price * p) / 100) })} />)}</Row>
              {paid > 0 && <ChipGroup wrap value={f.payMethod} onChange={(payMethod) => set({ payMethod })} options={PAY_METHODS.map((m) => ({ value: m.id, label: t(m.label) }))} />}
              {!(paid > 0) && <Switch value={f.confirmed} onChange={(confirmed) => set({ confirmed })} label={t('Order pakka hai')} description={f.confirmed ? t('Bina advance ke bhi pakka') : t('Sirf rate bataya — abhi pakka nahi')} />}
            </>
          )}
          <Card tone="brand"><Row justify="between"><Text weight="semibold">{t('Baqi')}</Text><Amount value={balance} weight="bold" size="lg" /></Row></Card>
        </FormSection>
        {problems.length > 0 && (f.organizationName || lines.length || editing) ? <Text size="sm" tone="warning">{problems[0]}</Text> : null}
      </FormTemplate>
      <ProductPicker open={picking} onClose={() => setPicking(false)} title={t('Cheezein')} includeRaw={false} variants={false} keepOpen pickedIds={picked}
        onPick={(p) => { if (picked.has(p.product.id)) return; setDirty(true); setLines((xs) => [...xs, { key: p.product.id, productId: p.product.id, name: p.product.name, qty: null, rate: p.product.price || null, unit: p.product.unit }]); }} />
    </>
  );
}

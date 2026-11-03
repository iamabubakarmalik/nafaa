/** Restaurants / hotels (web WholesalePage): wholesale accounts on the customer's khata with a credit limit, days, discount and delivery days; payments and the restaurant rate at the counter. */

import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, DetailRow, EmptyState, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Select, Sheet, Switch, Text, confirm, toast, useTheme } from '@/design';
import { CustomerPickerSheet, type PickedCustomer } from '@/modules/customers/components/CustomerPickerSheet';
import { NumberInput } from '@/modules/inventory/components/fields';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { wholesaleApi, type WholesaleAccount } from '../api';
import { BUSINESS_TYPES, DAYS, MEAT_KEYS, opt, phoneOk, refreshMeat } from '../meta';

export function WholesaleScreen() {
  const th = useTheme();
  const can = usePermission();
  const canEdit = can(P.CUSTOMERS_EDIT);
  const { guard } = useDeskOnline('meatDesk');
  const { cost } = useCostMask();
  const [active, setActive] = useState<'true' | 'false' | ''>('true');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<WholesaleAccount | null>(null);
  const [form, setForm] = useState<WholesaleAccount | 'new' | null>(null);
  const q = useQuery({ queryKey: [MEAT_KEYS.wholesale, active], queryFn: () => wholesaleApi.list({ active: active || undefined }) });
  const all = q.data ?? [];
  const s = search.trim().toLowerCase();
  const rows = all.filter((a) => !s || [a.businessName, a.accountNumber, a.contactPerson, a.contactPhone].join(' ').toLowerCase().includes(s));
  const owed = all.reduce((x, a) => x + Math.max(a.totalOutstanding, 0), 0);
  const live = open ? all.find((a) => a.id === open.id) ?? open : null;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Building2, tone: 'info', label: t('Accounts'), loading: q.isLoading, value: String(all.length) },
        { icon: Wallet, tone: 'danger', label: t('Kul udhaar'), loading: q.isLoading, value: cost(owed) },
      ]} />
      <Segmented value={active} onChange={setActive} options={[{ value: 'true', label: t('Chalu') }, { value: 'false', label: t('Band') }, { value: '', label: t('Sab') }]} />
      <OfflineNote feature="meatDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<WholesaleAccount>
        title={t('Restaurants / hotels')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Business, number ya rabta…') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(a) => a.id}
        renderItem={({ item: a }) => {
          const over = a.creditLimit > 0 && a.totalOutstanding > a.creditLimit;
          return (
            <RowCard dim={!a.isActive}>
              <ListRow icon={Building2} iconTone={over ? 'danger' : 'info'}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{a.businessName}</Text>{over && <Badge tone="danger">{t('Had se upar')}</Badge>}{!a.isActive && <Badge tone="neutral">{t('Band')}</Badge>}</Row>}
                subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" ltr numberOfLines={1}>{`${a.accountNumber} · ${t(BUSINESS_TYPES.find((b) => b.value === a.businessType)?.label ?? a.businessType)}`}</Text><Text size="xs" tone="secondary" numberOfLines={1}>{[a.contactPerson, a.discountPct ? `${a.discountPct}%` : '', a.creditLimit ? `${t('Had')} ${formatMoney(a.creditLimit)}` : ''].filter(Boolean).join(' · ')}</Text></View>}
                trailing={a.totalOutstanding > 0 ? <Amount value={a.totalOutstanding} weight="bold" tone="danger" /> : undefined}
                chevron onPress={() => setOpen(a)} />
            </RowCard>
          );
        }}
        empty={<EmptyState icon={Building2} title={search ? t('Koi account nahi mila') : t('Abhi koi restaurant / hotel account nahi')} message={t('Restaurant ya hotel ka account banayein — udhaar ki had, discount aur delivery ke din ek jagah.')} />}
        fab={canEdit ? { icon: Plus, label: t('Naya account'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <AccountSheet a={live} canEdit={canEdit} onClose={() => setOpen(null)} onEdit={(a) => { setOpen(null); guard(() => setForm(a)); }} />
      <AccountForm value={form} onClose={() => setForm(null)} />
    </>
  );
}

function AccountSheet({ a, canEdit, onClose, onEdit }: { a: WholesaleAccount | null; canEdit: boolean; onClose: () => void; onEdit: (a: WholesaleAccount) => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('meatDesk');
  const [paying, setPaying] = useState(false);
  const remove = async () => {
    if (!a || !(await confirm({ title: t('Account band karein?'), message: t('Khata aur purane bill mehfooz rahenge'), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    try { await wholesaleApi.remove(a.id); refreshMeat([MEAT_KEYS.wholesale]); toast.success(t('Account band')); onClose(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  return (
    <>
      <Sheet open={!!a && !paying} onClose={onClose} height={0.85} title={a?.businessName} description={a ? `${a.accountNumber} · ${t(BUSINESS_TYPES.find((b) => b.value === a.businessType)?.label ?? a.businessType)}` : undefined}
        footer={a && canEdit ? <Row gap={2}>{a.totalOutstanding > 0 && <Button style={{ flex: 1 }} size="lg" variant="success" icon={Wallet} onPress={() => guard(() => setPaying(true))}>{t('Amount')}</Button>}<Button style={{ flex: 1 }} size="lg" variant="secondary" onPress={() => onEdit(a)}>{t('Badlein')}</Button></Row> : undefined}>
        {a && (
          <View style={{ gap: th.space(3) }}>
            <Card flush>
              <DetailRow label={t('Kul udhaar')} value={<Amount value={a.totalOutstanding} weight="bold" tone={a.totalOutstanding > 0 ? 'danger' : undefined} />} />
              <DetailRow label={t('Udhaar ki had')} value={a.creditLimit ? formatMoney(a.creditLimit) : t('Koi had nahi')} />
              <DetailRow label={t('Kitne din me paisa')} value={String(a.creditDays)} />
              <DetailRow label={t('Discount % (orders par)')} value={`${a.discountPct}%`} />
              <DetailRow label={t('Delivery wale')} value={a.requiresDelivery ? a.deliveryDays.map((d) => t(DAYS[d])).join(', ') || t('Haan') : t('Nahi')} />
              {!!a.deliveryAddress && <DetailRow label={t('Delivery ka pata')} value={a.deliveryAddress} />}
              {!!a.contactPerson && <DetailRow label={t('Rabta (marzi)')} value={a.contactPerson} />}
              {!!a.contactPhone && <DetailRow label={t('Phone')} value={<Text ltr>{a.contactPhone}</Text>} />}
              <DetailRow label={t('Kul orders')} value={`${a.totalOrders} · ${formatMoney(a.totalPurchases)}`} last />
            </Card>
            {canEdit && <Button variant="ghost" icon={Trash2} onPress={() => guard(() => void remove())}>{t('Hatayein')}</Button>}
          </View>
        )}
      </Sheet>
      <PaySheet open={paying} title={t('Amount')} name={a?.businessName ?? ''} due={Math.max(a?.totalOutstanding ?? 0, 0)} advance cta={t('Darj karein')}
        onConfirm={async ({ paymentMethod, paidAmount }) => { await wholesaleApi.payment(a!.id, paidAmount, paymentMethod); refreshMeat([MEAT_KEYS.wholesale], true); toast.success(t('{{formatPKR}} darj ho gaya', { formatPKR: formatMoney(paidAmount) })); }} onClose={() => setPaying(false)} />
    </>
  );
}

function AccountForm({ value, onClose }: { value: WholesaleAccount | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const a = value === 'new' ? null : value;
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [pick, setPick] = useState(false);
  const [f, setF] = useState({ name: '', type: 'RESTAURANT', person: '', phone: '', address: '', limit: null as number | null, days: null as number | null, discount: null as number | null, delivery: false, deliveryDays: [] as number[], slot: '', ntn: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!value) return;
    setTouched(false); setCustomer(null);
    setF({ name: a?.businessName ?? '', type: a?.businessType ?? 'RESTAURANT', person: a?.contactPerson ?? '', phone: a?.contactPhone ?? '', address: a?.deliveryAddress ?? '', limit: a?.creditLimit || null, days: a?.creditDays || null, discount: a?.discountPct || null, delivery: a?.requiresDelivery ?? false, deliveryDays: a?.deliveryDays ?? [], slot: a?.deliveryTimeSlot ?? '', ntn: a?.ntnNumber ?? '' });
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const error = !a && !customer ? t('Customer chunein') : f.name.trim().length < 2 ? t('Business ka naam likhein') : !phoneOk(f.phone) ? t('Phone theek likhein') : f.discount != null && (f.discount < 0 || f.discount > 50) ? t('Discount 0 se 50% tak') : f.delivery && !f.address.trim() ? t('Delivery ka pata likhein') : '';
  const save = async () => {
    setTouched(true);
    if (error) { toast.error(error); return; }
    const body: Partial<WholesaleAccount> = { businessName: f.name.trim(), businessType: f.type, contactPerson: opt(f.person), contactPhone: opt(f.phone), deliveryAddress: opt(f.address), creditLimit: f.limit ?? 0, creditDays: f.days ?? 0, discountPct: f.discount ?? 0, requiresDelivery: f.delivery, deliveryDays: f.deliveryDays, deliveryTimeSlot: opt(f.slot), ntnNumber: opt(f.ntn) };
    setBusy(true);
    try {
      const r = a ? await wholesaleApi.update(a.id, body) : await wholesaleApi.create({ ...body, customerId: customer!.id });
      refreshMeat([MEAT_KEYS.wholesale]);
      toast.success(a ? t('Account badal diya') : t('Account {{accountNumber}} ban gaya', { accountNumber: r.accountNumber }));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Account save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={!!value && !pick} onClose={onClose} height={0.95} title={a ? t('{{accountNumber}} badlein', { accountNumber: a.accountNumber }) : t('Naya restaurant / hotel account')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          {!a && <ListRow icon={Building2} title={customer ? customer.name : t('Customer (khata isi ka)')} subtitle={customer?.phone ?? t('Naam ya phone likhein')} chevron onPress={() => setPick(true)} />}
          <Input label={t('Business ka naam')} value={f.name} onChangeText={(v) => set('name', v)} error={touched && f.name.trim().length < 2 ? error : undefined} />
          <Select label={t('Type')} value={f.type} onChange={(v) => set('type', v)} options={BUSINESS_TYPES.map((b) => ({ value: b.value, label: t(b.label) }))} />
          <Input label={t('Rabta (marzi)')} value={f.person} onChangeText={(v) => set('person', v)} />
          <Input label={t('Phone')} keyboardType="phone-pad" ltr value={f.phone} onChangeText={(v) => set('phone', v)} />
          <MoneyInput label={t('Udhaar ki had')} value={f.limit} onChangeValue={(v) => set('limit', v)} hint={t('Koi had nahi')} />
          <NumberInput label={t('Kitne din me paisa')} integer value={f.days} onChangeValue={(v) => set('days', v)} />
          <NumberInput label={t('Discount % (orders par)')} value={f.discount} onChangeValue={(v) => set('discount', v)} />
          <Switch value={f.delivery} onChange={(v) => set('delivery', v)} label={t('Maal hum pohanchate hain')} />
          {f.delivery && (
            <>
              <Input label={t('Delivery ka pata')} value={f.address} onChangeText={(v) => set('address', v)} />
              <ChipGroup wrap multiple value={f.deliveryDays.map(String)} onChange={(v) => set('deliveryDays', v.map(Number))} options={DAYS.map((d, i) => ({ value: String(i), label: t(d) }))} />
              <Input label={t('Waqt')} value={f.slot} onChangeText={(v) => set('slot', v)} />
            </>
          )}
          <Input label={t('NTN (marzi)')} ltr value={f.ntn} onChangeText={(v) => set('ntn', v)} />
        </View>
      </Sheet>
      <CustomerPickerSheet open={pick} title={t('Customer (khata isi ka)')} onPick={(c) => { setCustomer(c); if (!f.name) set('name', c.name); if (!f.phone && c.phone) set('phone', c.phone); setPick(false); }} onClose={() => setPick(false)} />
    </>
  );
}

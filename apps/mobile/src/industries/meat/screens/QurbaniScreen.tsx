/** Qurbani / aqeeqa bookings (web QurbaniPage): shares booked before Eid with an advance, then confirmed, slaughtered and handed over with one bill (the advance cancels it). */

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Ban, Beef, Pencil, Plus, Receipt, Undo2, Users, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { isShared, sharesOk } from '@nafaa/core/industries/meat';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, DetailRow, EmptyState, HBarList, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Select, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ReceiveSheet } from '../../_shared/farm/ReceiveSheet';
import { OfflineNote, PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { ReasonSheet, RowCard, StatRow } from '../../_shared/farm/ui';
import { RefundSheet } from '../components/MoneySheets';
import { liveAnimalsApi, qurbaniApi, type QurbaniBooking } from '../api';
import { MEAT_KEYS, PAY_METHODS, QURBANI_KINDS, QURBANI_OCCASIONS, QURBANI_STATUS, animalOf, animalText, kg, occasionLabel, opt, phoneOk, refreshMeat } from '../meta';

const isOpen = (b: QurbaniBooking) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED';

export function QurbaniScreen() {
  const th = useTheme();
  const can = usePermission();
  const canPos = can(P.POS_USE);
  const { guard } = useDeskOnline('meatDesk');
  const [status, setStatus] = useState('open');
  const [occasion, setOccasion] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'analytics'>('list');
  const [form, setForm] = useState<QurbaniBooking | 'new' | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: [MEAT_KEYS.qurbani, occasion], queryFn: () => qurbaniApi.list({ occasion: occasion || undefined }) });
  const all = q.data ?? [];
  const s = search.trim().toLowerCase();
  const rows = all.filter((b) => (status === 'open' ? isOpen(b) : status ? b.status === status : true) && (!s || [b.customerName, b.customerPhone, b.bookingNumber].join(' ').toLowerCase().includes(s)));
  const openRows = all.filter(isOpen);
  const shares = openRows.reduce((x, b) => x + b.shareCount, 0);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Users, tone: 'accent', label: t('Chal rahi'), loading: q.isLoading, value: String(openRows.length), hint: t('{{shares}} hisse', { shares }), onPress: () => setStatus('open') },
        { icon: Beef, tone: 'warning', label: t('Zibah ho gaya'), loading: q.isLoading, value: String(all.filter((b) => b.status === 'SLAUGHTERED').length), hint: t('Gosht dena baqi'), onPress: () => setStatus('SLAUGHTERED') },
      ]} />
      <Segmented value={view} onChange={setView} options={[{ value: 'list', label: t('Bookings') }, { value: 'analytics', label: t('Analytics') }]} />
      <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'open', label: t('Chal rahi') }, ...Object.entries(QURBANI_STATUS).map(([value, x]) => ({ value, label: t(x.label) })), { value: '', label: t('Sab') }]} />
      <ChipGroup value={occasion} onChange={setOccasion} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab mauqe') }, ...QURBANI_OCCASIONS.map((o) => ({ value: o.value, label: t(o.label) }))]} />
      <OfflineNote feature="meatDesk" />
      {view === 'analytics' && (
        <Card title={t('Eid ke din aur janwar ke hisaab se (chalti bookings)')}>
          {openRows.length === 0 ? <Text size="sm" tone="muted">{t('Koi chalti booking nahi')}</Text> : (
            <HBarList colorful rows={Object.entries(openRows.reduce<Record<string, { n: number; shares: number }>>((acc, b) => { const k = t('Din {{value}} · {{label}}', { value: b.slaughterDay ?? '—', label: animalText(b.animalType) }); const r = acc[k] ?? { n: 0, shares: 0 }; r.n += 1; r.shares += b.shareCount; acc[k] = r; return acc; }, {})).sort().map(([k, r]) => ({ key: k, label: k, value: r.shares, display: <Text size="xs" tone="muted">{t('{{n}} booking · {{shares}} hisse', { n: r.n, shares: r.shares })}</Text> }))} />
          )}
        </Card>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<QurbaniBooking>
        title={t('Qurbani / aqeeqa bookings')}
        grouped={false}
        search={view === 'list' ? { value: search, onChange: setSearch, placeholder: t('Naam, phone ya booking #…') } : undefined}
        summary={header}
        data={view === 'list' ? rows : []}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(b) => b.id}
        renderItem={({ item: b }) => {
          const st = QURBANI_STATUS[b.status] ?? { label: b.status, tone: 'neutral' as const };
          const due = Math.max((b.finalPrice ?? 0) - b.paidAmount, 0);
          return (
            <RowCard>
              <ListRow leading={<Text style={{ fontSize: 26 }}>{animalOf(b.animalType).emoji}</Text>}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{b.customerName}</Text><Badge tone={st.tone}>{t(st.label)}</Badge><Badge tone="neutral">{occasionLabel(b.occasion)}</Badge></Row>}
                subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" ltr numberOfLines={1}>{`${b.bookingNumber} · ${b.customerPhone}`}</Text><Text size="xs" tone="secondary" numberOfLines={1}>{`${animalText(b.animalType)} · ${t('{{shareCount}} hissa', { shareCount: b.shareCount })}${b.slaughterDay ? ` · ${t('Din {{value}}', { value: b.slaughterDay })}` : ''}`}</Text></View>}
                trailing={<View style={{ alignItems: 'flex-end' }}>{b.finalPrice ? <Amount value={b.finalPrice} weight="bold" /> : <Text size="xs" tone="warning">{t('Qeemat nahi')}</Text>}{isOpen(b) && due > 0 && <Text size="2xs" tone="warning">{t('Baqi {{due}}', { due: formatMoney(due) })}</Text>}</View>}
                chevron onPress={() => setOpen(b.id)} />
            </RowCard>
          );
        }}
        empty={view === 'list' ? <EmptyState icon={Beef} title={t('Koi booking nahi')} message={t('Eid se pehle hisse book karein — naam, phone, kitne hisse aur advance.')} /> : undefined}
        fab={canPos ? { icon: Plus, label: t('Nayi booking'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <BookingSheet id={open} canPos={canPos} onClose={() => setOpen(null)} onEdit={(b) => { setOpen(null); guard(() => setForm(b)); }} />
      <BookingForm value={form} onClose={() => setForm(null)} />
    </>
  );
}

function BookingSheet({ id, canPos, onClose, onEdit }: { id: string | null; canPos: boolean; onClose: () => void; onEdit: (b: QurbaniBooking) => void }) {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('meatDesk');
  const [dialog, setDialog] = useState<'pay' | 'done' | 'cancel' | 'refund' | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: [MEAT_KEYS.qurbani, 'one', id], queryFn: () => qurbaniApi.getOne(id!), enabled: !!id, staleTime: 0 });
  const b = q.data;
  const held = (b?.khataPaid ?? 0) + (b?.legacyPaid ?? 0);
  const due = b ? Math.max((b.finalPrice ?? 0) - b.paidAmount, 0) : 0;
  const next = b ? (b.status === 'BOOKED' ? { s: 'CONFIRMED', l: t('Pakki karein') } : b.status === 'CONFIRMED' ? { s: 'SLAUGHTERED', l: t('Zibah ho gaya') } : null) : null;
  const done = (money = false) => { refreshMeat([MEAT_KEYS.qurbani], money); void q.refetch(); };
  const step = async () => {
    if (!b || !next) return;
    setBusy(true);
    try { await qurbaniApi.updateStatus(b.id, next.s); done(); toast.success(next.l); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={!!id && !dialog} onClose={onClose} height={0.9} title={b?.customerName} description={b ? `${b.bookingNumber} · ${occasionLabel(b.occasion)}` : undefined}
        footer={b && canPos && isOpen(b) ? <Row gap={2}>{next && <Button style={{ flex: 1 }} size="lg" iconEnd={ArrowRight} loading={busy} onPress={() => guard(() => void step())}>{next.l}</Button>}<Button style={{ flex: 1 }} size="lg" variant="success" icon={Receipt} disabled={!b.finalPrice} onPress={() => guard(() => setDialog('done'))}>{t('Gosht de dein')}</Button></Row> : undefined}>
        {b && (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2} wrap><Badge tone={(QURBANI_STATUS[b.status] ?? { tone: 'neutral' as const }).tone}>{t(QURBANI_STATUS[b.status]?.label ?? b.status)}</Badge></Row>
            <Card flush>
              <DetailRow label={t('Janwar')} value={`${animalText(b.animalType)} · ${t('{{shareCount}} hissa', { shareCount: b.shareCount })}`} />
              <DetailRow label={t('Phone')} value={<Text ltr>{b.customerPhone}</Text>} />
              {!!b.slaughterDay && <DetailRow label={t('Kaunsa din')} value={t('Din {{value}}', { value: b.slaughterDay })} />}
              <DetailRow label={t('Kul qeemat')} value={b.finalPrice ? <Amount value={b.finalPrice} weight="bold" /> : t('Qeemat nahi')} />
              <DetailRow label={t('Advance mila')} value={formatMoney(b.paidAmount)} />
              <DetailRow label={t('Lena baqi')} value={<Amount value={due} tone={due > 0 ? 'danger' : undefined} weight="bold" />} />
              <DetailRow label={t('Gosht ghar bhejna hai')} value={b.wantsMeatDelivery ? b.deliveryAddress ?? t('Haan') : t('Nahi')} />
              <DetailRow label={t('Khaal customer ko chahiye')} value={b.wantsSkin ? t('Haan') : t('Nahi')} />
              <DetailRow label={t('Hidayat (marzi)')} value={b.specialInstructions || b.cancellationReason || '—'} last />
            </Card>
            {b.bill && <Card tone="success"><Text size="sm" weight="medium">{t('Bill {{saleNumber}}', { saleNumber: b.bill.saleNumber })} · {formatMoney(b.bill.total)}</Text></Card>}
            {canPos && (
              <Row gap={2} wrap>
                {isOpen(b) && (!b.finalPrice || due > 0) && <Button variant="secondary" icon={Wallet} style={{ flex: 1 }} onPress={() => guard(() => setDialog('pay'))}>{t('Paisa mila')}</Button>}
                {isOpen(b) && <Button variant="secondary" icon={Pencil} style={{ flex: 1 }} onPress={() => onEdit(b)}>{t('Badlein')}</Button>}
                {isOpen(b) && <Button variant="ghost" icon={Ban} style={{ flex: 1 }} onPress={() => guard(() => setDialog('cancel'))}>{t('Cancel')}</Button>}
                {b.status === 'CANCELLED' && b.paidAmount > 0 && can(P.RETURNS_CREATE) && <Button variant="secondary" icon={Undo2} style={{ flex: 1 }} onPress={() => guard(() => setDialog('refund'))}>{t('Advance wapas')}</Button>}
              </Row>
            )}
          </View>
        )}
      </Sheet>
      <ReceiveSheet open={dialog === 'pay'} title={t('Advance / paisa mila')} description={b ? `${b.bookingNumber} · ${b.customerName}` : ''} max={b?.finalPrice ? due : undefined} cta={t('Darj karein')}
        onConfirm={async ({ paymentMethod, paidAmount }) => { await qurbaniApi.payment(b!.id, paidAmount, paymentMethod); done(true); toast.success(t('{{formatPKR}} darj ho gaya', { formatPKR: formatMoney(paidAmount) })); }} onClose={() => setDialog(null)} />
      <PaySheet open={dialog === 'done'} title={t('Gosht de dein aur bill banayein')} name={b ? `${b.bookingNumber} · ${b.customerName}` : ''} due={Math.max((b?.finalPrice ?? 0) - held, 0)} cta={t('Bill banayein')}
        onConfirm={async ({ paymentMethod, paidAmount }) => { const r = await qurbaniApi.complete(b!.id, paidAmount, paymentMethod); done(true); toast.success(t('{{bookingNumber}} de diya — bill {{saleNumber}}', { bookingNumber: b!.bookingNumber, saleNumber: r.sale.saleNumber })); }} onClose={() => setDialog(null)} />
      <ReasonSheet open={dialog === 'cancel'} title={t('Cancel karein?')} description={b?.paidAmount ? t('Advance khate me jama rehta hai — wapas dena ho to "Advance wapas" se dein.') : undefined} cta={t('Haan, cancel')}
        onClose={() => setDialog(null)} onConfirm={async (reason) => { try { await qurbaniApi.updateStatus(b!.id, 'CANCELLED', reason); done(); toast.success(t('Cancel ho gaya')); } catch (e) { toast.error(errorText(e, t('Cancel nahi hua'))); throw e; } }} />
      <RefundSheet open={dialog === 'refund'} title={b ? `${b.bookingNumber} · ${b.customerName}` : ''} held={b?.khataPaid ?? 0} legacy={b?.legacyPaid ?? 0} onRefund={(pin) => qurbaniApi.refund(b!.id, pin).then(() => done(true))} onClose={() => setDialog(null)} />
    </>
  );
}

function BookingForm({ value, onClose }: { value: QurbaniBooking | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const b = value === 'new' ? null : value;
  const [f, setF] = useState({ name: '', phone: '', occasion: 'QURBANI', type: 'BEEF', shares: 1 as number | null, price: null as number | null, animalId: '', day: '1', delivery: false, address: '', skin: false, notes: '', advance: null as number | null, method: 'CASH' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!value) return;
    setF({ name: b?.customerName ?? '', phone: b?.customerPhone ?? '', occasion: b?.occasion ?? 'QURBANI', type: b?.animalType ?? 'BEEF', shares: b?.shareCount ?? 1, price: b?.finalPrice ?? null, animalId: b?.liveAnimalId ?? '', day: String(b?.slaughterDay ?? 1), delivery: b?.wantsMeatDelivery ?? false, address: b?.deliveryAddress ?? '', skin: b?.wantsSkin ?? false, notes: b?.specialInstructions ?? '', advance: null, method: 'CASH' });
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const animals = useQuery({ queryKey: [MEAT_KEYS.animals, { isSlaughtered: 'false' }], queryFn: () => liveAnimalsApi.list({ isSlaughtered: 'false' }), enabled: !!value });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const shared = isShared(f.type);
  const error = f.name.trim().length < 2 ? t('Naam likhein') : !/^[0-9+\-\s]{10,15}$/.test(f.phone.trim()) ? t('Phone theek likhein (03xx-xxxxxxx)') : !sharesOk(f.type, f.shares ?? 1) ? t('Hisse 1 se 7 tak') : f.price != null && !(f.price > 0) ? t('Qeemat theek likhein')
    : b && f.price != null && f.price + 0.005 < b.paidAmount ? t('{{formatPKR}} mil chuka — qeemat is se kam nahi', { formatPKR: formatMoney(b.paidAmount) }) : !b && (f.advance ?? 0) > 0 && f.price != null && (f.advance ?? 0) > f.price ? t('Advance qeemat se zyada nahi') : f.delivery && !f.address.trim() ? t('Pata likhein') : '';
  const save = async () => {
    if (error) { toast.error(error); return; }
    const body = { customerName: f.name.trim(), customerPhone: f.phone.trim(), occasion: f.occasion, animalType: f.type, shareCount: shared ? f.shares ?? 1 : 1, finalPrice: f.price, liveAnimalId: f.animalId || null, slaughterDay: Number(f.day), deliveryPreference: f.delivery ? 'HOME_DELIVERY' : 'SELF_PICKUP', wantsMeatDelivery: f.delivery, deliveryAddress: f.delivery ? f.address.trim() : null, wantsSkin: f.skin, specialInstructions: opt(f.notes) ?? null };
    setBusy(true);
    try {
      const r = b ? await qurbaniApi.update(b.id, body) : await qurbaniApi.create({ ...body, advanceAmount: f.advance ?? 0, paymentMethod: f.method });
      refreshMeat([MEAT_KEYS.qurbani], !b && (f.advance ?? 0) > 0);
      toast.success(b ? t('Booking badal di') : t('Booking {{bookingNumber}} ban gayi', { bookingNumber: (r as QurbaniBooking).bookingNumber }));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Booking save nahi hui'))); } finally { setBusy(false); }
  };
  const fit = (animals.data ?? []).filter((a) => a.animalType === f.type);
  return (
    <Sheet open={!!value} onClose={onClose} height={0.95} title={b ? t('{{bookingNumber}} badlein', { bookingNumber: b.bookingNumber }) : t('Nayi booking')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={f.name} onChangeText={(v) => set('name', v)} maxLength={120} />
        <Input label={t('Phone')} keyboardType="phone-pad" ltr value={f.phone} onChangeText={(v) => set('phone', v)} placeholder="03xx-xxxxxxx" />
        <Select label={t('Kis liye')} value={f.occasion} onChange={(v) => set('occasion', v)} options={QURBANI_OCCASIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
        <Select label={t('Janwar')} value={f.type} onChange={(v) => set('type', v)} options={QURBANI_KINDS.map((k) => ({ value: k.value, label: t(k.label) }))} />
        {shared && <NumberInput label={t('Hisse')} integer value={f.shares} onChangeValue={(v) => set('shares', v)} hint={t('1 se 7')} />}
        <MoneyInput label={t('Kul qeemat')} value={f.price} onChangeValue={(v) => set('price', v)} hint={t('Abhi pata na ho to khali — dete waqt zaroori')} />
        <Select label={t('Janwar (baara se)')} value={f.animalId} onChange={(v) => set('animalId', v)} placeholder="—" options={[{ value: '', label: '—' }, ...fit.map((a) => ({ value: a.id, label: `${a.tagNumber} · ${kg(a.weightKg)}` }))]} />
        <Select label={t('Kaunsa din')} value={f.day} onChange={(v) => set('day', v)} options={['1', '2', '3'].map((d) => ({ value: d, label: t('Eid ka {{value}} din', { value: d === '1' ? t('pehla') : d === '2' ? t('doosra') : t('teesra') }) }))} />
        <Switch value={f.delivery} onChange={(v) => set('delivery', v)} label={t('Gosht ghar bhejna hai')} />
        {f.delivery && <Input label={t('Pata')} value={f.address} onChangeText={(v) => set('address', v)} maxLength={1000} />}
        <Switch value={f.skin} onChange={(v) => set('skin', v)} label={t('Khaal customer ko chahiye')} />
        <TextArea label={t('Hidayat (marzi)')} value={f.notes} onChangeText={(v) => set('notes', v)} maxLength={1000} placeholder={t('Teen hisse: ghar, rishtedar, gareeb…')} />
        {!b && (
          <>
            <MoneyInput label={t('Advance (abhi mila)')} value={f.advance} onChangeValue={(v) => set('advance', v)} hint={t('Aaj ke galle aur customer ke khate me jata hai')} />
            {(f.advance ?? 0) > 0 && <ChipGroup wrap value={f.method} onChange={(v) => set('method', v)} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />}
          </>
        )}
      </View>
    </Sheet>
  );
}

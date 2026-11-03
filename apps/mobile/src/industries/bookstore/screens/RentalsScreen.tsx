/**
 * Book rentals (web RentalsPage): who has which book, when it is due and the
 * deposit held. Issue a book, take it back (a late fine comes out of the
 * deposit), mark it lost (bill for its price) or cancel. Needs the server.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, Clock, Plus, RotateCcw, Timer, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { isOutRental, lateDays, rentalFine, rentalPrice, returnSettlement } from '@nafaa/core/industries/bookstore';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useCustomerSearch, useProductSearch } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, EmptyState, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Select, Sheet, StatTile, Switch, Text, TextArea, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { MethodChips, OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { bookProfilesApi, rentalsApi, type BookFact, type BookRental } from '../api';
import { KEYS, RENTAL_STATUS, refreshBookstore } from '../meta';

type Tab = 'out' | 'late' | 'closed' | 'all';

export function RentalsScreen() {
  const th = useTheme();
  const canUse = usePermission()(P.POS_USE);
  const { guard } = useDeskOnline('bookstoreDesk');
  const [tab, setTab] = useState<Tab>('out');
  const [search, setSearch] = useState('');
  const [issue, setIssue] = useState(false);
  const [back, setBack] = useState<BookRental | null>(null);
  const q = useQuery({ queryKey: [KEYS.rentals], queryFn: () => rentalsApi.list() });
  const all = q.data ?? [];
  const out = all.filter((r) => isOutRental(r.status));
  const late = out.filter((r) => lateDays(r.dueDate) > 0);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const base = tab === 'out' ? out : tab === 'late' ? late : tab === 'closed' ? all.filter((r) => !isOutRental(r.status)) : all;
    return base.filter((r) => !s || [r.rentalNumber, r.customerName, r.customerPhone].some((v) => v?.toLowerCase().includes(s)));
  }, [all, tab, search]); // eslint-disable-line react-hooks/exhaustive-deps
  const deposits = out.reduce((s, r) => s + r.depositAmount, 0);
  const finesDue = late.reduce((s, r) => s + rentalFine(r.dueDate, r.finePerDay, r.quantity), 0);
  const names = useProductSearch({ query: '', limit: 3000 });
  const nameOf = useMemo(() => new Map((names.data ?? []).map((p) => [p.id, p.name])), [names.data]);

  const lost = async (r: BookRental) => {
    if (!(await confirm({ title: t('Kitab gum ho gayi?'), message: t('Kitab ki qeemat ka bill banega; pehle deposit ({{depositAmount}}) se katega, baqi customer ke khata me.', { depositAmount: formatMoney(r.depositAmount) }), tone: 'danger', confirmLabel: t('Haan, gum') }))) return;
    try { await rentalsApi.markLost(r.id); refreshBookstore([KEYS.rentals], true); toast.success(t('Kitab gum likhi gayi — qeemat ka bill ban gaya')); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  const cancel = async (r: BookRental) => {
    if (!(await confirm({ title: t('Rental cancel karein?'), message: t('Ghalti se di gayi kitab: shelf par wapas aur deposit lautaya jata hai. Kiraye ka bill Sales me rehta hai — wapas karna ho to Return karein.'), tone: 'danger', confirmLabel: t('Haan, cancel') }))) return;
    try { await rentalsApi.cancel(r.id); refreshBookstore([KEYS.rentals, 'inv'], true); toast.success(t('Rental cancel — kitab shelf par, deposit wapas')); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={BookOpen} tone="info" label={t('Bahar kitaben')} loading={q.isLoading} value={String(out.reduce((s, r) => s + r.quantity, 0))} onPress={() => setTab('out')} />
        <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone={late.length ? 'danger' : 'neutral'} label={t('Late')} loading={q.isLoading} value={String(late.length)} hint={t('Waqt guzar gaya')} onPress={() => setTab('late')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="success" label={t('Deposit drawer me')} loading={q.isLoading} value={formatMoney(deposits)} hint={t('Wapsi par lautana hai')} />
        <StatTile style={{ flex: 1 }} icon={Clock} tone="warning" label={t('Jurmana ban raha')} loading={q.isLoading} value={formatMoney(finesDue)} hint={t('Aaj tak ka')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'out', label: t('Bahar') }, { value: 'late', label: t('Late') }, { value: 'closed', label: t('Band') }, { value: 'all', label: t('Sab') }]} />
      <OfflineNote feature="bookstoreDesk" />
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate<BookRental>
        title={t('Book rentals')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Rental number, naam ya phone') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => {
          const days = isOutRental(r.status) ? lateDays(r.dueDate) : 0;
          const st = days > 0 ? RENTAL_STATUS.OVERDUE : RENTAL_STATUS[r.status] ?? RENTAL_STATUS.ACTIVE;
          const fine = isOutRental(r.status) ? rentalFine(r.dueDate, r.finePerDay, r.quantity) : r.fineAmount;
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: days > 0 ? 1 : th.isDark ? 1 : 0.5, borderColor: days > 0 ? th.colors.danger.solid : th.colors.border }}>
              <ListRow icon={Timer} iconTone={st.tone}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.customerName || r.rentalNumber}</Text><Badge tone={st.tone}>{days > 0 ? t('{{count}} din late', { count: days }) : t(st.label)}</Badge></Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[r.rentalNumber, nameOf.get(r.productId), r.quantity > 1 ? `× ${r.quantity}` : ''].filter(Boolean).join(' · ')}</Text>
                  <Text size="xs" tone="secondary">{`${t('Wapsi')}: ${formatDate(r.dueDate, { year: true })} · ${t('Deposit')}: ${formatMoney(r.depositAmount)}${fine > 0 ? ` · ${isOutRental(r.status) ? t('Jurmana') : t('Kata')}: ${formatMoney(fine)}` : ''}`}</Text>
                </View>} />
              {canUse && isOutRental(r.status) && (
                <Row gap={2} wrap style={{ paddingHorizontal: th.space(3), paddingBottom: th.space(3) }}>
                  <Button size="sm" variant="soft" icon={RotateCcw} onPress={() => guard(() => setBack(r))}>{t('Wapas aayi')}</Button>
                  <Button size="sm" variant="secondary" icon={AlertTriangle} onPress={() => guard(() => void lost(r))}>{t('Gum')}</Button>
                  <Button size="sm" variant="ghost" icon={XCircle} onPress={() => guard(() => void cancel(r))}>{t('Cancel')}</Button>
                </Row>
              )}
            </View>
          );
        }}
        empty={<EmptyState icon={Timer} title={search ? t('Koi rental nahi mili') : tab === 'late' ? t('Koi kitab late nahi') : t('Abhi koi kitab bahar nahi')} message={t("Kitab ke editor me 'Kiraye par' laga kar hafte ka kiraya aur deposit likhein, phir yahan se kitab dein.")} />}
        fab={canUse ? { icon: Plus, label: t('Kitab dein'), onPress: () => guard(() => setIssue(true)) } : undefined}
      />
      <IssueSheet open={issue} nameOf={nameOf} onClose={() => setIssue(false)} />
      <ReturnSheet rental={back} onClose={() => setBack(null)} />
    </>
  );
}

function IssueSheet({ open, nameOf, onClose }: { open: boolean; nameOf: Map<string, string>; onClose: () => void }) {
  const th = useTheme();
  const facts = useQuery({ queryKey: [KEYS.facts], queryFn: () => bookProfilesApi.facts().catch(() => [] as BookFact[]), staleTime: 5 * 60_000 });
  const rentable = useMemo(() => (facts.data ?? []).filter((f): f is Extract<BookFact, { kind: 'BOOK' }> => f.kind === 'BOOK' && f.isRentable && nameOf.has(f.productId)), [facts.data, nameOf]);
  const [productId, setProductId] = useState('');
  const [cq, setCq] = useState('');
  const [customer, setCustomer] = useState<{ id: string; name: string; phone?: string | null } | null>(null);
  const [v, setV] = useState({ name: '', phone: '', cnic: '', weeks: 2 as number | null, rent: null as number | null, deposit: null as number | null, fine: 50 as number | null, qty: 1 as number | null, method: 'CASH', note: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const term = useDebouncedValue(cq.trim(), 250);
  const custs = useCustomerSearch({ query: term, limit: 6 }, { enabled: term.length >= 2 && !customer });
  useEffect(() => { if (open) { setProductId(''); setCq(''); setCustomer(null); setTouched(false); setV({ name: '', phone: '', cnic: '', weeks: 2, rent: null, deposit: null, fine: 50, qty: 1, method: 'CASH', note: '' }); } }, [open]);
  const set = (p: Partial<typeof v>) => setV((x) => ({ ...x, ...p }));
  const fact = rentable.find((f) => f.productId === productId);
  const pick = (id: string) => {
    setProductId(id);
    const f = rentable.find((x) => x.productId === id);
    if (f) set({ rent: rentalPrice(f.rentalPricePerWeek || 0, v.weeks ?? 1), deposit: f.rentalDeposit || 0 });
  };
  const errors = { product: !productId ? t('Kitab chunein') : '', customer: !customer && !v.name.trim() ? t('Customer chunein ya naam likhein') : '' };
  const first = errors.product || errors.customer;
  const save = async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    const weeks = Math.max(v.weeks ?? 1, 1);
    setBusy(true);
    try {
      const r = await rentalsApi.create({ productId, customerId: customer?.id, customerName: customer?.name ?? v.name.trim(), customerPhone: customer?.phone ?? (v.phone.trim() || undefined), customerCnic: v.cnic.trim() || undefined,
        quantity: v.qty ?? 1, rentalDays: weeks * 7, rentalPrice: v.rent ?? 0, depositAmount: v.deposit ?? 0, finePerDay: v.fine ?? 0, paymentMethod: v.method, notes: v.note.trim() || undefined });
      refreshBookstore([KEYS.rentals, 'inv'], true);
      toast.success(t('{{rentalNumber}} — kitab di gayi', { rentalNumber: r.rentalNumber }));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Rental nahi bani'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.94} title={t('Kitab dein')} description={t('Kitab stock se nikalti hai, kiraye ka bill banta hai aur deposit drawer me jata hai')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Kitab dein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Kitab')} value={productId || null} onChange={pick} searchable placeholder={rentable.length ? t('Chunein') : t('Koi kitab kiraye wali nahi')} error={touched && errors.product}
          options={rentable.map((f) => ({ value: f.productId, label: nameOf.get(f.productId) ?? '', description: t('{{price}} / hafta', { price: formatMoney(f.rentalPricePerWeek) }) }))} />
        {customer ? (
          <Card><Row gap={2}><View style={{ flex: 1 }}><Text weight="semibold">{customer.name}</Text><Text size="xs" tone="muted" ltr>{customer.phone}</Text></View><Button size="sm" variant="ghost" onPress={() => setCustomer(null)}>{t('Badlein')}</Button></Row></Card>
        ) : (
          <>
            <Input label={t('Customer dhoondein')} value={cq} onChangeText={setCq} placeholder={t('Naam ya phone')} hint={t('Na mile to neeche naam aur phone likhein')} />
            {term.length >= 2 && (custs.data ?? []).length > 0 && (
              <Card flush>{(custs.data ?? []).map((c, i) => <ListRow key={c.id} divider={i < (custs.data?.length ?? 0) - 1} title={c.name} subtitle={c.phone ?? undefined} onPress={() => setCustomer({ id: c.id, name: c.name, phone: c.phone })} />)}</Card>
            )}
            <Input label={t('Naam')} value={v.name} onChangeText={(x) => set({ name: x })} error={touched && errors.customer ? errors.customer : undefined} />
            <Input label={t('Phone')} keyboardType="phone-pad" ltr value={v.phone} onChangeText={(x) => set({ phone: x })} />
          </>
        )}
        <Input label={t('CNIC (marzi)')} ltr value={v.cnic} onChangeText={(x) => set({ cnic: x })} />
        <NumberInput label={t('Kitne hafte')} integer value={v.weeks} onChangeValue={(w) => set({ weeks: w, ...(fact?.rentalPricePerWeek ? { rent: rentalPrice(fact.rentalPricePerWeek, w ?? 1) } : {}) })} />
        <NumberInput label={t('Kitne adad')} integer value={v.qty} onChangeValue={(x) => set({ qty: x })} />
        <MoneyInput label={t('Kiraya')} value={v.rent} onChangeValue={(x) => set({ rent: x })} />
        <MoneyInput label={t('Deposit (wapas hota hai)')} value={v.deposit} onChangeValue={(x) => set({ deposit: x })} />
        <MoneyInput label={t('Jurmana / din')} value={v.fine} onChangeValue={(x) => set({ fine: x })} />
        <Text size="sm" weight="medium" tone="secondary">{t('Payment kaise mili')}</Text>
        <MethodChips value={v.method} onChange={(x) => set({ method: x })} />
        <TextArea label={t('Note (marzi)')} value={v.note} onChangeText={(x) => set({ note: x })} />
        <Text weight="semibold">{t('Abhi lena: {{total}}', { total: formatMoney((v.rent ?? 0) + (v.deposit ?? 0)) })}</Text>
      </View>
    </Sheet>
  );
}

function ReturnSheet({ rental, onClose }: { rental: BookRental | null; onClose: () => void }) {
  const th = useTheme();
  const [condition, setCondition] = useState('Theek');
  const [notes, setNotes] = useState('');
  const [waive, setWaive] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (rental) { setCondition('Theek'); setNotes(''); setWaive(false); } }, [rental]);
  if (!rental) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  const fine = rentalFine(rental.dueDate, rental.finePerDay, rental.quantity);
  const days = lateDays(rental.dueDate);
  const s = returnSettlement(rental.depositAmount, fine, waive);
  const save = async () => {
    setBusy(true);
    try {
      const r = await rentalsApi.return(rental.id, { conditionOnReturn: condition, damageNotes: notes.trim() || undefined, waiveFine: waive });
      refreshBookstore([KEYS.rentals, 'inv'], true);
      toast.success(r.fineAmount > 0 ? t('Wapas — jurmana {{fineAmount}} deposit se kata', { fineAmount: formatMoney(r.fineAmount) }) : t('Kitab wapas, deposit lauta dein'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Wapsi nahi hui'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={t('{{rentalNumber}} — wapsi', { rentalNumber: rental.rentalNumber })} description={rental.customerName ?? undefined}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Kitab wapas lein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {fine > 0 && (
          <Card tone="warning">
            <Text size="sm">{t('{{count}} din late — jurmana {{fine}}', { count: days, fine: formatMoney(fine) })}</Text>
            <Switch value={waive} onChange={setWaive} label={t('Jurmana maaf')} />
          </Card>
        )}
        <ChipGroup value={condition} onChange={setCondition} options={['Theek', 'Thori kharab', 'Bohat kharab'].map((x) => ({ value: x, label: x }))} />
        {condition !== 'Theek' && <TextArea label={t('Kharabi ka note')} value={notes} onChangeText={setNotes} />}
        <Card>
          <Text size="sm">{t('Deposit {{deposit}}', { deposit: formatMoney(rental.depositAmount) })}</Text>
          {s.fine > 0 && <Text size="sm">{t('Jurmana kata: {{fine}}', { fine: formatMoney(s.fine) })}</Text>}
          <Text weight="bold">{t('Customer ko wapas: {{refund}}', { refund: formatMoney(s.refund) })}</Text>
          {s.extra > 0 && <Text size="sm" tone="danger">{t('Customer se aur lena: {{extra}}', { extra: formatMoney(s.extra) })}</Text>}
        </Card>
      </View>
    </Sheet>
  );
}

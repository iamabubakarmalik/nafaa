/**
 * Wedding and event contracts (web FloristWeddingsPage): quote to bill with the
 * advance kept on the family's khata. Upcoming, open, all and analytics;
 * confirm, start, payment, complete (the bill, with the flowers used) and cancel.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, CalendarHeart, CheckCircle2, Hammer, Heart, Pencil, Phone, Plus, Receipt, Trash2, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { daysUntil, weddingDue } from '@nafaa/core/industries/florist';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, DatePicker, DetailRow, EmptyState, FormSection, HBarList, IconButton, Input, ListRow, ListTemplate, MoneyInput, PressableScale, Row, Segmented, Select, Sheet, Skeleton, StatTile, Switch, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { MethodChips, OfflineNote, PaySheet, dateToKey, errorText, keyToDate, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { floristProductsApi, weddingContractsApi, type WeddingContract, type WeddingInput } from '../api';
import { FLORIST_KEYS, WEDDING_STATUS, refreshFlorist } from '../meta';

type Tab = 'upcoming' | 'open' | 'all' | 'analytics';
const LIMIT = 25;
const couple = (c: Pick<WeddingContract, 'brideName' | 'groomName'>) => `${c.brideName} & ${c.groomName}`;
const phoneOk = (v: string) => /^[0-9+\-\s]{10,15}$/.test(v.trim());

export function FloristWeddingsScreen() {
  const th = useTheme();
  const can = usePermission();
  const canWork = can(P.POS_USE);
  const { guard } = useDeskOnline('floristOrders');
  const [tab, setTab] = useState<Tab>('upcoming');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<WeddingContract | 'new' | null>(null);
  const [open, setOpen] = useState<WeddingContract | null>(null);
  const today = todayKey();

  const params = { search: search.trim() || undefined, status: status || (tab === 'open' ? 'OPEN' : undefined), upcoming: tab === 'upcoming' ? true : undefined, limit: LIMIT };
  const list = usePaged([FLORIST_KEYS.weddings, 'paged', tab, params], (page) => weddingContractsApi.paged({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })), tab !== 'analytics');
  const head = useQuery({ queryKey: [FLORIST_KEYS.weddings, 'open'], queryFn: () => weddingContractsApi.paged({ status: 'OPEN', limit: 1 }) });
  const all = useQuery({ queryKey: [FLORIST_KEYS.weddings, 'analytics'], queryFn: () => weddingContractsApi.paged({ limit: 100 }), enabled: tab === 'analytics' });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Heart} tone="accent" label={t('Chalu contracts')} loading={head.isLoading} value={String(head.data?.total ?? 0)} onPress={() => setTab('open')} />
        <StatTile style={{ flex: 1 }} icon={Banknote} tone="danger" label={t('Baqi (chalu)')} loading={head.isLoading} value={formatMoney(head.data?.totals.due ?? 0)} hint={t('Quote − advance')} />
      </Row>
      <Segmented value={tab} onChange={(v) => { setTab(v); setStatus(''); }} options={[{ value: 'upcoming', label: t('Aane wali') }, { value: 'open', label: t('Chalu') }, { value: 'all', label: t('Sab') }, { value: 'analytics', label: t('Analytics') }]} />
      {tab !== 'analytics' && <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab halat') }, ...Object.entries(WEDDING_STATUS).map(([value, s]) => ({ value, label: t(s.label) }))]} />}
      <OfflineNote feature="floristOrders" />
      <CachedNote query={head} />
      {tab === 'analytics' && <Analytics items={all.data?.items} loading={all.isLoading} />}
    </View>
  );

  return (
    <>
      <ListTemplate<WeddingContract>
        title={t('Shaadi / event contracts')}
        grouped={false}
        search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Naam, contract, phone ya jagah…') } : undefined}
        summary={header}
        data={tab === 'analytics' ? [] : list.items}
        loading={tab !== 'analytics' && list.loading}
        error={tab !== 'analytics' ? list.error : undefined}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={() => { list.refetch(); void head.refetch(); }}
        onEndReached={list.loadMore}
        keyExtractor={(c) => c.id}
        renderItem={({ item: c }) => {
          const owed = weddingDue(c);
          const left = daysUntil(c.weddingDate, today);
          const st = WEDDING_STATUS[c.status] ?? WEDDING_STATUS.QUOTED;
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <ListRow icon={Heart} iconTone={st.tone}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{couple(c)}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[c.contractNumber, c.contactPerson, c.ceremonyVenue].filter(Boolean).join(' · ')}</Text>
                  <Text size="xs" tone="secondary">{`${formatDate(c.weddingDate, { year: true })} · ${left === null ? '' : left < 0 ? t('{{value}} din pehle', { value: -left }) : left === 0 ? t('Aaj') : t('{{left}} din baad', { left })}`}</Text>
                </View>}
                trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={c.quotedAmount} weight="bold" /><Text size="2xs" tone={owed > 0.009 ? 'danger' : 'success'}>{owed > 0.009 ? t('{{owed}} baqi', { owed: formatMoney(owed) }) : t('Poora mila')}</Text></View>}
                chevron onPress={() => setOpen(c)} />
            </View>
          );
        }}
        empty={tab === 'analytics' ? undefined : <EmptyState icon={Heart} title={search || status ? t('Is filter me koi contract nahi') : t('Abhi koi contract nahi')} message={t('Shaadi, mehndi ya event ki sajawat ka quote yahan banayein — advance family ke khate me jama hoga.')} />}
        fab={canWork ? { icon: Plus, label: t('Naya contract'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <ContractSheet c={open} canWork={canWork} onClose={() => setOpen(null)} onEdit={(c) => { setOpen(null); setForm(c); }} />
      <ContractForm contract={form} onClose={() => setForm(null)} />
    </>
  );
}

function Analytics({ items, loading }: { items?: WeddingContract[]; loading: boolean }) {
  const th = useTheme();
  if (loading || !items) return <Skeleton height={200} />;
  const quoted = items.reduce((s, c) => s + c.quotedAmount, 0);
  const got = items.reduce((s, c) => s + c.advanceAmount, 0);
  const things: Record<string, number> = {};
  const bump = (k: string, v: number) => { things[k] = (things[k] ?? 0) + v; };
  for (const c of items) {
    if (c.includesStageDecoration) bump(t('Stage'), c.quotedAmount);
    if (c.includesCarDecoration) bump(t('Gaari'), c.quotedAmount);
    if (c.includesMehndiSetup) bump(t('Mehndi'), c.quotedAmount);
    if (c.includesGarlands) bump(t('Haar'), c.quotedAmount);
    if (c.includesBridalBouquet) bump(t('Dulhan bouquet'), c.quotedAmount);
  }
  const byStatus: Record<string, number> = {};
  for (const c of items) byStatus[c.status] = (byStatus[c.status] ?? 0) + c.quotedAmount;
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Heart} tone="accent" label={t('Contracts')} value={String(items.length)} />
        <StatTile style={{ flex: 1 }} icon={Receipt} tone="info" label={t('Quote')} value={formatMoney(quoted)} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="success" label={t('Mila')} value={formatMoney(got)} />
        <StatTile style={{ flex: 1 }} icon={Banknote} tone="danger" label={t('Baqi')} value={formatMoney(items.reduce((s, c) => s + weddingDue(c), 0))} />
      </Row>
      {Object.keys(byStatus).length > 0 && <Card title={t('Halat')}><HBarList colorful rows={Object.entries(byStatus).map(([k, v]) => ({ key: k, label: t(WEDDING_STATUS[k]?.label ?? k), value: v, display: <Text size="xs" tone="muted">{formatMoney(v)}</Text> }))} /></Card>}
      {Object.keys(things).length > 0 && <Card title={t('Kya sajaya')}><HBarList colorful rows={Object.entries(things).map(([k, v]) => ({ key: k, label: k, value: v, display: <Text size="xs" tone="muted">{formatMoney(v)}</Text> }))} /></Card>}
    </View>
  );
}

function ContractSheet({ c, canWork, onClose, onEdit }: { c: WeddingContract | null; canWork: boolean; onClose: () => void; onEdit: (c: WeddingContract) => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('floristOrders');
  const [paying, setPaying] = useState(false);
  const [completing, setCompleting] = useState(false);
  const step = useMutation({
    mutationFn: (to: string) => weddingContractsApi.updateStatus(c!.id, { status: to }),
    onSuccess: (r) => { refreshFlorist([FLORIST_KEYS.weddings]); toast.success(`${r.contractNumber}: ${t(WEDDING_STATUS[r.status]?.label ?? r.status)}`); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Halat nahi badli'))),
  });
  if (!c) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  const owed = weddingDue(c);
  const closed = c.status === 'COMPLETED' || c.status === 'CANCELLED';
  const st = WEDDING_STATUS[c.status] ?? WEDDING_STATUS.QUOTED;
  const things = [
    c.includesBridalBouquet && t('Dulhan bouquet'), c.includesBridesmaidBouquets && t('Saheli bouquet × {{bridesmaidCount}}', { bridesmaidCount: c.bridesmaidCount }),
    c.includesBoutonnieres && t('Boutonniere × {{boutonniereCount}}', { boutonniereCount: c.boutonniereCount }), c.includesGarlands && t('Haar × {{garlandCount}}', { garlandCount: c.garlandCount }),
    c.includesCarDecoration && t('Gaari sajawat'), c.includesStageDecoration && t('Stage sajawat'), c.includesMehndiSetup && t('Mehndi setup'),
    c.includesTableCentrepieces && t('Table centrepiece × {{centrepieceCount}}', { centrepieceCount: c.centrepieceCount }),
  ].filter(Boolean) as string[];
  const cancel = async () => {
    const ok = await confirm({ title: t('Contract cancel?'), tone: 'danger', confirmLabel: t('Haan, cancel'), message: c.advanceAmount > 0 ? t('{{advanceAmount}} advance family ke khate me jama rahega. Wapas dena ho to Khata se dein.', { advanceAmount: formatMoney(c.advanceAmount) }) : t('Contract record me rahega, sirf cancel likha jayega.') });
    if (!ok) return;
    try { await weddingContractsApi.cancel(c.id); refreshFlorist([FLORIST_KEYS.weddings]); toast.success(t('Contract cancel — advance family ke khate me jama hai')); onClose(); }
    catch (e) { toast.error(errorText(e, t('Cancel nahi hua'))); }
  };
  return (
    <Sheet open onClose={onClose} title={couple(c)} description={`${c.contractNumber} · ${t(st.label)}`}
      footer={canWork && !closed ? (
        <Row gap={2}>
          {c.status === 'QUOTED' && <Button style={{ flex: 1 }} icon={CheckCircle2} loading={step.isPending} onPress={() => guard(() => step.mutate('CONFIRMED'))}>{t('Pakka karein')}</Button>}
          {c.status === 'CONFIRMED' && <Button style={{ flex: 1 }} icon={Hammer} loading={step.isPending} onPress={() => guard(() => step.mutate('IN_PROGRESS'))}>{t('Kaam shuru')}</Button>}
          <Button style={{ flex: 1 }} variant={c.status === 'IN_PROGRESS' ? 'primary' : 'secondary'} icon={Receipt} onPress={() => guard(() => setCompleting(true))}>{t('Mukammal (bill)')}</Button>
        </Row>
      ) : undefined}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={2}>
          <StatTile style={{ flex: 1 }} label={t('Quote')} value={formatMoney(c.quotedAmount)} />
          <StatTile style={{ flex: 1 }} label={t('Mila')} tone="success" value={formatMoney(c.advanceAmount)} />
          <StatTile style={{ flex: 1 }} label={t('Baqi')} tone={owed > 0.009 ? 'danger' : 'success'} value={formatMoney(owed)} />
        </Row>
        <Card flush>
          <DetailRow label={t('Shaadi ki date')} value={formatDate(c.weddingDate, { year: true })} />
          <DetailRow label={t('Rabta')} value={<PressableScale onPress={() => void Linking.openURL(`tel:${c.contactPhone}`)}><Row gap={1}><Phone size={14} color={th.colors.brand.solid} /><Text size="sm" weight="semibold" tone="brand" ltr>{`${c.contactPerson} · ${c.contactPhone}`}</Text></Row></PressableScale>} />
          {!!c.ceremonyVenue && <DetailRow label={t('Nikah / barat ki jagah')} value={c.ceremonyVenue} />}
          {!!c.receptionVenue && <DetailRow label={t('Walima / reception')} value={c.receptionVenue} />}
          {!!c.siteVisitDate && <DetailRow label={t('Jagah dekhne ka din (marzi)')} value={formatDate(c.siteVisitDate, { year: true })} />}
          {!!c.colorTheme?.length && <DetailRow label={t('Rang')} value={c.colorTheme.join(', ')} />}
          {!!c.primaryFlowers?.length && <DetailRow label={t('Phool')} value={c.primaryFlowers.join(', ')} last />}
        </Card>
        {things.length > 0 && <Card title={t('Kya kya sajana hai')}><Text size="sm">{things.join(' · ')}</Text></Card>}
        {!!c.notes && <Text size="sm" tone="secondary">{c.notes}</Text>}
        {c.status === 'COMPLETED' && <Card tone="success"><Text size="sm">{t('Bill ban chuka hai. Baqi paisa family ke khate me hai.')}</Text></Card>}
        {canWork && !closed && (
          <Row gap={2} wrap>
            <Button size="sm" variant="secondary" icon={Pencil} onPress={() => guard(() => onEdit(c))}>{t('Badlein')}</Button>
            {owed > 0.009 && <Button size="sm" variant="secondary" icon={Wallet} onPress={() => guard(() => setPaying(true))}>{t('Payment lein')}</Button>}
            <Button size="sm" variant="secondary" icon={XCircle} onPress={() => guard(() => void cancel())}>{t('Cancel')}</Button>
          </Row>
        )}
        <PaySheet open={paying} advance title={t('Payment lein')} name={`${couple(c)}`} due={owed} cta={t('Darj karein')} onClose={() => setPaying(false)}
          onConfirm={async (pay) => { await weddingContractsApi.recordPayment(c.id, { amount: pay.paidAmount, paymentMethod: pay.paymentMethod }); refreshFlorist([FLORIST_KEYS.weddings], true); toast.success(t('{{amount}} family ke khate me jama', { amount: formatMoney(pay.paidAmount) })); onClose(); }} />
        {completing && <CompleteSheet c={c} onClose={() => setCompleting(false)} onDone={() => { setCompleting(false); onClose(); }} />}
      </View>
    </Sheet>
  );
}

function CompleteSheet({ c, onClose, onDone }: { c: WeddingContract; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const { cost, costHidden } = useCostMask();
  const q = useQuery({ queryKey: [FLORIST_KEYS.profiles, 'list'], queryFn: () => floristProductsApi.list() });
  const [rows, setRows] = useState<Array<{ productId: string; qty: number | null }>>([]);
  const [busy, setBusy] = useState(false);
  const owed = weddingDue(c);
  const flowers = ((q.data ?? []) as unknown as Array<{ productId: string; product?: { name: string; stock: number; costPrice: number } }>).filter((p): p is { productId: string; product: { name: string; stock: number; costPrice: number } } => !!p.product);
  const lines = rows.filter((r) => r.productId && (r.qty ?? 0) > 0).map((r) => ({ productId: r.productId, quantity: r.qty as number }));
  const total = lines.reduce((s, l) => s + l.quantity * (flowers.find((f) => f.productId === l.productId)?.product.costPrice ?? 0), 0);
  const run = async () => {
    setBusy(true);
    try {
      const r = await weddingContractsApi.updateStatus(c.id, { status: 'COMPLETED', materials: lines.length ? lines : undefined });
      refreshFlorist([FLORIST_KEYS.weddings], true);
      toast.success(r.sale ? t('Bill {{saleNumber}} ban gaya', { saleNumber: r.sale.saleNumber }) : t('Mukammal'));
      onDone();
    } catch (e) { toast.error(errorText(e, t('Halat nahi badli'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={t('Shaadi mukammal?')} description={t('{{couple}} — {{quotedAmount}} ka bill banega', { couple: couple(c), quotedAmount: formatMoney(c.quotedAmount) })}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void run()}>{t('Haan, bill banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm" tone="secondary">{t('{{advanceAmount}} jo pehle mila wo bill me se kat jayega{{value}}.', { advanceAmount: formatMoney(c.advanceAmount), value: owed > 0.009 ? t('; baqi {{owed}} family ke khate me udhaar rahega', { owed: formatMoney(owed) }) : '' })}</Text>
        <Text size="sm" weight="semibold">{t('Kaun se phool lage (marzi)')}</Text>
        <Text size="xs" tone="muted">{t('Stock se nikal jayenge aur unki cost profit me ginti hogi. Bill void ho to wapas shelf par.')}</Text>
        {rows.map((r, i) => (
          <Row key={i} gap={2}>
            <View style={{ flex: 1 }}><Select value={r.productId || null} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, productId: v } : x)))} placeholder={t('Cheez chunein')} searchable
              options={flowers.map((p) => ({ value: p.productId, label: t('{{name}} (stock {{value}})', { name: p.product.name, value: p.product.stock ?? 0 }) }))} /></View>
            <View style={{ width: 88 }}><NumberInput value={r.qty} onChangeValue={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, qty: v } : x)))} placeholder={t('Kitne')} /></View>
            <IconButton icon={Trash2} label={t('Hatayein')} size="sm" onPress={() => setRows(rows.filter((_, j) => j !== i))} />
          </Row>
        ))}
        <Button variant="secondary" size="sm" icon={Plus} onPress={() => setRows([...rows, { productId: '', qty: null }])}>{t('Phool jorein')}</Button>
        {lines.length > 0 && !costHidden && <Text size="sm" weight="semibold">{t('Phoolon ki cost: {{cost}}', { cost: cost(total) })}</Text>}
      </View>
    </Sheet>
  );
}

const THINGS: Array<[keyof WeddingInput, string, keyof WeddingInput | null]> = [
  ['includesStageDecoration', 'Stage sajawat', null], ['includesMehndiSetup', 'Mehndi setup', null], ['includesCarDecoration', 'Gaari sajawat', null],
  ['includesBridalBouquet', 'Dulhan bouquet', null], ['includesGarlands', 'Haar / sehra', 'garlandCount'], ['includesBridesmaidBouquets', 'Saheli bouquet', 'bridesmaidCount'],
  ['includesBoutonnieres', 'Boutonniere', 'boutonniereCount'], ['includesTableCentrepieces', 'Table centrepiece', 'centrepieceCount'],
];

function ContractForm({ contract, onClose }: { contract: WeddingContract | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const c = contract === 'new' ? null : contract;
  const [d, setD] = useState<Record<string, unknown>>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!contract) return;
    setTouched(false);
    setD(c ? { ...c, weddingDate: c.weddingDate.slice(0, 10), siteVisitDate: c.siteVisitDate?.slice(0, 10) ?? '', colorTheme: (c.colorTheme ?? []).join(', '), primaryFlowers: (c.primaryFlowers ?? []).join(', '), advanceAmount: null, quotedAmount: c.quotedAmount }
      : { brideName: '', groomName: '', contactPerson: '', contactPhone: '', contactEmail: '', city: '', weddingDate: '', siteVisitDate: '', ceremonyVenue: '', receptionVenue: '', colorTheme: '', primaryFlowers: '', quotedAmount: null, advanceAmount: null, advancePaymentMethod: 'CASH', notes: '' });
  }, [contract]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: unknown) => setD((x) => ({ ...x, [k]: v }));
  const s = (k: string) => String(d[k] ?? '');
  const quote = d.quotedAmount as number | null;
  const advance = (d.advanceAmount as number | null) ?? 0;
  const errors: Record<string, string> = {};
  if (!s('brideName').trim()) errors.brideName = t('Dulhan ka naam likhein');
  if (!s('groomName').trim()) errors.groomName = t('Dulha ka naam likhein');
  if (!s('contactPerson').trim()) errors.contactPerson = t('Rabta karne wale ka naam');
  if (!phoneOk(s('contactPhone'))) errors.contactPhone = t('Phone 10 se 15 hindse');
  if (!s('weddingDate')) errors.weddingDate = t('Shaadi ki date chunein');
  if (quote === null || quote < 0) errors.quotedAmount = t('Quote ki amount likhein');
  else if (c && quote < c.advanceAmount - 0.01) errors.quotedAmount = t('Pehle {{advanceAmount}} mil chuke — is se kam nahi', { advanceAmount: c.advanceAmount });
  if (!c && quote !== null && advance > quote + 0.01) errors.advanceAmount = t('Advance quote se zyada nahi');
  const err = (k: string) => (touched ? errors[k] : undefined);
  const first = Object.values(errors)[0];
  const list = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
  const save = async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    const o = (v: string) => v.trim() || undefined;
    const body: WeddingInput = {
      brideName: s('brideName').trim(), groomName: s('groomName').trim(), contactPerson: s('contactPerson').trim(), contactPhone: s('contactPhone').trim(), contactEmail: o(s('contactEmail')),
      weddingDate: s('weddingDate'), ceremonyVenue: o(s('ceremonyVenue')), receptionVenue: o(s('receptionVenue')), city: o(s('city')),
      includesBridalBouquet: !!d.includesBridalBouquet, includesBridesmaidBouquets: !!d.includesBridesmaidBouquets, bridesmaidCount: Number(d.bridesmaidCount) || 0, includesBoutonnieres: !!d.includesBoutonnieres,
      boutonniereCount: Number(d.boutonniereCount) || 0, includesGarlands: !!d.includesGarlands, garlandCount: Number(d.garlandCount) || 0, includesCarDecoration: !!d.includesCarDecoration,
      includesStageDecoration: !!d.includesStageDecoration, includesMehndiSetup: !!d.includesMehndiSetup, includesTableCentrepieces: !!d.includesTableCentrepieces, centrepieceCount: Number(d.centrepieceCount) || 0,
      colorTheme: list(s('colorTheme')), primaryFlowers: list(s('primaryFlowers')), quotedAmount: quote ?? 0, siteVisitDate: s('siteVisitDate') || null, notes: o(s('notes')),
      ...(!c && advance > 0 ? { advanceAmount: advance, advancePaymentMethod: s('advancePaymentMethod') || 'CASH' } : {}),
    };
    setBusy(true);
    try {
      const r = c ? await weddingContractsApi.update(c.id, body) : await weddingContractsApi.create(body);
      refreshFlorist([FLORIST_KEYS.weddings], advance > 0);
      toast.success(c ? t('Contract save ho gaya') : advance > 0 ? t('Contract {{contractNumber}} bana — advance khate me jama', { contractNumber: r.contractNumber }) : t('Contract {{contractNumber}} ban gaya', { contractNumber: r.contractNumber }));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Contract save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!contract} onClose={onClose} height={0.94} title={c ? t('{{contractNumber}} badlein', { contractNumber: c.contractNumber }) : t('Naya contract')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{c ? t('Save') : t('Contract banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <FormSection title={t('Jora aur rabta')}>
          <Input label={t('Dulhan')} value={s('brideName')} onChangeText={(v) => set('brideName', v)} error={err('brideName')} />
          <Input label={t('Dulha')} value={s('groomName')} onChangeText={(v) => set('groomName', v)} error={err('groomName')} />
          <Input label={t('Rabta (kis se baat hoti hai)')} value={s('contactPerson')} onChangeText={(v) => set('contactPerson', v)} error={err('contactPerson')} hint={t('Isi naam par khata banta hai')} />
          <Input label={t('Phone')} keyboardType="phone-pad" ltr value={s('contactPhone')} onChangeText={(v) => set('contactPhone', v)} error={err('contactPhone')} placeholder="0300 1234567" />
          <Input label={t('Email (marzi)')} keyboardType="email-address" autoCapitalize="none" ltr value={s('contactEmail')} onChangeText={(v) => set('contactEmail', v)} />
          <Input label={t('Shehar (marzi)')} value={s('city')} onChangeText={(v) => set('city', v)} placeholder={t('Lahore')} />
        </FormSection>
        <FormSection title={t('Kab aur kahan')}>
          <DatePicker label={t('Shaadi ki date')} value={keyToDate(s('weddingDate'))} minimumDate={c ? undefined : new Date()} onChange={(x) => set('weddingDate', dateToKey(x))} error={err('weddingDate')} hint={t('Asal function ka din')} />
          <DatePicker label={t('Jagah dekhne ka din (marzi)')} value={keyToDate(s('siteVisitDate'))} onChange={(x) => set('siteVisitDate', dateToKey(x))} />
          <Input label={t('Nikah / barat ki jagah')} value={s('ceremonyVenue')} onChangeText={(v) => set('ceremonyVenue', v)} placeholder={t('Marquee / hall ka naam')} />
          <Input label={t('Walima / reception (marzi)')} value={s('receptionVenue')} onChangeText={(v) => set('receptionVenue', v)} />
        </FormSection>
        <FormSection title={t('Kya kya sajana hai')}>
          {THINGS.map(([flag, label, count]) => (
            <View key={flag} style={{ gap: 6 }}>
              <Switch value={!!d[flag]} onChange={(v) => set(flag, v)} label={t(label)} />
              {count && !!d[flag] && <NumberInput integer value={(d[count] as number) ?? null} onChangeValue={(v) => set(count, v)} placeholder={t('{{label}} kitne', { label: t(label) })} />}
            </View>
          ))}
          <Input label={t('Rang (comma se)')} value={s('colorTheme')} onChangeText={(v) => set('colorTheme', v)} placeholder={t('Laal, safed, sunehri')} />
          <Input label={t('Phool (comma se)')} value={s('primaryFlowers')} onChangeText={(v) => set('primaryFlowers', v)} placeholder={t('Gulab, motia, genda')} />
        </FormSection>
        <FormSection title={t('Paisa')}>
          <MoneyInput label={t('Quote (Rs)')} value={quote} onChangeValue={(v) => set('quotedAmount', v)} error={err('quotedAmount')} hint={t('Poore kaam ki tay shuda amount')} />
          {!c && <MoneyInput label={t('Advance abhi (Rs)')} value={d.advanceAmount as number | null} onChangeValue={(v) => set('advanceAmount', v)} error={err('advanceAmount')} hint={t('Family ke khate me jama hoga')} />}
          {!c && advance > 0 && <MethodChips value={s('advancePaymentMethod') || 'CASH'} onChange={(v) => set('advancePaymentMethod', v)} />}
          {c && <Text size="xs" tone="muted">{t('Mila: {{advanceAmount}}. Nayi payment contract khol kar "Payment lein" se.', { advanceAmount: formatMoney(c.advanceAmount) })}</Text>}
          <TextArea label={t('Note (marzi)')} value={s('notes')} onChangeText={(v) => set('notes', v)} placeholder={t('Khaas farmaish, setup ka waqt…')} />
        </FormSection>
      </View>
    </Sheet>
  );
}

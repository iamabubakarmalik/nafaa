/**
 * Contractor khata (web CreditAccountsPage): every contractor's live udhaar from
 * the customer khata, how old it is, the limit, and the terms (days, guarantor,
 * cheque). Payments are taken on the customer's khata page.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, BookOpen, Clock, HardHat, Plus, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { overLimit, limitUsed, sumAging } from '@nafaa/core/industries/hardware';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, Input, ListRow, ListTemplate, MoneyInput, ProgressBar, Row, Sheet, StatTile, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { CustomerBox, OfflineNote, cnicOk, emptyCustomer, errText, opt, useDeskOnline, type CustomerValue } from '../../_shared/trade/desk';
import { creditAccountsApi, type CreditAccount } from '../api';
import { KEYS, refreshHardware, shortDate } from '../meta';

type Tab = 'owing' | 'over' | 'old' | 'all' | 'stopped';
const TABS: Array<{ value: Tab; label: string; match: (a: CreditAccount) => boolean }> = [
  { value: 'owing', label: t('Udhaar wale'), match: (a) => a.currentBalance > 0.009 && a.status !== 'CLOSED' },
  { value: 'over', label: t('Had se upar'), match: (a) => overLimit(a) },
  { value: 'old', label: t('90 din se purana'), match: (a) => a.ageOver90Days > 0 },
  { value: 'all', label: t('Sab'), match: (a) => a.status !== 'CLOSED' },
  { value: 'stopped', label: t('Roka / band'), match: (a) => a.status === 'SUSPENDED' || a.status === 'CLOSED' },
];
const DAYS = [15, 30, 45, 60, 90];

export function ContractorsScreen() {
  const th = useTheme();
  const can = usePermission();
  const manage = can(P.KHATA_MANAGE);
  const { guard } = useDeskOnline('hardwareDesk');
  const { cost } = useCostMask();
  const [tab, setTab] = useState<Tab>('owing');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CreditAccount | 'new' | null>(null);
  const q = search.trim();
  const list = useQuery({ queryKey: [KEYS.contractors, q], queryFn: () => creditAccountsApi.list({ search: q || undefined }), placeholderData: (p) => p });
  const data = list.data ?? [];
  const rows = useMemo(() => data.filter(TABS.find((x) => x.value === tab)!.match), [data, tab]);
  const open = data.filter((a) => a.status !== 'CLOSED');
  const total = open.reduce((s, a) => s + Math.max(a.currentBalance, 0), 0);
  const age = sumAging(open);

  const act = (a: CreditAccount, kind: 'suspend' | 'close' | 'reactivate') => guard(async () => {
    if (kind !== 'reactivate' && !(await confirm({ title: kind === 'suspend' ? t('Udhaar rokein?') : t('Khata band karein?'), message: t('Naya udhaar band ho jata hai; purana hisaab rehta hai.'), confirmLabel: kind === 'suspend' ? t('Rokein') : t('Band karein'), tone: 'danger' }))) return;
    try {
      if (kind === 'suspend') await creditAccountsApi.suspend(a.id); else if (kind === 'close') await creditAccountsApi.close(a.id); else await creditAccountsApi.reactivate(a.id);
      refreshHardware([KEYS.contractors]);
      toast.success(kind === 'reactivate' ? t('Udhaar dobara chalu') : t('Halat badal gayi'));
    } catch (e) { toast.error(errText(e, t('Nahi hua'))); }
  });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone="info" label={t('Kul udhaar')} loading={list.isLoading} value={cost(total)} onPress={() => setTab('owing')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone={age.over90 ? 'danger' : 'neutral'} label={t('90 din se upar')} loading={list.isLoading} value={cost(age.over90)} onPress={() => setTab('old')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Clock} tone="success" label={t('0–30 din')} loading={list.isLoading} value={cost(age.d30)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Clock} tone="warning" label={t('31–90 din')} loading={list.isLoading} value={cost(age.d60 + age.d90)} />
      </Row>
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={TABS.map((x) => ({ value: x.value, label: `${x.label} (${data.filter(x.match).length})` }))} />
      <OfflineNote feature="hardwareDesk" />
    </View>
  );
  return (
    <>
      <ListTemplate<CreditAccount>
        title={t('Thekedar khata')} grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, karobar, phone ya account…') }}
        summary={header} data={rows} loading={list.isLoading} error={list.data ? null : list.error} onRetry={() => void list.refetch()} refreshing={list.isRefetching} onRefresh={() => void list.refetch()} keyExtractor={(a) => a.id}
        renderItem={({ item: a }) => {
          const over = overLimit(a);
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <ListRow icon={HardHat} iconTone={over ? 'danger' : a.status === 'SUSPENDED' ? 'warning' : 'info'} onPress={() => (manage ? setForm(a) : undefined)}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{a.customerName}</Text>{a.status === 'SUSPENDED' && <Badge tone="danger">{t('Roka hua')}</Badge>}{a.status === 'CLOSED' && <Badge>{t('Band')}</Badge>}</Row>}
                subtitle={<View style={{ gap: 4 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[a.businessName, a.customerPhone, a.accountNumber].filter(Boolean).join(' · ')}</Text>
                  {a.creditLimit > 0 && <><ProgressBar value={limitUsed(a) / 100} /><Text size="2xs" tone={over ? 'danger' : 'muted'}>{t('Had {{limit}}{{days}}', { limit: formatMoney(a.creditLimit), days: a.creditDays ? ` · ${t('{{n}} din', { n: a.creditDays })}` : '' })}</Text></>}
                  {a.ageOver90Days > 0 && <Badge tone="danger">{t('90+ din: {{amount}}', { amount: formatMoney(a.ageOver90Days) })}</Badge>}
                  {a.lastPaymentDate ? <Text size="2xs" tone="muted">{t('Aakhri payment {{date}}', { date: shortDate(a.lastPaymentDate) })}</Text> : null}
                  {a.khataLinked === false && <Text size="2xs" tone="warning">{t('Customer khate se nahi jura — "Badlein" se customer chunein')}</Text>}
                  <Row gap={2} wrap style={{ marginTop: 4 }}>
                    {a.customerId ? <Button size="sm" variant="soft" icon={BookOpen} onPress={() => router.push(`/customers/${a.customerId}` as never)}>{t('Paisa lein')}</Button> : null}
                    {manage && a.status === 'ACTIVE' && <Button size="sm" variant="ghost" onPress={() => act(a, 'suspend')}>{t('Rokein')}</Button>}
                    {manage && a.status === 'SUSPENDED' && <Button size="sm" variant="ghost" onPress={() => act(a, 'reactivate')}>{t('Dobara chalu')}</Button>}
                    {manage && a.status !== 'CLOSED' && <Button size="sm" variant="ghost" onPress={() => act(a, 'close')}>{t('Band karein')}</Button>}
                  </Row>
                </View>}
                trailing={<Text size="sm" weight="bold" ltr>{cost(a.currentBalance)}</Text>} />
            </View>
          );
        }}
        empty={<EmptyState icon={HardHat} title={q ? t('Is search me koi thekedar nahi') : t('Is list me koi thekedar nahi')} message={t('Udhaar par maal lene wale thekedar ka khata banayein.')} />}
        fab={manage ? { icon: Plus, label: t('Naya thekedar'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <ContractorSheet account={form} onClose={() => setForm(null)} />
    </>
  );
}

/** Contractor credit terms: which customer (their khata carries the money), udhaar limit and days, guarantor and cheque security. */
function ContractorSheet({ account, onClose }: { account: CreditAccount | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const open = account !== null;
  const acc = account && account !== 'new' ? account : null;
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [f, setF] = useState({ businessName: '', customerCnic: '', businessAddress: '', creditLimit: null as number | null, creditDays: 30, guarantorName: '', guarantorPhone: '', guarantorCnic: '', chequeSecurity: '', notes: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setCustomer(acc ? { customerId: acc.customerId ?? '', name: acc.customerName, phone: acc.customerPhone ?? '', balance: acc.currentBalance } : emptyCustomer);
    setF({ businessName: acc?.businessName ?? '', customerCnic: acc?.customerCnic ?? '', businessAddress: acc?.businessAddress ?? '', creditLimit: acc?.creditLimit || null, creditDays: acc?.creditDays ?? 30, guarantorName: acc?.guarantorName ?? '', guarantorPhone: acc?.guarantorPhone ?? '', guarantorCnic: acc?.guarantorCnic ?? '', chequeSecurity: acc?.chequeSecurity ?? '', notes: acc?.notes ?? '' });
  }, [open, acc]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const loose = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());
  const errors = {
    customer: !customer.customerId ? t('Customer chunein — udhaar usi ke khate me chalta hai') : undefined, limit: (f.creditLimit ?? 0) < 0 ? t('Had manfi nahi ho sakti') : (customer.balance ?? 0) > 0 && (f.creditLimit ?? 0) > 0 && (customer.balance ?? 0) > (f.creditLimit ?? 0) ? t('Abhi ka udhaar ({{balance}}) is had se zyada hai', { balance: formatMoney(customer.balance ?? 0) }) : undefined,
    cnic: !cnicOk(f.customerCnic) ? t('CNIC 13 hindse (12345-1234567-1)') : undefined, gcnic: !cnicOk(f.guarantorCnic) ? t('CNIC 13 hindse') : undefined, gphone: !loose(f.guarantorPhone) ? t('Phone theek likhein') : undefined,
  };
  const first = Object.values(errors).find(Boolean);
  const run = async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    setBusy(true);
    try {
      const body = { ...f, creditLimit: f.creditLimit ?? 0, customerId: customer.customerId, customerName: customer.name, customerPhone: opt(customer.phone), businessName: opt(f.businessName), customerCnic: opt(f.customerCnic), businessAddress: opt(f.businessAddress), guarantorName: opt(f.guarantorName), guarantorPhone: opt(f.guarantorPhone), guarantorCnic: opt(f.guarantorCnic), chequeSecurity: opt(f.chequeSecurity), notes: opt(f.notes) };
      if (acc) await creditAccountsApi.update(acc.id, body); else await creditAccountsApi.create(body);
      refreshHardware([KEYS.contractors], true);
      toast.success(acc ? t('Thekedar ki shartein save') : t('Thekedar ka khata ban gaya'));
      onClose();
    } catch (e) { toast.error(errText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  const e = (v?: string) => (touched ? v : undefined);
  return (
    <Sheet open={open} onClose={onClose} title={acc ? t('{{customerName}} — shartein', { customerName: acc.customerName }) : t('Naya thekedar khata')} description={t('Udhaar, receiving aur statement customer ke khate me — yahan sirf had, din aur zamanat')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void run()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <CustomerBox value={customer} onChange={setCustomer} locked={!!acc} />
        {e(errors.customer) ? <Text size="xs" tone="danger">{errors.customer}</Text> : null}
        <Input label={t('Karobar ka naam')} value={f.businessName} onChangeText={(businessName) => set({ businessName })} placeholder={t('Ali Construction')} />
        <Input label={t('CNIC')} value={f.customerCnic} onChangeText={(customerCnic) => set({ customerCnic })} placeholder="35202-1234567-1" ltr error={e(errors.cnic)} />
        <MoneyInput label={t('Udhaar ki had (Rs)')} value={f.creditLimit} onChangeValue={(creditLimit) => set({ creditLimit })} error={e(errors.limit)} hint={t('0 = koi had nahi')} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Kitne din me wapsi')}</Text>
        <ChipGroup value={String(f.creditDays)} onChange={(v) => set({ creditDays: Number(v) })} options={DAYS.map((d) => ({ value: String(d), label: String(d) }))} />
        <Input label={t('Daftar / site ka pata')} value={f.businessAddress} onChangeText={(businessAddress) => set({ businessAddress })} />
        <Input label={t('Zamin (guarantor)')} value={f.guarantorName} onChangeText={(guarantorName) => set({ guarantorName })} />
        <Input label={t('Zamin ka phone')} value={f.guarantorPhone} onChangeText={(guarantorPhone) => set({ guarantorPhone })} keyboardType="phone-pad" ltr error={e(errors.gphone)} />
        <Input label={t('Zamin ka CNIC')} value={f.guarantorCnic} onChangeText={(guarantorCnic) => set({ guarantorCnic })} ltr error={e(errors.gcnic)} />
        <Input label={t('Security cheque')} value={f.chequeSecurity} onChangeText={(chequeSecurity) => set({ chequeSecurity })} placeholder={t('HBL cheque # 123456, Rs 5 lakh')} />
        <TextArea label={t('Note')} value={f.notes} onChangeText={(notes) => set({ notes })} />
      </View>
    </Sheet>
  );
}

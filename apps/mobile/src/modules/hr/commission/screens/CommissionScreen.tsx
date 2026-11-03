/**
 * Commission: each person's share of their sales, worked out on the server
 * from the bills. Tabs: Hisab (the month), Leaderboard, Rules and Team (for
 * managers), Payments and Analytics. A person with only "own commission" sees
 * just their own line.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Pencil, Plus, Trophy, Undo2, UserPlus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore, useIsOwner } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import { apiErrorMessage } from '@/core/api/errors';
import { businessDayKey, formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Avatar, Button, Card, EmptyState, HBarList, IconButton, ListRow, ListTemplate, Screen, Segmented, Select, StatTile, StatusPill, Switch, Text, confirm, toast, useTheme,
} from '@/design';
import { MonthStepper } from '../../attendance/components/MonthStepper';
import { commissionApi, type CommissionPayout, type CommissionPerson, type CommissionRow, type CommissionRule, type RulePayload } from '../api/commission';
import { CommissionAnalytics } from '../components/Analytics';
import { DetailSheet } from '../components/DetailSheet';
import { PaySheet } from '../components/PaySheet';
import { RuleSheet } from '../components/RuleSheet';
import { COMMISSION_KEY, PAY, dayTime, periodLabel, rateText, ruleName, shiftPeriod, signed } from '../lib/meta';

type Tab = 'hisab' | 'board' | 'rules' | 'team' | 'payouts' | 'analytics';
type Status = '' | 'due' | 'paid' | 'minus' | 'off';
type By = 'earned' | 'sale' | 'bills';

const STATUS_LABEL: Record<Exclude<Status, ''>, string> = { due: t('Dena baqi'), paid: t('Ada ho gayi'), minus: t('Minus / zyada ada'), off: t('Commission band') };

const toPayload = (r: CommissionRule, patch: Partial<RulePayload> = {}): RulePayload => ({
  name: r.name ?? null, userId: r.userId ?? null, basis: r.basis, valueType: r.valueType, value: r.value, categoryIds: r.categoryIds, brandIds: r.brandIds, supplierIds: r.supplierIds,
  minMonthlySale: r.minMonthlySale ?? null, targetAmount: r.targetAmount ?? null, targetBonus: r.targetBonus ?? null, isActive: r.isActive, note: r.note ?? null, ...patch,
});

export function CommissionScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const can = usePermission();
  const canManage = can(P.COMMISSION_MANAGE);
  const costHidden = !can(P.COST_VIEW);
  const isOwner = useIsOwner();
  const allShops = isAllShops(useAuthStore((s) => s.currentShopId));
  const shops = (useShops().data ?? []).filter((s) => s.isActive);
  const thisPeriod = businessDayKey(new Date()).slice(0, 7);

  const [period, setPeriod] = useState(thisPeriod);
  const [tab, setTab] = useState<Tab>('hisab');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('');
  const [shopId, setShopId] = useState('');
  const [by, setBy] = useState<By>('earned');
  const [open, setOpen] = useState<{ userId: string; name: string } | null>(null);
  const [paying, setPaying] = useState<CommissionRow | null>(null);
  const [ruleForm, setRuleForm] = useState<{ rule?: CommissionRule } | null>(null);

  const summaryQ = useQuery({ queryKey: [COMMISSION_KEY, 'summary', period], queryFn: () => commissionApi.summary(period), placeholderData: (p) => p });
  const s = summaryQ.data;
  const own = s?.scope === 'own';
  const manage = canManage && !own;
  const rulesQ = useQuery({ queryKey: [COMMISSION_KEY, 'rules'], queryFn: commissionApi.listRules, enabled: manage, staleTime: 60_000 });
  const peopleQ = useQuery({ queryKey: [COMMISSION_KEY, 'people'], queryFn: commissionApi.people, enabled: manage, staleTime: 60_000 });
  const people = peopleQ.data?.people ?? [];
  const withoutLogin = peopleQ.data?.withoutLogin ?? [];
  const rules = rulesQ.data ?? [];

  const refresh = () => { void qc.invalidateQueries({ queryKey: [COMMISSION_KEY] }); };
  const fail = (fallback: string) => (e: unknown) => toast.error(apiErrorMessage(e, fallback));
  const saveRule = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: RulePayload }) => (id ? commissionApi.updateRule(id, data) : commissionApi.createRule(data)),
    onSuccess: (_d, { id }) => { toast.success(id ? t('Rule badal gaya') : t('Rule ban gaya')); refresh(); setRuleForm(null); }, onError: fail(t('Rule save nahi hua')),
  });
  const removeRule = useMutation({ mutationFn: (id: string) => commissionApi.removeRule(id), onSuccess: () => { toast.success(t('Rule hata diya')); refresh(); setRuleForm(null); }, onError: fail(t('Rule nahi hata')) });
  const enroll = useMutation({
    mutationFn: (a: { userId: string; on: boolean; staffId?: string | null }) => commissionApi.enroll({ userId: a.userId, isActive: a.on, staffId: a.staffId ?? undefined }),
    onSuccess: (_d, a) => { toast.success(a.on ? t('Commission chaalu ho gayi') : t('Commission band kar di')); refresh(); }, onError: fail(t('Nahi hua')),
  });
  const pay = useMutation({
    mutationFn: (a: { userId: string; amount: number; expectedPaid: number; note?: string }) => commissionApi.pay({ ...a, period }),
    onSuccess: () => { toast.success(t('Payment likh di')); refresh(); setPaying(null); setOpen(null); }, onError: fail(t('Payment nahi likhi gayi')),
  });
  const undoPay = useMutation({ mutationFn: (userId: string) => commissionApi.undoPay(userId, period), onSuccess: () => { toast.success(t('Payment wapas le li')); refresh(); }, onError: fail(t('Nahi hua')) });
  const busy = saveRule.isPending || removeRule.isPending || enroll.isPending || pay.isPending || undoPay.isPending;
  const linkStaff = useMutation({
    mutationFn: (p: CommissionPerson) => commissionApi.linkUser(p.userId!),
    onSuccess: (_d, p) => { toast.success(t('{{name}} ka HR record ban gaya — tankhwah Staff safhe par daalein', { name: p.name })); refresh(); }, onError: fail(t('HR record nahi bana')),
  });

  const undo = async (r: { userId: string; name: string; paidAmount?: number | null }) => {
    if (await confirm({ title: t('{{name}} ki {{period}} ki payment ({{formatPKR}}) wapas lein?', { name: r.name, period: periodLabel(period), formatPKR: formatPKR(r.paidAmount ?? 0) }), message: t('Ye sirf record hatata hai — paise khud wapas nahi aate.'), tone: 'danger', confirmLabel: t('Wapas lein') })) undoPay.mutate(r.userId);
  };
  const togglePerson = async (p: CommissionPerson, on: boolean) => {
    if (!on && !(await confirm({ title: t('{{name}} par commission band karein?', { name: p.name }), message: t('Is ki commission har us mahine me 0 dikhegi jo abhi ada nahi hua.'), tone: 'danger', confirmLabel: t('Band karein') }))) return;
    enroll.mutate({ userId: p.userId!, on, staffId: p.staff?.id });
  };

  const needle = search.trim().toLowerCase();
  const inShop = (r: CommissionRow) => !shopId || r.shopId === shopId || !!r.shops?.some((x) => x.shopId === shopId);
  const rows = useMemo(() => {
    const list = (s?.rows ?? []).filter((r) => inShop(r) && (!needle || r.name.toLowerCase().includes(needle) || (r.staff?.designation ?? '').toLowerCase().includes(needle)))
      .filter((r) => !status || (status === 'due' && r.enrolled && r.due > 0) || (status === 'paid' && (r.payStatus === 'full' || r.payStatus === 'over')) || (status === 'minus' && (r.earned < 0 || r.payStatus === 'over')) || (status === 'off' && !r.enrolled));
    return [...list].sort((a, b) => Number(b.enrolled) - Number(a.enrolled) || b.earned - a.earned || b.sale - a.sale);
  }, [s, shopId, needle, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = rows.filter((r) => r.enrolled);
  const totals = { earned: live.reduce((a, r) => a + r.earned, 0), paid: rows.reduce((a, r) => a + (r.paidAmount ?? 0), 0), due: rows.reduce((a, r) => a + r.due, 0) };

  const tabs = own
    ? [{ value: 'hisab', label: t('Mera hisab') }, { value: 'payouts', label: t('Payment') }, { value: 'analytics', label: t('Analytics') }]
    : [{ value: 'hisab', label: t('Hisab') }, { value: 'board', label: t('Leaderboard') }, ...(manage ? [{ value: 'rules', label: t('Rules') }, { value: 'team', label: t('Team') }] : []), { value: 'payouts', label: t('Payment') }, { value: 'analytics', label: t('Analytics') }];

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={(v) => setTab(v as Tab)} options={tabs} />
      {tab !== 'rules' && tab !== 'team' && <MonthStepper month={period} onChange={setPeriod} max={thisPeriod} />}
      {!own && allShops && isOwner && shops.length > 1 && tab === 'hisab' && (
        <Select value={shopId} onChange={setShopId} title={t('Branch')} placeholder={t('Sab branches')} options={[{ value: '', label: t('Sab branches') }, ...shops.map((x) => ({ value: x.id, label: x.name }))]} />
      )}
      {tab === 'hisab' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={HandCoins} label={own ? t('Meri commission') : t('Kul commission')} loading={!s} value={<Text size="xl" weight="bold" ltr>{signed(totals.earned)}</Text>} hint={own ? undefined : t('{{count}} bande', { count: live.length })} />
          <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} tone="warning" label={t('Dena baqi')} loading={!s} value={<Amount value={totals.due} weight="bold" size="xl" compact />} hint={t('{{count}} bandon ka', { count: rows.filter((r) => r.enrolled && r.due > 0).length })} onPress={() => setStatus(status === 'due' ? '' : 'due')} />
          <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} tone="success" label={t('Ada hui')} loading={!s} value={<Amount value={totals.paid} weight="bold" size="xl" compact />} onPress={() => setStatus(status === 'paid' ? '' : 'paid')} />
          <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} tone="info" label={t('Asal sale')} loading={!s} value={<Amount value={live.reduce((a, r) => a + r.sale, 0)} weight="bold" size="xl" compact />} hint={s?.returnTotal ? t('Return {{returnTotal}} nikaal kar', { returnTotal: formatPKR(s.returnTotal) }) : t('Chaalu bandon ki')} />
        </View>
      )}
      {!online && <Text size="sm" tone="warning">{t('Commission ka hisab server par banta hai. Abhi aakhri dekha hua hisaab dikh raha hai.')}</Text>}
    </View>
  );
  const actions = manage ? <IconButton icon={Plus} label={t('Naya rule')} onPress={() => setRuleForm({})} /> : undefined;

  const sheets = (
    <>
      <DetailSheet target={open} period={period} canManage={manage} costHidden={costHidden} online={online} busy={busy} onClose={() => setOpen(null)}
        onPay={(d) => { setOpen(null); setTimeout(() => setPaying(d), 350); }} onUndo={(d) => { setOpen(null); setTimeout(() => void undo(d), 350); }} />
      <PaySheet row={paying} period={period} saving={pay.isPending} onClose={() => setPaying(null)} onPay={(a) => paying && pay.mutate({ userId: paying.userId, ...a })} />
      <RuleSheet open={!!ruleForm} rule={ruleForm?.rule} people={people} saving={saveRule.isPending || removeRule.isPending} onClose={() => setRuleForm(null)}
        onSave={(data) => saveRule.mutate({ id: ruleForm?.rule?.id, data })} onDelete={ruleForm?.rule ? () => removeRule.mutate(ruleForm.rule!.id) : undefined} />
    </>
  );

  if (tab === 'analytics' || tab === 'board') {
    const list = live.slice().sort((a, b) => b[by] - a[by] || b.sale - a.sale);
    return (
      <Screen title={t('Commission')} actions={actions} onRefresh={refresh} refreshing={summaryQ.isRefetching}>
        {header}
        {tab === 'analytics' ? <CommissionAnalytics period={period} onPerson={(userId, name) => setOpen({ userId, name })} /> : (
          <View style={{ gap: th.space(3) }}>
            <Segmented value={by} onChange={(v) => setBy(v as By)} options={[{ value: 'earned', label: t('Commission') }, { value: 'sale', label: t('Sale') }, { value: 'bills', label: t('Bill') }]} />
            {!list.length ? <EmptyState icon={Trophy} title={t('Abhi koi muqabla nahi')} message={t('Jin bandon par commission chaalu hai woh yahan sale ke hisaab se aate hain.')} /> : (
              <Card title={t('Sirf chaalu bande · return nikaal kar')}>
                <HBarList colorful rows={list.map((r) => ({ key: r.userId, label: r.name, value: Math.max(0, r[by]), display: by === 'bills' ? String(r.bills) : by === 'sale' ? formatPKR(r.sale) : signed(r.earned), hint: r.targets[0] ? t('Target {{pct}}%', { pct: Math.round(r.targets[0].pct) }) : undefined, onPress: () => setOpen({ userId: r.userId, name: r.name }) }))} />
              </Card>
            )}
          </View>
        )}
        {sheets}
      </Screen>
    );
  }

  if (tab === 'rules') {
    return (
      <>
        <ListTemplate<CommissionRule> title={t('Commission')} actions={actions} summary={header} data={rules} loading={rulesQ.isLoading} error={rulesQ.error} onRetry={rulesQ.refetch}
          refreshing={rulesQ.isRefetching} onRefresh={() => void rulesQ.refetch()} keyExtractor={(r) => r.id}
          renderItem={({ item: r }) => (
            <ListRow icon={HandCoins} iconTone={r.isActive ? 'brand' : 'neutral'} title={ruleName(r)}
              subtitle={[rateText(r), r.user?.fullName ?? t('Sab chaalu bande'), r.categoryIds.length ? t('{{count}} category chuni — baqi maal par ye rule nahi lagega', { count: r.categoryIds.length }) : '', r.minMonthlySale ? `${t('Kam se kam sale (mahina)')}: ${formatPKR(r.minMonthlySale)}` : '', r.targetAmount ? `${t('Target (mahina)')}: ${formatPKR(r.targetAmount)}` : ''].filter(Boolean).join(' · ')}
              trailing={<Switch value={r.isActive} onChange={(v) => saveRule.mutate({ id: r.id, data: toPayload(r, { isActive: v }) })} disabled={busy || !online} />}
              onPress={() => setRuleForm({ rule: r })} />
          )}
          empty={<EmptyState icon={HandCoins} title={t('Abhi koi chaalu rule nahi, is liye kisi ki commission nahi ban rahi.')} action={<Button icon={Plus} onPress={() => setRuleForm({})}>{t('Rule banayein')}</Button>} />}
          fab={{ icon: Plus, label: t('Naya rule'), onPress: () => setRuleForm({}) }} />
        {sheets}
      </>
    );
  }

  if (tab === 'team') {
    const list = people.filter((p) => !needle || p.name.toLowerCase().includes(needle));
    const rowOf = new Map((s?.rows ?? []).map((r) => [r.userId, r]));
    return (
      <>
        <ListTemplate<CommissionPerson> title={t('Commission')} summary={<View style={{ gap: th.space(2) }}>{header}<Text size="sm" tone="muted">{t('Har bande ko alag se chaalu karna parta hai — band switch par commission nahi banti.')}</Text></View>}
          search={{ value: search, onChange: setSearch, placeholder: t('Bande ka naam…') }}
          data={list} loading={peopleQ.isLoading} error={peopleQ.error} onRetry={peopleQ.refetch} refreshing={peopleQ.isRefetching} onRefresh={() => void peopleQ.refetch()} keyExtractor={(p) => p.userId ?? p.name}
          renderItem={({ item: p }) => {
            const r = p.userId ? rowOf.get(p.userId) : undefined;
            return (
              <ListRow avatar={<Avatar name={p.name} url={p.staff?.avatarUrl ?? undefined} size={40} />} title={p.name}
                subtitle={[p.staff?.designation ?? p.role ?? t('Login'), r ? t('Is mahine {{bills}} bill · {{sale}}', { bills: r.bills, sale: formatPKR(r.sale) }) : t('Is mahine koi sale nahi')].join(' · ')}
                trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Switch value={p.enrolled} onChange={(v) => void togglePerson(p, v)} disabled={busy || !online} />
                  {!p.staff && <Button size="sm" variant="ghost" icon={UserPlus} loading={linkStaff.isPending && linkStaff.variables?.userId === p.userId} onPress={() => linkStaff.mutate(p)}>{t('HR record')}</Button>}
                </View>} />
            );
          }}
          empty={<EmptyState title={t('Abhi koi banda nahi')} message={t('Team me log daalein — har bande ka apna login ho, tabhi pata chalta hai kis ne becha.')} />}
          footer={withoutLogin.length ? <Text size="sm" tone="warning" style={{ padding: th.space(3) }}>{t('{{withoutLogin}} employee', { withoutLogin: withoutLogin.length })} {t('ka apna login nahi — un ki sale darj nahi hoti.')}</Text> : undefined} />
        {sheets}
      </>
    );
  }

  if (tab === 'payouts') return <><PayoutsList period={period} search={search} setSearch={setSearch} header={header} actions={actions} />{sheets}</>;

  return (
    <>
      <ListTemplate<CommissionRow> title={t('Commission')} subtitle={periodLabel(period)} actions={actions}
        summary={<View style={{ gap: th.space(2) }}>{header}
          {s && !own && s.notEnrolled.length > 0 && <Text size="sm" tone="warning">{t('{{count}} bandon', { count: s.notEnrolled.length })} {t('ki sale hai magar commission chaalu nahi ({{value}}{{value2}}).', { value: s.notEnrolled.slice(0, 3).map((r) => r.name).join(', '), value2: s.notEnrolled.length > 3 ? '…' : '' })}</Text>}
          {s && !own && s.orphanBills > 0 && <Text size="sm" tone="warning">{t('{{orphanBills}} bill', { orphanBills: s.orphanBills })} {t('par kisi bande ka naam nahi ({{orphanSale}}) — in ki commission kisi ko nahi milti.', { orphanSale: formatPKR(s.orphanSale) })}</Text>}
          {s && !own && s.overpaidTotal > 0 && <Text size="sm" tone="warning">{t('Kuch bandon ko banti se {{amount}} zyada ada hua hai (baad me bill void hua ya rule badla).', { amount: formatPKR(s.overpaidTotal) })}</Text>}
          {own && <Text size="sm" tone="muted">{t('Ye aap ka apna hisab hai. Rate ya payment par sawal ho to dukaan ke malik se baat karein. Kisi line par tap karein to poori details khulti hai.')}</Text>}
          {s && !s.ruleCount && manage && <Text size="sm" tone="warning">{t('Abhi koi chaalu rule nahi, is liye kisi ki commission nahi ban rahi.')}</Text>}
        </View>}
        search={own ? undefined : { value: search, onChange: setSearch, placeholder: t('Bande ka naam, kaam ya staff #…') }}
        filters={own ? undefined : { value: status, onChange: (v) => setStatus(v as Status), options: [{ value: '', label: t('Sab') }, ...(Object.keys(STATUS_LABEL) as Array<Exclude<Status, ''>>).map((k) => ({ value: k as string, label: STATUS_LABEL[k] }))] }}
        data={rows} loading={summaryQ.isLoading && !s} error={summaryQ.error} onRetry={summaryQ.refetch} refreshing={summaryQ.isRefetching} onRefresh={refresh} keyExtractor={(r) => r.userId} grouped={false}
        renderItem={({ item: r }) => <HisabRow r={r} manage={manage} online={online} busy={busy} onOpen={() => setOpen({ userId: r.userId, name: r.name })} onPay={() => setPaying(r)} onUndo={() => void undo(r)} />}
        empty={<EmptyState icon={HandCoins} title={status || needle || shopId ? t('Is filter me koi nahi') : t('Is mahine koi hisab nahi')} />} />
      {sheets}
    </>
  );
}

function HisabRow({ r, manage, online, busy, onOpen, onPay, onUndo }: { r: CommissionRow; manage: boolean; online: boolean; busy: boolean; onOpen: () => void; onPay: () => void; onUndo: () => void }) {
  const th = useTheme();
  const st = PAY[r.payStatus];
  return (
    <View style={{ opacity: r.enrolled ? 1 : 0.6, backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, marginBottom: th.space(2), overflow: 'hidden' }}>
      <ListRow avatar={<Avatar name={r.name} url={undefined} size={40} />} title={r.name}
        subtitle={[r.staff?.designation, t('{{sale}} · {{bills}} bill', { sale: formatPKR(r.sale), bills: r.bills })].filter(Boolean).join(' · ')}
        trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Text weight="bold" ltr>{signed(r.earned)}</Text>{r.enrolled ? <StatusPill tone={st.tone}>{t(st.label)}</StatusPill> : <StatusPill tone="neutral">{t('Band')}</StatusPill>}</View>}
        chevron onPress={onOpen} />
      {r.enrolled && (r.due > 0 || r.paidAmount) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(3), paddingBottom: th.space(3) }}>
          <Text size="xs" tone="muted" style={{ flex: 1 }}>{`${t('Ada hui')} ${formatPKR(r.paidAmount ?? 0)} · ${t('Baqi')} ${formatPKR(r.due)}`}</Text>
          {manage && !r.paidInSalary && r.due > 0 && <Button size="sm" icon={HandCoins} disabled={!online || busy} onPress={onPay}>{t('Ada karein')}</Button>}
          {manage && !r.paidInSalary && !!r.paidAmount && <IconButton icon={Undo2} label={t('Payment wapas')} disabled={!online || busy} onPress={onUndo} />}
        </View>
      ) : null}
    </View>
  );
}

function PayoutsList({ period, search, setSearch, header, actions }: { period: string; search: string; setSearch: (v: string) => void; header: React.ReactNode; actions: React.ReactNode }) {
  const from = shiftPeriod(period, -11);
  const q = useQuery({ queryKey: [COMMISSION_KEY, 'payouts', from, period], queryFn: () => commissionApi.payouts(from, period) });
  const needle = search.trim().toLowerCase();
  const rows = (q.data ?? []).filter((p) => !needle || p.name.toLowerCase().includes(needle));
  const total = rows.reduce((a, p) => a + p.amount, 0);
  return (
    <ListTemplate<CommissionPayout> title={t('Commission')} actions={actions}
      summary={<View style={{ gap: 8 }}>{header}<Text size="sm" tone="muted">{t('{{count}} payments · kul {{total}}', { count: rows.length, total: formatPKR(total) })}</Text></View>}
      search={{ value: search, onChange: setSearch, placeholder: t('Bande ka naam…') }}
      data={rows} loading={q.isLoading} error={q.error} onRetry={q.refetch} refreshing={q.isRefetching} onRefresh={() => void q.refetch()} keyExtractor={(p) => p.id}
      renderItem={({ item: p }) => <ListRow icon={HandCoins} iconTone="success" title={p.name} subtitle={`${periodLabel(p.period)} · ${dayTime(p.paidAt)}${p.paidBy ? ` · ${p.paidBy}` : ''}${p.note ? ` · ${p.note}` : ''}`} trailing={<Amount value={p.amount} weight="bold" />} />}
      empty={<EmptyState icon={HandCoins} title={needle ? t('Is naam ki koi payment nahi') : t('Pichle 12 mahine me koi payment nahi likhi')} message={t('Hisab tab me kisi bande par "Ada karein" dabayein — yahan record ban jata hai.')} />} />
  );
}

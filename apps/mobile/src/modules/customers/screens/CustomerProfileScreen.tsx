/**
 * One customer: khata with payment, credit and old-register actions; how they
 * buy (12 months, favourite products, rhythm, payment habits); every bill; the
 * khata timeline with a statement to share; loyalty; and details. The balance
 * comes from the phone's own copy, so a payment taken a second ago already
 * shows, with or without internet.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, CloudOff, Copy, Crown, FileText, MessageCircle, MoreHorizontal, Pencil, Phone, Plus, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { balanceState, khataReminder, limitUsedPercent, thanksText } from '@nafaa/core/customers';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatDateTime, formatMoney, formatNumber, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { useCustomer, useOutbox } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useAuthStore } from '@/core/auth/store';
import { useBillLanguage } from '@/core/receipt';
import {
  Amount, Avatar, Badge, Button, Card, confirm, DetailRow, DetailSection, DetailTemplate, EmptyState, IconButton, ListRow, ProgressBar, Row, Segmented, Sheet, SkeletonRows, StatTile, Text, toast, useTheme,
} from '@/design';
import { methodLabel } from '@/modules/pos/components/parts';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { MiniBars } from '@/modules/sales/components/MiniBars';
import { SaleRow } from '@/modules/sales/components/SaleRow';
import { useCostMask } from '@/modules/sales/lib/mask';
import { shareCsv, sharePdf } from '@/modules/sales/lib/share';
import { useHistory } from '@/modules/sales/lib/useHistory';
import { customersApi, ledgerApi, type LedgerEntry } from '../api/customers';
import { KhataActionSheet } from '../components/KhataActionSheet';
import { callPhone, copyText, openWhatsApp } from '../lib/contact';
import { LEDGER_LABEL } from '../lib/meta';
import { refreshCustomers, useRefreshWhenSynced } from '../lib/refresh';
import { statementHtml, statementMessage, type StatementInput } from '../lib/statement';

type Tab = 'summary' | 'bills' | 'khata' | 'points' | 'details';
const isTemp = (id: string) => id.startsWith('tmp_');

export function CustomerProfileScreen({ initialTab }: { initialTab?: Tab }) {
  const th = useTheme();
  const params = useLocalSearchParams<{ id?: string; customerId?: string; tab?: string; pay?: string }>();
  const id = params.id ?? params.customerId ?? '';
  const can = usePermission();
  const online = useOnlineStatus();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Hamari dukaan');
  const { costHidden, cost } = useCostMask();
  const [tab, setTab] = useState<Tab>((params.tab as Tab) ?? initialTab ?? 'summary');
  const [action, setAction] = useState<'payment' | 'udhaar' | 'opening' | null>(params.pay ? 'payment' : null);
  const [menu, setMenu] = useState(false);

  const mirror = useCustomer(id);
  const m = mirror.data;
  const detail = useQuery({ queryKey: ['customer', id], queryFn: () => customersApi.getOne(id), enabled: !!id && !isTemp(id) && online });
  const insights = useQuery({ queryKey: ['customer-insights', id], queryFn: () => customersApi.insights(id), enabled: !!id && !isTemp(id) && online });
  const ledger = useQuery({ queryKey: ['customer-ledger', id], queryFn: () => ledgerApi.list(id), enabled: !!id && !isTemp(id) && online });
  const bills = useHistory('all', { customerId: id });
  const { items: outbox } = useOutbox();
  const waiting = useMemo(() => outbox.filter((o) => (o.kind === 'khata.payment' || o.kind === 'khata.udhaar') && o.path.includes(`/${id}/`) && o.status !== 'done'), [outbox, id]);
  useRefreshWhenSynced(() => { void detail.refetch(); void ledger.refetch(); void insights.refetch(); });

  const c = detail.data;
  const name = m?.name ?? c?.name ?? '';
  const phone = m?.phone ?? c?.phone ?? null;
  const balance = m?.balance ?? ledger.data?.shopBalance ?? c?.balance ?? 0;
  const limit = m?.creditLimit ?? c?.creditLimit ?? 0;
  const isVip = m?.isVip ?? c?.isVip ?? false;
  const state = balanceState(balance);
  const ins = insights.data;
  const dueDays = ins?.credit.dueDays ?? null;
  const entries: LedgerEntry[] = ledger.data?.ledgers ?? [];
  const usedPct = limitUsedPercent({ balance, creditLimit: limit });
  const canKhata = can(P.KHATA_MANAGE);
  const canEdit = can(P.CUSTOMERS_EDIT);
  const loading = !m && !c && (online && !isTemp(id) ? detail.isLoading : mirror.isLoading);
  const tabs = [
    { value: 'summary' as Tab, label: t('Khulasa') }, { value: 'bills' as Tab, label: t('Bills') }, { value: 'khata' as Tab, label: t('Khata') },
    ...((c?.loyaltyTransactions?.length ?? 0) > 0 ? [{ value: 'points' as Tab, label: t('Points') }] : []),
    { value: 'details' as Tab, label: t('Details') },
  ];

  useEffect(() => { if (params.pay) setAction('payment'); }, [params.pay]);

  const statement: StatementInput = { name, phone, shop, balance, entries, lang };
  const shareStatement = async () => {
    if (!online && !entries.length) return toast.warning(t('Khata ki purani history ke liye internet chahiye'));
    try { await sharePdf(`khata-${name}`, statementHtml(statement), t('Statement')); } catch { toast.error(t('PDF nahi bana')); }
  };
  const csv = async () => {
    try {
      await shareCsv(`khata-${name}`, [[t('Date'), t('Kya'), t('Reference'), t('Note'), t('Amount'), t('Baqi')],
        ...entries.map((e) => [formatDateTime(e.createdAt), t(LEDGER_LABEL[e.type]?.label ?? e.type), e.reference ?? '', e.note ?? '', e.amount.toFixed(2), e.balanceAfter.toFixed(2)])]);
    } catch { toast.error(t('Export nahi hua')); }
  };
  const message = () => (state === 'owes'
    ? khataReminder({ name, gender: c?.gender, phone, amount: formatMoney(balance), dueDays }, shop, lang)
    : thanksText({ name, gender: c?.gender }, shop, lang));
  const toggleVip = async () => {
    setMenu(false);
    if (!online) return toast.warning(t('Is kaam ke liye internet chahiye'));
    try { await customersApi.toggleVip(id); toast.success(isVip ? t('VIP hata diya') : t('VIP bana diya')); refreshCustomers(); void mirror.refetch(); } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const remove = async () => {
    setMenu(false);
    if (!online) return toast.warning(t('Is kaam ke liye internet chahiye'));
    const hasHistory = (c?._count.sales ?? 0) > 0 || (c?._count.ledgers ?? 0) > 0 || Math.abs(balance) > 0.009;
    const ok = await confirm({
      title: t('{{name}} ko mitayein?', { name }), tone: 'danger', confirmLabel: t('Haan'),
      message: hasHistory ? t('Is ki sale ya khata hai — mitaya nahi jayega, sirf band hoga. Purane bill aur khata salamat rahenge.') : t('Is ki koi sale ya khata nahi — hamesha ke liye mit jayega.'),
    });
    if (!ok) return;
    try {
      const r = await customersApi.remove(id);
      toast.success(r.message ?? t('Ho gaya'));
      refreshCustomers();
      if (r.softDeleted) void detail.refetch(); else router.back();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const balanceTone = state === 'owes' ? th.colors.danger : state === 'advance' ? th.colors.success : th.colors.neutral;

  return (
    <>
      <DetailTemplate
        title={name || t('Customer')}
        subtitle={c ? t('Customer {{createdAt}} se', { createdAt: formatDate(c.createdAt) }) : undefined}
        loading={loading}
        onRefresh={() => { void mirror.refetch(); if (online) { void detail.refetch(); void insights.refetch(); void ledger.refetch(); } }}
        refreshing={detail.isRefetching}
        actions={<Row gap={1}>
          {canEdit && <IconButton icon={Pencil} label={t('Badlein')} onPress={() => router.push(`/customers/${id}/edit` as never)} />}
          <IconButton icon={MoreHorizontal} label={t('Aur')} onPress={() => setMenu(true)} />
        </Row>}
        summary={m || c ? (
          <View style={{ gap: th.space(3) }}>
            <Row gap={3}>
              <Avatar name={name} url={c?.avatarUrl ?? undefined} size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <Row gap={1.5} wrap>
                  <Text size="xl" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Text>
                  {isVip && <Crown size={16} color={th.colors.warning.solid} />}
                  {m?.pendingCreate && <Badge tone="warning" icon={CloudOff}>{t('Waiting')}</Badge>}
                  {(m ? !m.isActive : c ? !c.isActive : false) && <Badge>{t('Band')}</Badge>}
                </Row>
                {!!phone && <Text size="sm" tone="muted" ltr>{phone}</Text>}
                {!!(m?.city || c?.city || c?.area) && <Text size="sm" tone="muted">{[c?.area ?? m?.area, c?.city ?? m?.city].filter(Boolean).join(', ')}</Text>}
              </View>
            </Row>
            <View style={{ padding: th.space(4), borderRadius: th.radius('xl'), backgroundColor: balanceTone.soft, gap: th.space(1) }}>
              <Text size="sm" tone="secondary">{state === 'owes' ? t('Baqi udhaar') : state === 'advance' ? t('Advance jama') : t('Khata')}</Text>
              {state === 'clear' ? <Text size="3xl" weight="bold" tone="muted">{t('Saaf')}</Text>
                : <Amount value={Math.abs(balance)} size="3xl" weight="bold" color={balanceTone.text} />}
              {state === 'owes' && dueDays !== null && <Text size="xs" color={balanceTone.text}>{t('Sab se purana udhaar {{dueDays}} din se baqi', { dueDays })}</Text>}
              {ledger.data && Math.abs(ledger.data.totalBalance - balance) > 0.009 && <Text size="xs" tone="secondary">{t('Saari branches: {{totalBalance}}', { totalBalance: formatMoney(ledger.data.totalBalance) })}</Text>}
              {usedPct !== null && (
                <View style={{ gap: 4, marginTop: th.space(1) }}>
                  <ProgressBar value={usedPct / 100} tone={usedPct >= 100 ? 'danger' : usedPct >= 75 ? 'warning' : 'success'} />
                  <Text size="2xs" tone="secondary">{t('Had {{creditLimit}}{{value}}', { creditLimit: formatMoney(limit), value: usedPct >= 100 ? t(' — paar ho gayi') : '' })}</Text>
                </View>
              )}
              {canKhata && (
                <Row gap={2} style={{ marginTop: th.space(2) }}>
                  <Button style={{ flex: 1 }} variant="success" icon={Wallet} disabled={state !== 'owes'} onPress={() => setAction('payment')}>{t('Payment')}</Button>
                  <Button style={{ flex: 1 }} variant="secondary" icon={Plus} onPress={() => setAction('udhaar')}>{t('Udhaar')}</Button>
                </Row>
              )}
            </View>
            <Row gap={2}>
              {!!phone && <Button size="sm" style={{ flex: 1 }} variant={state === 'owes' ? 'soft' : 'secondary'} icon={MessageCircle} onPress={() => openWhatsApp(phone, message())}>{state === 'owes' ? t('Yaad-dihani') : t('WhatsApp')}</Button>}
              {!!phone && <Button size="sm" style={{ flex: 1 }} variant="secondary" icon={Phone} onPress={() => callPhone(phone)}>{t('Call')}</Button>}
              <Button size="sm" style={{ flex: 1 }} variant="secondary" icon={FileText} onPress={() => void shareStatement()}>{t('Statement')}</Button>
            </Row>
            <Segmented value={tab} onChange={setTab} options={tabs} />
          </View>
        ) : undefined}
      >
        {!m && !c && !loading && <EmptyState icon={BookOpen} title={t('Customer nahi mila')} message={detail.error ? apiErrorMessage(detail.error) : undefined} />}
        {(m || c) && (
          <View style={{ gap: th.space(3) }}>
            <CachedNote query={detail} />
            {tab === 'summary' && (
              <>
                <Row gap={2}>
                  <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Kul khareedari')} value={<Amount value={ins?.visits.spent ?? m?.totalSpent ?? 0} size="lg" weight="bold" />} hint={t('{{value}} bill', { value: ins?.visits.count ?? c?.stats.totalSales ?? 0 })} />
                  <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Ausat bill')} value={<Amount value={ins?.visits.average ?? c?.stats.averageSale ?? 0} size="lg" weight="bold" />}
                    hint={ins?.visits.best ? t('sab se bara {{best}}', { best: formatMoney(ins.visits.best) }) : undefined} />
                </Row>
                <Row gap={2}>
                  <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="accent" label={t('Aakhri dafa')} value={ins?.visits.last ? formatRelative(ins.visits.last) : '—'} hint={ins?.visits.first ? t('pehli dafa {{first}}', { first: formatDate(ins.visits.first) }) : undefined} />
                  <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Points')} value={String(m?.loyaltyPoints ?? c?.loyaltyPoints ?? 0)}
                    hint={ins?.visits.averageGapDays != null ? t('Har {{count}} din baad', { count: Math.round(ins.visits.averageGapDays) }) : undefined} />
                </Row>
                {insights.isLoading && online && <SkeletonRows count={3} />}
                {ins && ins.months.length > 0 && ins.visits.count > 0 && (
                  <Card title={t('Har mahine kitna khareeda')} description={t('Pichhle 12 mahine')}>
                    <MiniBars points={ins.months.map((x) => ({ key: x.key, value: x.spent, label: x.key.slice(5) }))} highlight={ins.months[ins.months.length - 1]?.key} />
                  </Card>
                )}
                {ins && ins.products.length > 0 && (
                  <Card title={t('Kya leta hai')} flush>
                    {ins.products.slice(0, 5).map((p, i) => (
                      <ListRow key={p.productId} dense leading={<Text weight="bold" tone="muted" style={{ width: 20 }}>{i + 1}</Text>} title={p.name}
                        subtitle={t('{{qty}} {{unit}} · {{times}} dafa', { qty: formatNumber(p.qty, { maxDecimals: 2 }), unit: p.unit, times: p.times })} trailing={<Amount value={p.spent} size="sm" />} />
                    ))}
                  </Card>
                )}
                {ins && ins.payments.length > 0 && (
                  <Card title={t('Kaise paise deta hai')}>
                    <View style={{ gap: th.space(2.5) }}>
                      {ins.payments.map((p) => {
                        const total = ins.payments.reduce((s, x) => s + x.total, 0) || 1;
                        return (<View key={p.method} style={{ gap: 4 }}><Row justify="between"><Text size="sm">{methodLabel(p.method)} <Text size="sm" tone="muted">· {p.bills}</Text></Text><Amount value={p.total} size="sm" /></Row><ProgressBar value={p.total / total} /></View>);
                      })}
                    </View>
                  </Card>
                )}
                {ins && (
                  <Card title={t('Udhaar ka hisaab')}>
                    <Row gap={2} wrap>
                      <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} tone="danger" label={t('Kul udhaar liya')} value={<Amount value={ins.credit.taken} weight="bold" />} />
                      <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} tone="success" label={t('Payment di')} value={<Amount value={ins.credit.paid} weight="bold" />} />
                      <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} tone="info" label={t('Return / void')} value={<Amount value={ins.credit.reduced} weight="bold" />} />
                      <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} tone="warning" label={t('Sab se purana baqi')} value={dueDays !== null ? t('{{count}} din', { count: dueDays }) : '—'} />
                    </Row>
                    {ins.credit.pendingProfit != null && (ins.credit.billProfit ?? 0) > 0.5 && (
                      <Text size="xs" tone="warning" style={{ marginTop: th.space(2) }}>
                        {t('Udhaar bills ka profit {{total}}: haath mein aaya {{realised}} · udhaar mein profit (abhi aana hai) {{pending}}', {
                          total: cost(ins.credit.billProfit), realised: cost(ins.credit.realised), pending: cost(ins.credit.pendingProfit) })}
                      </Text>
                    )}
                  </Card>
                )}
                {!online && !ins && <EmptyState icon={CloudOff} title={t('Details ke liye internet chahiye')} message={t('Khulasa internet aate hi yahan aa jayega.')} />}
              </>
            )}

            {tab === 'bills' && (
              bills.loading ? <SkeletonRows count={4} /> : bills.sales.length === 0 ? <EmptyState icon={BookOpen} title={t('Koi bill nahi')} /> : (
                <View>
                  {bills.sales.map((s, i) => <SaleRow key={s.id} sale={s} first={i === 0} last={i === bills.sales.length - 1} />)}
                  {bills.hasMore && <Button variant="ghost" loading={bills.loadingMore} onPress={bills.loadMore}>{t('Aur dikhayein')}</Button>}
                </View>
              )
            )}

            {tab === 'khata' && (
              <>
                <Row gap={2}>
                  <Button size="sm" variant="secondary" style={{ flex: 1 }} icon={MessageCircle} disabled={!phone || !entries.length} onPress={() => openWhatsApp(phone, statementMessage(statement))}>{t('Statement WhatsApp par')}</Button>
                  <IconButton icon={Copy} label={t('CSV')} onPress={() => void csv()} />
                </Row>
                {canKhata && <Button variant="ghost" size="sm" onPress={() => setAction('opening')}>{t('Kaapi ka purana khata jorein')}</Button>}
                {waiting.length > 0 && (
                  <Card flush>
                    {waiting.map((o) => (
                      <ListRow key={o.id} dense icon={CloudOff} iconTone="warning" title={o.title} subtitle={t('Phone par save hai — internet aane par bhej diya jayega')}
                        trailing={<Amount value={o.kind === 'khata.payment' ? -(o.amount ?? 0) : (o.amount ?? 0)} size="sm" signed colorize />} />
                    ))}
                  </Card>
                )}
                {ledger.isLoading && online ? <SkeletonRows count={4} /> : entries.length === 0 ? (
                  <EmptyState icon={BookOpen} title={online ? t('Abhi koi khata entry nahi') : t('Khata ki purani history ke liye internet chahiye')} />
                ) : (
                  <Card flush>
                    {entries.map((e) => {
                      const meta = LEDGER_LABEL[e.type] ?? { label: e.type, tone: 'neutral' as const };
                      return (
                        <ListRow key={e.id} dense title={<Row gap={1.5} wrap><Badge tone={meta.tone}>{t(meta.label)}</Badge>{!!e.reference && <Text size="xs" tone="muted" ltr>{e.reference}</Text>}</Row>}
                          subtitle={`${formatDateTime(e.createdAt)}${e.createdBy ? ` · ${e.createdBy.fullName}` : ''}${e.shop ? ` · ${e.shop.name}` : ''}${e.note ? `\n${e.note}` : ''}`}
                          trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={e.amount} signed weight="bold" tone={e.amount > 0 ? 'danger' : 'success'} /><Text size="2xs" tone="muted">{t('baqi')} <Amount value={e.balanceAfter} size="2xs" tone="muted" /></Text></View>} />
                      );
                    })}
                  </Card>
                )}
              </>
            )}

            {tab === 'points' && c && (
              <Card flush>
                {c.loyaltyTransactions.map((x) => (
                  <ListRow key={x.id} dense title={x.type === 'EARNED' ? t('Mile') : x.type === 'REDEEMED' ? t('Istemal') : x.type === 'EXPIRED' ? t('Khatam') : t('Haath se')}
                    subtitle={`${formatDateTime(x.createdAt)}${x.note ? ` · ${x.note}` : ''}`}
                    trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr tone={x.points >= 0 ? 'success' : 'danger'}>{`${x.points > 0 ? '+' : ''}${x.points}`}</Text><Text size="2xs" tone="muted" ltr>{x.balanceAfter}</Text></View>} />
                ))}
              </Card>
            )}

            {tab === 'details' && (
              <>
                <DetailSection title={t('Customer')}>
                  <DetailRow label={t('Phone')} value={phone ? <Text ltr>{phone}</Text> : '—'} />
                  <DetailRow label={t('Email')} value={c?.email ? <Text ltr>{c.email}</Text> : '—'} />
                  <DetailRow label={t('Pata')} value={[c?.address, c?.area ?? m?.area, c?.city ?? m?.city].filter(Boolean).join(', ') || '—'} />
                  <DetailRow label={t('Udhaar ki limit (Rs)')} value={limit > 0 ? <Amount value={limit} /> : t('Koi had nahi')} />
                  {!!c?.priceTier && <DetailRow label={t('Default price')} value={c.priceTier} />}
                  <DetailRow label={t('CNIC')} value={c?.cnic ?? m?.cnic ? <Text ltr>{c?.cnic ?? m?.cnic}</Text> : '—'} />
                  {!!c?.ntn && <DetailRow label={t('NTN')} value={<Text ltr>{c.ntn}</Text>} />}
                  {!!c?.dateOfBirth && <DetailRow label={t('Paidaish ki date')} value={formatDate(c.dateOfBirth)} />}
                  <DetailRow last label={t('Note')} value={c?.notes || '—'} />
                </DetailSection>
              </>
            )}
          </View>
        )}
      </DetailTemplate>

      {(m || c) && (
        <KhataActionSheet open={!!action} action={action ?? 'payment'} customer={{ id, name, balance }} onClose={() => setAction(null)} onDone={() => { void mirror.refetch(); }} />
      )}
      <Sheet open={menu} onClose={() => setMenu(false)} title={name}>
        <View style={{ gap: th.space(1) }}>
          <ListRow icon={Crown} iconTone="warning" title={isVip ? t('VIP hatayein') : t('VIP banayein')} onPress={() => void toggleVip()} />
          <ListRow icon={Copy} title={t('Details copy')} onPress={() => { setMenu(false); void copyText([name, phone, c?.email, [c?.address, c?.area, c?.city].filter(Boolean).join(', ')].filter(Boolean).join('\n')); }} />
          {canKhata && <ListRow icon={BookOpen} title={t('Kaapi ka purana khata jorein')} onPress={() => { setMenu(false); setAction('opening'); }} />}
          {canEdit && <ListRow icon={Trash2} destructive title={t('Mitayein')} onPress={() => void remove()} />}
        </View>
      </Sheet>
    </>
  );
}



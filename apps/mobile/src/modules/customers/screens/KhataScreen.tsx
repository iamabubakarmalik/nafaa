/**
 * Khata book: who owes what and for how long, over every customer, from the
 * server (the phone's own copy with no internet). Take a payment or give
 * credit straight from the list, step through WhatsApp reminders one by one in
 * the shop's language, and edit the reminder wording.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Download, History, MessageSquare, MoreHorizontal, Plus, Settings2, SlidersHorizontal, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { khataReminder, thanksText, toneFor, type KhataAction } from '@nafaa/core/customers';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useAuthStore } from '@/core/auth/store';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Button, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Sheet, StatTile, Text, toast, useTheme } from '@/design';
import { shareCsv } from '@/modules/sales/lib/share';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { customersApi, ledgerApi, type AgingBucket, type DirectoryCustomer } from '../api/customers';
import { CustomerFiltersSheet } from '../components/CustomerFiltersSheet';
import { CustomerPickerSheet, type PickedCustomer } from '../components/CustomerPickerSheet';
import { CustomerRow } from '../components/CustomerRow';
import { KhataActionSheet } from '../components/KhataActionSheet';
import { ReminderTemplatesSheet, ReminderWizard } from '../components/ReminderSheets';
import { callPhone, openWhatsApp } from '../lib/contact';
import { AGING } from '../lib/meta';
import { refreshCustomers, useRefreshWhenSynced } from '../lib/refresh';
import { useDirectory } from '../lib/useDirectory';

const TYPES = [
  { value: 'khata', label: msg('Udhaar wale') }, { value: 'overLimit', label: msg('Had se zyada') }, { value: 'advance', label: msg('Advance') }, { value: 'all', label: msg('Sab customers') },
] as const;
const SORT_CHIPS = [
  { value: 'balance', label: msg('Zyada baqi pehle') }, { value: 'aging', label: msg('Purana udhaar pehle') }, { value: 'lastVisit', label: msg('Haal hi mein aaye') }, { value: 'name', label: msg('Naam (A–Z)') },
] as const;

export function KhataScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Hamari dukaan');
  const d = useDirectory({ type: 'khata', sort: 'balance' });
  const summary = useQuery({ queryKey: ['khata-summary'], queryFn: ledgerApi.summary, staleTime: 60_000 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [act, setAct] = useState<{ action: KhataAction; customer: { id: string; name: string; balance: number } } | null>(null);
  const [picking, setPicking] = useState<KhataAction | null>(null);
  const [wizard, setWizard] = useState<DirectoryCustomer[] | null>(null);
  const [templates, setTemplates] = useState(false);
  const [menu, setMenu] = useState(false);
  const canManage = can(P.KHATA_MANAGE);
  const st = d.data?.stats;
  const old = st ? st.aging.d30.amount + st.aging.d90.amount : 0;
  const month = summary.data?.thisMonth;
  useRefreshWhenSynced(() => { void d.refetch(); void summary.refetch(); });

  const all = async () => {
    const out: DirectoryCustomer[] = [];
    for (let page = 1; page <= 50; page++) {
      const res = await customersApi.directory({ ...d.filters, type: d.f.type === 'all' ? 'khata' : d.f.type }, page, 100);
      out.push(...res.items);
      if (!res.hasMore) break;
    }
    return out;
  };
  const reminders = async () => {
    try { setWizard(await all()); } catch (e) { toast.error(apiErrorMessage(e, t('List nahi aayi'))); }
  };
  const exportCsv = async () => {
    try {
      const rows = await all();
      if (!rows.length) return toast.error(t('Koi nahi'));
      await shareCsv('khata', [[t('Naam'), t('Phone'), t('Baqi'), t('Din'), t('Limit')], ...rows.map((c) => [c.name, c.phone ?? '', c.balance.toFixed(2), c.dueDays ?? '', c.creditLimit])], t('Khata'));
    } catch (e) { toast.error(apiErrorMessage(e, t('Export nahi hua'))); }
  };
  const pick = (c: PickedCustomer) => { const a = picking!; setPicking(null); setAct({ action: a, customer: { id: c.id, name: c.name, balance: c.balance } }); };
  const done = () => { refreshCustomers(); void d.refetch(); void summary.refetch(); };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" label={t('Kul lena hai')} loading={!st} value={<Amount value={st?.receivable ?? 0} size="lg" weight="bold" />} hint={t('{{owingCount}} customers', { owingCount: st?.owingCount ?? 0 })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('30 din se purana')} loading={!st} value={<Amount value={old} size="lg" weight="bold" />} hint={t('{{value}} customers', { value: st ? st.aging.d30.count + st.aging.d90.count : 0 })} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Is mahine receive')} loading={!month} value={<Amount value={month?.wasooli ?? 0} size="lg" weight="bold" />} hint={t('udhaar gaya {{udhaar}}', { udhaar: formatMoney(month?.udhaar ?? 0, { compact: true }) })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Advance jama')} loading={!st} value={<Amount value={st?.advance ?? 0} size="lg" weight="bold" />} hint={t('{{advanceCount}} customers', { advanceCount: st?.advanceCount ?? 0 })} />
      </Row>
      {st && st.owingCount > 0 && (
        <Row gap={2} wrap>
          {AGING.map((a) => {
            const b = st.aging[a.id as AgingBucket];
            const on = d.f.aging === a.id;
            return (
              <Button key={a.id} size="sm" variant={on ? 'primary' : 'soft'} onPress={() => d.set('aging', on ? undefined : (a.id as AgingBucket))}>
                {`${t(a.label)} · ${b.count}`}
              </Button>
            );
          })}
        </Row>
      )}
      <ChipGroup value={d.f.type} onChange={(v) => d.set('type', v as typeof d.f.type)} style={{ marginHorizontal: -th.space(4) }}
        options={TYPES.map((x) => ({ value: x.value, label: t(x.label), count: d.data?.tabs[x.value] }))} />
      <ChipGroup value={d.f.sort} onChange={(v) => d.set('sort', v as typeof d.f.sort)} style={{ marginHorizontal: -th.space(4) }}
        options={SORT_CHIPS.map((x) => ({ value: x.value, label: t(x.label) }))} />
      {d.offline && <Text size="xs" tone="muted">{t('Internet nahi — computer par save khata dikh raha hai. Payment aur udhaar abhi bhi likh sakte hain, internet aate hi server par chale jayenge.')}</Text>}
      <CachedNote query={d.listQuery} />
    </View>
  );

  return (
    <>
      <ListTemplate<DirectoryCustomer>
        title={t('Customer credit')}
        actions={<Row gap={1}>
          <IconButton icon={MessageSquare} label={t('Yaad-dihani')} onPress={() => void reminders()} />
          <IconButton icon={Download} label={t('CSV')} onPress={() => void exportCsv()} />
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={d.hasFilters} onPress={() => setFiltersOpen(true)} />
          <IconButton icon={MoreHorizontal} label={t('Aur')} onPress={() => setMenu(true)} />
        </Row>}
        search={{ value: d.search, onChange: d.setSearch, placeholder: t('Naam, phone ya sheher…') }}
        summary={header}
        data={d.items}
        loading={d.loading}
        error={d.error}
        onRetry={() => void d.refetch()}
        refreshing={d.refreshing}
        onRefresh={() => { void d.refetch(); void summary.refetch(); }}
        onEndReached={d.loadMore}
        keyExtractor={(c) => c.id}
        renderItem={({ item: c }) => (
          <CustomerRow c={c} showAge
            onPress={() => router.push(`/customers/${c.id}?tab=khata` as never)}
            onWhatsApp={() => openWhatsApp(c.phone, c.balance > 0.009
              ? khataReminder({ name: c.name, gender: c.gender, phone: c.phone, amount: formatMoney(c.balance), dueDays: c.dueDays }, shop, lang, toneFor(c.dueDays))
              : thanksText({ name: c.name, gender: c.gender }, shop, lang))}
            onCall={() => callPhone(c.phone)}
            onPayment={canManage ? () => setAct({ action: 'payment', customer: { id: c.id, name: c.name, balance: c.balance } }) : undefined} />
        )}
        empty={<EmptyState icon={UserRound} title={d.hasFilters || d.f.type !== 'khata' ? t('Is filter mein koi nahi') : t('Kisi ka udhaar baqi nahi')}
          message={d.hasFilters || d.f.type !== 'khata' ? t('Filter hata kar dekhein.') : undefined} />}
        fab={canManage ? { icon: Plus, label: t('Udhaar'), onPress: () => setPicking('udhaar') } : undefined}
      />
      <CustomerFiltersSheet d={d} open={filtersOpen} onClose={() => setFiltersOpen(false)} showSort={false} />
      <CustomerPickerSheet open={!!picking} title={picking === 'opening' ? t('Kis ka purana khata?') : t('Kis ko udhaar?')} onPick={pick} onClose={() => setPicking(null)} />
      {act && <KhataActionSheet open action={act.action} customer={act.customer} onClose={() => setAct(null)} onDone={done} />}
      <ReminderWizard open={!!wizard} customers={wizard ?? []} shop={shop} lang={lang} onClose={() => setWizard(null)} />
      <ReminderTemplatesSheet open={templates} lang={lang} onClose={() => setTemplates(false)} />
      <Sheet open={menu} onClose={() => setMenu(false)} title={t('Customer credit')}>
        <View>
          {canManage && <ListRow icon={History} title={t('Kaapi ka purana khata')} subtitle={t('Register ka purana baqi maujooda khate mein jurega')} onPress={() => { setMenu(false); setPicking('opening'); }} />}
          <ListRow icon={Settings2} title={t('Message badlein')} subtitle={t('Yaad-dihani ke messages')} onPress={() => { setMenu(false); setTemplates(true); }} />
        </View>
      </Sheet>
    </>
  );
}

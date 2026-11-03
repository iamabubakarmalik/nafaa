/**
 * Customers: every customer with server-side search (phone in any format),
 * filters and sort, so counts and totals cover the whole list. Who owes, who
 * has gone quiet, birthdays; long-press to select and act on many. Customers
 * made on this phone show on top until they reach the server; with no
 * internet the phone's own copy is used.
 */

import { router } from 'expo-router';
import { ArrowRight, BookOpen, Cake, CloudOff, Download, MessageCircle, Plus, SlidersHorizontal, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { khataReminder, thanksText } from '@nafaa/core/customers';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useAuthStore } from '@/core/auth/store';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Badge, Button, ChipGroup, EmptyState, IconButton, ListTemplate, Row, StatTile, Text, toast, useTheme } from '@/design';
import { shareCsv } from '@/modules/sales/lib/share';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import type { DirectoryCustomer } from '../api/customers';
import { BulkBar } from '../components/BulkBar';
import { CustomerFiltersSheet } from '../components/CustomerFiltersSheet';
import { CustomerRow } from '../components/CustomerRow';
import { QuickAddSheet } from '../components/QuickAddSheet';
import { callPhone, openWhatsApp } from '../lib/contact';
import { TYPES } from '../lib/meta';
import { refreshCustomers, useRefreshWhenSynced } from '../lib/refresh';
import { useDirectory } from '../lib/useDirectory';

export function CustomersScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Hamari dukaan');
  const d = useDirectory();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const canEdit = can(P.CUSTOMERS_EDIT);
  const st = d.data?.stats;
  useRefreshWhenSynced(() => void d.refetch());

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectedRows = d.items.filter((c) => selected.has(c.id));

  const exportCsv = async (only?: DirectoryCustomer[]) => {
    const rows = only ?? d.items;
    if (!rows.length) return toast.error(t('Koi customer nahi'));
    try {
      await shareCsv('customers', [
        [t('Naam'), t('Phone'), t('Sheher'), t('Baqi'), t('Kul khareedari'), t('Points')],
        ...rows.map((c) => [c.name, c.phone ?? '', c.city ?? '', c.balance.toFixed(2), c.spent.toFixed(2), c.loyaltyPoints]),
      ], t('Customers'));
    } catch { toast.error(t('Export nahi hua')); }
  };

  const openProfile = (c: DirectoryCustomer) => router.push(`/customers/${c.id}` as never);
  const summary = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" label={t('Kul udhaar baqi')} loading={!st} value={<Amount value={st?.receivable ?? 0} size="lg" weight="bold" />}
          hint={t('{{owingCount}} customers', { owingCount: st?.owingCount ?? 0 })} onPress={() => d.set('type', 'khata')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Kul khareedari')} loading={!st} value={<Amount value={st?.spent ?? 0} size="lg" weight="bold" compact />}
          hint={t('{{buyers}} ne khareeda', { buyers: st?.buyers ?? 0 })} />
      </Row>
      <ChipGroup value={d.f.type} onChange={(v) => d.set('type', v as typeof d.f.type)} style={{ marginHorizontal: -th.space(4) }}
        options={TYPES.map((x) => ({ value: x.value, label: t(x.label), icon: x.icon, count: d.data?.tabs[x.value] }))} />
      <CachedNote query={d.listQuery} />
      {d.offline && <Row gap={1.5}><CloudOff size={14} color={th.colors.textMuted} /><Text size="xs" tone="muted" style={{ flex: 1 }}>{t('Internet nahi — computer par save customers dikh rahe hain. Aamad aur sale ki ginti internet aane par.')}</Text></Row>}
      {st && st.birthdays.length > 0 && !d.hasFilters && (
        <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.accent.soft, gap: th.space(2) }}>
          <Row gap={1.5}><Cake size={16} color={th.colors.accent.text} /><Text size="sm" weight="semibold" tone="secondary">{t('Is mahine salgirah:')}</Text></Row>
          <Row gap={2} wrap>
            {st.birthdays.slice(0, 6).map((b) => (
              <Badge key={b.id} tone="accent" icon={b.phone ? MessageCircle : undefined}>{`${b.name} · ${b.day}`}</Badge>
            ))}
          </Row>
          <Button size="sm" variant="soft" iconEnd={ArrowRight} iconEndFlip onPress={() => d.set('birthday', 'month')}>{t('Sab dekhein')}</Button>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ListTemplate<DirectoryCustomer>
        title={t('Customers')}
        tabBar
        actions={<Row gap={1}>
          {can(P.KHATA_VIEW) && <IconButton icon={BookOpen} label={t('Khata')} onPress={() => router.push('/khata' as never)} />}
          <IconButton icon={Download} label={t('CSV')} onPress={() => void exportCsv()} />
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={d.hasFilters || d.f.sort !== 'recent'} onPress={() => setFiltersOpen(true)} />
        </Row>}
        search={{ value: d.search, onChange: d.setSearch, placeholder: t('Naam, phone (kisi bhi tarah), CNIC, sheher…') }}
        summary={summary}
        data={d.items}
        loading={d.loading}
        error={d.error}
        onRetry={() => void d.refetch()}
        refreshing={d.refreshing}
        onRefresh={() => { void d.refetch(); refreshCustomers(); }}
        onEndReached={d.loadMore}
        keyExtractor={(c) => c.id}
        renderItem={({ item: c }) => (
          <CustomerRow c={c} selected={selected.has(c.id)} selecting={selected.size > 0}
            onPress={() => (selected.size ? toggle(c.id) : openProfile(c))}
            onLongPress={() => toggle(c.id)}
            onWhatsApp={() => openWhatsApp(c.phone, c.balance > 0.009
              ? khataReminder({ name: c.name, gender: c.gender, phone: c.phone, amount: formatMoney(c.balance), dueDays: c.dueDays }, shop, lang)
              : thanksText({ name: c.name, gender: c.gender }, shop, lang))}
            onCall={() => callPhone(c.phone)}
            onPayment={can(P.KHATA_MANAGE) ? () => router.push(`/customers/${c.id}?pay=1` as never) : undefined} />
        )}
        empty={<EmptyState icon={Users} title={d.hasFilters || d.f.type !== 'all' ? t('Is filter mein koi nahi') : t('Abhi koi customer nahi')}
          message={d.hasFilters || d.f.type !== 'all' ? t('Filter hata kar dekhein.') : t('Pehla customer jor dein — sirf naam kaafi hai.')}
          action={canEdit ? <Button icon={Plus} onPress={() => setAdding(true)}>{t('Naya')}</Button> : undefined} />}
        fab={canEdit && !selected.size ? { icon: Plus, label: t('Naya'), onPress: () => setAdding(true) } : undefined}
      />
      {selected.size > 0 && (
        <BulkBar selected={selectedRows} canEdit={canEdit} onClear={() => setSelected(new Set())} onExport={() => void exportCsv(selectedRows)}
          onDone={() => { setSelected(new Set()); void d.refetch(); }} />
      )}
      <CustomerFiltersSheet d={d} open={filtersOpen} onClose={() => setFiltersOpen(false)} />
      <QuickAddSheet open={adding} onClose={() => setAdding(false)} onCreated={(c) => router.push(`/customers/${c.id}` as never)} />
    </View>
  );
}

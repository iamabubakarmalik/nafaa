/**
 * Child birthdays (web BirthdayRemindersPage): children with their parent's
 * phone, the days left, and a WhatsApp message before the birthday so the
 * parent buys the gift here. Swipe a row to message, change or switch off.
 * Needs the server; the last loaded list stays readable offline.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, Cake, MessageCircle, Pencil, Plus, Power, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { daysToBirthday, reminderDue } from '@nafaa/core/industries/toystore';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Badge, EmptyState, ListRow, ListTemplate, Row, Segmented, StatTile, SwipeRow, Text, confirm, useTheme, type SwipeAction } from '@/design';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { toyBirthdaysApi, type ToyBirthdayReminder } from '../api';
import { BirthdaySheet } from '../components/BirthdaySheets';
import { GENDERS, KEYS, dayOnly, labelOf, refreshToy, reminderText, whenText } from '../meta';

type Tab = 'soon' | 'all' | 'off';

export function BirthdaysScreen() {
  const th = useTheme();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name);
  const canEdit = usePermission()(P.CUSTOMERS_EDIT);
  const [tab, setTab] = useState<Tab>('soon');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ToyBirthdayReminder | 'new' | null>(null);

  const list = useQuery({ queryKey: [KEYS.birthdays, 'all'], queryFn: () => toyBirthdaysApi.list() });
  const all = useMemo(() => list.data ?? [], [list.data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((r) => (tab === 'off' ? !r.isActive : r.isActive && (tab === 'all' || daysToBirthday(r) <= 30)) && (!q || [r.childName, r.customerName, r.customerPhone].some((v) => v?.toLowerCase().includes(q))));
  }, [all, search, tab]);
  const active = all.filter((r) => r.isActive);
  const due = active.filter((r) => reminderDue(r));
  const sent = useMutation({ mutationFn: (r: ToyBirthdayReminder) => toyBirthdaysApi.markReminderSent(r.id), onSuccess: () => refreshToy([KEYS.birthdays]) });
  const off = useMutation({ mutationFn: (r: ToyBirthdayReminder) => toyBirthdaysApi.remove(r.id), onSuccess: () => { refreshToy([KEYS.birthdays, KEYS.overview]); } });

  const remind = (r: ToyBirthdayReminder) => {
    if (!openWhatsApp(r.customerPhone, reminderText(r, lang, shop))) return;
    if (canEdit) sent.mutate(r);
  };
  const switchOff = async (r: ToyBirthdayReminder) => {
    if (await confirm({ title: t('{{childName}} ki yaad dihani band karein?', { childName: r.childName }), message: t('Message ki list se hat jayega. Bachay ka record aur gift ki history rahegi.'), confirmLabel: t('Band karein'), tone: 'danger' })) off.mutate(r);
  };
  const swipe = (r: ToyBirthdayReminder): SwipeAction[] => [
    ...(r.isActive ? [{ icon: MessageCircle, label: t('Message'), tone: 'success' as const, onPress: () => remind(r) }] : []),
    ...(canEdit ? [{ icon: Pencil, label: t('Badlein'), tone: 'brand' as const, onPress: () => setForm(r) }] : []),
    ...(canEdit && r.isActive ? [{ icon: Power, label: t('Band karein'), tone: 'danger' as const, onPress: () => void switchOff(r) }] : []),
  ];

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Cake} label={t('Agle 30 din')} loading={list.isLoading} value={String(active.filter((r) => daysToBirthday(r) <= 30).length)} onPress={() => setTab('soon')} />
        <StatTile style={{ flex: 1 }} icon={Bell} tone="warning" label={t('Message bhejna hai')} loading={list.isLoading} value={String(due.length)} hint={t('Yaad dihani ka waqt')} onPress={() => setTab('soon')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Users} tone="info" label={t('Sab bachay')} loading={list.isLoading} value={String(active.length)} onPress={() => setTab('all')} />
        <StatTile style={{ flex: 1 }} icon={Power} tone="neutral" label={t('Band')} loading={list.isLoading} value={String(all.length - active.length)} onPress={() => setTab('off')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'soon', label: t('Qareeb') }, { value: 'all', label: t('Sab') }, { value: 'off', label: t('Band') }]} />
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate<ToyBirthdayReminder>
        title={t('Saalgirah')} subtitle={t('Saalgirah se pehle walidain ko WhatsApp — gift yahin se')}
        search={{ value: search, onChange: setSearch, placeholder: t('Bachay ya walid ka naam, phone') }}
        summary={header}
        data={rows} loading={list.isLoading} error={!list.data ? list.error : undefined} onRetry={() => void list.refetch()}
        refreshing={list.isRefetching} onRefresh={() => void list.refetch()} keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => {
          const d = daysToBirthday(r);
          return (
            <SwipeRow end={swipe(r)}>
              <ListRow
                title={r.childName}
                overline={[labelOf(GENDERS, r.childGender), t('{{count}} saal', { count: Math.floor(r.computed?.currentAge ?? 0) })].filter(Boolean).join(' · ')}
                subtitle={`${r.customerName} · ${r.customerPhone}${r.lastGiftGiven ? ` · ${r.lastGiftGiven}` : ''}`}
                trailing={(
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge tone={d <= 7 ? 'danger' : 'neutral'}>{whenText(d)}</Badge>
                    <Text size="2xs" tone="muted">{t('{{childBirthDate}} · {{turningAge}} saal ka', { childBirthDate: dayOnly(r.childBirthDate), turningAge: r.computed?.turningAge })}</Text>
                  </View>
                )}
                chevron onPress={() => router.push(`/toystore/birthdays/${r.id}` as never)} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={Cake} title={search ? t('Koi nahi mila') : tab === 'soon' ? t('Agle 30 din me koi saalgirah nahi') : t('Abhi koi bacha nahi')}
          message={t('Bill ke waqt walidain se bachay ki paidaish ki tareekh pooch kar likh lein — saalgirah se pehle message bhej kar gift yahin se bikta hai.')} />}
        fab={canEdit ? { icon: Plus, label: t('Bacha'), onPress: () => setForm('new') } : undefined}
      />
      <BirthdaySheet open={form !== null} value={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => setForm(null)} />
    </>
  );
}

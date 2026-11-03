/** Schools (web SchoolsPage): institutions with their book lists, discount, credit limit and khata balance. Needs the server. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ClipboardList, Plus, Power, School as SchoolIcon, ShoppingCart, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Select, Sheet, StatTile, Text, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { schoolsApi, type School } from '../api';
import { BOARDS, KEYS, SCHOOL_TYPES, refreshBookstore } from '../meta';

type Tab = 'active' | 'credit' | 'off';

export function SchoolsScreen() {
  const th = useTheme();
  const can = usePermission();
  const canEdit = can(P.CUSTOMERS_EDIT);
  const canKhata = can(P.KHATA_VIEW);
  const canSell = can(P.POS_USE);
  const { guard } = useDeskOnline('bookstoreDesk');
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<School | 'new' | null>(null);
  const q = useQuery({ queryKey: [KEYS.schools, 'all'], queryFn: () => schoolsApi.list() });
  const all = q.data ?? [];
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((x) => (tab === 'off' ? !x.isActive : x.isActive && (tab !== 'credit' || (x.customer?.balance ?? 0) > 0)) && (!s || [x.name, x.code, x.city, x.contactPerson, x.board].some((v) => v?.toLowerCase().includes(s))));
  }, [all, search, tab]);
  const active = all.filter((x) => x.isActive);
  const owed = active.reduce((s, x) => s + Math.max(x.customer?.balance ?? 0, 0), 0);
  const onCredit = active.filter((x) => (x.customer?.balance ?? 0) > 0).length;

  const openKhata = async (s: School, go: 'khata' | 'pos') => {
    try {
      const c = await schoolsApi.openKhata(s.id);
      refreshBookstore([KEYS.schools]);
      if (go === 'pos') { toast.success(t('POS par customer "{{name}}" chunein aur udhaar me bill karein', { name: s.name })); router.push('/pos' as never); }
      else router.push(`/customers/${c.id}` as never);
    } catch (e) { toast.error(errorText(e, t('Khata nahi khula'))); }
  };
  const toggle = async (s: School) => {
    if (s.isActive) {
      const ok = await confirm({ title: t('{{name}} band karein?', { name: s.name }), message: t('School list aur khata waise hi rahenge; band school ki lists POS par nahi dikhengi.'), tone: 'danger', confirmLabel: t('Band karein') });
      if (!ok) return;
    }
    try { if (s.isActive) await schoolsApi.remove(s.id); else await schoolsApi.update(s.id, { isActive: true }); refreshBookstore([KEYS.schools, KEYS.lists, KEYS.posLists]); toast.success(s.isActive ? t('{{name}} band — lists aur khata waise hi', { name: s.name }) : `${s.name} ${t('Chalu')}`); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={SchoolIcon} tone="info" label={t('Chalu school')} loading={q.isLoading} value={String(active.length)} hint={t('{{value}} band', { value: all.length - active.length })} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="warning" label={t('Schools se lena')} loading={q.isLoading} value={formatMoney(owed)} hint={t('Khata ka baqi')} onPress={() => setTab('credit')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: t('Chalu') }, { value: 'credit', label: t('Udhaar baqi') }, { value: 'off', label: t('Band') }]} />
      <OfflineNote feature="bookstoreDesk" />
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate<School>
        title={t('Schools')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, code, shehar ya board') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(s) => s.id}
        renderItem={({ item: s }) => {
          const bal = s.customer?.balance ?? 0;
          const over = s.creditLimit > 0 && bal > s.creditLimit;
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: s.isActive ? 1 : 0.7 }}>
              <ListRow icon={SchoolIcon} iconTone="info"
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{s.name}</Text>{s.discountPct > 0 && <Badge tone="success">{t('{{discountPct}}% off', { discountPct: s.discountPct })}</Badge>}</Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[s.type, s.board, s.city].filter(Boolean).join(' · ') || '—'}</Text>
                  <Text size="xs" tone={over ? 'danger' : bal > 0 ? 'warning' : 'secondary'}>{`${t('Lists')}: ${s._count?.bookLists ?? 0} · ${t('Baqi')}: ${formatMoney(bal)}${s.creditLimit > 0 ? ` / ${formatMoney(s.creditLimit)}` : ''}${over ? ` · ${t('had se upar')}` : ''}`}</Text>
                </View>}
                chevron onPress={() => guard(() => setForm(s))} />
              <Row gap={2} wrap style={{ paddingHorizontal: th.space(3), paddingBottom: th.space(3) }}>
                <Button size="sm" variant="soft" icon={ClipboardList} onPress={() => router.push(`/bookstore/school-lists?school=${s.id}` as never)}>{t('Lists')}</Button>
                {s.customer && canKhata && <Button size="sm" variant="secondary" icon={Wallet} onPress={() => router.push(`/customers/${s.customer!.id}` as never)}>{t('Khata')}</Button>}
                {!s.customer && canEdit && s.isActive && <Button size="sm" variant="secondary" icon={Wallet} onPress={() => guard(() => void openKhata(s, 'khata'))}>{t('Khata kholein')}</Button>}
                {canSell && canEdit && s.isActive && <Button size="sm" variant="secondary" icon={ShoppingCart} onPress={() => guard(() => void openKhata(s, 'pos'))}>{t('Udhaar bill')}</Button>}
                {canEdit && <Button size="sm" variant="ghost" icon={Power} onPress={() => guard(() => void toggle(s))}>{s.isActive ? t('Band') : t('Chalu')}</Button>}
              </Row>
            </View>
          );
        }}
        empty={<EmptyState icon={SchoolIcon} title={search ? t('Koi school nahi mila') : tab === 'credit' ? t('Kisi school par udhaar nahi') : t('Abhi koi school nahi')} message={t("School banayein, phir us ki har class ki book list. School udhaar par le to 'Khata' khol dein.")} />}
        fab={canEdit ? { icon: Plus, label: t('Naya school'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <SchoolForm school={form} onClose={() => setForm(null)} />
    </>
  );
}

function SchoolForm({ school, onClose }: { school: School | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const s0 = school === 'new' ? null : school;
  const [v, setV] = useState({ name: '', type: 'School', board: '', medium: '', city: '', address: '', phone: '', principalName: '', contactPerson: '', contactPhone: '', discount: null as number | null, days: null as number | null, limit: null as number | null });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!school) return;
    setTouched(false);
    setV({ name: s0?.name ?? '', type: s0?.type ?? 'School', board: s0?.board ?? '', medium: s0?.medium ?? '', city: s0?.city ?? '', address: s0?.address ?? '', phone: s0?.phone ?? '', principalName: s0?.principalName ?? '',
      contactPerson: s0?.contactPerson ?? '', contactPhone: s0?.contactPhone ?? '', discount: s0?.discountPct || null, days: s0?.creditDays || null, limit: s0?.creditLimit || null });
  }, [school]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((o) => ({ ...o, [k]: x }));
  const nameErr = !v.name.trim() ? t('Naam likhein') : undefined;
  const discErr = (v.discount ?? 0) > 100 ? t('100% se zyada nahi') : undefined;
  const save = async () => {
    setTouched(true);
    if (nameErr || discErr) return;
    const o = (x: string) => x.trim() || undefined;
    setBusy(true);
    try {
      const body: Partial<School> = { name: v.name.trim(), type: o(v.type), board: o(v.board), medium: o(v.medium), city: o(v.city), address: o(v.address), phone: o(v.phone), principalName: o(v.principalName),
        contactPerson: o(v.contactPerson), contactPhone: o(v.contactPhone), discountPct: v.discount ?? 0, creditDays: Math.round(v.days ?? 0), creditLimit: v.limit ?? 0 };
      if (s0) await schoolsApi.update(s0.id, body); else await schoolsApi.create(body);
      refreshBookstore([KEYS.schools]);
      toast.success(t('School save ho gaya'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!school} onClose={onClose} height={0.92} title={s0 ? t('{{name}} — badlein', { name: s0.name }) : t('Naya school')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={v.name} onChangeText={(x) => set('name', x)} error={touched ? nameErr : undefined} placeholder={t('Jaise: Beaconhouse Model Town')} />
        <Select label={t('Type')} value={v.type} onChange={(x) => set('type', x)} options={SCHOOL_TYPES.map((x) => ({ value: x, label: x }))} />
        <Select label={t('Board')} value={v.board || null} onChange={(x) => set('board', x)} placeholder={t('Chunein')} options={BOARDS.map((x) => ({ value: x, label: x }))} />
        <ChipGroup value={v.medium} onChange={(x) => set('medium', x)} options={['English', 'Urdu', 'Dono'].map((x) => ({ value: x, label: x }))} />
        <Input label={t('Shehar')} value={v.city} onChangeText={(x) => set('city', x)} />
        <Input label={t('Pata')} value={v.address} onChangeText={(x) => set('address', x)} />
        <Input label={t('Phone')} keyboardType="phone-pad" ltr value={v.phone} onChangeText={(x) => set('phone', x)} />
        <Input label={t('Principal')} value={v.principalName} onChangeText={(x) => set('principalName', x)} />
        <Input label={t('Banda (rabta)')} value={v.contactPerson} onChangeText={(x) => set('contactPerson', x)} />
        <Input label={t('Rabta phone')} keyboardType="phone-pad" ltr value={v.contactPhone} onChangeText={(x) => set('contactPhone', x)} />
        <NumberInput label={t('Discount %')} value={v.discount} onChangeValue={(x) => set('discount', x)} error={touched ? discErr : undefined} hint={t('Yaad rakhne ke liye — set ki qeemat School list me tay hoti hai')} />
        <NumberInput label={t('Udhaar ke din')} integer value={v.days} onChangeValue={(x) => set('days', x)} />
        <MoneyInput label={t('Udhaar ki had')} value={v.limit} onChangeValue={(x) => set('limit', x)} />
      </View>
    </Sheet>
  );
}

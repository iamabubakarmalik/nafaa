/** Publishers (web PublishersPage): discount, credit days and what is owed, linked to a supplier for purchases. Needs the server. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Building2, Plus, Power, ShoppingCart, Sparkles, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Segmented, Sheet, StatTile, Text, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { publishersApi, type Publisher } from '../api';
import { KEYS, refreshBookstore } from '../meta';

type Tab = 'active' | 'off';

export function PublishersScreen() {
  const th = useTheme();
  const can = usePermission();
  const canEdit = can(P.PRODUCTS_EDIT);
  const canBuy = can(P.PURCHASES_CREATE);
  const { guard } = useDeskOnline('bookstoreDesk');
  const { cost } = useCostMask();
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Publisher | 'new' | null>(null);
  const q = useQuery({ queryKey: [KEYS.publishers, 'all'], queryFn: () => publishersApi.list() });
  const all = q.data ?? [];
  const active = all.filter((p) => p.isActive);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((p) => (tab === 'active' ? p.isActive : !p.isActive) && (!s || [p.name, p.city, p.contactPerson, p.phone].some((v) => v?.toLowerCase().includes(s))));
  }, [all, tab, search]);
  const books = active.reduce((s, p) => s + (p._count?.books ?? 0), 0);
  const owed = active.reduce((s, p) => s + Math.max(p.supplier?.outstandingDue ?? 0, 0), 0);

  const buy = async (p: Publisher) => {
    try { const sup = await publishersApi.openSupplier(p.id); refreshBookstore([KEYS.publishers]); router.push(`/purchases/new?supplierId=${sup.id}` as never); }
    catch (e) { toast.error(errorText(e, t('Supplier nahi khula'))); }
  };
  const toggle = async (p: Publisher) => {
    if (p.isActive && !(await confirm({ title: t('{{name}} band karein?', { name: p.name }), message: t('Kitab banate waqt ye publisher nahi dikhega. Is ki kitaben, purchase aur khata waise hi rahenge.'), tone: 'danger', confirmLabel: t('Band karein') }))) return;
    try { if (p.isActive) await publishersApi.remove(p.id); else await publishersApi.update(p.id, { isActive: true }); refreshBookstore([KEYS.publishers]); toast.success(p.isActive ? t('{{name}} band — kitaben waisi hi', { name: p.name }) : t('{{name}} wapas chalu', { name: p.name })); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  const seed = async () => {
    try { const r = await publishersApi.seedPakistani(); refreshBookstore([KEYS.publishers]); toast.success(r.created ? t('{{created}} publisher jur gaye', { created: r.created }) : t('Sab pehle se maujood hain')); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Building2} tone="info" label={t('Chalu publisher')} loading={q.isLoading} value={String(active.length)} hint={t('{{value}} band', { value: all.length - active.length })} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="warning" label={t('Publishers ko dena')} loading={q.isLoading} value={cost(owed)} hint={t('Supplier khata se')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: t('Chalu') }, { value: 'off', label: t('Band') }]} />
      <OfflineNote feature="bookstoreDesk" />
      <CachedNote query={q} />
      <Text size="xs" tone="muted">{t('Kitaben jori hui')}: {books}</Text>
    </View>
  );

  return (
    <>
      <ListTemplate<Publisher>
        title={t('Publishers')}
        grouped={false}
        actions={canEdit ? <IconButton icon={Sparkles} label={t('Pakistani publishers jorein')} onPress={() => guard(() => void seed())} /> : undefined}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, shehar, banda ya phone') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: p.isActive ? 1 : 0.7 }}>
            <ListRow icon={Building2} iconTone="info"
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</Text>{p.defaultDiscountPct > 0 && <Badge tone="success">{t('{{discountPct}}% off', { discountPct: p.defaultDiscountPct })}</Badge>}</Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[p.city, p.contactPerson, p.phone].filter(Boolean).join(' · ') || '—'}</Text>
                <Text size="xs" tone="secondary">{`${t('Kitaben')}: ${p._count?.books ?? 0}${p.creditDays ? ` · ${t('{{creditDays}} din', { creditDays: p.creditDays })}` : ''}${p.supplier ? ` · ${t('Dena hai')}: ${cost(p.supplier.outstandingDue)}` : ''}`}</Text>
              </View>}
              chevron={canEdit} onPress={canEdit ? () => guard(() => setForm(p)) : undefined} />
            <Row gap={2} wrap style={{ paddingHorizontal: th.space(3), paddingBottom: th.space(3) }}>
              {canBuy && p.isActive && <Button size="sm" variant="soft" icon={ShoppingCart} onPress={() => guard(() => void buy(p))}>{t('Purchase')}</Button>}
              {p.supplier && can(P.SUPPLIERS_VIEW) && <Button size="sm" variant="secondary" icon={Wallet} onPress={() => router.push(`/suppliers/${p.supplier!.id}` as never)}>{t('Khata / wapsi')}</Button>}
              {canEdit && <Button size="sm" variant="ghost" icon={Power} onPress={() => guard(() => void toggle(p))}>{p.isActive ? t('Band') : t('Chalu')}</Button>}
            </Row>
          </View>
        )}
        empty={<EmptyState icon={Building2} title={search ? t('Koi publisher nahi mila') : tab === 'off' ? t('Koi band publisher nahi') : t('Abhi koi publisher nahi')} message={t('Publisher banayein ya mash-hoor Pakistani publisher ek click me jorein. Kitab banate waqt publisher chuna jata hai.')} />}
        fab={canEdit ? { icon: Plus, label: t('Naya publisher'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <PublisherForm publisher={form} onClose={() => setForm(null)} />
    </>
  );
}

function PublisherForm({ publisher, onClose }: { publisher: Publisher | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const p0 = publisher === 'new' ? null : publisher;
  const [v, setV] = useState({ name: '', city: '', contactPerson: '', phone: '', email: '', discount: null as number | null, days: null as number | null, terms: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!publisher) return;
    setTouched(false);
    setV({ name: p0?.name ?? '', city: p0?.city ?? '', contactPerson: p0?.contactPerson ?? '', phone: p0?.phone ?? '', email: p0?.email ?? '', discount: p0?.defaultDiscountPct || null, days: p0?.creditDays || null, terms: p0?.paymentTerms ?? '' });
  }, [publisher]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((o) => ({ ...o, [k]: x }));
  const nameErr = !v.name.trim() ? t('Naam likhein') : undefined;
  const discErr = (v.discount ?? 0) > 100 ? t('100% se zyada nahi') : undefined;
  const save = async () => {
    setTouched(true);
    if (nameErr || discErr) return;
    const o = (x: string) => x.trim() || undefined;
    setBusy(true);
    try {
      const body: Partial<Publisher> = { name: v.name.trim(), city: o(v.city), contactPerson: o(v.contactPerson), phone: o(v.phone), email: o(v.email), defaultDiscountPct: v.discount ?? 0, creditDays: Math.round(v.days ?? 0), paymentTerms: o(v.terms) };
      if (p0) await publishersApi.update(p0.id, body); else await publishersApi.create(body);
      refreshBookstore([KEYS.publishers]);
      toast.success(t('Publisher save ho gaya'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!publisher} onClose={onClose} height={0.88} title={p0 ? t('{{name}} — badlein', { name: p0.name }) : t('Naya publisher')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={v.name} onChangeText={(x) => set('name', x)} error={touched ? nameErr : undefined} placeholder={t('Jaise: Oxford University Press')} />
        <Input label={t('Shehar')} value={v.city} onChangeText={(x) => set('city', x)} placeholder={t('Lahore')} />
        <Input label={t('Banda (rabta)')} value={v.contactPerson} onChangeText={(x) => set('contactPerson', x)} placeholder={t('Sales officer ka naam')} />
        <Input label={t('Phone')} keyboardType="phone-pad" ltr value={v.phone} onChangeText={(x) => set('phone', x)} />
        <Input label={t('Email')} keyboardType="email-address" autoCapitalize="none" ltr value={v.email} onChangeText={(x) => set('email', x)} />
        <NumberInput label={t('Discount %')} value={v.discount} onChangeValue={(x) => set('discount', x)} error={touched ? discErr : undefined} hint={t('Purchase par MRP se itna kam — cost khud bharti hai')} />
        <NumberInput label={t('Udhaar ke din')} integer value={v.days} onChangeValue={(x) => set('days', x)} placeholder="30" />
        <Input label={t('Shart')} value={v.terms} onChangeText={(x) => set('terms', x)} placeholder={t('Season ke baad wapsi')} />
        <Text size="xs" tone="muted">{t('Supplier pehli purchase par publisher ke naam se khud ban jata hai.')}</Text>
      </View>
    </Sheet>
  );
}

/**
 * School book lists (web SchoolListsPage and SchoolListEditor): each class's
 * books sold as a set. Counter par / draft / band / purani; the editor adds
 * books from the catalog (or a whole class from the textbooks), with a set
 * discount or a fixed set price. Needs the server.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Copy, Play, Plus, Power, ShoppingCart, Trash2, Wand2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { currentSession, draftPrice, nextSession } from '@nafaa/core/industries/bookstore';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useProductSearch } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, EmptyState, FormSection, IconButton, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Select, Sheet, StatTile, Switch, Text, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { bookProfilesApi, schoolListsApi, schoolsApi, type SchoolBookList, type School } from '../api';
import { GRADES, KEYS, LIST_STATUS, refreshBookstore } from '../meta';

type Tab = 'ACTIVE' | 'DRAFT' | 'CLOSED' | 'ARCHIVED' | 'all';
const priceOf = (l: SchoolBookList) => l.bundlePrice ?? l.items.filter((i) => !i.isOptional).reduce((s, i) => s + i.total, 0);
const refresh = () => refreshBookstore([KEYS.lists, KEYS.posLists, KEYS.schools]);

export function SchoolListsScreen() {
  const th = useTheme();
  const can = usePermission();
  const canEdit = can(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('bookstoreDesk');
  const params = useLocalSearchParams<{ school?: string }>();
  const schoolId = params.school ?? '';
  const [tab, setTab] = useState<Tab>('ACTIVE');
  const [search, setSearch] = useState('');
  const [session, setSession] = useState('');
  const [form, setForm] = useState<SchoolBookList | 'new' | null>(null);
  const schools = useQuery({ queryKey: [KEYS.schools, 'all'], queryFn: () => schoolsApi.list(), staleTime: 60_000 });
  const q = useQuery({ queryKey: [KEYS.lists, schoolId], queryFn: () => schoolListsApi.list(schoolId ? { schoolId } : undefined) });
  const all = q.data ?? [];
  const sessions = useMemo(() => [...new Set(all.map((l) => l.session))].sort().reverse(), [all]);
  const scoped = all.filter((l) => !session || l.session === session);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return scoped.filter((l) => (tab === 'all' || l.status === tab) && (!s || [l.title, l.grade, l.section, l.school?.name].some((v) => v?.toLowerCase().includes(s))));
  }, [scoped, search, tab]);
  const count = (s: Tab) => scoped.filter((l) => s === 'all' || l.status === s).length;
  const notInCatalog = scoped.filter((l) => l.status === 'ACTIVE').reduce((s, l) => s + l.items.filter((i) => !i.productId && !i.isOptional).length, 0);
  const schoolName = (schools.data ?? []).find((s) => s.id === schoolId)?.name;

  const setStatus = async (l: SchoolBookList, to: string) => {
    try { await schoolListsApi.updateStatus(l.id, to); refresh(); toast.success(to === 'ACTIVE' ? t('List counter par — POS ke Combos me set bikega') : t('List counter se hat gayi')); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  const copy = async (l: SchoolBookList) => {
    try { const r = await schoolListsApi.duplicate(l.id, nextSession(l.session)); refresh(); setTab('DRAFT'); toast.success(t('{{title}} draft ban gayi — aaj ke rate lag gaye', { title: r.title })); }
    catch (e) { toast.error(errorText(e, t('Copy nahi hui'))); }
  };
  const archive = async (l: SchoolBookList) => {
    if (!(await confirm({ title: t('List purani me bhejein?'), message: t('List record me rahegi, counter par nahi dikhegi.'), tone: 'danger', confirmLabel: t('Haan') }))) return;
    try { await schoolListsApi.remove(l.id); refresh(); toast.success(t('List purani me chali gayi')); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      {schoolName && <Text size="sm" tone="muted">{t('{{schoolName}} ki lists', { schoolName })}</Text>}
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Play} tone="success" label={t('Counter par')} loading={q.isLoading} value={String(count('ACTIVE'))} hint={t('POS ke Combos me')} onPress={() => setTab('ACTIVE')} />
        <StatTile style={{ flex: 1 }} icon={Plus} tone={notInCatalog ? 'warning' : 'neutral'} label={t('Catalog se bahar')} loading={q.isLoading} value={String(notInCatalog)} hint={t('Chalti lists ki lines jo POS par nahi bikti')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'ACTIVE', label: t('Counter par') }, { value: 'DRAFT', label: t('Draft') }, { value: 'CLOSED', label: t('Band') }, { value: 'ARCHIVED', label: t('Purani') }, { value: 'all', label: t('Sab') }]} />
      {sessions.length > 1 && <ChipGroup value={session} onChange={setSession} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Har session') }, ...sessions.map((s) => ({ value: s, label: s }))]} />}
      <OfflineNote feature="bookstoreDesk" />
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate<SchoolBookList>
        title={t('School lists')}
        grouped={false}
        actions={can(P.POS_USE) ? <IconButton icon={ShoppingCart} label={t('POS')} onPress={() => router.push('/pos' as never)} /> : undefined}
        search={{ value: search, onChange: setSearch, placeholder: t('Class, school ya list ka naam') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(l) => l.id}
        renderItem={({ item: l }) => {
          const st = LIST_STATUS[l.status] ?? LIST_STATUS.DRAFT;
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <ListRow icon={Play} iconTone={st.tone}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{`${l.school?.name ?? ''} — ${l.grade}${l.section ? ` ${l.section}` : ''}`}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                subtitle={<Text size="xs" tone="muted" numberOfLines={1}>{`${l.session} · ${t('{{count}} cheezein', { count: l.items.length })} · ${formatMoney(priceOf(l))}`}</Text>}
                chevron={canEdit} onPress={canEdit ? () => guard(() => setForm(l)) : undefined} />
              {canEdit && (
                <Row gap={2} wrap style={{ paddingHorizontal: th.space(3), paddingBottom: th.space(3) }}>
                  {l.status !== 'ACTIVE' && l.status !== 'ARCHIVED' && <Button size="sm" variant="soft" icon={Play} onPress={() => guard(() => void setStatus(l, 'ACTIVE'))}>{t('Counter par karein')}</Button>}
                  {l.status === 'ACTIVE' && <Button size="sm" variant="secondary" icon={Power} onPress={() => guard(() => void setStatus(l, 'CLOSED'))}>{t('Band karein')}</Button>}
                  <Button size="sm" variant="secondary" icon={Copy} onPress={() => guard(() => void copy(l))}>{t('Naye session ke liye copy')}</Button>
                  {l.status !== 'ARCHIVED' && <Button size="sm" variant="ghost" icon={Trash2} onPress={() => guard(() => void archive(l))}>{t('Purani')}</Button>}
                </Row>
              )}
            </View>
          );
        }}
        empty={<EmptyState icon={Play} title={search ? t('Koi list nahi mili') : t('Abhi koi list nahi')} message={t('Har class ki kitabon ki list banayein — counter par ek saath set bikta hai.')} />}
        fab={canEdit ? { icon: Plus, label: t('Nayi list'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <ListEditor list={form} schools={schools.data ?? []} presetSchool={schoolId} onClose={() => setForm(null)} />
    </>
  );
}

interface LineDraft { key: string; productId: string | null; itemName: string; itemType: string; quantity: number | null; unitPrice: number; subject: string; isOptional: boolean }
let seq = 0;
const key = () => `l${++seq}`;

function ListEditor({ list, schools, presetSchool, onClose }: { list: SchoolBookList | 'new' | null; schools: School[]; presetSchool: string; onClose: () => void }) {
  const th = useTheme();
  const l0 = list === 'new' ? null : list;
  const [d, setD] = useState({ schoolId: '', session: currentSession(), grade: '', section: '', title: '', discount: null as number | null, bundle: null as number | null, lines: [] as LineDraft[] });
  const [q, setQ] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const term = useDebouncedValue(q.trim(), 200);
  const found = useProductSearch({ query: term, limit: 8 }, { enabled: term.length >= 2 });
  useEffect(() => {
    if (!list) return;
    setTouched(false); setQ('');
    setD({ schoolId: l0?.schoolId ?? presetSchool, session: l0?.session ?? currentSession(), grade: l0?.grade ?? '', section: l0?.section ?? '', title: l0?.title ?? '', discount: l0?.discountPct || null, bundle: l0?.bundlePrice ?? null,
      lines: (l0?.items ?? []).map((i) => ({ key: key(), productId: i.productId ?? null, itemName: i.itemName, itemType: i.itemType, quantity: i.quantity, unitPrice: i.unitPrice, subject: i.subject ?? '', isOptional: i.isOptional })) });
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps
  const school = schools.find((s) => s.id === d.schoolId);
  const setLine = (k: string, patch: Partial<LineDraft>) => setD((x) => ({ ...x, lines: x.lines.map((l) => (l.key === k ? { ...l, ...patch } : l)) }));
  const price = draftPrice(d.lines.map((l) => ({ quantity: l.quantity ?? 0, unitPrice: l.unitPrice, isOptional: l.isOptional })), d.discount ?? 0, d.bundle);
  const total = d.lines.filter((l) => !l.isOptional).reduce((s, l) => s + l.unitPrice * (l.quantity ?? 0), 0);

  const addProduct = (p: { id: string; name: string; price: number }) => {
    if (d.lines.some((l) => l.productId === p.id)) { toast.info(t('{{name}} pehle se list me hai', { name: p.name })); return; }
    setD((x) => ({ ...x, lines: [...x.lines, { key: key(), productId: p.id, itemName: p.name, itemType: 'BOOK', quantity: 1, unitPrice: p.price, subject: '', isOptional: false }] }));
    setQ('');
  };
  const addFree = () => { if (!q.trim()) return; setD((x) => ({ ...x, lines: [...x.lines, { key: key(), productId: null, itemName: q.trim(), itemType: 'OTHER', quantity: 1, unitPrice: 0, subject: '', isOptional: false }] })); setQ(''); };
  const fillClass = async () => {
    if (!d.grade.trim()) { toast.error(t('Pehle class chunein')); return; }
    try {
      const books = await bookProfilesApi.byAcademic({ grade: d.grade.trim(), board: school?.board || undefined });
      const have = new Set(d.lines.map((l) => l.productId));
      const fresh = books.filter((b) => !have.has(b.productId));
      if (!fresh.length) { toast.info(books.length ? t('Is class ki sab kitaben pehle se list me hain') : t('"{{grade}}" ki koi textbook nahi mili — kitab me class likhein', { grade: d.grade })); return; }
      setD((x) => ({ ...x, lines: [...x.lines, ...fresh.map((b) => ({ key: key(), productId: b.productId, itemName: b.product?.name ?? b.title, itemType: 'BOOK', quantity: 1, unitPrice: Number(b.product?.price ?? b.mrp ?? 0), subject: b.subject ?? '', isOptional: false }))] }));
      toast.success(t('{{count}} kitaben jur gayin', { count: fresh.length }));
    } catch (e) { toast.error(errorText(e, t('Kitaben nahi milin'))); }
  };

  const errors = {
    schoolId: !d.schoolId ? t('School chunein') : undefined, session: !d.session.trim() ? t('Session likhein') : undefined, grade: !d.grade.trim() ? t('Class likhein') : undefined,
    discount: (d.discount ?? 0) > 100 ? t('100% se zyada nahi') : undefined,
    lines: d.lines.length === 0 ? t('Kam se kam ek cheez jorein') : d.lines.some((x) => !x.itemName.trim() || !((x.quantity ?? 0) >= 1)) ? t('Har line ka naam aur quantity likhein') : undefined,
  };
  const first = Object.values(errors).find(Boolean);
  const save = async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    const body = {
      schoolId: d.schoolId, session: d.session.trim(), grade: d.grade.trim(), section: d.section.trim() || null, title: d.title.trim() || undefined, discountPct: d.discount ?? 0, bundlePrice: d.bundle,
      items: d.lines.map((x) => ({ productId: x.productId, itemName: x.itemName.trim(), itemType: x.itemType, quantity: x.quantity ?? 1, unitPrice: x.unitPrice, subject: x.subject.trim() || undefined, isOptional: x.isOptional })),
    };
    setBusy(true);
    try { if (l0) await schoolListsApi.update(l0.id, body); else await schoolListsApi.create(body); refresh(); toast.success(t('List save ho gayi')); onClose(); }
    catch (e) { toast.error(errorText(e, t('Save nahi hui'))); } finally { setBusy(false); }
  };

  return (
    <Sheet open={!!list} onClose={onClose} height={0.95} title={l0 ? t('{{title}} — badlein', { title: l0.title }) : t('Nayi school list')}
      footer={
        <View style={{ gap: 8 }}>
          <Text size="sm" tone="secondary">{t('Set ki qeemat')} <Text weight="bold" ltr>{formatMoney(price)}</Text>{price < total ? ` ${t('(bachat {{formatPKR}})', { formatPKR: formatMoney(total - price) })}` : ''}</Text>
          <Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>
        </View>
      }>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('School')} value={d.schoolId || null} onChange={(v) => setD({ ...d, schoolId: v })} placeholder={t('Chunein')} error={touched && errors.schoolId} hint={!schools.length ? t('Pehle Schools me school banayein') : undefined}
          options={schools.filter((s) => s.isActive || s.id === d.schoolId).map((s) => ({ value: s.id, label: s.name }))} />
        <Input label={t('Session')} value={d.session} onChangeText={(v) => setD({ ...d, session: v })} error={touched && errors.session} placeholder="2026-2027" ltr />
        <Input label={t('Class')} value={d.grade} onChangeText={(v) => setD({ ...d, grade: v })} error={touched && errors.grade} placeholder={t('Class 5')} />
        <ChipGroup value={d.grade} onChange={(v) => setD({ ...d, grade: v })} style={{ marginHorizontal: -th.space(4) }} options={GRADES.map((g) => ({ value: g, label: g }))} />
        <Input label={t('Section')} value={d.section} onChangeText={(v) => setD({ ...d, section: v })} placeholder={t('Marzi hai — A, Blue')} />
        <Input label={t('List ka naam (marzi)')} value={d.title} onChangeText={(v) => setD({ ...d, title: v })} />
        <Button variant="secondary" icon={Wand2} onPress={() => void fillClass()}>{t('Is class ki textbooks jorein')}</Button>

        <FormSection title={t('Kitaben / cheezein')}>
          <Input value={q} onChangeText={setQ} placeholder={t('Naam likh kar dhoondein')} onSubmitEditing={addFree} />
          {term.length >= 2 && (
            <Card flush>
              {(found.data ?? []).map((p, i) => <ListRow key={p.id} divider={i < (found.data?.length ?? 0) - 1} title={p.name} trailing={<Text size="sm" ltr>{formatMoney(p.price)}</Text>} onPress={() => addProduct({ id: p.id, name: p.name, price: p.price })} />)}
              <ListRow icon={Plus} title={t('"{{q}}" bina catalog ke jorein', { q })} onPress={addFree} />
            </Card>
          )}
          {d.lines.map((x) => (
            <Card key={x.key}>
              <View style={{ gap: th.space(2) }}>
                <Row gap={2}>
                  <Text weight="semibold" numberOfLines={2} style={{ flex: 1 }}>{x.itemName}{!x.productId ? ` · ${t('Catalog me nahi')}` : ''}</Text>
                  <IconButton icon={Trash2} label={t('Hatayein')} size="sm" onPress={() => setD((s) => ({ ...s, lines: s.lines.filter((l) => l.key !== x.key) }))} />
                </Row>
                <Row gap={2}>
                  <View style={{ flex: 1 }}><NumberInput label={t('Adad')} integer value={x.quantity} onChangeValue={(v) => setLine(x.key, { quantity: v })} /></View>
                  <View style={{ flex: 1 }}><MoneyInput label={t('Rate')} value={x.unitPrice} onChangeValue={(v) => setLine(x.key, { unitPrice: v ?? 0 })} /></View>
                </Row>
                <Input label={t('Subject')} value={x.subject} onChangeText={(v) => setLine(x.key, { subject: v })} />
                <Switch value={x.isOptional} onChange={(v) => setLine(x.key, { isOptional: v })} label={t('Marzi ki (set me shamil nahi)')} />
              </View>
            </Card>
          ))}
          {touched && errors.lines && <Text size="xs" tone="danger">{errors.lines}</Text>}
        </FormSection>
        <FormSection title={t('Set ki qeemat')}>
          <NumberInput label={t('Set discount %')} value={d.discount} onChangeValue={(v) => setD({ ...d, discount: v })} error={touched ? errors.discount : undefined} />
          <MoneyInput label={t('Ya poore set ki tay qeemat')} value={d.bundle} onChangeValue={(v) => setD({ ...d, bundle: v })} hint={t('Likhne par discount ki jagah yehi qeemat lagti hai')} />
        </FormSection>
      </View>
    </Sheet>
  );
}

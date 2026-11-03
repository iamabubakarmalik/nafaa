/** Authors (web AuthorsPage): names and pen names, featured stars; a book is also found by its author. Needs the server. */

import { useQuery } from '@tanstack/react-query';
import { Plus, Power, Star, Users } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Segmented, Sheet, StatTile, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { authorsApi, type Author } from '../api';
import { KEYS, LANGUAGES, refreshBookstore } from '../meta';

type Tab = 'active' | 'off';

export function AuthorsScreen() {
  const th = useTheme();
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('bookstoreDesk');
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Author | 'new' | null>(null);
  const q = useQuery({ queryKey: [KEYS.authors, 'all'], queryFn: () => authorsApi.list() });
  const all = q.data ?? [];
  const active = all.filter((a) => a.isActive);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((a) => (tab === 'active' ? a.isActive : !a.isActive) && (!s || [a.name, a.penName].some((v) => v?.toLowerCase().includes(s))));
  }, [all, tab, search]);

  const feature = async (a: Author) => {
    try { await authorsApi.toggleFeatured(a.id); refreshBookstore([KEYS.authors]); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  const toggle = async (a: Author) => {
    if (a.isActive && !(await confirm({ title: t('{{name}} band karein?', { name: a.name }), message: t('Kitab banate waqt ye author nahi dikhega; jin kitabon par laga hai un par rahega.'), tone: 'danger', confirmLabel: t('Band karein') }))) return;
    try { if (a.isActive) await authorsApi.remove(a.id); else await authorsApi.update(a.id, { isActive: true }); refreshBookstore([KEYS.authors]); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Users} tone="info" label={t('Chalu author')} loading={q.isLoading} value={String(active.length)} hint={t('{{value}} band', { value: all.length - active.length })} />
        <StatTile style={{ flex: 1 }} icon={Star} tone="warning" label={t('Khaas (featured)')} loading={q.isLoading} value={String(active.filter((a) => a.isFeatured).length)} hint={t('List me upar')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: t('Chalu') }, { value: 'off', label: t('Band') }]} />
      <OfflineNote feature="bookstoreDesk" />
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate<Author>
        title={t('Authors')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam ya qalami naam') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(a) => a.id}
        renderItem={({ item: a }) => (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: a.isActive ? 1 : 0.7 }}>
            <ListRow icon={Users} iconTone="info"
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{a.name}</Text>{a.isFeatured && <Badge tone="warning">{t('Khaas')}</Badge>}</Row>}
              subtitle={<Text size="xs" tone="muted" numberOfLines={1}>{[a.penName, a.nationality, t('{{value}} kitaben', { value: a._count?.bookAuthors ?? a.totalBooks ?? 0 })].filter(Boolean).join(' · ')}</Text>}
              trailing={canEdit ? <Row gap={1}><IconButton icon={Star} label={a.isFeatured ? t('Khaas se hatayein') : t('Khaas banayein')} size="sm" variant={a.isFeatured ? 'soft' : 'ghost'} onPress={() => guard(() => void feature(a))} /><IconButton icon={Power} label={a.isActive ? t('Band') : t('Chalu')} size="sm" variant="ghost" onPress={() => guard(() => void toggle(a))} /></Row> : undefined}
              onPress={canEdit ? () => guard(() => setForm(a)) : undefined} />
          </View>
        )}
        empty={<EmptyState icon={Users} title={search ? t('Koi author nahi mila') : t('Abhi koi author nahi')} message={t("Author yahan banayein ya kitab banate waqt naam likh kar 'Naya' dabayein.")} />}
        fab={canEdit ? { icon: Plus, label: t('Naya author'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <AuthorForm author={form} onClose={() => setForm(null)} />
    </>
  );
}

function AuthorForm({ author, onClose }: { author: Author | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const a0 = author === 'new' ? null : author;
  const [v, setV] = useState({ name: '', penName: '', nationality: '', bornYear: null as number | null, diedYear: null as number | null, bio: '', languages: [] as string[] });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!author) return;
    setTouched(false);
    setV({ name: a0?.name ?? '', penName: a0?.penName ?? '', nationality: a0?.nationality ?? '', bornYear: a0?.bornYear ?? null, diedYear: a0?.diedYear ?? null, bio: a0?.bio ?? '', languages: a0?.languages ?? [] });
  }, [author]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    setTouched(true);
    if (!v.name.trim()) return;
    const o = (x: string) => x.trim() || undefined;
    setBusy(true);
    try {
      const body: Partial<Author> = { name: v.name.trim(), penName: o(v.penName), nationality: o(v.nationality), bornYear: v.bornYear ?? undefined, diedYear: v.diedYear ?? undefined, bio: o(v.bio), languages: v.languages };
      if (a0) await authorsApi.update(a0.id, body); else await authorsApi.create(body);
      refreshBookstore([KEYS.authors]);
      toast.success(t('Author save ho gaya'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!author} onClose={onClose} height={0.8} title={a0 ? t('{{name}} — badlein', { name: a0.name }) : t('Naya author')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={v.name} onChangeText={(x) => setV({ ...v, name: x })} error={touched && !v.name.trim() ? t('Naam likhein') : undefined} />
        <Input label={t('Qalami naam')} value={v.penName} onChangeText={(x) => setV({ ...v, penName: x })} placeholder={t('Marzi hai')} />
        <Input label={t('Mulk')} value={v.nationality} onChangeText={(x) => setV({ ...v, nationality: x })} placeholder={t('Pakistani')} />
        <NumberInput label={t('Paida hone ka saal')} integer value={v.bornYear} onChangeValue={(x) => setV({ ...v, bornYear: x })} />
        <NumberInput label={t('Wafat ka saal')} integer value={v.diedYear} onChangeValue={(x) => setV({ ...v, diedYear: x })} />
        <Text size="sm" weight="medium" tone="secondary">{t('Zubaan')}</Text>
        <ChipGroup wrap multiple value={v.languages} onChange={(x) => setV({ ...v, languages: x })} options={LANGUAGES.map((l) => ({ value: l, label: l }))} />
        <TextArea label={t('Bio (marzi)')} value={v.bio} onChangeText={(x) => setV({ ...v, bio: x })} />
      </View>
    </Sheet>
  );
}

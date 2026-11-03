/**
 * Seasonal collections (web CollectionsPage): a collection groups products;
 * at season end one tap puts the whole collection on a percent sale and
 * another puts regular prices back. Tap a collection to see and change its
 * products and the sale; the form sheet makes or edits one. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Palette, Percent, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, ChipGroup, DatePicker, EmptyState, IconButton, Input, List, ListRow, ListTemplate, MoneyInput, Row, Select, Sheet, StatusPill, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { collectionsApi, type CollectionInput, type GarmentCollection } from '../api';
import { COLLECTION_KEY, SEASONS, dateISO, opt, refreshGarments, seasonLabel } from '../meta';

const SALE_CHIPS = ['10', '20', '30', '50'];

function CollectionForm({ open, item, onClose }: { open: boolean; item: GarmentCollection | null; onClose: () => void }) {
  const th = useTheme();
  const [name, setName] = useState(item?.name ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [season, setSeason] = useState(item?.season ?? 'ALL_SEASON');
  const [year, setYear] = useState(item?.year ? String(item.year) : String(new Date().getFullYear()));
  const [launch, setLaunch] = useState<Date | null>(item?.launchDate ? new Date(item.launchDate) : null);
  const [end, setEnd] = useState<Date | null>(item?.endDate ? new Date(item.endDate) : null);
  const [desc, setDesc] = useState(item?.description ?? '');
  const [featured, setFeatured] = useState(item?.isFeatured ?? false);
  const [active, setActive] = useState(item?.isActive ?? true);
  const save = useMutation({
    mutationFn: () => {
      const body: CollectionInput = { name: name.trim(), code: opt(code), season, year: Number(year) || undefined, launchDate: dateISO(launch), endDate: dateISO(end), description: opt(desc), isFeatured: featured, isActive: active };
      return item ? collectionsApi.update(item.id, body) : collectionsApi.create(body);
    },
    onSuccess: () => { toast.success(t('Save ho gaya')); refreshGarments([COLLECTION_KEY, 'garments-meta']); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={item ? t('Edit collection') : t('Nayi collection')} height={0.92}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!name.trim()} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} placeholder={t('Jaise: Eid 2026')} />
        <Row gap={2}>
          <Input containerStyle={{ flex: 1 }} label={t('Code')} value={code} onChangeText={setCode} autoCapitalize="characters" />
          <Input containerStyle={{ flex: 1 }} label={t('Saal')} value={year} onChangeText={(v) => setYear(v.replace(/\D/g, ''))} keyboardType="number-pad" />
        </Row>
        <Select label={t('Season')} value={season} onChange={setSeason} options={SEASONS.map((s) => ({ value: s.value, label: t(s.label) }))} />
        <DatePicker label={t('Launch date')} value={launch} onChange={setLaunch} />
        <DatePicker label={t('Khatam date')} value={end} onChange={setEnd} />
        <TextArea label={t('Tafseel')} value={desc} onChangeText={setDesc} />
        <Switch value={featured} onChange={setFeatured} label={t('Khaas collection')} />
        <Switch value={active} onChange={setActive} label={t('Chaalu hai')} />
      </View>
    </Sheet>
  );
}

function CollectionSheet({ id, onClose, onEdit }: { id: string | null; onClose: () => void; onEdit: (c: GarmentCollection) => void }) {
  const th = useTheme();
  const can = usePermission();
  const edit = can(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('garmentsDesk');
  const [adding, setAdding] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const q = useQuery({ queryKey: [COLLECTION_KEY, 'one', id], queryFn: () => collectionsApi.getOne(id!), enabled: !!id });
  const c = q.data;
  const done = () => { refreshGarments([COLLECTION_KEY, 'garments-meta'], true); void q.refetch(); };
  const sale = useMutation({
    mutationFn: (percent: number | null) => collectionsApi.setSale(id!, percent),
    onSuccess: (r) => { toast.success(r.salePercent ? t('{{n}} cheezon par {{p}}% sale', { n: r.products, p: r.salePercent }) : t('Regular prices wapas')); done(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  return (
    <>
      <Sheet open={!!id && !adding} onClose={onClose} title={c?.name ?? t('Collection')} height={0.92} scrollable={false}>
        <View style={{ flex: 1, gap: th.space(3) }}>
          <OfflineNote feature="garmentsDesk" />
          {c && (
            <>
              <Row gap={2} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusPill tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? t('Chaalu') : t('Band')}</StatusPill>
                <Text size="sm" tone="secondary">{seasonLabel(c.season)}{c.year ? ` · ${c.year}` : ''}</Text>
                {c.salePercent ? <Badge tone="danger">{t('{{p}}% Sale', { p: c.salePercent })}</Badge> : null}
                {edit && <Button size="sm" variant="ghost" onPress={() => onEdit(c)}>{t('Edit')}</Button>}
              </Row>
              {edit && (
                <>
                  <Text size="sm" weight="semibold" tone="secondary">{t('Poori collection par sale')}</Text>
                  <ChipGroup wrap value={String(c.salePercent ?? '')} onChange={(v) => guard(() => sale.mutate(Number(v)))} options={SALE_CHIPS.map((p) => ({ value: p, label: `${p}%`, icon: Percent }))} />
                  <Row gap={2} style={{ alignItems: 'flex-end' }}>
                    <MoneyInput containerStyle={{ flex: 1 }} label={t('Apna percent')} value={pct} onChangeValue={setPct} prefix="%" decimals={false} />
                    <Button variant="soft" disabled={!pct || pct >= 100} onPress={() => guard(() => sale.mutate(pct))}>{t('Lagayein')}</Button>
                    {!!c.salePercent && <Button variant="ghost" onPress={() => guard(() => sale.mutate(null))}>{t('Sale khatam')}</Button>}
                  </Row>
                </>
              )}
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Text weight="semibold">{t('{{n}} products', { n: c.products.length })}</Text>
                {edit && <Button size="sm" variant="soft" icon={Plus} onPress={() => setAdding(true)}>{t('Products jorein')}</Button>}
              </Row>
              <List data={c.products} keyExtractor={(p) => p.id} loading={false}
                empty={<EmptyState compact icon={Palette} title={t('Is collection me abhi koi cheez nahi')} />}
                renderItem={({ item: p }) => (
                  <ListRow dense title={p.name} subtitle={`${t('Stock')} ${p.stock}${p.sku ? ` · ${p.sku}` : ''}`}
                    trailing={<Row gap={2} style={{ alignItems: 'center' }}>
                      <View style={{ alignItems: 'flex-end' }}><Amount value={p.price} size="sm" weight="semibold" />{p.regularPrice ? <Text size="2xs" tone="muted" style={{ textDecorationLine: 'line-through' }}>{formatMoney(p.regularPrice)}</Text> : null}</View>
                      {edit && <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={() => guard(() => void collectionsApi.removeProducts(c.id, [p.id]).then(done).catch((e) => toast.error(apiErrorMessage(e, t('Nahi hua')))))} />}
                    </Row>} />
                )} />
            </>
          )}
        </View>
      </Sheet>
      <ProductPicker open={adding} onClose={() => setAdding(false)} title={t('Products jorein')} includeRaw={false} variants={false} keepOpen
        onPick={(p) => { void collectionsApi.addProducts(id!, [p.product.id]).then(() => { toast.success(t('Jud gaya')); done(); }).catch((e) => toast.error(apiErrorMessage(e, t('Nahi hua')))); }} />
    </>
  );
}

export function CollectionsScreen() {
  const can = usePermission();
  const edit = can(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('garmentsDesk');
  const [form, setForm] = useState<{ item: GarmentCollection | null } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const list = useQuery({ queryKey: [COLLECTION_KEY, 'list'], queryFn: () => collectionsApi.list(), staleTime: 30_000 });
  const stats = useQuery({ queryKey: [COLLECTION_KEY, 'stats'], queryFn: () => collectionsApi.stats(30), staleTime: 60_000 });
  const by = new Map((stats.data?.items ?? []).map((s) => [s.collectionId, s]));
  const rows = (list.data ?? []).filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <>
      <ListTemplate<GarmentCollection> title={t('Collections')} search={{ value: search, onChange: setSearch, placeholder: t('Collection dhoondein') }}
        data={rows} loading={list.isLoading} error={list.error} onRetry={() => void list.refetch()} refreshing={list.isRefetching} onRefresh={() => void list.refetch()}
        keyExtractor={(c) => c.id}
        summary={<OfflineNote feature="garmentsDesk" />}
        renderItem={({ item: c }) => {
          const s = by.get(c.id);
          return (
            <ListRow divider icon={Palette} iconTone={c.isActive ? 'accent' : 'neutral'} title={c.name}
              subtitle={`${seasonLabel(c.season)}${c.year ? ` · ${c.year}` : ''} · ${t('{{n}} products', { n: s?.products ?? c.productCount ?? 0 })}${s ? ` · ${t('{{n}} bike (30 din)', { n: Math.round(s.soldQty) })}` : ''}`}
              trailing={c.salePercent ? <Badge tone="danger">{t('{{p}}% Sale', { p: c.salePercent })}</Badge> : s?.stockValue ? <Amount value={s.stockValue} size="sm" compact /> : undefined}
              chevron onPress={() => setOpenId(c.id)} />
          );
        }}
        empty={<EmptyState icon={Palette} title={t('Koi collection nahi')} />}
        fab={edit ? { icon: Plus, label: t('New'), onPress: () => guard(() => setForm({ item: null })) } : undefined} />
      <CollectionSheet id={openId} onClose={() => setOpenId(null)} onEdit={(c) => { setOpenId(null); setForm({ item: c }); }} />
      {form && <CollectionForm key={form.item?.id ?? 'new'} open item={form.item} onClose={() => setForm(null)} />}
    </>
  );
}

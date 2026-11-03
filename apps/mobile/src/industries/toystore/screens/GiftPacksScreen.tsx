/**
 * Gift packs (web ToyGiftPacksPage): several toys at one price for Eid and
 * birthdays. Each pack shows its toys, the saving, how many the shelf can make
 * and its dates; the counter sells them from its Gift packs tab. Also sets the
 * gift wrapping charge. Needs the server; the last loaded list stays readable.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Copy, Gift, Moon, Package, Pencil, Plus, Power, Scissors, ShoppingCart, Star } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { buildable, isLive } from '@nafaa/core/industries/toystore';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, EmptyState, IconButton, Input, ListTemplate, MoneyInput, Row, Segmented, Sheet, StatTile, SwipeRow, Text, confirm, toast, useTheme, type SwipeAction } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { packBody, toyGiftPacksApi, toyProductsApi, type GiftWrap, type ToyGiftPack } from '../api';
import { AGE_GROUPS, KEYS, OCCASIONS, dayOnly, labelOf, refreshToy } from '../meta';

type Tab = 'live' | 'season' | 'off';
const stockOf = (p: ToyGiftPack) => buildable(p.items.map((i) => ({ quantity: i.quantity, stock: i.product?.stock })));

export function GiftPacksScreen() {
  const th = useTheme();
  const can = usePermission();
  const canEdit = can(P.PRODUCTS_EDIT);
  const canSell = can(P.POS_USE);
  const [tab, setTab] = useState<Tab>('live');
  const [search, setSearch] = useState('');
  const [wrapOpen, setWrapOpen] = useState(false);
  const wrapQ = useQuery({ queryKey: [KEYS.wrap], queryFn: () => toyProductsApi.giftWrap(), enabled: canEdit, staleTime: 60_000 });
  const wrap = wrapQ.data;
  const list = useQuery({ queryKey: [KEYS.packs, 'all'], queryFn: () => toyGiftPacksApi.list() });
  const all = useMemo(() => list.data ?? [], [list.data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((p) => (tab === 'off' ? !p.isActive : tab === 'season' ? p.isActive && p.isSeasonal : p.isActive)
      && (!q || [p.name, p.occasion, p.seasonName, ...p.items.map((i) => i.product?.name)].some((v) => v?.toLowerCase().includes(q))));
  }, [all, search, tab]);
  const live = all.filter((p) => isLive(p));
  const short = live.filter((p) => stockOf(p) === 0);
  const refresh = () => refreshToy([KEYS.packs, KEYS.posPacks, KEYS.overview]);
  const off = useMutation({ mutationFn: (p: ToyGiftPack) => toyGiftPacksApi.remove(p.id), onSuccess: () => { refresh(); toast.success(t('Pack band ho gaya — counter par nahi dikhega')); } });
  const on = useMutation({ mutationFn: (p: ToyGiftPack) => toyGiftPacksApi.update(p.id, packBody(p, { isActive: true })), onSuccess: () => { refresh(); toast.success(t('Pack phir counter par')); } });
  const copy = useMutation({ mutationFn: (p: ToyGiftPack) => toyGiftPacksApi.duplicate(p.id), onSuccess: (p) => { refresh(); toast.success(t('Copy ban gayi (band) — badal kar chalu karein')); router.push(`/toystore/gift-packs/${p.id}/edit` as never); } });
  const switchOff = async (p: ToyGiftPack) => {
    if (await confirm({ title: t('{{name}} band karein?', { name: p.name }), message: t('Counter par nahi dikhega. Bike hue bill aur ginti waisi rahengi; baad me Chalu kar sakte hain.'), confirmLabel: t('Band karein'), tone: 'danger' })) off.mutate(p);
  };
  const swipe = (p: ToyGiftPack): SwipeAction[] => [
    ...(canSell && isLive(p) ? [{ icon: ShoppingCart, label: t('Bechein'), tone: 'success' as const, onPress: () => router.push('/pos' as never) }] : []),
    ...(canEdit ? [{ icon: Pencil, label: t('Badlein'), tone: 'brand' as const, onPress: () => router.push(`/toystore/gift-packs/${p.id}/edit` as never) }, { icon: Copy, label: t('Copy'), tone: 'info' as const, onPress: () => copy.mutate(p) }] : []),
    ...(canEdit ? [p.isActive ? { icon: Power, label: t('Band'), tone: 'danger' as const, onPress: () => void switchOff(p) } : { icon: Power, label: t('Chalu'), tone: 'success' as const, onPress: () => on.mutate(p) }] : []),
  ];

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Gift} label={t('Chalu')} loading={list.isLoading} value={String(all.filter((p) => p.isActive).length)} hint={t('Ab tak bike {{count}}', { count: all.reduce((s, p) => s + p.totalSold, 0) })} onPress={() => setTab('live')} />
        <StatTile style={{ flex: 1 }} icon={Moon} tone="success" label={t('Season (Eid)')} loading={list.isLoading} value={String(all.filter((p) => p.isActive && p.isSeasonal).length)} onPress={() => setTab('season')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Package} tone={short.length ? 'danger' : 'neutral'} label={t('Stock nahi')} loading={list.isLoading} value={String(short.length)} hint={t('Ek bhi pack nahi banta')} />
        <StatTile style={{ flex: 1 }} icon={Power} tone="neutral" label={t('Band')} loading={list.isLoading} value={String(all.filter((p) => !p.isActive).length)} onPress={() => setTab('off')} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'live', label: t('Chalu') }, { value: 'season', label: t('Season') }, { value: 'off', label: t('Band') }]} />
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate<ToyGiftPack>
        title={t('Gift packs')} subtitle={t('Kai khilone ek qeemat par — counter ke Gift packs tab se bikte hain')} grouped={false}
        actions={canEdit ? <IconButton icon={Scissors} label={wrap?.isActive ? t('Gift wrap {{price}}', { price: wrap.price }) : t('Gift wrap')} onPress={() => setWrapOpen(true)} /> : undefined}
        search={{ value: search, onChange: setSearch, placeholder: t('Pack ya khilone ka naam') }}
        summary={header}
        data={rows} loading={list.isLoading} error={!list.data ? list.error : undefined} onRetry={() => void list.refetch()}
        refreshing={list.isRefetching} onRefresh={() => void list.refetch()} keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => {
          const can2 = stockOf(p);
          const onNow = isLive(p);
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: p.isActive ? 1 : 0.7 }}>
              <SwipeRow end={swipe(p)}>
                <Card flush style={{ borderWidth: 0, borderRadius: 0 }} onPress={canEdit ? () => router.push(`/toystore/gift-packs/${p.id}/edit` as never) : undefined}>
                  <View style={{ padding: th.space(3.5), gap: th.space(2) }}>
                    <Row gap={2} justify="between" align="start">
                      <View style={{ flex: 1 }}>
                        <Row gap={1.5}>{p.isFeatured ? <Star size={14} color={th.colors.warning.text} fill={th.colors.warning.text} /> : null}<Text weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</Text></Row>
                        <Text size="xs" tone="muted" numberOfLines={1}>{[labelOf(OCCASIONS, p.occasion), labelOf(AGE_GROUPS, p.targetAgeGroup), p.isSeasonal && p.seasonName].filter(Boolean).join(' · ') || t('{{itemCount}} khilone', { itemCount: p.itemCount })}</Text>
                      </View>
                      <Badge tone={onNow ? 'success' : p.isActive ? 'warning' : 'neutral'}>{onNow ? t('Counter par') : p.isActive ? t('Tareekh se bahar') : t('Band')}</Badge>
                    </Row>
                    {p.items.slice(0, 3).map((i, n) => (
                      <Row key={`${i.productId}-${n}`} justify="between"><Text size="sm" numberOfLines={1} style={{ flex: 1 }}>{`${i.product?.name ?? t('Khilona nahi mila')} × ${i.quantity}`}</Text><Amount value={i.unitPrice * i.quantity} size="sm" tone="muted" /></Row>
                    ))}
                    {p.items.length > 3 && <Text size="xs" tone="muted">{t('+{{value}} aur', { value: p.items.length - 3 })}</Text>}
                    <Row gap={3} justify="between">
                      <View><Text size="2xs" tone="muted">{t('Pack')}</Text><Amount value={p.giftPackPrice} weight="bold" /></View>
                      <View><Text size="2xs" tone="muted">{t('Bachat')}</Text><Text size="sm" weight="semibold" tone="success" ltr>{p.savings > 0 ? `${p.savings} (${p.savingsPct}%)` : '—'}</Text></View>
                      <View><Text size="2xs" tone="muted">{t('Stock se')}</Text><Text size="sm" weight="semibold" tone={can2 === 0 ? 'danger' : 'default'}>{t('{{can}} pack', { can: can2 })}</Text></View>
                    </Row>
                    {(p.validFrom || p.validUntil) && <Text size="xs" tone="muted">{[p.validFrom ? dayOnly(p.validFrom) : '', p.validUntil ? dayOnly(p.validUntil) : ''].filter(Boolean).join(' – ')}</Text>}
                    <Text size="xs" tone="muted">{t('{{totalSold}} bike{{value}}', { totalSold: p.totalSold, value: p.isGiftWrapped ? t(' · Wrap ke saath') : '' })}</Text>
                  </View>
                </Card>
              </SwipeRow>
            </View>
          );
        }}
        empty={<EmptyState icon={Gift} title={search ? t('Koi pack nahi mila') : tab === 'off' ? t('Koi band pack nahi') : t('Abhi koi gift pack nahi')}
          message={t('Do ya zyada khilone chun kar ek qeemat rakhein — Eid aur saalgirah par jaldi bikta hai aur purana stock bhi nikalta hai.')} />}
        fab={canEdit ? { icon: Plus, label: t('Pack'), onPress: () => router.push('/toystore/gift-packs/new' as never) } : undefined}
      />
      <GiftWrapSheet open={wrapOpen} current={wrap ?? null} onClose={() => setWrapOpen(false)} />
    </>
  );
}

/** Sets the gift wrapping charge; the counter bills it as a service line (no stock). 0 switches it off. */
function GiftWrapSheet({ open, current, onClose }: { open: boolean; current: GiftWrap | null; onClose: () => void }) {
  const th = useTheme();
  const [price, setPrice] = useState<number | null>(null);
  const [name, setName] = useState('Gift wrapping');
  useEffect(() => { if (open) { setPrice(current?.isActive ? current.price : null); setName(current?.name ?? 'Gift wrapping'); } }, [open, current]);
  const save = useMutation({
    mutationFn: () => toyProductsApi.setGiftWrap({ price: price ?? 0, name: name.trim() || undefined }),
    onSuccess: (w) => {
      toast.success(w.isActive ? t('Gift wrap {{price}} — POS par chip se lagayein', { price: w.price }) : t('Gift wrap band'));
      refreshToy([KEYS.wrap, KEYS.posPacks]);
      onClose();
    },
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('Gift wrap ka charge')} description={t('Bill par alag line — stock nahi ginta, Sale me aata hai')}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={() => save.mutate()}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Charge (Rs)')} value={price} onChangeValue={setPrice} placeholder="100" hint={t('0 ya khali = band')} />
        <Input label={t('Bill par naam')} value={name} onChangeText={setName} maxLength={60} />
      </View>
    </Sheet>
  );
}

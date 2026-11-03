/**
 * Kitchen stations (web StationsPage): grill, tandoor, bar… Each station
 * takes whole menu categories, so a dish's ticket (KOT) goes to the station
 * of its category; categories on no station go to the first one. Changes
 * need the server; the last routing stays readable offline.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, ChefHat, Flame, FolderTree, Monitor, Pencil, Plus, Printer, Trash2, UtensilsCrossed } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, Chip, EmptyState, IconButton, Input, ListRow, Row, Screen, Select, Sheet, Skeleton, StatTile, Text, confirm, toast, useTheme,
} from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { stationsApi, type StationInput, type StationRouting } from '../api';
import { MENU_KEYS, refreshMenu } from '../meta';

type Station = StationRouting['stations'][number];

const PRESETS = [
  { name: 'Grill / BBQ', code: 'BBQ' }, { name: 'Tandoor', code: 'TND' }, { name: 'Karahi', code: 'KRH' },
  { name: 'Chinese', code: 'CHN' }, { name: 'Fast food', code: 'FF' }, { name: 'Bar / Drinks', code: 'BAR' }, { name: 'Dessert', code: 'DST' },
];

export function StationsScreen() {
  const th = useTheme();
  const can = usePermission();
  const canManage = can(P.RESTAURANT_KITCHEN_MANAGE);
  const online = useOnlineStatus();
  const [editing, setEditing] = useState<Station | StationInput | null>(null);
  const q = useQuery({ queryKey: [MENU_KEYS.stations], queryFn: () => stationsApi.routing() });
  const data = q.data;
  const stations = data?.stations ?? [];
  const categories = data?.categories ?? [];
  const menuCats = categories.filter((c) => c.dishes > 0 || c.stationId);
  const loose = menuCats.filter((c) => !c.stationId);
  const looseDishes = loose.reduce((s, c) => s + c.dishes, 0) + (data?.uncategorisedDishes ?? 0);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const refresh = () => refreshMenu(MENU_KEYS.stations, 'restaurant-stations');
  const guard = (run: () => void) => { if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; } run(); };

  const place = useMutation({
    mutationFn: ({ station, categoryId }: { station: Station; categoryId: string }) => stationsApi.update(station.id, { categoryIds: [...station.categoryIds, categoryId] }),
    onSuccess: (s) => { toast.success(t('{{name}} par laga di', { name: s.name })); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Station save nahi hua'))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => stationsApi.remove(id),
    onSuccess: () => { toast.success(t('Station band — is ki categories ab pehle station par jayengi')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const askRemove = async (s: Station) => {
    if (await confirm({ title: t('"{{name}}" band karein?', { name: s.name }), tone: 'danger', confirmLabel: t('Band karein'),
      message: t('Is ki {{count}} category kisi station par nahi rahengi aur un ke KOT pehle station par jayenge. Purane KOT par station ka naam rahega.', { count: s.categoryIds.length }) })) remove.mutate(s.id);
  };

  return (
    <>
      <Screen title={t('Kitchen stations')} subtitle={t('Kaunsi dish kis kitchen / printer par')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
        actions={canManage ? <IconButton icon={Plus} label={t('Naya station')} onPress={() => guard(() => setEditing({ name: '', code: '', printerName: '', categoryIds: [] }))} /> : undefined}>
        <View style={{ gap: th.space(3) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={Flame} tone="warning" label={t('Stations')} loading={q.isLoading} value={String(stations.length)} hint={t('{{count}} printer wale', { count: stations.filter((s) => s.printerName).length })} />
            <StatTile style={{ flex: 1 }} icon={FolderTree} tone={loose.length ? 'warning' : 'success'} label={t('Category bina station')} loading={q.isLoading} value={String(loose.length)} hint={loose.length ? t('Neeche lagayein') : t('Sab lagi hain')} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={UtensilsCrossed} tone="success" label={t('Dishes station par')} loading={q.isLoading} value={String(stations.reduce((s, x) => s + x.dishes, 0))} />
            <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone="neutral" label={t('Bina station dishes')} loading={q.isLoading} value={String(looseDishes)} hint={data?.fallback ? `→ ${data.fallback.name}` : undefined} />
          </Row>
          <CachedNote query={q} />

          {!q.isLoading && !stations.length && (
            <EmptyState icon={Flame} title={t('Abhi koi station nahi')} message={t('Station ke bagair saare KOT ek jagah jate hain. BBQ, tandoor aur chinese alag hon to har ek ka station banayein aur us ki categories lagayein.')}
              action={canManage ? <Row gap={1.5} wrap justify="center">{PRESETS.map((p) => <Chip key={p.code} icon={Plus} label={p.name} onPress={() => guard(() => setEditing({ ...p, printerName: '', categoryIds: [] }))} />)}</Row> : undefined} />
          )}

          {loose.length > 0 && stations.length > 0 && (
            <Card tone="warning" title={t('{{count}} category kisi station par nahi — in ke KOT {{value}} par ja rahe hain', { count: loose.length, value: data?.fallback?.name ?? stations[0]?.name ?? '' })}>
              <View style={{ gap: th.space(2) }}>
                {loose.map((c) => (
                  <Row key={c.id} gap={2}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} />
                    <Text size="sm" weight="medium" style={{ flex: 1 }} numberOfLines={1}>{c.name} <Text size="sm" tone="muted">{t('· {{dishes}} dish', { dishes: c.dishes })}</Text></Text>
                    {canManage && (
                      <View style={{ width: 150 }}>
                        <Select placeholder={t('Station…')} value={null} options={stations.map((s) => ({ value: s.id, label: s.name }))}
                          onChange={(v) => { const s = stations.find((x) => x.id === v); if (s) guard(() => place.mutate({ station: s, categoryId: c.id })); }} />
                      </View>
                    )}
                  </Row>
                ))}
              </View>
            </Card>
          )}

          {q.isLoading ? <Skeleton height={180} /> : stations.map((s, idx) => (
            <Card key={s.id} title={s.name}
              description={s.printerName ? `🖨 ${s.printerName}` : t('Kitchen screen')}
              action={<Badge tone="warning">{s.code || s.name.slice(0, 3).toUpperCase()}</Badge>}>
              <View style={{ gap: th.space(2) }}>
                {idx === 0 && <Text size="xs" tone="muted">{t('Bina station wale bhi yahan')}</Text>}
                <Row gap={1.5} wrap>
                  {s.categoryIds.map((id) => { const c = catById.get(id); return <Badge key={id} tone="neutral">{c?.name ?? t('Category hat gayi')}</Badge>; })}
                  {!s.categoryIds.length && <Text size="sm" tone="muted">{t('Koi category nahi')}</Text>}
                </Row>
                <Row gap={1.5}>
                  {s.printerName ? <Printer size={14} color={th.colors.textMuted} /> : <Monitor size={14} color={th.colors.textMuted} />}
                  <Text size="xs" tone="muted" style={{ flex: 1 }}>{t('{{dishes}} dish is station par', { dishes: s.dishes })}</Text>
                </Row>
                {canManage && (
                  <Row gap={1.5}>
                    <Button size="sm" variant="secondary" icon={Pencil} onPress={() => guard(() => setEditing(s))}>{t('Badlein')}</Button>
                    <View style={{ flex: 1 }} />
                    <IconButton icon={Trash2} label={t('Band karein')} variant="danger" size="sm" onPress={() => guard(() => void askRemove(s))} />
                  </Row>
                )}
              </View>
            </Card>
          ))}

          {stations.length > 0 && <ListRow icon={ChefHat} title={t('Order → KOT → har station ki apni parchi / screen.')} subtitle={t('Kitchen screen')} chevron onPress={() => router.push('/kitchen' as never)} />}
        </View>
      </Screen>
      {editing && <StationSheet initial={editing} stations={stations} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </>
  );
}

function StationSheet({ initial, stations, categories, onClose, onSaved }: {
  initial: Station | StationInput; stations: Station[]; categories: StationRouting['categories']; onClose: () => void; onSaved: () => void;
}) {
  const th = useTheme();
  const id = 'id' in initial ? initial.id : null;
  const [f, setF] = useState({ name: initial.name ?? '', code: initial.code ?? '', printerName: initial.printerName ?? '', categoryIds: initial.categoryIds ?? [] });
  const [tried, setTried] = useState(false);
  const owner = new Map<string, string>();
  for (const s of stations) if (s.id !== id) for (const c of s.categoryIds) owner.set(c, s.name);
  const dup = stations.some((s) => s.id !== id && s.name.trim().toLowerCase() === f.name.trim().toLowerCase());
  const problem = !f.name.trim() ? t('Station ka naam likhein') : dup ? t('Is naam ka station pehle se hai') : null;
  const save = useMutation({
    mutationFn: () => {
      const body = { name: f.name.trim(), code: f.code.trim().toUpperCase(), printerName: f.printerName.trim(), categoryIds: f.categoryIds };
      return id ? stationsApi.update(id, body) : stationsApi.create(body);
    },
    onSuccess: () => { toast.success(id ? t('Station save') : t('Station ban gaya')); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const submit = () => { setTried(true); if (!problem && !save.isPending) save.mutate(); };
  const flip = (c: string) => setF((x) => ({ ...x, categoryIds: x.categoryIds.includes(c) ? x.categoryIds.filter((y) => y !== c) : [...x.categoryIds, c] }));
  return (
    <Sheet open onClose={onClose} title={id ? t('{{name}} badlein', { name: initial.name }) : t('Naya station')} description={t('Station ki categories ke saare KOT isi par jayenge')} height={0.9}
      footer={<View style={{ gap: th.space(2) }}>{tried && problem && <Text size="sm" tone="warning">{problem}</Text>}<Button size="lg" fullWidth loading={save.isPending} onPress={submit}>{id ? t('Save karein') : t('Station banayein')}</Button></View>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={f.name} onChangeText={(v) => setF({ ...f, name: v.slice(0, 40) })} placeholder={t('Grill / BBQ')} error={tried && problem ? problem : undefined} />
        {!id && <Row gap={1.5} wrap>{PRESETS.filter((p) => !stations.some((s) => s.name.toLowerCase() === p.name.toLowerCase())).map((p) => <Chip key={p.code} label={p.name} onPress={() => setF({ ...f, name: p.name, code: p.code })} />)}</Row>}
        <Input label={t('Chhota code')} value={f.code} onChangeText={(v) => setF({ ...f, code: v.slice(0, 8).toUpperCase() })} placeholder={t('BBQ')} hint={t('KOT par chhapta hai')} ltr />
        <Input label={t('Printer ka naam')} icon={Printer} value={f.printerName} onChangeText={(v) => setF({ ...f, printerName: v.slice(0, 80) })} placeholder={t('Maslan: KITCHEN-80')}
          hint={t('Khali = kitchen screen par dikhega. Computer me printer ka jo naam hai wohi likhein.')} ltr />
        <Text size="sm" weight="semibold" tone="secondary">{t('Categories')} <Text size="sm" tone="muted">{t('· ek category ek hi station par')}</Text></Text>
        {!categories.length ? <Text size="sm" tone="muted">{t('Pehle menu ki categories banayein (BBQ, Karahi, Drinks).')}</Text> : (
          <Card flush>
            {categories.map((c, i) => {
              const other = owner.get(c.id);
              return <ListRow key={c.id} dense divider={i < categories.length - 1} title={c.name} subtitle={other ? other : t('{{dishes}} dish', { dishes: c.dishes })}
                disabled={!!other} selected={f.categoryIds.includes(c.id)} onPress={() => flip(c.id)}
                leading={<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} />} />;
            })}
          </Card>
        )}
      </View>
    </Sheet>
  );
}

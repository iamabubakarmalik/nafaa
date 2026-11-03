/** Sheets for the van screens: create or edit a van, load stock from the godown, and close the day. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Truck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiClient } from '@/core/api/client';
import { useShops } from '@/core/auth/useShops';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, Checkbox, Input, MoneyInput, Row, Select, Sheet, SkeletonRows, Switch, Text, toast, useTheme } from '@/design';
import { DIST_KEY, distError, distributionApi, type BootProduct } from '../api/distribution.api';
import { phase2Api, type SaveVan, type VanDetail, type VanLine, type VanRow, type VanSession } from '../api/phase2.api';
import { rs, trim } from '../lib/meta';

export const VANS_KEY = [DIST_KEY, 'vans'] as const;

/* ───────────── create / edit ───────────── */

export function VanFormSheet({ open, van, saving, onClose, onSave }: {
  open: boolean; van: Pick<VanRow, 'name' | 'vehicleNo' | 'homeShopId' | 'salesmanId' | 'routeId' | 'isActive' | 'note'> | null; saving: boolean; onClose: () => void; onSave: (b: SaveVan) => void;
}) {
  const th = useTheme();
  const shopsQ = useShops();
  const teamQ = useQuery({ queryKey: ['team'], queryFn: () => apiClient.get('/team').then((r) => r.data as { id: string; fullName: string }[]).catch(() => []), staleTime: 5 * 60_000, enabled: open });
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000, enabled: open });
  const [name, setName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [homeShopId, setHomeShopId] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [isActive, setActive] = useState(true);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!open) return;
    setName(van?.name ?? ''); setVehicleNo(van?.vehicleNo ?? ''); setHomeShopId(van?.homeShopId ?? ''); setSalesmanId(van?.salesmanId ?? '');
    setRouteId(van?.routeId ?? ''); setActive(van?.isActive ?? true); setNote(van?.note ?? '');
  }, [open, van]);
  const submit = () => onSave({
    name: name.trim(), vehicleNo: vehicleNo.trim() || undefined, homeShopId: homeShopId || null, salesmanId: salesmanId || null, routeId: routeId || null, note: note.trim() || undefined,
    ...(van && { isActive }),
  });
  return (
    <Sheet open={open} onClose={onClose} title={van ? t('{{name}} — Edit', { name: van.name }) : t('New van')}
      description={t('Van ka apna stock hota hai. Godown se load hoti hai aur shaam ko bacha maal wapas wahi jata hai.')}
      footer={<Button fullWidth size="lg" loading={saving} disabled={!name.trim()} onPress={submit}>{van ? t('Save') : t('Create van')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} maxLength={60} placeholder={t('Van 1 - Shadman')} />
        <Input label={t('Gaari no.')} value={vehicleNo} onChangeText={(v) => setVehicleNo(v.toUpperCase())} autoCapitalize="characters" ltr maxLength={30} placeholder={t('LES-1234')} />
        <Select label={t('Godown (load / unload)')} value={homeShopId} onChange={setHomeShopId} placeholder={t('Chunein')}
          options={[{ value: '', label: t('Chunein') }, ...(shopsQ.data ?? []).map((s) => ({ value: s.id, label: `${s.name}${s.type !== 'SHOP' ? ` · ${t('godown')}` : ''}` }))]} />
        <Select label={t('Salesman')} value={salesmanId} onChange={setSalesmanId} placeholder={t('Baad me')} hint={t('Is login se phone par van ki sale hoti hai (Van Salesman preset)')}
          options={[{ value: '', label: t('Baad me') }, ...(teamQ.data ?? []).map((m) => ({ value: m.id, label: m.fullName }))]} />
        <Select label={t('Route')} value={routeId} onChange={setRouteId} placeholder={t('Koi nahi')} options={[{ value: '', label: t('Koi nahi') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} />
        <Input label={t('Note')} value={note} onChangeText={setNote} placeholder={t('Zaroori nahi')} />
        {van && <Switch value={isActive} onChange={setActive} label={t('Van chal rahi hai')} description={t('Band van par load ya sale nahi hoti')} />}
      </View>
    </Sheet>
  );
}

/* ───────────── load ───────────── */

interface LoadLine { key: string; productId: string; variantId: string | null; unitId: string; qty: string }

export function VanLoadSheet({ open, van, onClose }: { open: boolean; van: VanDetail; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const catalog = useQuery({ queryKey: [DIST_KEY, 'boot-products'], queryFn: distributionApi.bootProducts, staleTime: 10 * 60_000, enabled: open });
  const [lines, setLines] = useState<LoadLine[]>([]);
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setLines([]); setNote(''); } }, [open]);

  const byId = useMemo(() => new Map((catalog.data ?? []).map((p) => [p.id, p])), [catalog.data]);
  const options = useMemo(() => (catalog.data ?? []).filter((p) => p.isActive).flatMap((p) =>
    p.variants.length ? p.variants.map((v) => ({ value: `${p.id}:${v.id}`, label: `${p.name} · ${v.name}`, description: p.sku ?? undefined }))
      : [{ value: `${p.id}:`, label: p.name, description: p.sku ?? undefined }]), [catalog.data]);
  const packs = (p: BootProduct | undefined, variantId: string | null) => (p?.units ?? []).filter((u) => (u.variantId ?? null) === variantId || u.variantId == null);
  const set = (key: string, patch: Partial<LoadLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const valid = lines.filter((l) => Number(l.qty) > 0);

  const save = useMutation({
    mutationFn: () => {
      if (!valid.length) throw new Error(t('Kam se kam ek item aur quantity likhein'));
      return phase2Api.loadVan(van.id, valid.map((l) => ({ productId: l.productId, variantId: l.variantId, unitId: l.unitId || null, qty: Number(l.qty) })), note.trim() || undefined);
    },
    onSuccess: (r) => { toast.success(t('{{transferNumber}} — van load ho gayi', { transferNumber: r.transferNumber })); void qc.invalidateQueries({ queryKey: VANS_KEY }); onClose(); },
    onError: (e) => toast.error(distError(e, t('Load nahi hua'))),
  });

  return (
    <Sheet open={open} onClose={onClose} title={t('{{name}} — load', { name: van.name })} description={t('{{value}} se van par (transfer foran receive ho jata hai)', { value: van.homeShopName ?? t('Godown') })}
      footer={<Button fullWidth size="lg" icon={Truck} loading={save.isPending} disabled={!valid.length || !van.homeShopId} onPress={() => save.mutate()}>{t('Load van')} · {t('{{count}} items', { count: valid.length })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {catalog.isLoading ? <SkeletonRows count={2} /> : (
          <Select label={t('Item dhoondein…')} value="" placeholder={t('Item dhoondein…')} searchable options={options}
            onChange={(v) => {
              const [pid, vid] = v.split(':');
              const p = byId.get(pid);
              const def = packs(p, vid || null).find((u) => u.isDefault);
              setLines((ls) => [...ls, { key: `${Date.now()}${ls.length}`, productId: pid, variantId: vid || null, unitId: def?.id ?? '', qty: '' }]);
            }} />
        )}
        {!lines.length ? <Text size="sm" tone="muted" align="center">{t('Upar se item dhoond kar line banayein')}</Text> : lines.map((l) => {
          const p = byId.get(l.productId);
          const pk = packs(p, l.variantId);
          const stock = p?.stock.filter((s) => s.shopId === van.homeShopId && (s.variantId ?? null) === l.variantId).reduce((a, s) => a + s.qty, 0);
          const pack = pk.find((u) => u.id === l.unitId);
          return (
            <View key={l.key} style={{ gap: th.space(2) }}>
              <Row justify="between">
                <Text size="sm" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{p?.name}{l.variantId ? ` · ${p?.variants.find((v) => v.id === l.variantId)?.name}` : ''}</Text>
                <Button variant="ghost" size="sm" icon={Trash2} onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>{''}</Button>
              </Row>
              <Row gap={2} align="end">
                <Input containerStyle={{ flex: 1 }} label={t('Quantity')} keyboardType="decimal-pad" ltr value={l.qty} onChangeText={(v) => set(l.key, { qty: v.replace(/[^\d.]/g, '') })} />
                {pk.length > 0 && <View style={{ flex: 1 }}><Select label={t('Unit')} value={l.unitId} onChange={(v) => set(l.key, { unitId: v })} placeholder={p?.unit}
                  options={[{ value: '', label: p?.unit ?? '' }, ...pk.map((u) => ({ value: u.id, label: u.unitName }))]} /></View>}
              </Row>
              {stock != null && <Text size="xs" tone="muted">{t('Godown me {{stock}} {{unit}}', { stock: trim(stock), unit: p?.unit })}{pack && pack.conversionRate > 1 && Number(l.qty) > 0 ? ` · ${trim(Number(l.qty) * pack.conversionRate)} ${p?.unit}` : ''}</Text>}
            </View>
          );
        })}
        <Input label={t('Note')} value={note} onChangeText={setNote} placeholder={t('Zaroori nahi')} />
      </View>
    </Sheet>
  );
}

/* ───────────── close day ───────────── */

export function VanCloseSheet({ open, vanId, onClose, onDone }: { open: boolean; vanId: string; onClose: () => void; onDone: (s: VanSession) => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const canVerify = usePermission()(P.DISTRIBUTION_COLLECTIONS_VERIFY);
  const q = useQuery({ queryKey: [...VANS_KEY, 'close', vanId], queryFn: () => phase2Api.vanClosePreview(vanId), enabled: open });
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [handedIn, setHandedIn] = useState<number | null>(null);
  const [unload, setUnload] = useState(true);
  const [verify, setVerify] = useState(canVerify);
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setCounts({}); setHandedIn(null); setUnload(true); setVerify(canVerify); setNote(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = (l: VanLine) => `${l.productId}:${l.variantId ?? ''}`;
  const lines = q.data?.lines ?? [];
  const counted = (l: VanLine) => { const v = counts[key(l)]; return v === undefined || v === '' ? Math.max(0, l.expected) : Number(v); };
  const variance = lines.reduce((s, l) => s + Math.abs(counted(l) - l.expected) * (l.cost ?? 0), 0);
  const expectedCash = q.data?.session.money.expectedCash ?? 0;

  const save = useMutation({
    mutationFn: () => phase2Api.closeVan(vanId, {
      counts: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, counted: counted(l) })),
      ...(handedIn != null && { handedIn }), unload, verifyCollections: canVerify && verify, note: note.trim() || undefined,
    }),
    onSuccess: (s) => { toast.success(t('Van ka din band ho gaya')); void qc.invalidateQueries({ queryKey: VANS_KEY }); onDone(s); },
    onError: (e) => toast.error(distError(e, t('Din band nahi hua'))),
  });

  return (
    <Sheet open={open} onClose={onClose} title={t('Close van day')} description={t('Van par jo maal hai woh ginein. Kam / zyada stock adjustment me jata hai, bacha maal godown wapas.')}
      footer={<View style={{ gap: th.space(2) }}>
        <Text size="sm" tone="muted" align="center">{t('Farq (cost)')}: <Text size="sm" weight="bold" tone={variance > 0 ? 'danger' : 'default'} ltr>{rs(variance)}</Text></Text>
        <Button fullWidth size="lg" loading={save.isPending} disabled={q.isLoading} onPress={() => save.mutate()}>{t('Close day')}</Button>
      </View>}>
      {q.isLoading ? <SkeletonRows count={3} /> : (
        <View style={{ gap: th.space(3) }}>
          {!lines.length && <Text size="sm" tone="muted" align="center">{t('Aaj van par koi maal nahi chala')}</Text>}
          {lines.map((l) => {
            const c = counted(l);
            return (
              <View key={key(l)} style={{ gap: 4 }}>
                <Row justify="between"><Text size="sm" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{l.name}</Text>
                  <Text size="xs" tone="muted" ltr>{t('Hona chahiye')}: {trim(l.expected)} {l.baseUnit}</Text></Row>
                <Text size="xs" tone="muted" ltr>{t('Shuru')} {trim(l.opening)} · {t('Load')} {trim(l.loaded)} · {t('Bika')} {trim(l.sold)} · {t('Wapsi')} {trim(l.returnsIn)} · {t('Kharab')} {trim(l.writtenOff)}</Text>
                <Row gap={2}>
                  <Input containerStyle={{ flex: 1 }} keyboardType="decimal-pad" ltr placeholder={trim(Math.max(0, l.expected))} value={counts[key(l)] ?? ''} accessibilityLabel={t('{{name}} gina', { name: l.name })}
                    onChangeText={(v) => setCounts((p) => ({ ...p, [key(l)]: v.replace(/[^\d.]/g, '') }))} />
                  <Text size="sm" weight="semibold" tone={c !== l.expected ? 'danger' : 'muted'} ltr style={{ alignSelf: 'center', minWidth: 70, textAlign: 'right' }}>{c === l.expected ? '—' : `${c > l.expected ? '+' : ''}${trim(c - l.expected)}`}</Text>
                </Row>
              </View>
            );
          })}
          <Row justify="between"><Text size="sm" tone="muted">{t('Cash expected')}</Text><Amount value={expectedCash} weight="bold" /></Row>
          <MoneyInput label={t('Salesman ne cash diya')} value={handedIn} onChangeValue={setHandedIn} placeholder={String(expectedCash)} />
          {handedIn != null && handedIn !== expectedCash && <Text size="sm" weight="semibold" tone={handedIn < expectedCash ? 'danger' : 'success'}>{handedIn < expectedCash ? t('Kam') : t('Zyada')} {rs(Math.abs(expectedCash - handedIn))}</Text>}
          <Checkbox value={unload} onChange={setUnload} label={t('Bacha maal godown wapas bhejein')} description={t('Transfer van → godown, foran receive')} />
          {canVerify && <Checkbox value={verify} onChange={setVerify} label={t('Aaj ki collections abhi verify karein')} description={t('Khate me payment lag jayegi')} />}
          <Input label={t('Note')} value={note} onChangeText={setNote} placeholder={t('Zaroori nahi')} />
        </View>
      )}
    </Sheet>
  );
}


/**
 * Vehicle companies and their models on one screen (web VehicleMakesPage): the
 * list parts are fitted to and vehicles are picked from. Pakistani companies
 * with their common cars and bikes can be added in one tap; anything missing
 * is added by hand. Nothing is deleted — a company or model is switched off.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Bike, Car, Factory, Pencil, Plus, Power, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { badYears } from '@nafaa/core/industries/autoparts';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, Chip, ChipGroup, EmptyState, Input, ListRow, ListTemplate, Row, Select, Sheet, Switch, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatGrid } from '../../_shared/trade/kit';
import { vehicleMakesApi, vehicleModelsApi, type VehicleMake, type VehicleMakeInput, type VehicleModel, type VehicleModelInput, type VehicleType } from '../api';
import { MAKES_KEY, MODELS_KEY, VEHICLE_TYPES, refreshAuto, vehicleTypeOf } from '../meta';

const BIKES: VehicleType[] = ['MOTORCYCLE', 'SCOOTER', 'RICKSHAW'];

export function VehicleMakesScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('autopartsDesk');
  const canEdit = can(P.PRODUCTS_EDIT);
  const [search, setSearch] = useState('');
  const [showOff, setShowOff] = useState(false);
  const [makeId, setMakeId] = useState('');
  const [makeForm, setMakeForm] = useState<VehicleMake | 'new' | null>(null);
  const [modelForm, setModelForm] = useState<VehicleModel | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const makesQ = useQuery({ queryKey: [MAKES_KEY, 'all'], queryFn: () => vehicleMakesApi.list() });
  const modelsQ = useQuery({ queryKey: [MODELS_KEY, 'all'], queryFn: () => vehicleModelsApi.list() });
  const refresh = () => refreshAuto([MAKES_KEY, MODELS_KEY]);

  const makes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const modelHit = new Set((modelsQ.data ?? []).filter((m) => q && m.name.toLowerCase().includes(q)).map((m) => m.makeId));
    return (makesQ.data ?? []).filter((m) => (showOff || m.isActive) && (!q || m.name.toLowerCase().includes(q) || modelHit.has(m.id)));
  }, [makesQ.data, modelsQ.data, search, showOff]);
  const make = makesQ.data?.find((m) => m.id === makeId) ?? makes[0];
  const models = (modelsQ.data ?? []).filter((m) => m.makeId === make?.id && (showOff || m.isActive))
    .filter((m) => !search.trim() || make?.name.toLowerCase().includes(search.trim().toLowerCase()) || m.name.toLowerCase().includes(search.trim().toLowerCase()));
  const total = { makes: (makesQ.data ?? []).filter((m) => m.isActive).length, models: (modelsQ.data ?? []).filter((m) => m.isActive).length };
  const bikes = (modelsQ.data ?? []).filter((m) => m.isActive && BIKES.includes(m.vehicleType)).length;
  const loading = makesQ.isLoading || modelsQ.isLoading;

  const run = (fn: () => Promise<unknown>, ok: string) => guard(async () => {
    setBusy(true);
    try { await fn(); toast.success(ok); refresh(); } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  });
  const seed = () => guard(async () => {
    setBusy(true);
    try { const r = await vehicleMakesApi.seedPakistani(); toast.success(r.created || r.models ? t('{{created}} company aur {{models}} model daal diye', { created: r.created, models: r.models }) : t('Sab pehle se maujood hain')); refresh(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  });

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: Factory, tone: 'info', label: t('Company'), loading, value: String(total.makes), hint: t('Toyota, Honda, Suzuki…') },
        { icon: Car, tone: 'accent', label: t('Car / jeep model'), loading, value: String(total.models - bikes) },
        { icon: Bike, tone: 'warning', label: t('Bike / rickshaw'), loading, value: String(bikes) },
      ]} />
      <OfflineNote feature="autopartsDesk" />
      <Row gap={2} wrap>
        {canEdit && <Button size="sm" variant="secondary" icon={Sparkles} loading={busy} onPress={seed}>{t('Pakistani list daalein')}</Button>}
        <Switch value={showOff} onChange={setShowOff} label={t('Band bhi dikhayein')} />
      </Row>
      {makes.length > 0 && (
        <ChipGroup value={make?.id ?? ''} onChange={setMakeId} style={{ marginHorizontal: -th.space(4) }}
          options={makes.map((m) => ({ value: m.id, label: `${m.name} · ${(modelsQ.data ?? []).filter((x) => x.makeId === m.id && x.isActive).length}` }))} />
      )}
      {make && (
        <Card title={`${make.name}${make.isActive ? '' : ` ${t('(band)')}`}`} description={t('{{value}}{{count}} model', { value: make.country ? `${make.country} · ` : '', count: models.length })}
          action={canEdit ? <Row gap={1}><Button size="sm" variant="ghost" icon={Pencil} onPress={() => guard(() => setMakeForm(make))}>{t('Badlein')}</Button><Button size="sm" variant="ghost" icon={Power} loading={busy} onPress={() => void run(() => (make.isActive ? vehicleMakesApi.remove(make.id) : vehicleMakesApi.update(make.id, { isActive: true })), make.isActive ? t('{{name}} band — purani gaariyan aur parts waise hi', { name: make.name }) : `${make.name} ${t('chalu')}`)}>{make.isActive ? t('Band') : t('Chalu')}</Button></Row> : undefined}>
          {canEdit ? <Button size="sm" icon={Plus} onPress={() => guard(() => setModelForm('new'))}>{t('Model')}</Button> : null}
        </Card>
      )}
      <MakeSheet make={makeForm === 'new' ? null : makeForm} open={!!makeForm} onClose={() => setMakeForm(null)} onSaved={(m) => setMakeId(m.id)} />
      {make && <ModelSheet makes={(makesQ.data ?? []).filter((m) => m.isActive || m.id === make.id)} makeId={make.id} model={modelForm === 'new' ? null : modelForm} open={!!modelForm} onClose={() => setModelForm(null)} />}
    </View>
  );

  return (
    <ListTemplate<VehicleModel>
      title={t('Company aur model')}
      subtitle={t('Parts kis gaari me lagte hain aur job me gaari chunna — isi list se')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Company ya model — Corolla, CD 70…') }}
      summary={summary}
      data={make ? models : []}
      loading={loading}
      error={makesQ.data ? null : makesQ.error}
      onRetry={() => void makesQ.refetch()}
      refreshing={makesQ.isRefetching}
      onRefresh={() => { void makesQ.refetch(); void modelsQ.refetch(); }}
      keyExtractor={(m) => m.id}
      renderItem={({ item: m }) => (
        <RowCard>
          <ListRow icon={BIKES.includes(m.vehicleType) ? Bike : Car} iconTone={m.isActive ? 'neutral' : 'danger'} title={<Row gap={1.5}><Text weight="semibold">{m.name}</Text>{!m.isActive ? <Badge tone="neutral">{t('Band')}</Badge> : null}</Row>}
            subtitle={`${vehicleTypeOf(m.vehicleType)}${m.yearFrom || m.yearTo ? ` · ${m.yearFrom ?? ''}–${m.yearTo ?? t('ab tak')}` : ''}${m.engineOptions.length ? ` · ${m.engineOptions.join(', ')}` : ''}`}
            trailing={canEdit ? <Row gap={1}><Button size="sm" variant="ghost" icon={Pencil} onPress={() => guard(() => setModelForm(m))}>{t('Badlein')}</Button><Button size="sm" variant="ghost" icon={Power} onPress={() => void run(() => (m.isActive ? vehicleModelsApi.remove(m.id) : vehicleModelsApi.update(m.id, { isActive: true })), m.isActive ? `${m.name} ${t('band')}` : `${m.name} ${t('chalu')}`)}>{m.isActive ? t('Band') : t('Chalu')}</Button></Row> : undefined} />
        </RowCard>
      )}
      empty={!makesQ.data?.length
        ? <EmptyState icon={Factory} title={t('Abhi koi company nahi')} message={t('Ek click me Toyota, Honda, Suzuki, Yamaha… aur un ke aam model daal lein.')} action={canEdit ? <Button icon={Sparkles} loading={busy} onPress={seed}>{t('Pakistani list daalein')}</Button> : undefined} />
        : <EmptyState icon={Car} title={t('Is company ka koi model nahi — “Model” se jorein')} />}
      fab={canEdit ? { icon: Plus, label: t('Company'), onPress: () => guard(() => setMakeForm('new')) } : undefined}
    />
  );
}

function MakeSheet({ make, open, onClose, onSaved }: { make: VehicleMake | null; open: boolean; onClose: () => void; onSaved: (m: VehicleMake) => void }) {
  const th = useTheme();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  useEffect(() => { if (open) { setName(make?.name ?? ''); setCountry(make?.country ?? ''); } }, [open, make]);
  const bad = name.trim().length < 2;
  const save = useMutation({
    mutationFn: (v: VehicleMakeInput) => (make ? vehicleMakesApi.update(make.id, v) : vehicleMakesApi.create(v)),
    onSuccess: (m) => { toast.success(t('{{name}} save ho gayi', { name: m.name })); refreshAuto([MAKES_KEY, MODELS_KEY]); onSaved(m); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Company save nahi hui'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={make ? t('{{name}} badlein', { name: make.name }) : t('Nayi company')} footer={<Button fullWidth size="lg" disabled={bad} loading={save.isPending} onPress={() => save.mutate({ name: name.trim(), country: country.trim() || undefined })}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} placeholder={t('Toyota')} error={name && bad ? t('Kam se kam 2 harf') : undefined} />
        <Input label={t('Mulk')} value={country} onChangeText={setCountry} placeholder={t('Japan')} hint={t('Marzi hai')} />
      </View>
    </Sheet>
  );
}

function ModelSheet({ makes, makeId, model, open, onClose }: { makes: VehicleMake[]; makeId: string; model: VehicleModel | null; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [f, setF] = useState({ makeId, name: '', type: 'CAR' as VehicleType, from: null as number | null, to: null as number | null, engines: '' });
  useEffect(() => { if (open) setF({ makeId: model?.makeId ?? makeId, name: model?.name ?? '', type: model?.vehicleType ?? 'CAR', from: model?.yearFrom ?? null, to: model?.yearTo ?? null, engines: model?.engineOptions.join(', ') ?? '' }); }, [open, model, makeId]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const yearsBad = badYears(f.from, f.to);
  const bad = f.name.trim().length < 1 || yearsBad;
  const save = useMutation({
    mutationFn: (v: VehicleModelInput) => (model ? vehicleModelsApi.update(model.id, v) : vehicleModelsApi.create(v)),
    onSuccess: (m) => { toast.success(t('{{name}} save ho gaya', { name: m.name })); refreshAuto([MAKES_KEY, MODELS_KEY]); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Model save nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={model ? t('{{name}} badlein', { name: model.name }) : t('Naya model')}
      footer={<Button fullWidth size="lg" disabled={bad} loading={save.isPending} onPress={() => save.mutate({ makeId: f.makeId, name: f.name.trim(), vehicleType: f.type, yearFrom: f.from ?? undefined, yearTo: f.to ?? undefined, engineOptions: f.engines.split(',').map((x) => x.trim()).filter(Boolean) })}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Company')} value={f.makeId} searchable onChange={(v) => set({ makeId: v })} options={makes.map((m) => ({ value: m.id, label: m.name }))} />
        <Input label={t('Model')} value={f.name} onChangeText={(v) => set({ name: v })} placeholder={t('Corolla')} />
        <Select label={t('Gaari ki type')} value={f.type} onChange={(v) => set({ type: v as VehicleType })} options={VEHICLE_TYPES.map((x) => ({ value: x, label: vehicleTypeOf(x) }))} />
        <Input label={t('Engine')} value={f.engines} onChangeText={(v) => set({ engines: v })} placeholder={t('1300cc, 1600cc')} hint={t('Comma se alag — marzi hai')} />
        <NumberInput label={t('Saal se')} integer value={f.from} onChangeValue={(v) => set({ from: v })} placeholder="2014" />
        <NumberInput label={t('Saal tak')} integer value={f.to} onChangeValue={(v) => set({ to: v })} placeholder={t('Ab tak')} error={yearsBad ? t('“Se” se kam hai') : undefined} />
      </View>
    </Sheet>
  );
}

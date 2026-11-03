/**
 * Cold chain log (web TemperatureLogPage): fridge and store temperature
 * readings, written twice a day. A reading outside the limits is a breach;
 * insulin and vaccines from a fridge that broke the 2–8°C range should be
 * checked before selling. Any staff member can write a reading. Needs the
 * server.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Thermometer } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { outOfRange } from '@nafaa/core/industries/pharmacy';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, Card, ChipGroup, EmptyState, Input, ListRow, ListTemplate, Row, Sheet, StatTile, Text, toast, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { temperatureApi, type TemperatureLog } from '../api';
import { DASH_KEY, TEMP_KEY, TEMP_PRESETS } from '../meta';

const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
const clean = (v: string) => v.replace(/[^\d.-]/g, '');

function ReadingSheet({ open, places, onClose }: { open: boolean; places: string[]; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const all = [...new Set([...places, ...TEMP_PRESETS.map((p) => p.location)])];
  const [location, setLocation] = useState(all[0] ?? 'Fridge 1');
  const preset = TEMP_PRESETS.find((p) => p.location === location);
  const [temp, setTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [min, setMin] = useState(String(preset?.min ?? 2));
  const [max, setMax] = useState(String(preset?.max ?? 8));
  const [notes, setNotes] = useState('');
  const pick = (l: string) => { setLocation(l); const p = TEMP_PRESETS.find((x) => x.location === l); if (p) { setMin(String(p.min)); setMax(String(p.max)); } };
  const tv = num(temp);
  const out = outOfRange(tv, min === '' ? null : Number(min), max === '' ? null : Number(max));
  const save = useMutation({
    mutationFn: () => temperatureApi.create({
      location: location.trim(), temperature: tv, humidity: humidity ? Number(humidity) : undefined,
      minLimit: min === '' ? undefined : Number(min), maxLimit: max === '' ? undefined : Number(max), notes: notes.trim() || undefined,
    }),
    onSuccess: (r) => {
      if (r.isWithinRange) toast.success(t('Reading likh di')); else toast.error(t('Temperature had se bahar — dawai check karein'));
      setTemp(''); setHumidity(''); setNotes('');
      void qc.invalidateQueries({ queryKey: [TEMP_KEY] }); void qc.invalidateQueries({ queryKey: [DASH_KEY] });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const submit = () => {
    if (!location.trim()) { toast.error(t('Jagah likhein')); return; }
    if (!Number.isFinite(tv) || tv < -80 || tv > 80) { toast.error(t('Temperature -80 se 80 ke darmiyan likhein')); return; }
    if (min !== '' && max !== '' && Number(min) > Number(max)) { toast.error(t('Kam se kam had zyada wali se bari hai')); return; }
    save.mutate();
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.88} title={t('Nayi reading')} description={t('Subah aur shaam — dono waqt likhein')}
      footer={<Button fullWidth variant={out ? 'danger' : 'primary'} loading={save.isPending} onPress={submit}>{t('Reading save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup wrap value={location} onChange={pick} options={all.map((l) => ({ value: l, label: l }))} />
        <Input label={t('Jagah')} value={location} onChangeText={setLocation} />
        <Input label={t('Temperature °C')} value={temp} onChangeText={(v) => setTemp(clean(v))} keyboardType="numbers-and-punctuation" ltr autoFocus
          error={out ? t('Had {{min}}–{{max}}°C se bahar', { min, max }) : undefined} />
        <Input label={t('Nami %')} value={humidity} onChangeText={(v) => setHumidity(clean(v))} keyboardType="decimal-pad" ltr />
        <Row gap={2}>
          <View style={{ flex: 1 }}><Input label={t('Kam se kam')} value={min} onChangeText={(v) => setMin(clean(v))} keyboardType="numbers-and-punctuation" ltr /></View>
          <View style={{ flex: 1 }}><Input label={t('Zyada se zyada')} value={max} onChangeText={(v) => setMax(clean(v))} keyboardType="numbers-and-punctuation" ltr /></View>
        </Row>
        <Input label={t('Note')} value={notes} onChangeText={setNotes} placeholder={t('Bijli gayi thi, fridge ka darwaza khula tha…')} />
      </View>
    </Sheet>
  );
}

export function TemperatureLogScreen() {
  const th = useTheme();
  const { guard } = useDeskOnline('pharmacyDesk');
  const [tab, setTab] = useState<'all' | 'breach'>('all');
  const [place, setPlace] = useState('');
  const [add, setAdd] = useState(false);
  const rec = usePeriod('week');
  const range = rec.period.from === 'all' ? {} : { from: rec.period.from, to: rec.period.to };
  const sum = useQuery({ queryKey: [TEMP_KEY, 'summary'], queryFn: () => temperatureApi.summary(7) });
  const logs = useQuery({ queryKey: [TEMP_KEY, 'list', rec.period.from, rec.period.to], queryFn: () => temperatureApi.list(range) });
  const places = useMemo(() => [...new Set([...(sum.data?.byLocation.map((b) => b.location) ?? []), ...(logs.data ?? []).map((l) => l.location ?? '').filter(Boolean)])], [sum.data, logs.data]);
  const items = (logs.data ?? []).filter((l) => (tab === 'all' || !l.isWithinRange) && (!place || l.location === place))
    .sort((a, b) => b.logDate.localeCompare(a.logDate));
  const s = sum.data;

  return (
    <>
      <ListTemplate<TemperatureLog>
        title={t('Cold chain')}
        grouped={false}
        summary={
          <View style={{ gap: th.space(3) }}>
            <Row gap={2}>
              <StatTile style={{ flex: 1 }} icon={Thermometer} tone={s?.breaches ? 'danger' : 'success'} label={t('Had se bahar')} loading={!s} value={String(s?.breaches ?? 0)} hint={t('Pichle 7 din')} />
              <StatTile style={{ flex: 1 }} label={t('Theek reading')} loading={!s} value={s ? `${Math.round(s.compliancePct)}%` : ''} hint={t('{{count}} readings', { count: s?.total ?? 0 })} tone="info" />
            </Row>
            {s?.byLocation?.length ? (
              <Card flush title={t('Har jagah ka hisaab')}>
                {s.byLocation.map((b, i) => (
                  <ListRow key={b.location} dense divider={i < s.byLocation.length - 1} title={b.location}
                    subtitle={`${t('Kam')} ${b._min.temperature ?? '—'} · ${t('Zyada')} ${b._max.temperature ?? '—'}`}
                    trailing={<Text weight="bold" ltr>{b._avg.temperature != null ? `${Number(b._avg.temperature).toFixed(1)}°C` : '—'}</Text>} onPress={() => setPlace(place === b.location ? '' : b.location)} />
                ))}
              </Card>
            ) : null}
            <ChipGroup value={rec.preset} onChange={(v) => rec.setPreset(v as typeof rec.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />
            <ChipGroup value={tab} onChange={setTab} options={[{ value: 'all', label: t('Sab') }, { value: 'breach', label: t('Had se bahar') }]} />
            {place ? <ChipGroup value={place} onChange={() => setPlace('')} options={[{ value: place, label: `${place} ✕` }]} /> : null}
            <OfflineNote feature="pharmacyDesk" />
            <CachedNote query={logs} />
          </View>
        }
        data={items}
        loading={logs.isLoading}
        error={!logs.data ? logs.error : undefined}
        onRetry={() => void logs.refetch()}
        refreshing={logs.isRefetching}
        onRefresh={() => { void logs.refetch(); void sum.refetch(); }}
        keyExtractor={(l) => l.id}
        renderItem={({ item: l }) => (
          <ListRow icon={Thermometer} iconTone={l.isWithinRange ? 'success' : 'danger'} title={l.location || t('Jagah')}
            subtitle={[formatDateTime(l.logDate), l.minLimit != null || l.maxLimit != null ? `${l.minLimit ?? '—'}–${l.maxLimit ?? '—'}°C` : '', l.notes].filter(Boolean).join(' · ')}
            trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" tone={l.isWithinRange ? 'default' : 'danger'} ltr>{`${l.temperature}°C`}</Text>{!l.isWithinRange ? <Badge tone="danger">{t('Had se bahar')}</Badge> : null}{l.humidity != null ? <Text size="2xs" tone="muted" ltr>{`${l.humidity}%`}</Text> : null}</View>} />
        )}
        empty={<EmptyState icon={Thermometer} title={tab === 'breach' ? t('Koi reading had se bahar nahi') : t('Abhi koi reading nahi')} message={t('Subah aur shaam fridge ka temperature likhein.')} />}
        fab={{ icon: Plus, label: t('Nayi reading'), onPress: () => guard(() => setAdd(true)) }}
      />
      <ReadingSheet open={add} places={places} onClose={() => setAdd(false)} />
    </>
  );
}

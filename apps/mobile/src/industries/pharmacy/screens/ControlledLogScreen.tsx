/**
 * Narcotic / controlled register (web ControlledLogPage): every register
 * medicine with stock now, what came in and went out in the period, and sales
 * that still lack the patient or doctor. Opening a medicine shows its register
 * line by line (opening and closing balance, bill, patient, doctor) which can
 * be shared for an inspector; a missing name can be filled in from here.
 * Needs the server.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, PackageMinus, PackagePlus, Share2, ShieldAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import { cnicOk, drName, formatCnic } from '@nafaa/core/industries/pharmacy';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, EmptyState, Input, ListRow, ListTemplate, Row, Sheet, StatTile, Switch, Text, toast, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod, type Period } from '@/modules/sales/lib/period';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { controlledLogApi, type NarcoticOverviewRow, type NarcoticRegister, type RegisterRow } from '../api';
import { REGISTER_KEY, SCHEDULE_META, fmtNum, scheduleLabel } from '../meta';

const range = (p: Period) => (p.from === 'all' ? undefined : { from: p.from, to: p.to });

function registerText(r: NarcoticRegister, label: string): string {
  const head = `${t('Register — {{name}}', { name: r.medicine.name })}\n${label}\n${t('Shuru')}: ${fmtNum(r.opening)} · ${t('Aaya')}: ${fmtNum(r.inQty)} · ${t('Gaya')}: ${fmtNum(r.outQty)} · ${t('Aakhir')}: ${fmtNum(r.closing)} ${r.medicine.unit}\n`;
  const rows = r.rows.map((x) => [`#${x.no}`, formatDateTime(x.at), `${x.label}${x.reference ? ` ${x.reference}` : ''}`,
    x.party ? [x.party.patientName, x.party.patientCnic, drName(x.party.doctorName), x.party.doctorRegNumber].filter(Boolean).join(' / ') : '',
    x.inQty ? `+${fmtNum(x.inQty)}` : '', x.outQty ? `-${fmtNum(x.outQty)}` : '', `= ${fmtNum(x.closing)}`].filter(Boolean).join(' | '));
  return `${head}\n${rows.join('\n')}`;
}

function DetailsSheet({ row, productId, onClose }: { row: RegisterRow | null; productId: string; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const p = row?.party ?? {};
  const [d, setD] = useState({ patientName: '', patientCnic: '', patientPhone: '', doctorName: '', doctorRegNumber: '', prescriptionNumber: '' });
  const [seed, setSeed] = useState<string | null>(null);
  if (row && seed !== row.id) {
    setSeed(row.id);
    setD({ patientName: p.patientName ?? '', patientCnic: p.patientCnic ?? '', patientPhone: p.patientPhone ?? '', doctorName: p.doctorName ?? '', doctorRegNumber: p.doctorRegNumber ?? '', prescriptionNumber: p.prescriptionNumber ?? '' });
  }
  const [tried, setTried] = useState(false);
  const errors = {
    patientName: d.patientName.trim().length < 2 ? t('Mareez ka naam likhein') : undefined,
    doctorName: d.doctorName.trim().length < 2 ? t('Doctor ka naam likhein') : undefined,
    patientCnic: !cnicOk(d.patientCnic) ? t('CNIC 13 hindsay ka hota hai') : undefined,
  };
  const save = useMutation({
    mutationFn: () => controlledLogApi.saleDetails({
      saleId: row!.saleId!, productId, patientName: d.patientName.trim(), doctorName: d.doctorName.trim(),
      patientCnic: d.patientCnic.trim() || undefined, patientPhone: d.patientPhone.trim() || undefined,
      doctorRegNumber: d.doctorRegNumber.trim() || undefined, prescriptionNumber: d.prescriptionNumber.trim() || undefined,
    }),
    onSuccess: () => { toast.success(t('Register me likh diya')); void qc.invalidateQueries({ queryKey: [REGISTER_KEY] }); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const set = (k: keyof typeof d, v: string) => setD((x) => ({ ...x, [k]: v }));
  return (
    <Sheet open={!!row} onClose={onClose} height={0.9} title={t('Bill {{value}} — mareez aur doctor', { value: row?.reference ?? '' })}
      footer={<Button fullWidth loading={save.isPending} onPress={() => { setTried(true); if (Object.values(errors).some(Boolean)) return; save.mutate(); }}>{t('Register me likhein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Mareez ka naam')} value={d.patientName} onChangeText={(v) => set('patientName', v)} error={tried ? errors.patientName : undefined} />
        <Input label={t('CNIC')} value={d.patientCnic} onChangeText={(v) => set('patientCnic', formatCnic(v))} keyboardType="number-pad" ltr error={tried ? errors.patientCnic : undefined} />
        <Input label={t('Phone')} value={d.patientPhone} onChangeText={(v) => set('patientPhone', v)} keyboardType="phone-pad" ltr />
        <Input label={t('Nuskha number')} value={d.prescriptionNumber} onChangeText={(v) => set('prescriptionNumber', v)} ltr />
        <Input label={t('Doctor ka naam')} value={d.doctorName} onChangeText={(v) => set('doctorName', v)} error={tried ? errors.doctorName : undefined} />
        <Input label={t('PMDC')} value={d.doctorRegNumber} onChangeText={(v) => set('doctorRegNumber', v)} ltr />
      </View>
    </Sheet>
  );
}

function RegisterView({ productId, rec, onBack }: { productId: string; rec: ReturnType<typeof usePeriod>; onBack: () => void }) {
  const { period, label } = rec;
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('pharmacyDesk');
  const [fill, setFill] = useState<RegisterRow | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const q = useQuery({ queryKey: [REGISTER_KEY, productId, period.from, period.to], queryFn: () => controlledLogApi.register(productId, range(period)) });
  const r = q.data;
  const rows = r ? (onlyMissing ? r.rows.filter((x) => x.missing) : r.rows) : [];
  const meta = r ? SCHEDULE_META[r.medicine.scheduleClass] : undefined;
  return (
    <>
      <ListTemplate<RegisterRow>
        title={r?.medicine.name ?? t('Register')}
        subtitle={r ? [r.medicine.dosageForm, r.medicine.registrationNumber && `DRAP ${r.medicine.registrationNumber}`].filter(Boolean).join(' · ') : undefined}
        actions={r ? <Button size="sm" variant="ghost" icon={Share2} onPress={() => void Share.share({ message: registerText(r, label) })}>{t('Share')}</Button> : undefined}
        grouped={false}
        onBack={onBack}
        summary={
          <View style={{ gap: th.space(2) }}>
            <ChipGroup value={rec.preset} onChange={(v) => rec.setPreset(v as typeof rec.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
            <Row gap={2}>
              <StatTile style={{ flex: 1 }} label={t('Shuru me')} loading={!r} value={r ? `${fmtNum(r.opening)}` : ''} hint={r?.medicine.unit} />
              <StatTile style={{ flex: 1 }} icon={PackagePlus} tone="success" label={t('Aaya')} loading={!r} value={r ? fmtNum(r.inQty) : ''} />
              <StatTile style={{ flex: 1 }} icon={PackageMinus} tone="danger" label={t('Gaya')} loading={!r} value={r ? fmtNum(r.outQty) : ''} />
            </Row>
            <Row gap={2}>
              <StatTile style={{ flex: 1 }} label={t('Aakhir me')} loading={!r} value={r ? fmtNum(r.closing) : ''} hint={meta ? scheduleLabel(r!.medicine.scheduleClass) : undefined} />
              <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone={r?.missing ? 'warning' : 'neutral'} label={t('Naam baqi')} loading={!r} value={r ? String(r.missing) : ''} onPress={() => setOnlyMissing((v) => !v)} />
            </Row>
            <Switch value={onlyMissing} onChange={setOnlyMissing} label={t('Sirf naam baqi wali')} />
            <CachedNote query={q} />
          </View>
        }
        data={rows}
        loading={q.isLoading}
        error={!r ? q.error : undefined}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(x) => x.id}
        renderItem={({ item: x }) => {
          const party = x.party && (x.party.patientName || x.party.doctorName) ? x.party : null;
          return (
            <ListRow overline={`#${x.no} · ${formatDateTime(x.at)}`}
              title={`${x.label}${x.reference ? ` ${x.reference}` : ''}${x.saleVoided ? ` · ${t('void')}` : ''}`}
              subtitle={party ? `${party.patientName ?? '—'}${party.patientCnic ? ` (${party.patientCnic})` : ''} · ${drName(party.doctorName) || t('doctor nahi')}${party.doctorRegNumber ? ` ${party.doctorRegNumber}` : ''}` : x.saleId ? t('Naam nahi likha') : undefined}
              trailing={<View style={{ alignItems: 'flex-end' }}>
                <Text weight="bold" tone={x.outQty ? 'danger' : 'success'} ltr>{x.inQty ? `+${fmtNum(x.inQty)}` : x.outQty ? `-${fmtNum(x.outQty)}` : '0'}</Text>
                <Text size="2xs" tone="muted" ltr>{`= ${fmtNum(x.closing)}`}</Text>
                {x.missing ? <Badge tone="warning">{t('Naam baqi')}</Badge> : null}
              </View>}
              onPress={x.saleId && !x.saleVoided && can(P.POS_USE) ? () => guard(() => setFill(x)) : undefined}
              chevron={!!x.saleId && !x.saleVoided && can(P.POS_USE)} />
          );
        }}
        empty={<EmptyState icon={ShieldAlert} title={onlyMissing ? t('Sab sales me naam likhe hain') : t('Is muddat me koi entry nahi')} />}
      />
      <DetailsSheet row={fill} productId={productId} onClose={() => setFill(null)} />
    </>
  );
}

export function ControlledLogScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ product?: string }>();
  const rec = usePeriod('month');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(params.product ?? null);
  const q = useQuery({ queryKey: [REGISTER_KEY, 'overview', rec.period.from, rec.period.to], queryFn: () => controlledLogApi.overview(range(rec.period)) });
  const needle = search.trim().toLowerCase();
  const items = useMemo(() => (q.data?.items ?? []).filter((i) => !needle || i.name.toLowerCase().includes(needle)), [q.data, needle]);
  const totals = q.data?.totals;

  if (open) return <RegisterView productId={open} rec={rec} onBack={() => (params.product ? router.back() : setOpen(null))} />;

  return (
    <ListTemplate<NarcoticOverviewRow>
      title={t('Narcotic register')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Dawai ka naam…') }}
      summary={
        <View style={{ gap: th.space(2) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={ShieldAlert} tone="danger" label={t('Register wali')} loading={!totals} value={String(totals?.medicines ?? 0)} />
            <StatTile style={{ flex: 1 }} label={t('Sales')} loading={!totals} value={String(totals?.sales ?? 0)} hint={t('{{value}} gaya', { value: fmtNum(totals?.out ?? 0) })} />
            <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone={totals?.missing ? 'warning' : 'neutral'} label={t('Naam baqi')} loading={!totals} value={String(totals?.missing ?? 0)} />
          </Row>
          <ChipGroup value={rec.preset} onChange={(v) => rec.setPreset(v as typeof rec.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
          <OfflineNote feature="pharmacyDesk" />
          <CachedNote query={q} />
        </View>
      }
      data={items}
      loading={q.isLoading}
      error={!q.data ? q.error : undefined}
      onRetry={() => void q.refetch()}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      keyExtractor={(i) => i.productId}
      renderItem={({ item: i }) => (
        <ListRow icon={ShieldAlert} iconTone="danger" title={i.name} subtitle={[scheduleLabel(i.scheduleClass), i.dosageForm].filter(Boolean).join(' · ')}
          overline={`${t('Aaya')} ${fmtNum(i.inQty)} · ${t('Gaya')} ${fmtNum(i.outQty)}`}
          trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{`${fmtNum(i.stock)} ${i.unit}`}</Text>{i.missing ? <Badge tone="warning">{t('{{count}} naam baqi', { count: i.missing })}</Badge> : null}</View>}
          chevron onPress={() => setOpen(i.productId)} />
      )}
      empty={<EmptyState icon={ShieldAlert} title={t('Koi register wali dawai nahi')} message={t('Dawai ko Narcotic ya Controlled schedule dein — phir yahan register banega.')} />}
    />
  );
}

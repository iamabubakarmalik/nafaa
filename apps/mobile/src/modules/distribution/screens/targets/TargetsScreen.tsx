/**
 * Targets: monthly targets per booker, route, brand or principal (any mix;
 * none = the whole business), by value or quantity, with what is achieved so
 * far, whether it is on pace and what is needed per day. Achievement is
 * invoiced value less goods that came back. Commission is paid from HR.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Target, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Button, confirm, EmptyState, IconButton, Input, ListTemplate, ProgressBar, Row, Segmented, Select, Sheet, StatTile, StatusPill, SwipeRow, Text, toast, useTheme,
} from '@/design';
import { DIST_KEY, distributionApi } from '../../api/distribution.api';
import { phase2Api, type SaveTarget, type TargetMetric, type TargetRow } from '../../api/phase2.api';
import { useTeam } from '../../api/setup-lookups';
import { DistributionGate } from '../../components/DistributionGate';
import { CachedNote } from '../../components/parts';
import { rs, trim } from '../../lib/meta';
import { digits } from '../../lib/setup';

const KEY = [DIST_KEY, 'targets'] as const;

function shiftMonth(period: string, by: number) {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const monthLabel = (p: string) => { const [y, m] = p.split('-').map(Number); return formatDate(new Date(Date.UTC(y, m - 1, 15, 7)), { year: true }).replace(/^\d+\s/, ''); };

export function TargetsScreen() {
  return <DistributionGate title={t('Targets')}><Body /></DistributionGate>;
}

function Body() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_TARGETS_MANAGE);
  const [period, setPeriod] = useState<string | undefined>();
  const q = useQuery({ queryKey: [...KEY, period ?? 'now'], queryFn: () => phase2Api.targets({ period }) });
  const shown = q.data?.period ?? period;
  const [edit, setEdit] = useState<TargetRow | 'new' | null>(null);
  const rows = q.data?.targets ?? [];
  const onTrack = rows.filter((x) => x.onTrack).length;
  const fmt = (x: TargetRow, n: number) => (x.metric === 'VALUE' ? rs(n) : `${trim(n)} ${x.unitName || 'pcs'}`);

  const del = useMutation({
    mutationFn: (id: string) => phase2Api.deleteTarget(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY }); toast.success(t('Target hata diya')); },
  });
  const copy = useMutation({
    mutationFn: () => phase2Api.copyTargets(shiftMonth(shown!, -1), shown!),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: KEY }); toast.success(r.copied ? t('{{copied}} target copy hue', { copied: r.copied }) : t('Copy karne ko kuch nahi (pichle mahine koi naya target nahi)')); },
  });
  const ask = async (x: TargetRow) => {
    if (await confirm({ title: t('Delete this target?'), confirmLabel: t('Delete'), tone: 'danger' })) del.mutate(x.id);
  };

  return (
    <>
      <ListTemplate<TargetRow>
        title={t('Targets')}
        subtitle={shown ? monthLabel(shown) : undefined}
        actions={canManage ? <IconButton icon={Copy} label={t('Copy last month')} disabled={!shown || copy.isPending} onPress={() => copy.mutate()} /> : undefined}
        summary={(
          <View style={{ gap: th.space(3) }}>
            <Row gap={2}>
              <IconButton icon={ChevronLeft} flip label={t('Pichla mahina')} onPress={() => shown && setPeriod(shiftMonth(shown, -1))} />
              <Text weight="semibold" style={{ flex: 1 }} align="center">{shown ? monthLabel(shown) : t('Is mahine')}</Text>
              <IconButton icon={ChevronRight} flip label={t('Agla mahina')} onPress={() => shown && setPeriod(shiftMonth(shown, 1))} />
            </Row>
            {q.data && (
              <Row gap={2}>
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Mahina guzra')} value={`${Math.round(q.data.pace)}%`} hint={t('{{daysLeft}} din baqi', { daysLeft: q.data.daysLeft })} />
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={onTrack === rows.length ? 'success' : 'warning'} label={t('Raftar par')} value={`${onTrack}/${rows.length}`} />
              </Row>
            )}
            <CachedNote query={q} />
          </View>
        )}
        data={rows}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        refreshing={q.isRefetching}
        onRefresh={q.refetch}
        keyExtractor={(x) => x.id}
        grouped={false}
        renderItem={({ item: x }) => {
          const tone = x.pct >= 100 ? 'success' : x.onTrack ? 'info' : 'warning';
          const card = (
            <View style={{ marginBottom: th.space(2), padding: th.space(4), gap: th.space(2), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border }}>
              <Row gap={2} align="start">
                <View style={{ flex: 1 }}>
                  <Text weight="semibold" numberOfLines={1}>{x.label}</Text>
                  <Text size="xs" tone="muted">{x.metric === 'VALUE' ? t('Rupay (sale)') : t('Quantity{{value}}', { value: x.unitName ? ` · ${x.unitName}` : '' })}{x.note ? ` · ${x.note}` : ''}</Text>
                </View>
                <StatusPill tone={tone}>{x.pct >= 100 ? t('Poora') : x.onTrack ? t('Raftar par') : t('Peeche')}</StatusPill>
              </Row>
              <Row gap={2} justify="between" align="baseline">
                <Text size="xl" weight="bold" tabular ltr>{fmt(x, x.achieved)}</Text>
                <Text size="sm" tone="muted">{t('target {{t}} ·', { t: fmt(x, x.target) })} <Text size="sm" weight="bold">{Math.round(x.pct)}%</Text></Text>
              </Row>
              <ProgressBar value={Math.min(1, x.pct / 100)} />
              <Row gap={2} justify="between">
                <Mini k={t('Ab tak chahiye')} v={fmt(x, x.expectedByNow)} />
                <Mini k={t('Baqi')} v={fmt(x, x.remaining)} />
                <Mini k={t('Roz chahiye')} v={fmt(x, x.perDayNeeded)} />
              </Row>
            </View>
          );
          return canManage ? (
            <SwipeRow end={[
              { icon: Pencil, label: t('Badlein'), tone: 'brand', onPress: () => setEdit(x) },
              { icon: Trash2, label: t('Hatayein'), tone: 'danger', onPress: () => ask(x) },
            ]}>{card}</SwipeRow>
          ) : card;
        }}
        empty={<EmptyState icon={Target} title={t('{{value}} ka koi target nahi. Misal: Booker Ali — Rs 5,00,000, ya Brand Dalda — 300 Carton.', { value: shown ? monthLabel(shown) : t('Is mahine') })}
          action={canManage ? <Button icon={Plus} onPress={() => setEdit('new')}>{t('New target')}</Button> : undefined} />}
        fab={canManage ? { icon: Plus, label: t('New target'), onPress: () => setEdit('new') } : undefined}
      />
      {edit && shown && <TargetSheet target={edit === 'new' ? null : edit} period={shown} onClose={() => setEdit(null)} />}
    </>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text size="2xs" tone="muted" numberOfLines={1}>{k}</Text>
      <Text size="xs" weight="semibold" tabular ltr numberOfLines={1}>{v}</Text>
    </View>
  );
}

function TargetSheet({ target, period, onClose }: { target: TargetRow | null; period: string; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const teamQ = useTeam();
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const principalsQ = useQuery({ queryKey: [DIST_KEY, 'principals'], queryFn: phase2Api.principals, staleTime: 5 * 60_000, retry: false });
  const [form, setForm] = useState<SaveTarget>({
    period: target?.period ?? period, userId: target?.userId ?? '', routeId: target?.routeId ?? '', brandId: target?.brandId ?? '',
    supplierId: target?.supplierId ?? '', metric: target?.metric ?? 'VALUE', target: target?.target ?? 0, unitName: target?.unitName ?? '', note: target?.note ?? '',
  });
  const [amount, setAmount] = useState(target?.target ? String(target.target) : '');
  const set = <K extends keyof SaveTarget>(k: K, v: SaveTarget[K]) => setForm((f) => ({ ...f, [k]: v }));
  const team = useMemo(() => (teamQ.data ?? []).filter((u) => u.isActive), [teamQ.data]);
  const principals = (principalsQ.data?.suppliers ?? []).filter((s) => s.isPrincipal || s.id === form.supplierId);
  const any = { value: '', label: t('Koi bhi') };
  const n = Number(amount) || 0;

  const save = useMutation({
    mutationFn: () => {
      const body: SaveTarget = {
        ...form, userId: form.userId || null, routeId: form.routeId || null, brandId: form.brandId || null, supplierId: form.supplierId || null,
        unitName: form.metric === 'QTY' ? form.unitName?.trim() || null : null, target: n, note: form.note?.trim() || undefined,
      };
      return target ? phase2Api.updateTarget(target.id, body) : phase2Api.createTarget(body);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY }); toast.success(t('Target save ho gaya')); onClose(); },
  });

  return (
    <Sheet open onClose={onClose} height={0.92} title={target ? t('Edit target') : t('New target')}
      description={t('Jo cheezein chunein sab milni chahiye — kuch na chunein to poore business ka target')}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Cancel')}</Button>
        <Button style={{ flex: 1.4 }} loading={save.isPending} disabled={!(n > 0)} onPress={() => save.mutate()}>{t('Save')}</Button>
      </Row>}>
      <View style={{ gap: th.space(4) }}>
        <Segmented value={form.metric} onChange={(v) => set('metric', v as TargetMetric)} options={[{ value: 'VALUE', label: t('Rupay') }, { value: 'QTY', label: t('Quantity') }]} />
        <Input ltr label={form.metric === 'VALUE' ? t('Target (Rs)') : t('Target (quantity)')} value={amount} onChangeText={(v) => setAmount(digits(v))} keyboardType="decimal-pad" />
        {form.metric === 'QTY' && <Input label={t('Pack (marzi se)')} value={form.unitName ?? ''} onChangeText={(v) => set('unitName', v)} placeholder={t('Carton')} hint={t('Pack ka naam jaisa items par hai; khali = pcs')} />}
        <Select label={t('Booker')} value={form.userId ?? ''} onChange={(v) => set('userId', v)} options={[any, ...team.map((u) => ({ value: u.id, label: u.fullName }))]} />
        <Select label={t('Route')} value={form.routeId ?? ''} onChange={(v) => set('routeId', v)} options={[any, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name }))]} />
        <Select label={t('Brand')} value={form.brandId ?? ''} onChange={(v) => set('brandId', v)} searchable options={[any, ...(principalsQ.data?.brands ?? []).map((b) => ({ value: b.id, label: b.name }))]} />
        <Select label={t('Principal (company)')} value={form.supplierId ?? ''} onChange={(v) => set('supplierId', v)} options={[any, ...principals.map((s) => ({ value: s.id, label: s.name }))]}
          hint={principalsQ.data && !principals.length ? t('Pehle Claims → Principals me brands company se jodein') : undefined} />
        <Input label={t('Note')} value={form.note ?? ''} onChangeText={(v) => set('note', v)} maxLength={200} />
      </View>
    </Sheet>
  );
}

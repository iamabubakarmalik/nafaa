/**
 * Counter pieces of the auto parts pack (web pos/JobHandover, pos/CoreTakeBack):
 * finished vehicles handed back from the counter (take what is left, close the
 * job, post its bill) and the old part a customer gives back. Rendered by the
 * shared counter through PosIndustryConfig.Overlay, CartExtra and extraView.
 */

import { useQuery } from '@tanstack/react-query';
import { Recycle, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { create } from 'zustand';
import { jobDue } from '@nafaa/core/industries/autoparts';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Badge, Button, EmptyState, List, ListRow, Row, Text, toast, useTheme } from '@/design';
import { sendSlip } from '../../_shared/trade/slip';
import { workshopJobsApi, type DeliverInput, type WorkshopJob } from '../api';
import { JOB_KEY, REMINDER_KEY, VEHICLE_KEY, refreshAuto, statusOf, vehicleName } from '../meta';
import { jobCard } from '../slip';
import { AddCoreSheet } from './CoreSheet';
import { DeliverSheet } from './JobSheets';

const useHandover = create<{ jobId: string | null }>(() => ({ jobId: null }));
export const openHandover = (jobId: string) => useHandover.setState({ jobId });
const closeHandover = () => useHandover.setState({ jobId: null });

function HandoverSheet() {
  const jobId = useHandover((s) => s.jobId);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Shop';
  const lang = useBillLanguage();
  const [busy, setBusy] = useState(false);
  // The full job carries old parts already taken with it.
  const detail = useQuery({ queryKey: [JOB_KEY, 'one', jobId], queryFn: () => workshopJobsApi.getOne(jobId!), enabled: !!jobId, staleTime: 10_000 });
  const confirm = async (v: DeliverInput) => {
    if (!jobId || busy) return;
    setBusy(true);
    try {
      const r = await workshopJobsApi.deliver(jobId, v);
      toast.success(r.sale ? t('{{jobNumber}} — gaari de di, bill {{saleNumber}}', { jobNumber: r.jobNumber, saleNumber: r.sale.saleNumber }) : t('{{jobNumber}} — gaari de di', { jobNumber: r.jobNumber }));
      refreshAuto([JOB_KEY, VEHICLE_KEY, REMINDER_KEY], { money: true });
      void sendSlip(jobCard(r, lang), shopName, lang).catch(() => undefined);
      closeHandover();
    } catch (e) { toast.error(apiErrorMessage(e, t('Gaari wapas nahi hui'))); } finally { setBusy(false); }
  };
  return <DeliverSheet job={detail.data ?? null} open={!!jobId && !!detail.data} pending={busy} onClose={closeHandover} onConfirm={(v) => void confirm(v)} />;
}

/** Counter overlay: the hand-over sheet. */
export function AutoPartsOverlay() {
  return <HandoverSheet />;
}

/** Counter tab: finished vehicles waiting to go back, priced at what is still due. */
export function ReadyJobsView({ padBottom }: { padBottom: number }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const can = usePermission();
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const canHandOver = can(P.SERVICE_JOBS_MANAGE);
  const q = useQuery({ queryKey: [JOB_KEY, 'handover', shopId], queryFn: () => workshopJobsApi.page({ view: 'ready', shopId, limit: 200 }), enabled: canHandOver, staleTime: 15_000 });
  const items = q.data?.items ?? [];
  const go = (j: WorkshopJob) => {
    if (!online) { toast.error(t('Internet nahi — gaari wapas dena sirf online hota hai. Parts offline bik sakte hain.')); return; }
    openHandover(j.id);
  };
  return (
    <List<WorkshopJob>
      data={items} loading={q.isLoading} onRefresh={() => void q.refetch()} refreshing={q.isRefetching} keyExtractor={(j) => j.id}
      contentContainerStyle={{ paddingBottom: padBottom }}
      empty={<EmptyState icon={Wrench} title={t('Koi gaari dene ke liye tayyar nahi')} />}
      renderItem={({ item: j }) => {
        const due = jobDue(j);
        return (
          <ListRow icon={Wrench} iconTone="success" title={<Text weight="semibold" numberOfLines={1}>{`${[j.registrationNumber, j.makeName, j.modelName].filter(Boolean).join(' ') || j.jobNumber}${j.customerName ? ` — ${j.customerName}` : ''}`}</Text>}
            subtitle={`${j.jobNumber} · ${due > 0 ? t('baqi {{due}}', { due: formatMoney(due) }) : t('kuch baqi nahi')}`}
            trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={due} weight="bold" /><Badge tone="success">{t(statusOf(j.status).label)}</Badge></View>}
            chevron onPress={() => go(j)} />
        );
      }}
    />
  );
}

/** Cart notice: record an old part the customer hands back. */
export function CoreTakeBack() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" icon={Recycle} onPress={() => setOpen(true)}>{t('Purana part liya')}</Button>
      <AddCoreSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

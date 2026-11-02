/**
 * One service from the rate list: its charges, time and warranty, how
 * often it is done and what it earned, and its latest jobs.
 *
 * Keys: E edit · J new job · Esc back.
 */

import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, Clock, Pencil, ShieldCheck, Tag } from 'lucide-react';
import { Button, Card, PageHero, PageShell, Skeleton, TBody, THead, Table, Td, Th, Tr, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { catalogApi } from '../api/catalog.api';
import { CATALOG_KEY, categoryOf, dayOnly, statusOf, tradeOf } from '../components/meta';
import { t } from '@core/i18n';

export default function ServicesBizServiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { sales } = useMasked();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canJob = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const q = useQuery({ queryKey: [CATALOG_KEY, 'one', id], queryFn: () => catalogApi.getOne(id), enabled: !!id });
  const s = q.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key.toLowerCase() === 'e' && canEdit) navigate(`/services-biz-services/${id}/edit`);
      if (e.key.toLowerCase() === 'j' && canJob) navigate(`/services-biz/jobs/new?service=${id}`);
      if (e.key === 'Escape') navigate('/services-biz/catalog');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, canEdit, canJob, navigate]);

  if (q.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;
  if (!s) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">{t('Service nahi mili')}</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/services-biz/catalog')}>{t('Rate list')}</Button></div></PageShell>;

  const rate = s.baseCharge ? sales(s.baseCharge) : s.hourlyRate ? t('{{hourlyRate}}/ghanta', { hourlyRate: sales(s.hourlyRate) }) : t('Andaze se');
  const extras: Array<[string, number]> = ([[t('Emergency'), s.emergencyCharge], [t('Raat'), s.nightCharge], [t('Chhutti ka din'), s.weekendCharge], [t('Shehar se bahar'), s.outOfCityCharge]] as Array<[string, number]>).filter(([, v]) => v > 0);

  return (
    <PageShell>
      <PageHero
        title={s.name}
        chip={<><Tag /> {s.isActive ? t('Chaalu') : t('Band')}</>}
        meta={[categoryOf(s.category), s.businessType ? tradeOf(s.businessType) : null, s.code].filter(Boolean).join(' · ')}
        actions={<>
          <button type="button" onClick={() => navigate('/services-biz/catalog')} title={t('Wapas (Esc)')} className={heroIconButton}><ArrowLeft className="h-4 w-4 rtl-flip" /></button>
          {canEdit && <Link to={`/services-biz-services/${s.id}/edit`} title={t('Badlein (E)')} className={heroButton}><Pencil className="h-4 w-4" /><span className="hidden sm:inline">{t('Badlein')}</span></Link>}
          {canJob && s.isActive && <Link to={`/services-biz/jobs/new?service=${s.id}`} title={t('Nayi job (J)')} className={heroPrimaryButton}><Briefcase className="h-4 w-4" />{t('Nayi job')}</Link>}
        </>}
        stats={[
          { label: t('Kaam ka rate'), value: rate },
          { label: t('Jobs'), value: s.totalJobs },
          { label: t('Kamai'), value: sales(s.totalRevenue) },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="rounded-2xl" title={t('Rate aur shartein')}>
          <dl className="space-y-2 text-[0.875rem]">
            <Row label={t('Visit charge')} value={s.visitCharge ? sales(s.visitCharge) : '—'} />
            <Row label={t('Kaam')} value={rate} />
            {(s.minCharge > 0 || (s.maxCharge ?? 0) > 0) && <Row label={t('Range')} value={`${sales(s.minCharge)} – ${s.maxCharge ? sales(s.maxCharge) : '…'}`} />}
            {extras.map(([l, v]) => <Row key={l} label={t('{{l}} (extra)', { l })} value={sales(v)} />)}
            <Row label={t('Waqt')} value={<span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" />{t('{{estimatedDurationMin}} min', { estimatedDurationMin: s.estimatedDurationMin })}</span>} />
            <Row label={t('Warranty')} value={s.warrantyDays ? <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />{t('{{warrantyDays}} din', { warrantyDays: s.warrantyDays })}</span> : '—'} />
            {s.warrantyTerms && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">{s.warrantyTerms}</p>}
            {s.requiresAdvance && <Row label={t('Advance')} value={`${s.advancePct}%`} />}
            {s.description && <p className="pt-2 text-[0.8125rem] text-slate-600">{s.description}</p>}
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[0.75rem]">
            {s.jobsByStatus.map((b) => <span key={b.status} className={cn('rounded-full px-2 py-0.5 font-medium ring-1', statusOf(b.status).tone)}>{statusOf(b.status).label}: {b.count}</span>)}
          </div>
        </Card>
        <Card className="rounded-2xl" flush title={t('Pichli jobs')}>
          {!s.recentJobs.length ? <p className="px-5 pb-6 pt-3 text-[0.875rem] text-slate-500">{t('Abhi is service ki koi job nahi')}</p> : (
            <Table className="mt-3" minWidth="32rem">
              <THead><Tr><Th>{t('Job')}</Th><Th>{t('Customer')}</Th><Th>{t('Halat')}</Th><Th align="right">{t('Bill')}</Th></Tr></THead>
              <TBody>
                {s.recentJobs.map((j) => (
                  <Tr key={j.id}>
                    <Td><Link to={`/services-biz/jobs/${j.id}`} className="font-mono text-[0.8125rem] font-semibold text-brand-700 hover:underline">{j.jobNumber}</Link><span className="block text-[0.75rem] text-slate-500">{dayOnly(j.createdAt)}</span></Td>
                    <Td>{j.customerName ?? '—'}</Td>
                    <Td><span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', statusOf(j.status).tone)}>{statusOf(j.status).label}</span></Td>
                    <Td align="right" className="tabular-nums">{sales(j.totalCharge)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-end font-medium text-slate-900">{value}</dd></div>;
}

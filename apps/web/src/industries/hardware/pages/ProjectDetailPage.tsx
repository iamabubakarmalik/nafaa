/** One contractor site: money (quoted, billed, delivered, still to send), its quotations and challans, and its stage. */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Edit3, FilePlus, FileText, MapPin, Phone, Truck } from 'lucide-react';
import { Button, Card, KpiCard, KpiRow, PageHero, PageShell, Skeleton, heroButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { HeroBack } from '@core/components/HeroBack';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { projectsApi, type ProjectStatus } from '../api/projects.api';
import type { Delivery } from '../api/deliveries.api';
import type { Quotation } from '../api/quotations.api';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { CHALLAN_STATUS, QUOTE_STATUS, errorText, shortDate } from '../lib/meta';
import { PROJECT_NEXT, PROJECT_STATUS } from '../lib/projects';

export default function ProjectDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const [editing, setEditing] = useState(false);
  const { data: p, isLoading } = useQuery({ queryKey: ['hardware-project', id], queryFn: () => projectsApi.getOne(id), enabled: !!id });
  const move = useMutation({
    mutationFn: (s: ProjectStatus) => projectsApi.updateStatus(id, s),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['hardware-project', id] }); qc.invalidateQueries({ queryKey: ['hardware-projects'] }); toast.success(PROJECT_STATUS[r.status].label); },
    onError: (e) => toast.error(errorText(e, 'Status nahi badla')),
  });

  if (isLoading || !p) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></PageShell>;
  const st = PROJECT_STATUS[p.status];
  const quotations = (p.quotations ?? []) as Quotation[];
  const deliveries = (p.deliveries ?? []) as Delivery[];
  const pct = p.totalOrdered > 0 ? Math.min(Math.round((p.totalDelivered / p.totalOrdered) * 100), 100) : 0;

  return (
    <PageShell>
      <PageHero title={<HeroBack to="/hardware/projects" label="Sites">{p.name}</HeroBack>} chip={st.label}
        meta={`${p.projectNumber} · ${p.customerName}${p.contractorName ? ` · Thekedar ${p.contractorName}` : ''}`}
        actions={<>
          <button type="button" onClick={() => setEditing(true)} className={heroButton}><Edit3 className="h-4 w-4" />Badlein</button>
          {p.customerId && <Link to={`/customers/${p.customerId}`} className={heroButton}><BookOpen className="h-4 w-4" />Khata</Link>}
          <Link to={`/hardware/deliveries/new?project=${p.id}`} className={heroButton}><Truck className="h-4 w-4" />Challan</Link>
          <Link to={`/hardware/quotations/new?project=${p.id}`} className={heroPrimaryButton}><FilePlus className="h-4 w-4" />Quotation</Link>
        </>}
        stats={[
          { label: 'Bill / maal', value: money(p.totalOrdered) },
          { label: 'Pohanch chuka', value: money(p.totalDelivered), hint: `${pct}%` },
          { label: 'Bhejna baqi', value: money(p.totalPending) },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={FileText} color="#2563eb" label="Quotation (maani hui)" value={money(p.totalQuoted)} hint={`${quotations.length} quotation`} />
        <KpiCard icon={Truck} color="#7c3aed" label="Challan" value={deliveries.length} hint={`${deliveries.filter((d) => ['PENDING', 'SCHEDULED', 'LOADED', 'DISPATCHED', 'IN_TRANSIT'].includes(d.status)).length} raste me`} />
        <KpiCard icon={MapPin} color="#a16207" label="Budget" value={p.estimatedBudget ? money(p.estimatedBudget) : '—'} hint={p.projectType || undefined} />
        <KpiCard icon={Phone} color="#16a34a" label="Site par rabta" value={p.siteContactPhone || p.contractorPhone || p.customerPhone || '—'} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card flush title="Quotations" actions={<Link to={`/hardware/quotations?project=${p.id}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Sab →</Link>}>
            {quotations.length === 0 ? <p className="px-5 pb-5 text-[0.875rem] text-slate-500">Abhi koi quotation nahi.</p> : (
              <ul className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <li key={q.id}><Link to={`/hardware/quotations/${q.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="font-mono text-[0.8125rem] font-semibold">{q.quotationNumber}</span>
                    <span className="text-[0.75rem] text-slate-500">{shortDate(q.createdAt)}</span>
                    <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', QUOTE_STATUS[q.status].tone)}>{QUOTE_STATUS[q.status].label}</span>
                    <span className="w-28 text-right font-semibold tabular-nums">{money(q.total)}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </Card>
          <Card flush title="Challan" actions={<Link to={`/hardware/deliveries?project=${p.id}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Sab →</Link>}>
            {deliveries.length === 0 ? <p className="px-5 pb-5 text-[0.875rem] text-slate-500">Abhi koi challan nahi.</p> : (
              <ul className="divide-y divide-slate-100">
                {deliveries.map((d) => (
                  <li key={d.id}><Link to={`/hardware/deliveries/${d.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="font-mono text-[0.8125rem] font-semibold">{d.deliveryNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.75rem] text-slate-500">{d.items.map((i) => i.itemName).join(', ')}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', CHALLAN_STATUS[d.status].tone)}>{CHALLAN_STATUS[d.status].label}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <aside className="space-y-4">
          <Card title="Site">
            <dl className="space-y-2 text-[0.875rem]">
              <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><dd>{[p.siteAddress, p.area, p.city].filter(Boolean).join(', ')}</dd></div>
              {p.customerPhone && <div className="flex justify-between"><dt className="text-slate-500">Malik</dt><dd><a href={`tel:${p.customerPhone}`} className="text-brand-700">{p.customerPhone}</a></dd></div>}
              {p.contractorPhone && <div className="flex justify-between"><dt className="text-slate-500">Thekedar</dt><dd><a href={`tel:${p.contractorPhone}`} className="text-brand-700">{p.contractorPhone}</a></dd></div>}
              {p.startDate && <div className="flex justify-between"><dt className="text-slate-500">Shuru</dt><dd>{shortDate(p.startDate)}</dd></div>}
              {p.expectedEndDate && <div className="flex justify-between"><dt className="text-slate-500">Khatam (andaza)</dt><dd>{shortDate(p.expectedEndDate)}</dd></div>}
              {p.notes && <p className="whitespace-pre-line text-slate-600">{p.notes}</p>}
            </dl>
          </Card>
          <Card title="Kaam ka marhala">
            <div className="grid gap-2">
              {(PROJECT_NEXT[p.status] ?? []).map((s) => (
                <Button key={s} variant={s === 'CANCELLED' ? 'ghost' : 'secondary'} loading={move.isPending && move.variables === s} onClick={() => move.mutate(s)}>{PROJECT_STATUS[s].label}</Button>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      {editing && <ProjectFormModal project={p} onClose={() => setEditing(false)} />}
    </PageShell>
  );
}

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, X, Ban, Sparkles, User, Phone, Mail, MapPin,
  Clock, Printer, DollarSign, CreditCard, Star, Calendar, Truck,
  Camera, ArrowRight, Zap, Package, Activity, Timer, Award, Shield,
  PenTool, MessageSquare, Plus,
} from 'lucide-react';
import { jobsApi, type JobStatus } from '../api/jobs.api';
import { techniciansApi } from '../api/technicians.api';
import { dispatchApi } from '../api/dispatch.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_FLOW: JobStatus[] = ['CONFIRMED', 'SCHEDULED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED'];

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', icon: Clock },
  ENQUIRY: { label: 'Enquiry', color: 'bg-slate-500', icon: Phone },
  QUOTED: { label: 'Quoted', color: 'bg-blue-400', icon: DollarSign },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500', icon: CheckCircle2 },
  SCHEDULED: { label: 'Scheduled', color: 'bg-cyan-500', icon: Clock },
  ASSIGNED: { label: 'Assigned', color: 'bg-violet-500', icon: User },
  DISPATCHED: { label: 'Dispatched', color: 'bg-purple-500', icon: Truck },
  EN_ROUTE: { label: 'En Route', color: 'bg-indigo-500', icon: Truck },
  ARRIVED: { label: 'Arrived', color: 'bg-teal-500', icon: MapPin },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500', icon: Activity },
  PAUSED: { label: 'Paused', color: 'bg-orange-500', icon: Timer },
  AWAITING_PARTS: { label: 'Awaiting Parts', color: 'bg-orange-600', icon: Package },
  AWAITING_APPROVAL: { label: 'Awaiting Approval', color: 'bg-yellow-500', icon: Clock },
  QUALITY_CHECK: { label: 'Quality Check', color: 'bg-fuchsia-500', icon: Star },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600', icon: CheckCircle2 },
  UNABLE_TO_COMPLETE: { label: 'Unable', color: 'bg-red-600', icon: X },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-violet-400', icon: Calendar },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', icon: Ban },
  WARRANTY_HOLD: { label: 'Warranty Hold', color: 'bg-slate-500', icon: Timer },
  DISPUTED: { label: 'Disputed', color: 'bg-red-500', icon: MessageSquare },
};

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showPhotos, setShowPhotos] = useState<'before' | 'during' | 'after' | null>(null);

  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['services-job', id],
    queryFn: () => jobsApi.getOne(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => jobsApi.updateStatus(id!, { status }),
    onSuccess: () => { toast.success('Status updated'); refetch(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => jobsApi.cancel(id!, reason),
    onSuccess: () => { toast.success('Cancelled'); refetch(); },
  });

  if (isLoading || !job) {
    return <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  const statusCfg = STATUS_CONFIG[job.status];
  const StatusIcon = statusCfg.icon;
  const currentIdx = STATUS_FLOW.indexOf(job.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const remaining = job.totalCharge - job.paidAmount;
  const isFullyPaid = remaining <= 0.01;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className={
        'relative overflow-hidden rounded-3xl text-white p-6 shadow-2xl ' +
        (job.priority === 'EMERGENCY' ? 'bg-gradient-to-br from-red-950 via-red-800 to-rose-700' :
         job.priority === 'URGENT' ? 'bg-gradient-to-br from-slate-950 via-red-900 to-orange-800' :
         'bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800')
      }>
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/services-biz/jobs')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                {job.priority}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold">{job.jobNumber}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                <span className={'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white inline-flex items-center gap-1 ' + statusCfg.color}>
                  <StatusIcon className="h-3 w-3" />
                  {statusCfg.label}
                </span>
                <span className="text-white/80 font-semibold">{job.serviceName}</span>
                {job.underWarranty && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-xs font-extrabold">🛡️ WARRANTY</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Printer className="h-4 w-4" />
              Print
            </button>
            {!job.primaryTechnicianId && (
              <Button onClick={() => setShowAssign(true)} className="bg-violet-500 hover:bg-violet-600 text-white">
                <User className="h-4 w-4" />
                Assign Technician
              </Button>
            )}
            {!isFullyPaid && job.status !== 'CANCELLED' && (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                <DollarSign className="h-4 w-4" />
                Add Payment
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Status Flow */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-extrabold">Job Workflow</h3>
          {nextStatus && !['CANCELLED', 'COMPLETED'].includes(job.status) && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => statusMutation.mutate(nextStatus)} loading={statusMutation.isPending} className={STATUS_CONFIG[nextStatus].color + ' text-white'}>
                <ArrowRight className="h-3.5 w-3.5" />
                Mark {STATUS_CONFIG[nextStatus].label}
              </Button>
              {job.status !== 'COMPLETED' && (
                <Button size="sm" variant="secondary" onClick={() => {
                  const reason = prompt('Cancellation reason?');
                  if (reason) cancelMutation.mutate(reason);
                }} className="bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100">
                  <Ban className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          )}
          {job.status === 'COMPLETED' && !job.customerRating && (
            <Button size="sm" onClick={() => setShowRating(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              <Star className="h-3.5 w-3.5" />
              Add Rating
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => {
            const isActive = i <= currentIdx;
            const isCurrent = i === currentIdx;
            const cfg = STATUS_CONFIG[s];
            const StepIcon = cfg.icon;
            return (
              <div key={s} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={
                    'h-9 w-9 rounded-full flex items-center justify-center ' +
                    (isCurrent ? cfg.color + ' text-white ring-4 ring-blue-200 dark:ring-blue-900 shadow' :
                     isActive ? cfg.color + ' text-white' : 'bg-slate-200 dark:bg-neutral-700 text-slate-500')
                  }>
                    {isActive && !isCurrent ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-600">{cfg.label}</span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={'h-0.5 w-6 mx-1 ' + (i < currentIdx ? 'bg-blue-500' : 'bg-slate-200 dark:bg-neutral-700')} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-4">
          {/* Customer */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
            <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Customer
            </h3>
            <div className="space-y-2 text-sm">
              <div className="font-extrabold text-base">{job.customerName || 'Walk-in'}</div>
              {job.customerPhone && (
                <a href={'tel:' + job.customerPhone} className="flex items-center gap-1 text-blue-700 font-bold hover:underline">
                  <Phone className="h-3 w-3" />
                  {job.customerPhone}
                </a>
              )}
              {job.customerAltPhone && (
                <div className="flex items-center gap-1 text-slate-600 font-bold text-xs">
                  <Phone className="h-3 w-3" />
                  Alt: {job.customerAltPhone}
                </div>
              )}
              {job.customerEmail && (
                <a href={'mailto:' + job.customerEmail} className="flex items-center gap-1 text-blue-700 font-bold hover:underline text-xs">
                  <Mail className="h-3 w-3" />
                  {job.customerEmail}
                </a>
              )}
            </div>
          </div>

          {/* Problem + Location */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Problem Description</div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{job.problemDescription}</p>
            </div>
            {job.customerReportedIssue && (
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Customer Reported</div>
                <p className="text-sm italic text-slate-700">{job.customerReportedIssue}</p>
              </div>
            )}
            {job.urgencyReason && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 p-2 text-xs">
                <span className="font-extrabold text-red-800">⚠️ Urgency:</span> {job.urgencyReason}
              </div>
            )}

            {(job.brand || job.modelNumber || job.serialNumber) && (
              <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                {job.brand && <div><div className="text-[9px] uppercase font-extrabold text-slate-500">Brand</div><div className="text-sm font-extrabold">{job.brand}</div></div>}
                {job.modelNumber && <div><div className="text-[9px] uppercase font-extrabold text-slate-500">Model</div><div className="text-sm font-extrabold font-mono">{job.modelNumber}</div></div>}
                {job.serialNumber && <div><div className="text-[9px] uppercase font-extrabold text-slate-500">Serial</div><div className="text-sm font-extrabold font-mono">{job.serialNumber}</div></div>}
              </div>
            )}

            {job.serviceAddress && (
              <div className="pt-3 border-t">
                <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Service Location
                </div>
                <p className="text-sm font-semibold">{job.serviceAddress}</p>
                {(job.city || job.area) && (
                  <p className="text-xs text-slate-600 font-bold">{job.area} {job.city && '• ' + job.city}</p>
                )}
                {job.landmark && <p className="text-xs italic text-slate-500">📍 {job.landmark}</p>}
                {job.entryInstructions && (
                  <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-2 text-xs italic">
                    🚪 {job.entryInstructions}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Technician */}
          {job.technician && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
              <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-violet-600" />
                Assigned Technician
              </h3>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-xl font-extrabold shrink-0">
                  {(job.technician.staff?.firstName || 'T').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-extrabold">
                    {((job.technician.staff?.firstName || '') + ' ' + (job.technician.staff?.lastName || '')).trim()}
                  </div>
                  {job.technician.staff?.phone && (
                    <a href={'tel:' + job.technician.staff.phone} className="text-xs font-bold text-blue-700 hover:underline">
                      📞 {job.technician.staff.phone}
                    </a>
                  )}
                  {job.technician.profile && (
                    <div className="text-[10px] font-bold text-violet-700 uppercase">{job.technician.profile.level} • {job.technician.profile.status}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parts */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                Parts Used ({job.parts.length})
              </h3>
              {!['COMPLETED', 'CANCELLED'].includes(job.status) && (
                <Button size="sm" onClick={() => setShowAddPart(true)} className="bg-gradient-to-r from-orange-500 to-red-600">
                  <Plus className="h-3.5 w-3.5" />
                  Add Part
                </Button>
              )}
            </div>
            {job.parts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 font-semibold">No parts used</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                {job.parts.map((p: any) => (
                  <div key={p.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-extrabold text-orange-700 tabular-nums">{p.quantity}×</span>
                          <span className="font-extrabold">{p.partName}</span>
                          {p.partNumber && <span className="text-[10px] font-mono text-slate-500">{p.partNumber}</span>}
                          {p.brand && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-extrabold">{p.brand}</span>}
                          {p.isUnderWarranty && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">🛡️ WARRANTY</span>}
                          {p.isCustomerSupplied && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold">CUSTOMER</span>}
                        </div>
                        {p.serialNumber && <div className="text-[10px] font-mono text-slate-500 mt-1">SN: {p.serialNumber}</div>}
                        {p.warrantyDays > 0 && <div className="text-[10px] font-extrabold text-emerald-700 mt-0.5">Part warranty: {p.warrantyDays} days</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm text-slate-500">{formatPKR(p.unitPrice)} × {p.quantity}</div>
                        <div className={'text-lg font-extrabold tabular-nums ' + (p.isUnderWarranty ? 'text-emerald-700 line-through' : 'text-emerald-700')}>
                          {formatPKR(p.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="grid grid-cols-3 gap-3">
            {(['before', 'during', 'after'] as const).map((stage) => {
              const urls = stage === 'before' ? job.beforePhotoUrls : stage === 'during' ? job.duringPhotoUrls : job.afterPhotoUrls;
              return (
                <div key={stage} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase text-slate-700">📸 {stage}</span>
                    <button onClick={() => setShowPhotos(stage)} className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {urls.length === 0 ? (
                    <div className="text-[10px] text-slate-400 font-bold text-center py-4">No photos</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {urls.slice(0, 4).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                      {urls.length > 4 && (
                        <div className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center text-xs font-extrabold text-slate-500">
                          +{urls.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rating */}
          {job.customerRating && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={'h-5 w-5 ' + (n <= (job.customerRating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-300')} />
                  ))}
                </div>
                <span className="font-extrabold text-amber-900">{job.customerRating}/5</span>
                {job.wouldRecommend && <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-extrabold">✅ RECOMMENDS</span>}
              </div>
              {job.customerFeedback && <p className="text-sm italic text-slate-700">"{job.customerFeedback}"</p>}
            </div>
          )}

          {/* Notes */}
          {(job.technicianNotes || job.internalNotes) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {job.technicianNotes && (
                <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 p-4">
                  <div className="text-xs font-extrabold text-blue-800 mb-1">Technician Notes</div>
                  <p className="text-sm text-slate-700">{job.technicianNotes}</p>
                </div>
              )}
              {job.internalNotes && (
                <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800 border-2 border-slate-200 p-4">
                  <div className="text-xs font-extrabold text-slate-800 mb-1">Internal Notes</div>
                  <p className="text-sm text-slate-700">{job.internalNotes}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Bill Summary</div>

              <div className="space-y-1.5 text-sm">
                {job.visitCharge > 0 && <div className="flex justify-between"><span className="text-white/70">Visit</span><span className="font-bold tabular-nums">{formatPKR(job.visitCharge)}</span></div>}
                {job.labourCharge > 0 && <div className="flex justify-between"><span className="text-white/70">Labour</span><span className="font-bold tabular-nums">{formatPKR(job.labourCharge)}</span></div>}
                {job.partsCharge > 0 && <div className="flex justify-between"><span className="text-white/70">Parts</span><span className="font-bold tabular-nums">{formatPKR(job.partsCharge)}</span></div>}
                {job.transportCharge > 0 && <div className="flex justify-between"><span className="text-white/70">Transport</span><span className="font-bold tabular-nums">{formatPKR(job.transportCharge)}</span></div>}
                {job.emergencyCharge > 0 && <div className="flex justify-between text-red-300"><span>Emergency</span><span className="font-bold tabular-nums">{formatPKR(job.emergencyCharge)}</span></div>}
                {job.taxAmount > 0 && <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(job.taxAmount)}</span></div>}
                {job.discountAmount > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(job.discountAmount)}</span></div>}
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(job.totalCharge)}</span>
              </div>

              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Paid</span>
                  <span className="font-extrabold text-emerald-300 tabular-nums">{formatPKR(job.paidAmount)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between">
                    <span className="text-amber-300 font-extrabold">Remaining</span>
                    <span className="font-extrabold text-amber-300 tabular-nums">{formatPKR(remaining)}</span>
                  </div>
                )}
                {isFullyPaid && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/30 text-emerald-200 text-xs font-extrabold">
                    <CheckCircle2 className="h-3 w-3" />
                    PAID IN FULL
                  </div>
                )}
              </div>

              {job.jobWarrantyDays > 0 && job.jobWarrantyExpiryDate && (
                <div className="mt-3 pt-3 border-t border-white/20 rounded-lg bg-emerald-500/20 p-2 text-xs">
                  <div className="text-emerald-200 font-extrabold flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Warranty: {job.jobWarrantyDays} days
                  </div>
                  <div className="text-emerald-300 text-[10px] font-bold">
                    Valid until: {format(new Date(job.jobWarrantyExpiryDate), 'dd MMM yyyy')}
                  </div>
                </div>
              )}

              {!isFullyPaid && job.status !== 'CANCELLED' && (
                <Button size="lg" className="w-full mt-4 bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                  <CreditCard className="h-4 w-4" />
                  Add Payment
                </Button>
              )}
            </div>

            {/* Time log */}
            {job.timeLog && job.timeLog.length > 0 && (
              <div className="rounded-3xl bg-white dark:bg-neutral-900 border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-bold">Activity Log</h3>
                </div>
                <div className="divide-y max-h-64 overflow-y-auto">
                  {job.timeLog.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-blue-600" />
                        <span className="font-extrabold">{log.action}</span>
                      </div>
                      <div className="text-slate-500 mt-0.5">{format(new Date(log.timestamp), 'dd MMM, HH:mm')}</div>
                      {log.latitude && (
                        <div className="text-[10px] font-mono text-emerald-700">📍 {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showPayment && (
        <PaymentModal jobId={id!} remaining={remaining} onClose={() => setShowPayment(false)} onDone={() => { setShowPayment(false); refetch(); }} />
      )}
      {showRating && (
        <RatingModal jobId={id!} onClose={() => setShowRating(false)} onDone={() => { setShowRating(false); refetch(); }} />
      )}
      {showAssign && (
        <AssignModal jobId={id!} onClose={() => setShowAssign(false)} onDone={() => { setShowAssign(false); refetch(); }} />
      )}
      {showAddPart && (
        <AddPartModal jobId={id!} onClose={() => setShowAddPart(false)} onDone={() => { setShowAddPart(false); refetch(); }} />
      )}
      {showPhotos && (
        <PhotosModal jobId={id!} stage={showPhotos} onClose={() => setShowPhotos(null)} onDone={() => { setShowPhotos(null); refetch(); }} />
      )}
    </div>
  );
}

function PaymentModal({ jobId, remaining, onClose, onDone }: any) {
  const [amount, setAmount] = useState(remaining);
  const [isAdvance, setIsAdvance] = useState(false);

  const payMutation = useMutation({
    mutationFn: () => jobsApi.addPayment(jobId, amount, isAdvance),
    onSuccess: () => { toast.success('Payment added'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">Add Payment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Amount</label>
            <input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
            <div className="mt-1 flex gap-1">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <button key={f} onClick={() => setAmount(Number((remaining * f).toFixed(2)))} className="flex-1 h-8 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold hover:bg-slate-200">
                  {(f * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer">
            <input type="checkbox" checked={isAdvance} onChange={(e) => setIsAdvance(e.target.checked)} className="h-4 w-4 rounded" />
            <span className="text-xs font-extrabold text-amber-800">This is an advance payment</span>
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RatingModal({ jobId, onClose, onDone }: any) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [satisfaction, setSatisfaction] = useState('SATISFIED');

  const rateMutation = useMutation({
    mutationFn: () => jobsApi.rate(jobId, { rating, feedback, wouldRecommend, satisfaction }),
    onSuccess: () => { toast.success('Rating submitted'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">Rate Service</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
                  <Star className={'h-12 w-12 ' + (n <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300')} />
                </button>
              ))}
            </div>
            <div className="text-2xl font-extrabold text-amber-700">{rating}/5</div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Satisfaction</label>
            <div className="grid grid-cols-4 gap-1">
              {['VERY_SATISFIED', 'SATISFIED', 'NEUTRAL', 'DISSATISFIED'].map((s) => (
                <button key={s} onClick={() => setSatisfaction(s)} className={
                  'py-2 rounded-lg text-[10px] font-extrabold ' +
                  (satisfaction === s ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700')
                }>{s.replace('_', ' ')}</button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 cursor-pointer">
            <input type="checkbox" checked={wouldRecommend} onChange={(e) => setWouldRecommend(e.target.checked)} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold text-emerald-900">✅ Would recommend to others</span>
          </label>

          <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback (optional)..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600" onClick={() => rateMutation.mutate()} loading={rateMutation.isPending}>
              <Star className="h-4 w-4" />
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ jobId, onClose, onDone }: any) {
  const [selectedId, setSelectedId] = useState('');

  const { data: suggestions = [] } = useQuery({
    queryKey: ['dispatch-suggest', jobId],
    queryFn: () => dispatchApi.suggest(jobId),
  });

  const assignMutation = useMutation({
    mutationFn: () => jobsApi.assign(jobId, selectedId),
    onSuccess: () => { toast.success('Technician assigned'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold">🎯 Smart Dispatch</h3>
            <p className="text-xs text-slate-500 font-semibold">AI-suggested technicians based on skill, distance & rating</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-semibold">No technicians available</div>
          ) : (
            suggestions.map((t: any, i: number) => {
              const name = t.staff ? ((t.staff.firstName || '') + ' ' + (t.staff.lastName || '')).trim() : '';
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.staffId)}
                  className={
                    'w-full p-3 rounded-xl border-2 text-left transition ' +
                    (selectedId === t.staffId ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300')
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className={
                      'h-8 w-8 rounded-lg text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0 ' +
                      (i === 0 ? 'bg-gradient-to-br from-amber-500 to-yellow-600' : 'bg-gradient-to-br from-slate-300 to-slate-400')
                    }>
                      {i === 0 ? '🥇' : i + 1}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-extrabold shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold truncate">{name}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">{t.level} • {t.status}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        {t.avgRating && (
                          <span className="inline-flex items-center gap-0.5 text-amber-700 font-extrabold">
                            <Star className="h-2 w-2 fill-current" />
                            {t.avgRating.toFixed(1)}
                          </span>
                        )}
                        {t.distanceKm !== null && (
                          <span className="inline-flex items-center gap-0.5 text-blue-700 font-extrabold">
                            <MapPin className="h-2 w-2" />
                            {t.distanceKm.toFixed(1)}km
                          </span>
                        )}
                        <span className="text-slate-500">Score: {t.matchScore?.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="p-4 border-t flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => assignMutation.mutate()} loading={assignMutation.isPending} disabled={!selectedId}>
            <CheckCircle2 className="h-4 w-4" />
            Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddPartModal({ jobId, onClose, onDone }: any) {
  const [form, setForm] = useState<any>({
    partName: '', partNumber: '', brand: '', quantity: 1, unitPrice: 0, costPrice: 0,
    isCustomerSupplied: false, isUnderWarranty: false, warrantyDays: 0, serialNumber: '', notes: '',
  });

  const addMutation = useMutation({
    mutationFn: () => jobsApi.addPart(jobId, {
      ...form,
      quantity: Number(form.quantity) || 1,
      unitPrice: Number(form.unitPrice) || 0,
      costPrice: Number(form.costPrice) || 0,
      warrantyDays: Number(form.warrantyDays) || 0,
    }),
    onSuccess: () => { toast.success('Part added'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-orange-50 flex items-center justify-between">
          <h3 className="font-extrabold">Add Part</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
          <input autoFocus value={form.partName} onChange={(e) => setForm({ ...form, partName: e.target.value })} placeholder="Part name *" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} placeholder="Part #" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" min="0.1" step="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Qty" className="h-11 rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
            <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="Unit Price" className="h-11 rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            <input type="number" value={form.warrantyDays} onChange={(e) => setForm({ ...form, warrantyDays: e.target.value })} placeholder="Warranty days" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-orange-500" />
          </div>
          <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Serial #" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />

          <div className="grid grid-cols-2 gap-2">
            <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.isCustomerSupplied ? 'border-blue-500 bg-blue-50' : 'border-slate-200 dark:border-neutral-700')}>
              <input type="checkbox" checked={form.isCustomerSupplied} onChange={(e) => setForm({ ...form, isCustomerSupplied: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold">Customer supplied</span>
            </label>
            <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.isUnderWarranty ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 dark:border-neutral-700')}>
              <input type="checkbox" checked={form.isUnderWarranty} onChange={(e) => setForm({ ...form, isUnderWarranty: e.target.checked })} className="h-4 w-4 rounded" />
              <span className="text-xs font-extrabold">Under warranty (free)</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-orange-500 to-red-600" onClick={() => addMutation.mutate()} loading={addMutation.isPending} disabled={!form.partName}>
              <Plus className="h-4 w-4" />
              Add Part
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotosModal({ jobId, stage, onClose, onDone }: any) {
  const [urls, setUrls] = useState<string[]>([]);

  const uploadMutation = useMutation({
    mutationFn: () => jobsApi.addPhotos(jobId, stage, urls),
    onSuccess: () => { toast.success('Photos added'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-fuchsia-50 flex items-center justify-between">
          <h3 className="font-extrabold">📸 Upload {stage} photos</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {urls.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {urls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setUrls(urls.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadDropzone onUploaded={(records) => {
            const newUrls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
            setUrls([...urls, ...newUrls]);
          }} />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-fuchsia-500 to-pink-600" onClick={() => uploadMutation.mutate()} loading={uploadMutation.isPending} disabled={urls.length === 0}>
              <CheckCircle2 className="h-4 w-4" />
              Save Photos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

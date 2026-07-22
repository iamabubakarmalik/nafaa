import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building, Plus, Search, X, Save, RefreshCw, Sparkles, MapPin,
  User, Phone, Calendar, DollarSign, Layers, Camera, Clock,
  CheckCircle2, AlertCircle, Ban, PauseCircle,
} from 'lucide-react';
import { projectsApi, type ProjectStatus, type HardwareProject } from '../api/projects.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; icon: any }> = {
  PLANNING: { label: 'Planning', color: 'bg-slate-500', icon: Clock },
  QUOTED: { label: 'Quoted', color: 'bg-blue-500', icon: AlertCircle },
  APPROVED: { label: 'Approved', color: 'bg-cyan-500', icon: CheckCircle2 },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500', icon: Building },
  ON_HOLD: { label: 'On Hold', color: 'bg-orange-500', icon: PauseCircle },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', icon: Ban },
};

const PROJECT_TYPES = ['Residential House', 'Commercial Plaza', 'Apartment', 'Villa', 'Factory', 'Warehouse', 'Renovation', 'Boundary Wall', 'Farm House', 'Shop', 'Other'];

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HardwareProject | null>(null);

  const { data: projects = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hardware-projects', statusFilter, search],
    queryFn: () => projectsApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
      search: search.trim() || undefined,
      active: true,
    }),
  });

  const filtered = statusFilter === 'active'
    ? projects.filter((p) => !['COMPLETED', 'CANCELLED'].includes(p.status))
    : projects;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Construction Sites
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏗️ Projects</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Construction site tracking with contractor & budget</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search project, customer, phone..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['active', 'all', ...Object.keys(STATUS_CONFIG)].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (statusFilter === s ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {s === 'active' ? '🔥 Active' : s === 'all' ? 'All' : STATUS_CONFIG[s as ProjectStatus]?.label || s}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <ProjectForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['hardware-projects'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Building className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No projects</p>
          <Button className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Add First Project
          </Button>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((proj) => <ProjectCard key={proj.id} project={proj} />)}
        </section>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: HardwareProject }) {
  const statusCfg = STATUS_CONFIG[project.status];
  const StatusIcon = statusCfg.icon;
  const progressPct = project.totalOrdered > 0 ? (project.totalDelivered / project.totalOrdered) * 100 : 0;

  return (
    <Link to={'/hardware/projects/' + project.id} className="block rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-blue-300 transition p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow shrink-0">
            <Building className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{project.projectNumber}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 text-white ' + statusCfg.color}>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </span>
            </div>
            <h3 className="mt-1 font-extrabold text-slate-900 dark:text-white">{project.name}</h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {project.customerName}
              </span>
              {project.customerPhone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {project.customerPhone}
                </span>
              )}
              {project.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {project.city}{project.area ? ', ' + project.area : ''}
                </span>
              )}
            </div>
            {(project.contractorName || project.architectName) && (
              <div className="mt-1 flex gap-3 text-xs font-bold text-blue-700">
                {project.contractorName && <span>👷 {project.contractorName}</span>}
                {project.architectName && <span>📐 {project.architectName}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(project.totalDelivered)}</div>
          <div className="text-[10px] font-bold text-slate-500">delivered</div>
          {project.estimatedBudget && (
            <div className="text-[10px] font-extrabold text-slate-700">Budget: {formatPKR(project.estimatedBudget)}</div>
          )}
        </div>
      </div>

      {project.totalOrdered > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 mb-1">
            <span>Delivery Progress</span>
            <span>{progressPct.toFixed(0)}% ({formatPKR(project.totalDelivered)} / {formatPKR(project.totalOrdered)})</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: progressPct + '%' }} />
          </div>
        </div>
      )}
    </Link>
  );
}

function ProjectForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    customerId: editing?.customerId ?? '',
    customerName: editing?.customerName ?? '',
    customerPhone: editing?.customerPhone ?? '',
    contractorName: editing?.contractorName ?? '',
    contractorPhone: editing?.contractorPhone ?? '',
    architectName: editing?.architectName ?? '',
    siteAddress: editing?.siteAddress ?? '',
    city: editing?.city ?? '',
    area: editing?.area ?? '',
    latitude: editing?.latitude ?? '',
    longitude: editing?.longitude ?? '',
    siteContactPhone: editing?.siteContactPhone ?? '',
    projectType: editing?.projectType ?? '',
    builtUpArea: editing?.builtUpArea ?? '',
    floors: editing?.floors ?? '',
    startDate: editing?.startDate ? editing.startDate.slice(0, 10) : '',
    expectedEndDate: editing?.expectedEndDate ? editing.expectedEndDate.slice(0, 10) : '',
    estimatedBudget: editing?.estimatedBudget ?? '',
    creditLimit: editing?.creditLimit ?? 0,
    creditDays: editing?.creditDays ?? 30,
    imageUrls: editing?.imageUrls ?? [],
    documentUrls: editing?.documentUrls ?? [],
    notes: editing?.notes ?? '',
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-project', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showPicker,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        builtUpArea: form.builtUpArea ? Number(form.builtUpArea) : undefined,
        floors: form.floors ? Number(form.floors) : undefined,
        estimatedBudget: form.estimatedBudget ? Number(form.estimatedBudget) : undefined,
        creditLimit: Number(form.creditLimit) || 0,
        creditDays: Number(form.creditDays) || 0,
      };
      return editing ? projectsApi.update(editing.id, payload) : projectsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Project updated' : 'Project created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Project' : 'New Project'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project Name * (e.g. Ali House Construction)" className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />

        {/* Customer picker */}
        {form.customerId ? (
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-center gap-3">
            <User className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="font-extrabold">{form.customerName}</div>
              {form.customerPhone && <div className="text-xs text-slate-600 font-bold">{form.customerPhone}</div>}
            </div>
            <button onClick={() => setForm({ ...form, customerId: '', customerName: '', customerPhone: '' })} className="text-xs font-extrabold text-blue-600 hover:underline">Change</button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
              <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Customer phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={() => setShowPicker(!showPicker)} className="text-xs font-extrabold text-blue-600 hover:underline">🔍 Or pick existing customer</button>
            {showPicker && (
              <div className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-3 space-y-2">
                <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold" />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {(customersData?.items ?? []).map((c) => (
                    <button key={c.id} onClick={() => { setForm({ ...form, customerId: c.id, customerName: c.name, customerPhone: c.phone || '' }); setShowPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Project description..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        {/* Contractor/Architect */}
        <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-violet-900 dark:text-violet-300">👷 Team Members</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.contractorName} onChange={(e) => setForm({ ...form, contractorName: e.target.value })} placeholder="Contractor name" className="h-11 rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            <input value={form.contractorPhone} onChange={(e) => setForm({ ...form, contractorPhone: e.target.value })} placeholder="Contractor phone" className="h-11 rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <input value={form.architectName} onChange={(e) => setForm({ ...form, architectName: e.target.value })} placeholder="Architect name" className="h-11 w-full rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
        </div>

        {/* Site */}
        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Site Location
          </div>
          <textarea rows={2} value={form.siteAddress} onChange={(e) => setForm({ ...form, siteAddress: e.target.value })} placeholder="Full site address *" className="w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="h-11 rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Area/Sector" className="h-11 rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="Latitude (GPS)" className="h-11 rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-500" />
            <input type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="Longitude (GPS)" className="h-11 rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <input value={form.siteContactPhone} onChange={(e) => setForm({ ...form, siteContactPhone: e.target.value })} placeholder="Site contact phone (foreman)" className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>

        {/* Project details */}
        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            <option value="">Project Type</option>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" value={form.builtUpArea} onChange={(e) => setForm({ ...form, builtUpArea: e.target.value })} placeholder="Built-up area (sq ft)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
          <input type="number" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} placeholder="Floors" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        {/* Dates */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Expected End Date</label>
            <input type="date" value={form.expectedEndDate} onChange={(e) => setForm({ ...form, expectedEndDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Financials */}
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Budget & Credit
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Estimated Budget</label>
            <input type="number" value={form.estimatedBudget} onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })} placeholder="0" className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Credit Limit</label>
              <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Credit Days</label>
              <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Site Photos</label>
          {form.imageUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-1 mb-2">
              {form.imageUrls.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, imageUrls: form.imageUrls.filter((_: any, idx: number) => idx !== i) })} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadDropzone onUploaded={(records) => {
            const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
            setForm({ ...form, imageUrls: [...form.imageUrls, ...urls] });
          }} />
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim() || !form.customerName.trim() || !form.siteAddress.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update Project' : 'Create Project'}
          </Button>
        </div>
      </div>
    </section>
  );
}

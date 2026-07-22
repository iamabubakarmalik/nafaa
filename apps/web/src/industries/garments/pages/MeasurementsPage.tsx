import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ruler, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  User, Phone, Calendar, Award, Camera, ChevronDown, ChevronUp,
  UserCheck,
} from 'lucide-react';
import { measurementsApi, type MeasurementProfile } from '../api/measurements.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const GENDERS = [
  { value: 'MEN', label: 'Men', emoji: '👨' },
  { value: 'WOMEN', label: 'Women', emoji: '👩' },
  { value: 'BOYS', label: 'Boys', emoji: '👦' },
  { value: 'GIRLS', label: 'Girls', emoji: '👧' },
];

const MEASUREMENT_GROUPS = {
  upper: {
    label: '👕 Upper Body',
    fields: [
      { key: 'neck', label: 'Neck' },
      { key: 'shoulder', label: 'Shoulder' },
      { key: 'chest', label: 'Chest' },
      { key: 'bust', label: 'Bust' },
      { key: 'waist', label: 'Waist' },
      { key: 'hip', label: 'Hip' },
      { key: 'armhole', label: 'Armhole' },
      { key: 'bicep', label: 'Bicep' },
      { key: 'wrist', label: 'Wrist' },
      { key: 'sleeveLength', label: 'Sleeve Length' },
      { key: 'shirtLength', label: 'Shirt Length' },
    ],
  },
  lower: {
    label: '👖 Lower Body',
    fields: [
      { key: 'trouserLength', label: 'Trouser Length' },
      { key: 'inseam', label: 'Inseam' },
      { key: 'thigh', label: 'Thigh' },
      { key: 'knee', label: 'Knee' },
      { key: 'bottom', label: 'Bottom' },
    ],
  },
  desi: {
    label: '🇵🇰 Shalwar / Kurta',
    fields: [
      { key: 'kurtaLength', label: 'Kurta Length' },
      { key: 'shalwarLength', label: 'Shalwar Length' },
      { key: 'shalwarBottom', label: 'Shalwar Bottom' },
      { key: 'daman', label: 'Daman' },
    ],
  },
};

export default function MeasurementsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MeasurementProfile | null>(null);

  const { data: measurements = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['measurements', genderFilter],
    queryFn: () => measurementsApi.list({
      gender: genderFilter === 'all' ? undefined : genderFilter,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => measurementsApi.remove(id),
    onSuccess: () => {
      toast.success('Measurement removed');
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
    },
  });

  const filtered = measurements.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.profileName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-pink-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Body Measurements
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📐 Customer Measurements</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Naap-jokh — kurta, shalwar, shirt, gown sab</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Measurement
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by profile name..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setGenderFilter('all')}
            className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
              (genderFilter === 'all' ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }
          >
            All
          </button>
          {GENDERS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGenderFilter(g.value)}
              className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                (genderFilter === g.value ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
              }
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <MeasurementForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['measurements'] });
          }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Ruler className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No measurements yet</p>
          <Button className="mt-4 bg-gradient-to-r from-rose-600 to-pink-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Add First Measurement
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <MeasurementCard
              key={m.id}
              measurement={m}
              onEdit={() => { setEditing(m); setShowForm(true); }}
              onDelete={() => {
                if (confirm('Remove this measurement?')) removeMutation.mutate(m.id);
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function MeasurementCard({ measurement, onEdit, onDelete }: {
  measurement: MeasurementProfile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const genderCfg = GENDERS.find((g) => g.value === measurement.gender);

  // Show first few key measurements
  const keyFields: Array<{ key: keyof MeasurementProfile; label: string }> = [
    { key: 'chest', label: 'Chest' },
    { key: 'waist', label: 'Waist' },
    { key: 'hip', label: 'Hip' },
    { key: 'shirtLength', label: 'Shirt' },
    { key: 'kurtaLength', label: 'Kurta' },
    { key: 'sleeveLength', label: 'Sleeve' },
    { key: 'trouserLength', label: 'Trouser' },
    { key: 'inseam', label: 'Inseam' },
  ];
  const filled = keyFields.filter((f) => measurement[f.key] !== null && measurement[f.key] !== undefined);

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 space-y-3 ' +
      (measurement.isDefault ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow shrink-0 text-lg">
          {genderCfg?.emoji || '📐'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-extrabold text-slate-900 dark:text-white">{measurement.profileName}</h3>
            {measurement.isDefault && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <Award className="h-2 w-2" />
                Default
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 text-[9px] font-extrabold uppercase">
              {measurement.unit}
            </span>
          </div>
          {measurement.customer && (
            <div className="flex items-center gap-1 text-xs text-slate-600 font-bold mt-0.5">
              <User className="h-3 w-3" />
              {measurement.customer.name}
            </div>
          )}
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
            <Calendar className="h-2.5 w-2.5 inline mr-0.5" />
            {format(new Date(measurement.measuredAt), 'dd MMM yyyy')}
          </div>
        </div>
      </div>

      {filled.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {filled.slice(0, 8).map((f) => (
            <div key={f.key} className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
              <div className="text-[8px] uppercase font-extrabold text-slate-500">{f.label}</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                {measurement[f.key] as number}
              </div>
            </div>
          ))}
        </div>
      )}

      {measurement.imageUrls.length > 0 && (
        <div className="flex gap-1">
          {measurement.imageUrls.slice(0, 4).map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 hover:border-rose-500">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </a>
          ))}
          {measurement.imageUrls.length > 4 && (
            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-extrabold text-slate-600">
              +{measurement.imageUrls.length - 4}
            </div>
          )}
        </div>
      )}

      {(measurement.postureNotes || measurement.fittingNotes) && (
        <div className="text-xs italic text-amber-700 line-clamp-2">
          📝 {measurement.postureNotes || measurement.fittingNotes}
        </div>
      )}

      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <button onClick={onEdit} className="flex-1 h-8 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <Edit3 className="h-3 w-3" />
          Edit
        </button>
        <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function MeasurementForm({ editing, onClose, onSaved }: {
  editing: MeasurementProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({
    customerId: editing?.customerId ?? '',
    profileName: editing?.profileName ?? 'Default',
    gender: editing?.gender ?? '',
    unit: editing?.unit ?? 'INCH',
    // All measurements
    neck: editing?.neck ?? '',
    shoulder: editing?.shoulder ?? '',
    chest: editing?.chest ?? '',
    bust: editing?.bust ?? '',
    waist: editing?.waist ?? '',
    hip: editing?.hip ?? '',
    armhole: editing?.armhole ?? '',
    bicep: editing?.bicep ?? '',
    wrist: editing?.wrist ?? '',
    sleeveLength: editing?.sleeveLength ?? '',
    shirtLength: editing?.shirtLength ?? '',
    trouserLength: editing?.trouserLength ?? '',
    inseam: editing?.inseam ?? '',
    thigh: editing?.thigh ?? '',
    knee: editing?.knee ?? '',
    bottom: editing?.bottom ?? '',
    kurtaLength: editing?.kurtaLength ?? '',
    shalwarLength: editing?.shalwarLength ?? '',
    shalwarBottom: editing?.shalwarBottom ?? '',
    daman: editing?.daman ?? '',
    postureNotes: editing?.postureNotes ?? '',
    fittingNotes: editing?.fittingNotes ?? '',
    imageUrls: editing?.imageUrls ?? [],
    isDefault: editing?.isDefault ?? false,
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(!editing?.customerId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ upper: true, lower: true, desi: true });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-measurement', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showCustomerPicker,
  });

  const selectedCustomer = customersData?.items?.find((c) => c.id === form.customerId);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = { ...form };
      // Convert measurement fields to numbers
      const numericFields = [
        'neck', 'shoulder', 'chest', 'bust', 'waist', 'hip', 'armhole', 'bicep', 'wrist',
        'sleeveLength', 'shirtLength', 'trouserLength', 'inseam', 'thigh', 'knee', 'bottom',
        'kurtaLength', 'shalwarLength', 'shalwarBottom', 'daman',
      ];
      numericFields.forEach((f) => {
        if (payload[f] === '' || payload[f] === null || payload[f] === undefined) delete payload[f];
        else payload[f] = Number(payload[f]);
      });
      // Remove empty strings
      if (!payload.gender) delete payload.gender;
      if (!payload.postureNotes) delete payload.postureNotes;
      if (!payload.fittingNotes) delete payload.fittingNotes;
      return editing ? measurementsApi.update(editing.id, payload) : measurementsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Measurement updated' : 'Measurement saved');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-300 dark:border-rose-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Measurement' : 'New Measurement'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Customer picker */}
        {(!form.customerId || showCustomerPicker) ? (
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Select Customer *</label>
            <div className="relative mb-2">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-neutral-700">
              {(customersData?.items ?? []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setForm({ ...form, customerId: c.id }); setShowCustomerPicker(false); }}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition text-left"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate">{c.name}</div>
                    {c.phone && <div className="text-xs text-slate-500 font-semibold">{c.phone}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800 p-3 flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-rose-600" />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 dark:text-white">{selectedCustomer?.name || 'Customer'}</div>
              {selectedCustomer?.phone && <div className="text-xs text-slate-600 font-bold">{selectedCustomer.phone}</div>}
            </div>
            {!editing && (
              <button onClick={() => { setForm({ ...form, customerId: '' }); setShowCustomerPicker(true); }} className="text-xs font-extrabold text-rose-600 hover:underline">
                Change
              </button>
            )}
          </div>
        )}

        {form.customerId && (
          <>
            {/* Basic info */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Profile Name *</label>
                <input
                  value={form.profileName}
                  onChange={(e) => setForm({ ...form, profileName: e.target.value })}
                  placeholder="Default / Formal / Loose"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500"
                >
                  <option value="">Select</option>
                  {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Unit</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, unit: 'INCH' })}
                    className={
                      'h-11 rounded-xl text-sm font-extrabold border-2 ' +
                      (form.unit === 'INCH' ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800')
                    }
                  >
                    Inches
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, unit: 'CM' })}
                    className={
                      'h-11 rounded-xl text-sm font-extrabold border-2 ' +
                      (form.unit === 'CM' ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800')
                    }
                  >
                    Cm
                  </button>
                </div>
              </div>
            </div>

            {/* Measurement groups */}
            {Object.entries(MEASUREMENT_GROUPS).map(([groupKey, group]) => (
              <div key={groupKey} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded({ ...expanded, [groupKey]: !expanded[groupKey] })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-800/50 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
                >
                  <span className="font-extrabold text-slate-900 dark:text-white">{group.label}</span>
                  {expanded[groupKey] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expanded[groupKey] && (
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {group.fields.map((f) => (
                      <div key={f.key}>
                        <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">{f.label}</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={form[f.key]}
                            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                            placeholder="0"
                            className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-3 pr-8 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-slate-400 uppercase">{form.unit === 'INCH' ? 'in' : 'cm'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Notes */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Posture Notes</label>
                <textarea
                  rows={2}
                  value={form.postureNotes}
                  onChange={(e) => setForm({ ...form, postureNotes: e.target.value })}
                  placeholder="Round shoulders, high hip..."
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Fitting Notes</label>
                <textarea
                  rows={2}
                  value={form.fittingNotes}
                  onChange={(e) => setForm({ ...form, fittingNotes: e.target.value })}
                  placeholder="Loose fit preferred, tight sleeve..."
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Reference Photos</label>
              {form.imageUrls.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 mb-2">
                  {form.imageUrls.map((url: string, i: number) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setForm({ ...form, imageUrls: form.imageUrls.filter((_: any, idx: number) => idx !== i) })}
                        className="absolute top-1 right-1 h-5 w-5 rounded bg-rose-600 text-white flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <UploadDropzone
                onUploaded={(records) => {
                  const urls = Array.isArray(records)
                    ? records.map((r: any) => r.url || r).filter(Boolean)
                    : [(records as any)?.url || records];
                  setForm({ ...form, imageUrls: [...form.imageUrls, ...urls] });
                }}
              />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-5 w-5 rounded"
              />
              <Award className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300">Default measurement</div>
                <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Auto-select this for future orders</div>
              </div>
            </label>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-rose-600 to-pink-700"
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
                disabled={!form.customerId}
              >
                <Save className="h-4 w-4" />
                {editing ? 'Update' : 'Save Measurement'}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

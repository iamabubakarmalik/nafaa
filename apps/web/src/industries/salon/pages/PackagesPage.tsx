import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Plus, X, Save, Edit3, Trash2, RefreshCw, Sparkles, Star,
  DollarSign, Calendar, User, Phone, CheckCircle2, Search, Clock,
} from 'lucide-react';
import { packagesApi, type Package as SalonPkg } from '../api/packages.api';
import { salonServicesApi } from '../api/services.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

export default function PackagesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'packages' | 'purchases'>('packages');
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [editing, setEditing] = useState<SalonPkg | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<string>('ACTIVE');

  const { data: packages = [], isLoading: pkgLoading } = useQuery({
    queryKey: ['salon-packages'],
    queryFn: () => packagesApi.list({ active: true }),
  });

  const { data: purchases = [], isLoading: purLoading } = useQuery({
    queryKey: ['salon-package-purchases', purchaseStatus],
    queryFn: () => packagesApi.purchases({ status: purchaseStatus === 'all' ? undefined : purchaseStatus }),
    enabled: tab === 'purchases',
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => packagesApi.remove(id),
    onSuccess: () => { toast.success('Package removed'); queryClient.invalidateQueries({ queryKey: ['salon-packages'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Package className="h-3.5 w-3.5 text-amber-300" />
              Prepaid Bundles
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎁 Packages</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Bulk service bundles with sessions & validity</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {tab === 'packages' ? (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowPackageForm(true); }}>
                <Plus className="h-4 w-4" />
                New Package
              </Button>
            ) : (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPurchase(true)}>
                <Plus className="h-4 w-4" />
                Sell Package
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <button onClick={() => setTab('packages')} className={
          'px-4 py-2 rounded-xl text-sm font-extrabold transition ' +
          (tab === 'packages' ? 'bg-emerald-600 text-white shadow' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700')
        }>
          Packages ({packages.length})
        </button>
        <button onClick={() => setTab('purchases')} className={
          'px-4 py-2 rounded-xl text-sm font-extrabold transition ' +
          (tab === 'purchases' ? 'bg-emerald-600 text-white shadow' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700')
        }>
          Sold / Purchases
        </button>
      </div>

      {showPackageForm && (
        <PackageForm
          editing={editing}
          onClose={() => { setShowPackageForm(false); setEditing(null); }}
          onSaved={() => { setShowPackageForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['salon-packages'] }); }}
        />
      )}

      {showPurchase && (
        <PurchaseForm
          packages={packages}
          onClose={() => setShowPurchase(false)}
          onSaved={() => { setShowPurchase(false); queryClient.invalidateQueries({ queryKey: ['salon-package-purchases'] }); }}
        />
      )}

      {tab === 'packages' ? (
        pkgLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-72 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
          </div>
        ) : packages.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
            <Package className="h-16 w-16 text-slate-400 mx-auto mb-3" />
            <p className="font-extrabold text-slate-700">No packages yet</p>
            <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => { setEditing(null); setShowPackageForm(true); }}>
              <Plus className="h-4 w-4" />
              Create First Package
            </Button>
          </div>
        ) : (
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onEdit={() => { setEditing(pkg); setShowPackageForm(true); }}
                onDelete={() => { if (confirm('Remove "' + pkg.name + '"?')) removeMutation.mutate(pkg.id); }}
              />
            ))}
          </section>
        )
      ) : (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['ACTIVE', 'all', 'USED', 'EXPIRED', 'CANCELLED', 'REFUNDED'].map((s) => (
              <button key={s} onClick={() => setPurchaseStatus(s)} className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
                (purchaseStatus === s ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
              }>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>

          {purLoading ? (
            <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
          ) : purchases.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
              <Package className="h-16 w-16 text-slate-400 mx-auto mb-3" />
              <p className="font-extrabold text-slate-700">No package purchases</p>
            </div>
          ) : (
            <section className="grid gap-3">
              {purchases.map((p) => <PurchaseCard key={p.id} purchase={p} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PackageCard({ pkg, onEdit, onDelete }: any) {
  const savings = pkg.originalPrice ? pkg.originalPrice - pkg.price : 0;
  const savingsPct = pkg.originalPrice ? (savings / pkg.originalPrice) * 100 : 0;

  return (
    <div className={
      'group rounded-3xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl transition overflow-hidden ' +
      (pkg.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="relative aspect-video bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 overflow-hidden">
        {pkg.imageUrl ? (
          <img src={pkg.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-white/50" />
          </div>
        )}

        {pkg.isFeatured && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
            <Star className="h-2 w-2 fill-current" />
            Featured
          </span>
        )}

        {savings > 0 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-extrabold uppercase shadow">
            SAVE {savingsPct.toFixed(0)}%
          </span>
        )}

        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-slate-900/90 text-white flex items-center justify-center hover:bg-slate-900 shadow">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-600 shadow">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{pkg.name}</h3>
        {pkg.description && (
          <p className="text-xs text-slate-500 font-semibold line-clamp-2">{pkg.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Sessions</div>
            <div className="font-extrabold text-emerald-800 text-lg tabular-nums">{pkg.totalSessions}</div>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2">
            <div className="text-[9px] uppercase font-extrabold text-blue-700">Validity</div>
            <div className="font-extrabold text-blue-800 text-lg tabular-nums">{pkg.validityDays}d</div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
          <div>
            {pkg.originalPrice && pkg.originalPrice > pkg.price && (
              <div className="text-xs text-slate-400 line-through">{formatPKR(pkg.originalPrice)}</div>
            )}
            <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none">{formatPKR(pkg.price)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-extrabold text-slate-500">Sold</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{pkg.totalSold}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchaseCard({ purchase }: any) {
  const daysLeft = differenceInDays(new Date(purchase.expiryDate), new Date());
  const isExpiring = daysLeft <= 15 && daysLeft > 0 && purchase.status === 'ACTIVE';
  const progressPct = (purchase.sessionsUsed / (purchase.sessionsUsed + purchase.sessionsRemaining)) * 100 || 0;

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
      (isExpiring ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{purchase.purchaseNumber}</span>
              <span className={
                'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' +
                (purchase.status === 'ACTIVE' ? 'bg-emerald-600' :
                 purchase.status === 'USED' ? 'bg-blue-600' :
                 purchase.status === 'EXPIRED' ? 'bg-slate-500' :
                 'bg-rose-500')
              }>
                {purchase.status}
              </span>
              {isExpiring && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">
                  {daysLeft}d left
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{purchase.package?.name}</div>
            <div className="text-xs text-slate-500 font-semibold">
              Purchased: {format(new Date(purchase.purchaseDate), 'dd MMM yyyy')} • Expires: {format(new Date(purchase.expiryDate), 'dd MMM yyyy')}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(purchase.amountPaid)}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 mb-1">
          <span>Sessions Used: {purchase.sessionsUsed}</span>
          <span>Remaining: {purchase.sessionsRemaining}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600" style={{ width: progressPct + '%' }} />
        </div>
      </div>
    </div>
  );
}

function PackageForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    price: editing?.price ?? 0,
    originalPrice: editing?.originalPrice ?? '',
    totalSessions: editing?.totalSessions ?? 5,
    validityDays: editing?.validityDays ?? 90,
    imageUrl: editing?.imageUrl ?? '',
    isFeatured: editing?.isFeatured ?? false,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ['salon-services-for-package'],
    queryFn: () => salonServicesApi.list({ active: true }),
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if (!editing?.services) return [];
    return Array.isArray(editing.services) ? editing.services.map((s: any) => s.serviceId || s.id).filter(Boolean) : [];
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        totalSessions: Number(form.totalSessions),
        validityDays: Number(form.validityDays),
        services: selectedServiceIds.map((id) => ({ serviceId: id })),
      };
      return editing ? packagesApi.update(editing.id, payload) : packagesApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Package updated' : 'Package created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggleService = (id: string) => {
    setSelectedServiceIds(selectedServiceIds.includes(id) ? selectedServiceIds.filter((s) => s !== id) : [...selectedServiceIds, id]);
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Package' : 'New Package'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Package Name *" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Package Price *</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Original Price</label>
            <input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} placeholder="For showing savings" className="h-14 w-full rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Total Sessions *</label>
            <input type="number" value={form.totalSessions} onChange={(e) => setForm({ ...form, totalSessions: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Validity (days) *</label>
            <input type="number" value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Included Services ({selectedServiceIds.length})</label>
          <div className="max-h-60 overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-2 space-y-1">
            {allServices.map((svc) => (
              <label key={svc.id} className={
                'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ' +
                (selectedServiceIds.includes(svc.id) ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-slate-50 dark:hover:bg-neutral-800')
              }>
                <input type="checkbox" checked={selectedServiceIds.includes(svc.id)} onChange={() => toggleService(svc.id)} className="h-4 w-4 rounded" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold truncate">{svc.name}</div>
                  <div className="text-[10px] font-bold text-slate-500">{formatPKR(svc.price)}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Image</label>
          {form.imageUrl ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-200">
              <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, imageUrl: '' })} className="absolute top-2 right-2 h-8 w-8 rounded bg-rose-600 text-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, imageUrl: url });
            }} />
          )}
        </div>

        <label className={
          'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' +
          (form.isFeatured ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-neutral-700')
        }>
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-4 w-4 rounded" />
          <Star className={'h-4 w-4 ' + (form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
          <span className="text-sm font-extrabold">Featured Package</span>
        </label>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim() || !form.price}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function PurchaseForm({ packages, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({ packageId: '', customerId: '', amountPaid: 0, notes: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const selectedPkg = packages.find((p: any) => p.id === form.packageId);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-package', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showPicker,
  });

  const purchaseMutation = useMutation({
    mutationFn: () => packagesApi.purchase({
      packageId: form.packageId,
      customerId: form.customerId,
      amountPaid: Number(form.amountPaid) || (selectedPkg?.price ?? 0),
      notes: form.notes || undefined,
    }),
    onSuccess: () => { toast.success('Package sold'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">Sell Package</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Choose Package *</label>
          <div className="grid gap-2">
            {packages.map((pkg: any) => (
              <button key={pkg.id} onClick={() => setForm({ ...form, packageId: pkg.id, amountPaid: pkg.price })} className={
                'p-3 rounded-xl border-2 text-left ' +
                (form.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-emerald-300')
              }>
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold truncate">{pkg.name}</div>
                    <div className="text-xs text-slate-500 font-bold">{pkg.totalSessions} sessions • {pkg.validityDays}d validity</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(pkg.price)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Customer *</label>
          {selectedCustomer ? (
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 flex items-center gap-3">
              <User className="h-5 w-5 text-emerald-600" />
              <div className="flex-1">
                <div className="font-extrabold">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div className="text-xs text-slate-600 font-bold">{selectedCustomer.phone}</div>}
              </div>
              <button onClick={() => { setSelectedCustomer(null); setForm({ ...form, customerId: '' }); }} className="text-xs font-extrabold text-emerald-600 hover:underline">Change</button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowPicker(!showPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-emerald-400">
                <Search className="h-4 w-4 inline mr-1" />
                Search Customer
              </button>
              {showPicker && (
                <div className="mt-2 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-3 space-y-2">
                  <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {(customersData?.items ?? []).map((c) => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setForm({ ...form, customerId: c.id }); setShowPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
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
        </div>

        {selectedPkg && (
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Amount Paid *</label>
            <input type="number" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        )}

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => purchaseMutation.mutate()} loading={purchaseMutation.isPending} disabled={!form.packageId || !form.customerId}>
            <CheckCircle2 className="h-4 w-4" />
            Confirm Sale
          </Button>
        </div>
      </div>
    </section>
  );
}

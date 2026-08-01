import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, X, User, Phone, MapPin, Sofa, Ruler,
  Palette, DollarSign, Calendar, Hammer, Image as ImageIcon,
  ClipboardList, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { customOrdersApi } from '../api/custom-orders.api';
import { carpentersApi } from '../api/carpenters.api';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

export default function CustomOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    customerId: '', customerName: '', customerPhone: '', customerAddress: '', customerCnic: '',
    productType: '', description: '', categoryType: '',
    material: '', woodType: '', colorRequested: '', polishRequested: '', upholsteryFabric: '',
    lengthCm: '', widthCm: '', heightCm: '', customDimensions: '',
    sketchUrls: [] as string[], referenceImages: [] as string[], designNotes: '',
    quotedPrice: 0, depositAmount: 0, estimatedDays: 30,
    carpenterId: '', workshopLocation: '',
    deliveryAddress: '', deliveryCity: '', deliveryArea: '',
    requiresInstallation: true, installationCharge: 0, warrantyMonths: 6,
    notes: '',
  });

  const { data: existing } = useQuery({
    queryKey: ['custom-order', id], queryFn: () => customOrdersApi.getOne(id!), enabled: isEdit,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'], queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const { data: carpenters = [] } = useQuery({
    queryKey: ['carpenters-active'], queryFn: () => carpentersApi.list({ active: true }),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        customerId: existing.customerId ?? '', customerName: existing.customerName,
        customerPhone: existing.customerPhone, customerAddress: existing.customerAddress ?? '',
        customerCnic: existing.customerCnic ?? '',
        productType: existing.productType, description: existing.description,
        categoryType: existing.categoryType ?? '',
        material: existing.material ?? '', woodType: existing.woodType ?? '',
        colorRequested: existing.colorRequested ?? '', polishRequested: existing.polishRequested ?? '',
        upholsteryFabric: existing.upholsteryFabric ?? '',
        lengthCm: existing.lengthCm as any ?? '', widthCm: existing.widthCm as any ?? '', heightCm: existing.heightCm as any ?? '',
        customDimensions: existing.customDimensions ?? '',
        sketchUrls: existing.sketchUrls ?? [], referenceImages: existing.referenceImages ?? [],
        designNotes: existing.designNotes ?? '',
        quotedPrice: existing.quotedPrice, depositAmount: existing.depositAmount, estimatedDays: existing.estimatedDays,
        carpenterId: existing.carpenterId ?? '', workshopLocation: existing.workshopLocation ?? '',
        deliveryAddress: existing.deliveryAddress ?? '', deliveryCity: existing.deliveryCity ?? '', deliveryArea: existing.deliveryArea ?? '',
        requiresInstallation: existing.requiresInstallation, installationCharge: existing.installationCharge ?? 0,
        warrantyMonths: existing.warrantyMonths, notes: existing.notes ?? '',
      });
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => customOrdersApi.create(form as any),
    onSuccess: (result) => {
      toast.success('Order created');
      qc.invalidateQueries({ queryKey: ['custom-orders-list'] });
      navigate(`/furniture/custom-orders/${result.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const balance = form.quotedPrice - form.depositAmount;
  const canSave = form.customerName.trim() && form.customerPhone.trim() && form.productType.trim() && form.description.trim() && form.quotedPrice > 0 && form.estimatedDays > 0;

  return (
    <div className="space-y-5 pb-24">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <button onClick={() => navigate('/furniture/custom-orders')}
            className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/20">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ClipboardList className="h-3.5 w-3.5 text-amber-300" /> {isEdit ? 'Edit Custom Order' : 'New Custom Order'}
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">📋 Custom Furniture Order</h1>
            <p className="mt-1 text-sm text-white/80 font-semibold">Create quotation, take deposit, schedule production</p>
          </div>
        </div>
      </section>

      <div className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-violet-700 shrink-0 mt-0.5" />
        <div className="text-sm text-violet-900">
          <div className="font-extrabold mb-1">Order flow</div>
          <div className="font-semibold">Quotation → Deposit → Assign Carpenter → In Production → Ready → Delivery → Completed</div>
        </div>
      </div>

      {/* Customer */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead n="1" icon={User} title="Customer Details" tone="violet" />
        <div>
          <Lbl>Existing Customer <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
          <select value={form.customerId}
            onChange={(e) => {
              const c = customers.find((x: any) => x.id === e.target.value);
              setForm({
                ...form, customerId: e.target.value,
                customerName: c?.name || form.customerName,
                customerPhone: c?.phone || form.customerPhone,
                customerAddress: (c as any)?.address || form.customerAddress,
              });
            }}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
            <option value="">Walk-in / new customer</option>
            {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>))}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Full Name *</Lbl>
            <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Customer name"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <Lbl>Phone *</Lbl>
            <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              placeholder="03XX XXXXXXX"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <Lbl>CNIC <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <input value={form.customerCnic} onChange={(e) => setForm({ ...form, customerCnic: e.target.value })}
              placeholder="XXXXX-XXXXXXX-X"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <Lbl>Address</Lbl>
            <input value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
              placeholder="Full address"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
        </div>
      </section>

      {/* Product */}
      <section className="rounded-2xl bg-white border-2 border-amber-300 shadow-sm p-5 space-y-4">
        <SectionHead n="2" icon={Sofa} title="Product Details" tone="amber" />
        <div>
          <Lbl>Product Type *</Lbl>
          <input value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })}
            placeholder="Custom 7-Seater L-Shape Sofa Set"
            className="h-14 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-lg font-extrabold focus:outline-none focus:border-amber-600" />
        </div>
        <div>
          <Lbl>Description *</Lbl>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Full description of what customer wants..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Material</Lbl>
            <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
              <option value="">Not specified</option>
              <option value="SOLID_WOOD_SHEESHAM">Sheesham</option>
              <option value="SOLID_WOOD_TEAK">Teak</option>
              <option value="SOLID_WOOD_ROSEWOOD">Rosewood</option>
              <option value="MDF">MDF</option>
              <option value="LEATHER_GENUINE">Real Leather</option>
              <option value="FABRIC_VELVET">Velvet Fabric</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>
          <div>
            <Lbl>Wood Type</Lbl>
            <input value={form.woodType} onChange={(e) => setForm({ ...form, woodType: e.target.value })}
              placeholder="Sheesham / Teak"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <Lbl>Color Requested</Lbl>
            <input value={form.colorRequested} onChange={(e) => setForm({ ...form, colorRequested: e.target.value })}
              placeholder="Walnut brown"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <Lbl>Polish Type</Lbl>
            <input value={form.polishRequested} onChange={(e) => setForm({ ...form, polishRequested: e.target.value })}
              placeholder="Semi-gloss / Matte"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div className="sm:col-span-2">
            <Lbl>Upholstery Fabric</Lbl>
            <input value={form.upholsteryFabric} onChange={(e) => setForm({ ...form, upholsteryFabric: e.target.value })}
              placeholder="Velvet, Linen, Leather..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
        </div>
      </section>

      {/* Dimensions */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead n="3" icon={Ruler} title="Dimensions" tone="blue" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl>Length (cm)</Lbl>
            <input type="number" value={form.lengthCm}
              onChange={(e) => setForm({ ...form, lengthCm: e.target.value === '' ? '' : Number(e.target.value) as any })}
              placeholder="200"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <Lbl>Width (cm)</Lbl>
            <input type="number" value={form.widthCm}
              onChange={(e) => setForm({ ...form, widthCm: e.target.value === '' ? '' : Number(e.target.value) as any })}
              placeholder="90"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <Lbl>Height (cm)</Lbl>
            <input type="number" value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value === '' ? '' : Number(e.target.value) as any })}
              placeholder="85"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div>
          <Lbl>Custom Dimensions Notes</Lbl>
          <input value={form.customDimensions} onChange={(e) => setForm({ ...form, customDimensions: e.target.value })}
            placeholder="Any special sizing requirements..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
        </div>
      </section>

      {/* Sketches & References */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead n="4" icon={ImageIcon} title="Sketches & References" tone="rose" />
        <div>
          <Lbl>Customer Sketches</Lbl>
          <UploadDropzone purpose="custom-order-sketch" maxFiles={6}
            onUploaded={(recs: any[]) => setForm({ ...form, sketchUrls: [...form.sketchUrls, ...recs.map((r) => r.url)] })}
            hint="Upload customer's hand-drawn sketches" />
          {form.sketchUrls.length > 0 && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {form.sketchUrls.map((url, i) => (
                <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, sketchUrls: form.sketchUrls.filter((_, x) => x !== i) })}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <Lbl>Reference Images (from magazines, catalogues, etc.)</Lbl>
          <UploadDropzone purpose="custom-order-reference" maxFiles={6}
            onUploaded={(recs: any[]) => setForm({ ...form, referenceImages: [...form.referenceImages, ...recs.map((r) => r.url)] })}
            hint="Inspiration images" />
          {form.referenceImages.length > 0 && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {form.referenceImages.map((url, i) => (
                <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, referenceImages: form.referenceImages.filter((_, x) => x !== i) })}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <Lbl>Design Notes</Lbl>
          <textarea rows={2} value={form.designNotes} onChange={(e) => setForm({ ...form, designNotes: e.target.value })}
            placeholder="Any special design requirements, patterns, motifs..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500" />
        </div>
      </section>

      {/* Pricing & Timeline */}
      <section className="rounded-2xl bg-white border-2 border-emerald-300 shadow-sm p-5 space-y-4">
        <SectionHead n="5" icon={DollarSign} title="Pricing & Timeline" tone="emerald" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl tone="emerald">Quoted Price *</Lbl>
            <input type="number" value={form.quotedPrice}
              onChange={(e) => setForm({ ...form, quotedPrice: Number(e.target.value) })}
              className="h-14 w-full rounded-xl border-2 border-emerald-400 bg-emerald-50 px-3 text-2xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600" />
          </div>
          <div>
            <Lbl>Deposit Amount</Lbl>
            <input type="number" value={form.depositAmount}
              onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })}
              className="h-14 w-full rounded-xl border-2 border-slate-200 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            <div className="mt-1 flex gap-1">
              {[25, 50, 75, 100].map((pct) => (
                <button key={pct} type="button" onClick={() => setForm({ ...form, depositAmount: Math.round(form.quotedPrice * pct / 100) })}
                  className="flex-1 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold">
                  {pct}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <Lbl>Estimated Days *</Lbl>
            <input type="number" value={form.estimatedDays}
              onChange={(e) => setForm({ ...form, estimatedDays: Number(e.target.value) })}
              className="h-14 w-full rounded-xl border-2 border-slate-200 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        {form.quotedPrice > 0 && (
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1">
            <div className="flex justify-between text-xs font-bold"><span className="text-slate-600">Quoted</span><span className="tabular-nums">{formatPKR(form.quotedPrice)}</span></div>
            <div className="flex justify-between text-xs font-bold"><span className="text-slate-600">Deposit</span><span className="text-emerald-700 tabular-nums">-{formatPKR(form.depositAmount)}</span></div>
            <div className="pt-1 border-t border-slate-200 flex justify-between text-sm font-extrabold">
              <span>Balance</span>
              <span className="text-rose-700 tabular-nums">{formatPKR(balance)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Carpenter Assignment */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead n="6" icon={Hammer} title="Assign Carpenter" tone="orange" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Carpenter <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <select value={form.carpenterId} onChange={(e) => setForm({ ...form, carpenterId: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
              <option value="">Not assigned yet</option>
              {(carpenters as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.activeProjects} active)</option>))}
            </select>
          </div>
          <div>
            <Lbl>Workshop Location</Lbl>
            <input value={form.workshopLocation} onChange={(e) => setForm({ ...form, workshopLocation: e.target.value })}
              placeholder="Main workshop"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
        </div>
      </section>

      {/* Delivery & Installation */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead n="7" icon={MapPin} title="Delivery & Installation" tone="blue" />
        <div>
          <Lbl>Delivery Address</Lbl>
          <textarea rows={2} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
            placeholder="Full delivery address..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.deliveryCity} onChange={(e) => setForm({ ...form, deliveryCity: e.target.value })}
            placeholder="City"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.deliveryArea} onChange={(e) => setForm({ ...form, deliveryArea: e.target.value })}
            placeholder="Area / Sector"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
            <input type="checkbox" checked={form.requiresInstallation}
              onChange={(e) => setForm({ ...form, requiresInstallation: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-xs font-extrabold text-slate-700">Requires Installation</span>
          </label>
          <div>
            <Lbl>Installation Charge</Lbl>
            <input type="number" value={form.installationCharge}
              onChange={(e) => setForm({ ...form, installationCharge: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <Lbl>Warranty (months)</Lbl>
            <input type="number" value={form.warrantyMonths}
              onChange={(e) => setForm({ ...form, warrantyMonths: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-5">
        <Lbl>Additional Notes</Lbl>
        <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any special instructions, terms, or notes..."
          className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/furniture/custom-orders')}>Cancel</Button>
          <Button className="bg-gradient-to-r from-violet-600 to-purple-800"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            <Save className="h-4 w-4" /> Create Order
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ n, icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-600 to-orange-800',
    blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-teal-700',
    orange: 'from-orange-500 to-red-700',
    rose: 'from-rose-500 to-red-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
        <span className="text-slate-400">{n}.</span> {title}
      </h3>
    </div>
  );
}

function Lbl({ children, tone }: any) {
  return <label className={`block text-xs font-extrabold uppercase tracking-wider mb-1.5 ${tone === 'emerald' ? 'text-emerald-700' : 'text-slate-600'}`}>{children}</label>;
}

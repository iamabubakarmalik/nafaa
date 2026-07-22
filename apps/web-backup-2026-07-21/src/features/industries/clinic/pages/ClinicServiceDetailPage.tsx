import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Trash2, Stethoscope, Star, TrendingUp, Sparkles,
  Clock, Package, DollarSign, Eye, ExternalLink, CheckCircle2, XCircle,
  Calendar, Ban, FileText, ShieldAlert, Baby, RefreshCw, Users, Info,
  Video, Home, Zap, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { productsApi } from '@/api/products.api';
import { clinicServicesApi } from '../api/services.api';
import { SERVICE_CATEGORIES } from '../api/constants';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

export default function ClinicServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: service } = useQuery({
    queryKey: ['clinic-service-by-product', id],
    queryFn: () => clinicServicesApi.byProduct(id!).catch(() => null),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: () => {
      toast.success('Service removed');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-cyan-200 border-t-cyan-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Stethoscope className="h-16 w-16 text-slate-300" />
        <p className="font-extrabold text-slate-700">Service not found</p>
        <Link to="/products" className="text-cyan-600 font-bold hover:underline">← Back</Link>
      </div>
    );
  }

  const category = SERVICE_CATEGORIES.find((c) => c.value === service?.category);
  const images = product.images ?? [];
  const currentImage = images[activeImage]?.url;

  const priceOptions = service ? [
    { key: 'base', price: service.basePrice, label: 'Base Price', emoji: '🩺' },
    { key: 'followUp', price: service.followUpPrice, label: 'Follow-up', emoji: '🔁' },
    { key: 'emergency', price: service.emergencyPrice, label: 'Emergency', emoji: '🚨' },
    { key: 'telemedicine', price: service.telemedicinePrice, label: 'Telemedicine', emoji: '📹' },
    { key: 'homeVisit', price: service.homeVisitPrice, label: 'Home Visit', emoji: '🏠' },
    { key: 'discounted', price: service.discountedPrice, label: 'Discounted', emoji: '💰' },
  ].filter((o) => o.price && Number(o.price) > 0) : [];

  return (
    <ErrorBoundary>
      <div className="space-y-5 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-600 font-bold transition">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/catalog" target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-cyan-50 border-2 border-cyan-200 px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-100">
              <Eye className="h-3.5 w-3.5" /> Catalog <ExternalLink className="h-3 w-3" />
            </Link>
            <Link to={'/clinic-services/' + id + '/edit'}>
              <Button className="bg-gradient-to-r from-cyan-600 to-blue-700">
                <Edit3 className="h-4 w-4" /> Edit
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => { if (confirm('Delete "' + product.name + '"?')) removeMutation.mutate(); }} className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative grid lg:grid-cols-[1fr_1fr] gap-6 items-start">
            <div>
              <div className={'relative aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br ' + (category?.color || 'from-cyan-400 to-blue-500')}>
                {currentImage ? (
                  <img src={currentImage} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-9xl">{category?.emoji || '🩺'}</div>
                )}
                {service?.isFeatured && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-1 shadow-lg">
                    <Star className="h-3 w-3 fill-white" /> FEATURED
                  </div>
                )}
                {service?.isPopular && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-1 shadow-lg">
                    <TrendingUp className="h-3 w-3" /> POPULAR
                  </div>
                )}
                {service?.durationMin && (
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg">
                    <Clock className="h-3.5 w-3.5" /> {service.durationMin} min
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {images.map((img: any, idx: number) => (
                    <button
                      key={img.id ?? idx}
                      onClick={() => setActiveImage(idx)}
                      className={'shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition ' + (activeImage === idx ? 'border-white shadow-lg scale-105' : 'border-white/30 opacity-70 hover:opacity-100')}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                    🩺 Clinical Service
                  </div>
                  {category && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-extrabold border border-white/20">
                      {category.emoji} {category.label}
                    </div>
                  )}
                  {!product.isActive && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-rose-500/30 px-2.5 py-0.5 text-xs font-extrabold border border-rose-300/40">
                      <XCircle className="h-3 w-3" /> INACTIVE
                    </div>
                  )}
                </div>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
                {service?.subcategory && (
                  <div className="mt-1 text-sm font-bold text-white/80">{service.subcategory}</div>
                )}
                {service?.serviceCode && (
                  <div className="mt-1 text-xs font-mono font-bold text-cyan-300">Code: {service.serviceCode}</div>
                )}
              </div>

              {(service?.descriptionLong || product.description) && (
                <p className="text-sm text-white/85 leading-relaxed">{service?.descriptionLong || product.description}</p>
              )}

              {service?.basePrice && (
                <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-4">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Base Price</div>
                  <div className="text-4xl font-extrabold tabular-nums text-emerald-300 mt-1">
                    {formatPKRFull(service.basePrice)}
                  </div>
                  {service.discountedPrice && (
                    <div className="text-xs font-bold text-amber-300 mt-1">Discounted: {formatPKR(service.discountedPrice)}</div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {service?.requiresDoctor && <Badge label="👨‍⚕️ Doctor Required" />}
                {service?.requiresAppointment && <Badge label="📅 Appointment" />}
                {service?.requiresFasting && <Badge label="🚫 Fasting" />}
              </div>
            </div>
          </div>
        </section>

        {/* PRICING TIERS */}
        {priceOptions.length > 0 && (
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Pricing Tiers</h3>
                <p className="text-[11px] text-slate-500 font-semibold">{priceOptions.length} tier(s) available</p>
              </div>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {priceOptions.map((opt) => (
                <div key={opt.key} className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 hover:border-cyan-300 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="text-xs font-extrabold text-slate-700 uppercase">{opt.label}</div>
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">
                    {formatPKR(Number(opt.price))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* REQUIREMENTS */}
        {service && (
          <section className="rounded-3xl bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-2 border-blue-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-200/60">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Requirements</h3>
                <p className="text-[11px] text-slate-500 font-semibold">What is needed</p>
              </div>
            </div>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <ReqBadge active={service.requiresDoctor} label="Doctor Required" emoji="👨‍⚕️" />
              <ReqBadge active={service.requiresAppointment} label="Appointment" emoji="📅" />
              <ReqBadge active={service.requiresFasting} label="Fasting" emoji="🚫" />
            </div>

            {service.prepInstructions && (
              <div className="mt-4 rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
                <div className="text-xs uppercase font-extrabold text-amber-700 mb-1">Pre-Service Instructions</div>
                <p className="text-sm text-amber-900 leading-relaxed">{service.prepInstructions}</p>
              </div>
            )}
            {service.postCareInstructions && (
              <div className="mt-3 rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3">
                <div className="text-xs uppercase font-extrabold text-emerald-700 mb-1">Post-Service Care</div>
                <p className="text-sm text-emerald-900 leading-relaxed">{service.postCareInstructions}</p>
              </div>
            )}
          </section>
        )}

        {/* PACKAGE INCLUDES */}
        {service?.packageIncludes && service.packageIncludes.length > 0 && (
          <section className="rounded-3xl bg-white border-2 border-violet-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-violet-200/60">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Package Includes</h3>
                <p className="text-[11px] text-slate-500 font-semibold">{service.packageIncludes.length} items</p>
              </div>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              {service.packageIncludes.map((item: string) => (
                <div key={item} className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-200 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-bold text-slate-800">{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WARNINGS */}
        {(service?.contraindications || service?.sideEffects) && (
          <section className="rounded-3xl bg-red-50 border-2 border-red-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-red-200/60">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Warnings</h3>
              </div>
            </div>
            {service.contraindications && (
              <div className="mt-4">
                <div className="text-xs uppercase font-extrabold text-red-700 mb-1">Contraindications</div>
                <p className="text-sm text-red-900 leading-relaxed">{service.contraindications}</p>
              </div>
            )}
            {service.sideEffects && (
              <div className="mt-3">
                <div className="text-xs uppercase font-extrabold text-red-700 mb-1">Side Effects</div>
                <p className="text-sm text-red-900 leading-relaxed">{service.sideEffects}</p>
              </div>
            )}
          </section>
        )}

        {/* META */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetaRow label="SKU" value={product.sku || '—'} mono />
            <MetaRow label="Barcode" value={product.barcode || '—'} mono />
            <MetaRow label="Unit" value={product.unit} />
            <MetaRow label="Tax Rate" value={(product.taxRate ?? 0) + '%'} />
            <MetaRow label="Category" value={product.category?.name || '—'} />
            <MetaRow label="Brand" value={product.brand?.name || '—'} />
            <MetaRow label="Duration" value={service?.durationMin ? service.durationMin + ' min' : '—'} />
            <MetaRow label="Created" value={new Date(product.createdAt).toLocaleDateString('en-PK')} />
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur border border-white/30 px-2.5 py-1 text-[11px] font-extrabold">
      {label}
    </span>
  );
}

function ReqBadge({ active, label, emoji }: any) {
  return (
    <div className={'rounded-xl border-2 p-3 flex items-center gap-2 ' + (active ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-white opacity-50')}>
      <span className="text-lg">{emoji}</span>
      <div className={'text-xs font-extrabold ' + (active ? 'text-cyan-900' : 'text-slate-500 line-through')}>
        {label}
      </div>
      {active ? <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" /> : <XCircle className="h-4 w-4 text-slate-400 ml-auto" />}
    </div>
  );
}

function MetaRow({ label, value, mono }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{label}</div>
      <div className={'mt-1 text-sm font-extrabold text-slate-900 ' + (mono ? 'font-mono' : '')}>{value}</div>
    </div>
  );
}

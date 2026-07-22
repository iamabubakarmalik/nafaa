import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Trash2, Wrench, Star, TrendingUp, Zap,
  Clock, Shield, DollarSign, Eye, ExternalLink, Award, Package,
  CheckCircle2, XCircle, GraduationCap, FileText, Sparkles, Timer,
  Monitor, Home, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { catalogApi } from '../api/catalog.api';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

const BIZ_EMOJI: Record<string, string> = {
  ELECTRICIAN: '⚡', PLUMBER: '🔧', AC_TECHNICIAN: '❄️', APPLIANCE_REPAIR: '📺',
  MOBILE_REPAIR: '📱', COMPUTER_REPAIR: '💻', IT_SERVICES: '🖥️', CLEANING: '🧹',
  PEST_CONTROL: '🐜', CARPENTRY: '🪚', PAINTING: '🎨', MASONRY: '🧱',
  CCTV_INSTALLATION: '📹', SOLAR_INSTALLATION: '☀️', HVAC: '🌬️',
  AUTOMOBILE_MECHANIC: '🚗', MOTORCYCLE_MECHANIC: '🏍️', OTHER: '🛠️',
};

const CAT_EMOJI: Record<string, string> = {
  INSTALLATION: '🔧', REPAIR: '🛠️', MAINTENANCE: '⚙️', INSPECTION: '🔍',
  CLEANING_SERVICE: '🧹', UPGRADE: '⬆️', REPLACEMENT: '🔄', DIAGNOSTIC: '📊',
  EMERGENCY: '🚨', CONSULTATION: '💬', AMC_VISIT: '🛡️', OTHER_SERVICE: '⭐',
};

export default function ServicesBizServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: service, isLoading } = useQuery({
    queryKey: ['catalog-service', id],
    queryFn: () => catalogApi.getOne(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => catalogApi.remove(id!),
    onSuccess: () => {
      toast.success('Service removed');
      queryClient.invalidateQueries({ queryKey: ['catalog-services'] });
      navigate('/services-biz/catalog');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-cyan-200 border-t-cyan-600 animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Wrench className="h-16 w-16 text-slate-300" />
        <p className="font-extrabold text-slate-700">Service not found</p>
        <Link to="/services-biz/catalog" className="text-cyan-600 font-bold hover:underline">← Back to services</Link>
      </div>
    );
  }

  const image = service.imageUrl || service.imageUrls?.[0];
  const bizEmoji = BIZ_EMOJI[service.businessType || ''] || '🛠️';
  const catEmoji = CAT_EMOJI[service.category] || '🔧';
  const minPrice = [service.baseCharge, service.hourlyRate, service.visitCharge]
    .map((x) => Number(x || 0)).filter((x) => x > 0).sort((a, b) => a - b)[0] || 0;

  return (
    <ErrorBoundary>
      <div className="space-y-5 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link to="/services-biz/catalog" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-600 font-bold transition">
            <ArrowLeft className="h-4 w-4" /> Back to Catalog
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/catalog" target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-cyan-50 border-2 border-cyan-200 px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-100">
              <Eye className="h-3.5 w-3.5" /> Customer View <ExternalLink className="h-3 w-3" />
            </Link>
            <Link to={`/services-biz-services/${id}/edit`}>
              <Button className="bg-gradient-to-r from-cyan-600 to-blue-700">
                <Edit3 className="h-4 w-4" /> Edit Service
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                if (confirm(`Delete "${service.name}"?`)) removeMutation.mutate();
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

          <div className="relative grid lg:grid-cols-[1fr_1fr] gap-6 items-start">
            <div>
              <div className="relative aspect-video rounded-3xl bg-gradient-to-br from-cyan-100 to-blue-100 overflow-hidden shadow-2xl">
                {image ? (
                  <img src={image} alt={service.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">{bizEmoji}</div>
                )}
                {service.isFeatured && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-1 shadow-lg">
                    <Star className="h-3 w-3 fill-white" /> FEATURED
                  </div>
                )}
                {service.isPopular && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-1 shadow-lg">
                    <TrendingUp className="h-3 w-3" /> POPULAR
                  </div>
                )}
                {service.isEmergency && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold uppercase inline-flex items-center gap-1 shadow-lg animate-pulse">
                    <Zap className="h-3 w-3" /> EMERGENCY
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                    🛠️ Service
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur px-2.5 py-0.5 text-xs font-extrabold border border-white/20">
                    {catEmoji} {service.category.replace('_', ' ')}
                  </div>
                  {service.businessType && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur px-2.5 py-0.5 text-xs font-extrabold border border-white/20">
                      {bizEmoji} {service.businessType.replace(/_/g, ' ')}
                    </div>
                  )}
                  {!service.isActive && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-rose-500/30 backdrop-blur px-2.5 py-0.5 text-xs font-extrabold border border-rose-300/40">
                      <XCircle className="h-3 w-3" /> INACTIVE
                    </div>
                  )}
                </div>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{service.name}</h1>
                {service.code && (
                  <div className="mt-1 text-sm font-mono font-bold text-white/80">{service.code}</div>
                )}
              </div>

              {service.description && (
                <p className="text-sm text-white/85 leading-relaxed">{service.description}</p>
              )}

              <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-4">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">
                  {service.chargeType.replace('_', ' ')} • Starting At
                </div>
                <div className="text-4xl font-extrabold tabular-nums text-emerald-300 mt-1">
                  {formatPKRFull(minPrice)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
                  <Clock className="h-4 w-4 text-cyan-300 mx-auto mb-1" />
                  <div className="font-extrabold">{service.estimatedDurationMin}min</div>
                  <div className="text-[9px] font-bold text-white/70 uppercase">Duration</div>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
                  <GraduationCap className="h-4 w-4 text-violet-300 mx-auto mb-1" />
                  <div className="font-extrabold">{service.requiredSkillLevel}</div>
                  <div className="text-[9px] font-bold text-white/70 uppercase">Skill</div>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
                  <Shield className="h-4 w-4 text-emerald-300 mx-auto mb-1" />
                  <div className="font-extrabold">{service.warrantyDays}d</div>
                  <div className="text-[9px] font-bold text-white/70 uppercase">Warranty</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {service.isRemoteAvailable && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/25 backdrop-blur border border-blue-300/50 px-2.5 py-1 text-[11px] font-extrabold">💻 Remote OK</span>}
                {service.requiresLicense && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 backdrop-blur border border-amber-300/50 px-2.5 py-1 text-[11px] font-extrabold">🎓 License</span>}
                {service.requiresQuote && <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/25 backdrop-blur border border-violet-300/50 px-2.5 py-1 text-[11px] font-extrabold">📝 Quote-based</span>}
                {service.requiresAdvance && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 backdrop-blur border border-emerald-300/50 px-2.5 py-1 text-[11px] font-extrabold">💰 {service.advancePct}% Advance</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Pricing Details</h3>
              <p className="text-[11px] text-slate-500 font-semibold">All charge tiers and surcharges</p>
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Number(service.baseCharge) > 0 && <PriceTile label="Base / Fixed" emoji="💵" value={service.baseCharge} tone="emerald" />}
            {Number(service.hourlyRate) > 0 && <PriceTile label="Hourly Rate" emoji="⏱️" value={service.hourlyRate} tone="cyan" />}
            {Number(service.visitCharge) > 0 && <PriceTile label="Visit Charge" emoji="🚗" value={service.visitCharge} tone="blue" />}
            {Number(service.minCharge) > 0 && <PriceTile label="Minimum" emoji="🔻" value={service.minCharge} tone="amber" />}
            {service.maxCharge && Number(service.maxCharge) > 0 && <PriceTile label="Maximum (cap)" emoji="🔺" value={service.maxCharge} tone="violet" />}
            {Number(service.emergencyCharge) > 0 && <PriceTile label="Emergency" emoji="🚨" value={service.emergencyCharge} tone="red" />}
            {Number(service.weekendCharge) > 0 && <PriceTile label="Weekend" emoji="📅" value={service.weekendCharge} tone="amber" />}
            {Number(service.nightCharge) > 0 && <PriceTile label="Night Hours" emoji="🌙" value={service.nightCharge} tone="violet" />}
            {Number(service.outOfCityCharge) > 0 && <PriceTile label="Out of City" emoji="🚚" value={service.outOfCityCharge} tone="blue" />}
          </div>
        </section>

        {service.requiredTools?.length > 0 && (
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-md">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Required Tools ({service.requiredTools.length})</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Tools needed for this service</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {service.requiredTools.map((t: string) => (
                <span key={t} className="inline-flex items-center px-3 py-1.5 rounded-lg border-2 border-orange-200 bg-orange-50 text-xs font-extrabold text-orange-900">
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {service.requiredParts?.length > 0 && (
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Common Parts ({service.requiredParts.length})</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Typical parts/materials used</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {service.requiredParts.map((p: string) => (
                <span key={p} className="inline-flex items-center px-3 py-1.5 rounded-lg border-2 border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-900">
                  {p}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-green-50 border-2 border-emerald-200 shadow-sm p-5">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-emerald-200/60">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Warranty & Guarantee</h3>
              <p className="text-[11px] text-slate-500 font-semibold">Service coverage terms</p>
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <InfoTile icon={Timer} label="Warranty Days" value={`${service.warrantyDays} days`} tone="emerald" />
            <InfoTile icon={Shield} label="Warranty Type" value={service.warrantyType.replace('_', ' ')} tone="teal" />
            <InfoTile icon={Award} label="Total Jobs Done" value={String(service.totalJobs || 0)} tone="cyan" />
          </div>
          {service.warrantyTerms && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 mb-1">Warranty Terms</div>
              <p className="text-sm text-slate-700 leading-relaxed">{service.warrantyTerms}</p>
            </div>
          )}
          {service.requiresLicense && service.licenseType && (
            <div className="mt-4 rounded-xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-2">
              <GraduationCap className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-900">Required License:</strong>
                <div className="text-amber-800 font-semibold text-sm mt-0.5">{service.licenseType}</div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetaRow label="Code" value={service.code || '—'} mono />
            <MetaRow label="Category" value={service.category.replace('_', ' ')} />
            <MetaRow label="Business Type" value={service.businessType?.replace(/_/g, ' ') || '—'} />
            <MetaRow label="Charge Type" value={service.chargeType.replace('_', ' ')} />
            <MetaRow label="Total Revenue" value={formatPKR(service.totalRevenue || 0)} />
            <MetaRow label="Avg Rating" value={service.avgRating ? service.avgRating.toFixed(1) + ' ⭐' : '—'} />
            <MetaRow label="Created" value={new Date(service.createdAt).toLocaleDateString('en-PK')} />
            <MetaRow label="Updated" value={new Date(service.updatedAt).toLocaleDateString('en-PK')} />
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}

function PriceTile({ label, emoji, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    red: 'border-red-200 bg-red-50 text-red-800',
  };
  return (
    <div className={'rounded-2xl border-2 p-4 ' + tones[tone]}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{emoji}</span>
        <div className="text-xs font-extrabold uppercase tracking-wider">{label}</div>
      </div>
      <div className="text-2xl font-extrabold tabular-nums">{formatPKR(Number(value))}</div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    teal: 'text-teal-700 bg-teal-50 border-teal-200',
    cyan: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  };
  const [text, bg, border] = tones[tone].split(' ');
  return (
    <div className={'rounded-2xl border-2 p-3 ' + bg + ' ' + border}>
      <div className={'inline-flex items-center gap-1.5 ' + text}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase tracking-wider font-extrabold">{label}</span>
      </div>
      <div className={'mt-1 text-lg font-extrabold ' + text}>{value}</div>
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

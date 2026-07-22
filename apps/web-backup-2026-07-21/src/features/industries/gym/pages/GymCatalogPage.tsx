import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Target, Flame, Users, Award, Star, Sparkles, Clock, MessageCircle,
  Search, X, Heart, Check, Snowflake, Zap, ShieldCheck, Calendar, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { membershipPlansApi } from '../api/membership-plans.api';
import { trainersApi } from '../api/trainers.api';
import { classesApi } from '../api/classes.api';
import { useAuthStore } from '@/store/auth.store';

const PLAN_TYPE_EMOJI: Record<string, { emoji: string; gradient: string }> = {
  DAILY: { emoji: '☀️', gradient: 'from-amber-400 to-orange-500' },
  WEEKLY: { emoji: '📅', gradient: 'from-blue-400 to-cyan-500' },
  MONTHLY: { emoji: '📆', gradient: 'from-emerald-400 to-teal-500' },
  QUARTERLY: { emoji: '🗓️', gradient: 'from-violet-400 to-purple-500' },
  HALF_YEARLY: { emoji: '📊', gradient: 'from-pink-400 to-fuchsia-500' },
  YEARLY: { emoji: '🏆', gradient: 'from-amber-500 to-yellow-600' },
  LIFETIME: { emoji: '💎', gradient: 'from-cyan-500 to-blue-600' },
};

export default function GymCatalogPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const [tab, setTab] = useState<'plans' | 'trainers' | 'classes'>('plans');
  const [search, setSearch] = useState('');
  const [inquirePlan, setInquirePlan] = useState<any>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ['catalog-plans'],
    queryFn: () => membershipPlansApi.list({ active: true }),
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['catalog-trainers'],
    queryFn: () => trainersApi.list({ available: true }),
    enabled: tab === 'trainers',
  });

  const { data: upcomingClasses = [] } = useQuery({
    queryKey: ['catalog-classes'],
    queryFn: () => {
      const now = new Date();
      const end = new Date(); end.setDate(end.getDate() + 7);
      return classesApi.calendar(now.toISOString(), end.toISOString());
    },
    enabled: tab === 'classes',
  });

  const shopSettings = (tenant as any)?.settings ?? {};
  const shopWhatsapp = shopSettings.shopWhatsapp || shopSettings.shopPhone || (tenant as any)?.phone;

  const filteredPlans = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase().trim();
    return plans.filter((p: any) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [plans, search]);

  const featuredPlans = plans.filter((p: any) => p.isFeatured);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl mb-6">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Dumbbell className="h-3.5 w-3.5 text-amber-300" />
              {tenant?.name || 'Gym'}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Transform Your Body 💪</h1>
            <p className="mt-2 text-sm text-white/85 max-w-xl">
              {plans.length} membership plans • Expert trainers • Group classes • State-of-art equipment
            </p>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { v: 'plans', label: '🎯 Plans', desc: plans.length + ' available' },
          { v: 'trainers', label: '💪 Trainers', desc: 'Expert coaches' },
          { v: 'classes', label: '📅 Classes', desc: 'This week' },
        ].map((t) => (
          <button key={t.v} onClick={() => setTab(t.v as any)} className={
            'p-4 rounded-2xl border-2 transition text-center ' +
            (tab === t.v ? 'bg-gradient-to-br from-red-600 to-orange-700 text-white border-red-500 shadow-lg' : 'bg-white border-slate-200 text-slate-700 hover:border-red-300')
          }>
            <div className="text-xl mb-1">{t.label}</div>
            <div className={'text-[10px] font-extrabold ' + (tab === t.v ? 'text-white/80' : 'text-slate-500')}>{t.desc}</div>
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <>
          {featuredPlans.length > 0 && !search && (
            <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 p-5 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
                  <Star className="h-4 w-4 fill-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-amber-900 text-lg">Featured Plans</h3>
                  <p className="text-[11px] text-amber-700 font-bold">Most popular choices</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {featuredPlans.map((p: any) => (
                  <PlanCard key={p.id} plan={p} onInquire={() => setInquirePlan(p)} featured />
                ))}
              </div>
            </section>
          )}

          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3 mb-6">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-red-500"
                placeholder="Search plans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
            </div>
          </section>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((p: any) => (
              <PlanCard key={p.id} plan={p} onInquire={() => setInquirePlan(p)} />
            ))}
          </div>

          {filteredPlans.length === 0 && (
            <div className="rounded-3xl bg-white border-2 border-dashed p-12 text-center">
              <Target className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <p className="font-extrabold">No plans available</p>
            </div>
          )}
        </>
      )}

      {tab === 'trainers' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map((t: any) => {
            const staffName = t.staff ? ((t.staff.firstName || '') + ' ' + (t.staff.lastName || '')).trim() : 'Trainer';
            return (
              <div key={t.id} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-red-400 hover:shadow-xl transition p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {t.photoUrl ? (
                    <img src={t.photoUrl} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-slate-200" />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center text-3xl font-extrabold">
                      {staffName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-extrabold text-lg">{staffName}</div>
                    <div className="text-xs font-extrabold text-red-600">{t.role.replace('_', ' ')}</div>
                    {t.experienceYears && <div className="text-[10px] font-bold text-slate-500">{t.experienceYears}+ years exp</div>}
                    {t.avgRating && (
                      <div className="mt-1 inline-flex items-center gap-0.5 text-xs font-extrabold text-amber-700">
                        <Star className="h-3 w-3 fill-current" /> {t.avgRating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                {t.bio && <p className="text-xs text-slate-600 line-clamp-3">{t.bio}</p>}
                {t.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.specializations.slice(0, 4).map((s: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-extrabold uppercase">{s}</span>
                    ))}
                  </div>
                )}
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-700">Per Session</span>
                  <span className="text-lg font-extrabold text-emerald-900 tabular-nums">{formatPKR(t.perSessionRate)}</span>
                </div>
                <button
                  onClick={() => {
                    if (!shopWhatsapp) return toast.error('WhatsApp not configured');
                    const phone = shopWhatsapp.replace(/[^0-9]/g, '');
                    const clean = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
                    const msg = '💪 Hi, I want to book PT sessions with ' + staffName + '. Please share details.';
                    window.open('https://wa.me/' + clean + '?text=' + encodeURIComponent(msg), '_blank');
                  }}
                  className="w-full h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Book Now
                </button>
              </div>
            );
          })}
          {trainers.length === 0 && (
            <div className="col-span-full rounded-3xl bg-white border-2 border-dashed p-12 text-center">
              <Dumbbell className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <p className="font-extrabold">No trainers available</p>
            </div>
          )}
        </div>
      )}

      {tab === 'classes' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingClasses.map((cls: any) => (
            <div key={cls.id} className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 transition p-4 space-y-3">
              <div className="relative aspect-video rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 overflow-hidden">
                {cls.imageUrl ? <img src={cls.imageUrl} className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">📅</div>
                )}
              </div>
              <div>
                <h3 className="font-extrabold">{cls.name}</h3>
                <div className="text-[10px] uppercase font-extrabold text-blue-600">{cls.classType.replace('_', ' ')}</div>
              </div>
              <div className="text-xs text-slate-600 font-bold">
                📅 {new Date(cls.scheduledStart).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-700">
                  {cls.isFree ? 'FREE' : formatPKR(cls.memberPrice)}
                </span>
                <span className="text-slate-500 font-bold">{cls.currentEnrolled}/{cls.maxParticipants} enrolled</span>
              </div>
              <button
                onClick={() => {
                  if (!shopWhatsapp) return toast.error('WhatsApp not configured');
                  const phone = shopWhatsapp.replace(/[^0-9]/g, '');
                  const clean = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
                  const msg = '💪 Book class: ' + cls.name + ' on ' + new Date(cls.scheduledStart).toLocaleString('en-PK');
                  window.open('https://wa.me/' + clean + '?text=' + encodeURIComponent(msg), '_blank');
                }}
                className="w-full h-9 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1"
              >
                <MessageCircle className="h-3 w-3" /> Book Class
              </button>
            </div>
          ))}
          {upcomingClasses.length === 0 && (
            <div className="col-span-full rounded-3xl bg-white border-2 border-dashed p-12 text-center">
              <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <p className="font-extrabold">No classes this week</p>
            </div>
          )}
        </div>
      )}

      {/* Plan Inquiry Modal */}
      {inquirePlan && (
        <PlanInquireModal
          plan={inquirePlan}
          onClose={() => setInquirePlan(null)}
          shopWhatsapp={shopWhatsapp}
          tenantName={tenant?.name}
        />
      )}
    </>
  );
}

function PlanCard({ plan, onInquire, featured }: any) {
  const typeCfg = PLAN_TYPE_EMOJI[plan.planType] ?? { emoji: '⭐', gradient: 'from-slate-500 to-slate-700' };
  return (
    <div className={
      'rounded-3xl bg-white border-2 shadow-sm overflow-hidden hover:shadow-xl transition ' +
      (featured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200')
    }>
      <div className={'p-6 text-white bg-gradient-to-br ' + typeCfg.gradient}>
        <div className="text-4xl mb-2">{typeCfg.emoji}</div>
        <div className="text-xs uppercase tracking-wider font-extrabold text-white/80">{plan.planType.replace('_', ' ')}</div>
        <h3 className="text-2xl font-extrabold mt-1">{plan.name}</h3>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tabular-nums">{formatPKR(plan.price)}</span>
          <span className="text-xs text-white/70">/ {plan.durationDays}d</span>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {plan.description && <p className="text-xs text-slate-500 line-clamp-2">{plan.description}</p>}
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700"><Check className="h-3 w-3 text-emerald-600" /> {plan.isUnlimited ? 'Unlimited visits' : plan.visitLimit + ' visits'}</div>
          <div className="flex items-center gap-2 font-bold text-slate-700"><Check className="h-3 w-3 text-emerald-600" /> {plan.accessAllHours ? '24/7 Access' : plan.accessTimeStart + '-' + plan.accessTimeEnd}</div>
          {plan.includesClasses && <div className="flex items-center gap-2 font-bold text-slate-700"><Check className="h-3 w-3 text-emerald-600" /> Group classes</div>}
          {plan.includesPersonalTraining && <div className="flex items-center gap-2 font-bold text-slate-700"><Check className="h-3 w-3 text-emerald-600" /> {plan.personalTrainingSessions} PT sessions</div>}
          {plan.includesLockerFacility && <div className="flex items-center gap-2 font-bold text-slate-700"><Check className="h-3 w-3 text-emerald-600" /> Locker facility</div>}
          {plan.includesSteamSauna && <div className="flex items-center gap-2 font-bold text-slate-700"><Check className="h-3 w-3 text-emerald-600" /> Steam & sauna</div>}
          {plan.allowFreeze && <div className="flex items-center gap-2 font-bold text-slate-700"><Snowflake className="h-3 w-3 text-blue-600" /> Freeze up to {plan.maxFreezeDays}d</div>}
        </div>
        <Button className="w-full bg-gradient-to-r from-red-600 to-orange-700" onClick={onInquire}>
          <MessageCircle className="h-4 w-4" /> Enquire Now
        </Button>
      </div>
    </div>
  );
}

function PlanInquireModal({ plan, onClose, shopWhatsapp, tenantName }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const inquire = () => {
    if (!shopWhatsapp) return toast.error('WhatsApp not configured');
    const cleanPhone = shopWhatsapp.replace(/[^0-9]/g, '');
    const clean = cleanPhone.startsWith('92') ? cleanPhone : cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : '92' + cleanPhone;
    const lines = [
      '💪 *MEMBERSHIP INQUIRY*', '',
      '🎯 Plan: *' + plan.name + '*',
      '💰 Price: ' + formatPKR(plan.price) + ' / ' + plan.durationDays + ' days',
      '',
      name ? 'Name: ' + name : '',
      phone ? 'Phone: ' + phone : '',
      '',
      'I want to join! Please share enrollment details.',
      tenantName ? '— To ' + tenantName : '',
    ].filter(Boolean);
    window.open('https://wa.me/' + clean + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');
    toast.success('Inquiry sent!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-red-600 to-orange-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/80">Enquire About</div>
            <h3 className="font-extrabold text-lg">{plan.name}</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl bg-red-50 border-2 border-red-200 p-3 text-center">
            <div className="text-3xl font-extrabold text-red-700 tabular-nums">{formatPKR(plan.price)}</div>
            <div className="text-xs font-bold text-slate-600">for {plan.durationDays} days</div>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone" className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
          <Button size="lg" className="w-full bg-gradient-to-r from-green-500 to-green-600" onClick={inquire}>
            <MessageCircle className="h-5 w-5" /> Send WhatsApp Inquiry
          </Button>
        </div>
      </div>
    </div>
  );
}

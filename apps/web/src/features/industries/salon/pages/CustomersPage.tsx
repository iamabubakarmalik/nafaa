import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Heart, Plus, Search, X, Save, Edit3, RefreshCw, Sparkles, User,
  Phone, Calendar, DollarSign, Star, Camera, AlertCircle, Pill,
  Award, TrendingUp, Eye, Sparkle, Droplet, Users,
} from 'lucide-react';
import { salonCustomerProfilesApi, type SalonCustomerProfile } from '../api/customer-profiles.api';
import { customersApi } from '@/api/customers.api';
import { staffProfilesApi } from '../api/staff-profiles.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const HAIR_TYPES = ['Straight', 'Wavy', 'Curly', 'Coily', 'Kinky'];
const HAIR_LENGTHS = ['Very Short', 'Short', 'Medium', 'Long', 'Very Long'];
const HAIR_COLORS = ['Black', 'Dark Brown', 'Brown', 'Light Brown', 'Blonde', 'Red', 'Gray', 'White', 'Colored'];
const HAIR_TEXTURES = ['Fine', 'Medium', 'Coarse', 'Thick'];

const SKIN_TYPES = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];
const SKIN_TONES = ['Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Dark', 'Deep'];

const PREGNANCY_OPTIONS = ['No', 'Yes', 'Trying', 'Breastfeeding', 'Prefer not to say'];

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SalonCustomerProfile | null>(null);
  const [viewing, setViewing] = useState<SalonCustomerProfile | null>(null);

  const { data: profiles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['salon-customer-profiles', search],
    queryFn: () => salonCustomerProfilesApi.list({ search: search.trim() || undefined }),
  });

  const { data: allCustomers } = useQuery({
    queryKey: ['all-customers-for-salon'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });

  // Merge profile with customer data
  const profilesWithCustomer = profiles.map((p) => {
    const c = allCustomers?.items?.find((x) => x.id === p.customerId);
    return { ...p, customer: c };
  });

  const filtered = profilesWithCustomer.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.customer?.name?.toLowerCase().includes(q) || p.customer?.phone?.includes(q);
  });

  const stats = {
    total: profiles.length,
    withMedical: profiles.filter((p) => p.medicalConditions || p.allergies?.length > 0).length,
    highSpenders: profiles.filter((p) => p.totalSpent > 10000).length,
    recentVisits: profiles.filter((p) => {
      if (!p.lastVisitAt) return false;
      const days = (Date.now() - new Date(p.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Heart className="h-3.5 w-3.5 text-amber-300" />
              Client Records
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💖 Customer Profiles</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Hair, skin, allergies, preferences — sab record</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Profile
            </Button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Profiles" value={stats.total} icon={Users} color="cyan" />
        <StatCard label="Medical Alerts" value={stats.withMedical} icon={AlertCircle} color="rose" />
        <StatCard label="VIP Customers" value={stats.highSpenders} icon={Award} color="amber" sub=">Rs 10K spent" />
        <StatCard label="Active (30d)" value={stats.recentVisits} icon={TrendingUp} color="emerald" />
      </section>

      {/* SEARCH */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-cyan-500" />
        </div>
      </section>

      {showForm && (
        <CustomerProfileForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['salon-customer-profiles'] });
          }}
        />
      )}

      {viewing && (
        <CustomerProfileModal
          profile={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); setShowForm(true); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Heart className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No customer profiles yet</p>
          <p className="text-xs text-slate-500 mt-1">Add salon-specific profiles for your customers</p>
          <Button className="mt-4 bg-gradient-to-r from-cyan-600 to-teal-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Create First Profile
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onView={() => setViewing(profile)}
              onEdit={() => { setEditing(profile); setShowForm(true); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    cyan: 'from-cyan-500 to-teal-600',
    rose: 'from-rose-500 to-red-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ profile, onView, onEdit }: any) {
  const c = profile.customer;
  const hasAlerts = profile.allergies?.length > 0 || profile.medicalConditions;
  const isVIP = profile.totalSpent > 10000;

  return (
    <div className={
      'group rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-4 space-y-3 ' +
      (isVIP ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start gap-3">
        {profile.photoUrls?.[0] ? (
          <img src={profile.photoUrls[0]} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-neutral-700 shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white flex items-center justify-center text-xl font-extrabold shadow shrink-0">
            {c?.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-900 dark:text-white truncate">{c?.name || 'Customer'}</span>
            {isVIP && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <Star className="h-2 w-2 fill-current" />
                VIP
              </span>
            )}
            {hasAlerts && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <AlertCircle className="h-2 w-2" />
                ALERT
              </span>
            )}
          </div>
          {c?.phone && (
            <div className="flex items-center gap-1 text-xs text-slate-600 font-bold mt-0.5">
              <Phone className="h-3 w-3" />
              {c.phone}
            </div>
          )}
          {profile.lastVisitAt && (
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Last visit: {format(new Date(profile.lastVisitAt), 'dd MMM yyyy')}
            </div>
          )}
        </div>
      </div>

      {/* Hair & Skin quick info */}
      <div className="grid grid-cols-2 gap-1.5">
        {profile.hairType && (
          <div className="rounded-lg bg-pink-50 dark:bg-pink-950/30 p-2">
            <div className="text-[9px] uppercase font-extrabold text-pink-700">Hair</div>
            <div className="text-xs font-extrabold text-pink-900 dark:text-pink-300 truncate">{profile.hairType}</div>
            {profile.hairLength && <div className="text-[9px] font-bold text-pink-600">{profile.hairLength}</div>}
          </div>
        )}
        {profile.skinType && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">
            <div className="text-[9px] uppercase font-extrabold text-amber-700">Skin</div>
            <div className="text-xs font-extrabold text-amber-900 dark:text-amber-300 truncate">{profile.skinType}</div>
            {profile.skinTone && <div className="text-[9px] font-bold text-amber-600">{profile.skinTone}</div>}
          </div>
        )}
      </div>

      {/* Allergies alert */}
      {profile.allergies?.length > 0 && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-2">
          <div className="text-[9px] uppercase font-extrabold text-rose-700 mb-1 flex items-center gap-1">
            <AlertCircle className="h-2.5 w-2.5" />
            Allergies
          </div>
          <div className="flex flex-wrap gap-1">
            {profile.allergies.slice(0, 3).map((a: string, i: number) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/40 text-rose-700 text-[9px] font-extrabold">
                {a}
              </span>
            ))}
            {profile.allergies.length > 3 && (
              <span className="text-[9px] text-rose-500 font-extrabold">+{profile.allergies.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Visits</div>
          <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">{profile.totalVisits}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Spent</div>
          <div className="font-extrabold text-emerald-700 tabular-nums text-[10px]">{formatPKR(profile.totalSpent).replace('Rs', '').trim()}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-amber-700 inline-flex items-center justify-center gap-0.5">
            <Star className="h-2 w-2 fill-current" />
            Rating
          </div>
          <div className="font-extrabold text-amber-700 tabular-nums">
            {profile.avgRating ? profile.avgRating.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <button onClick={onView} className="flex-1 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-950/40 hover:bg-cyan-200 text-cyan-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          <Eye className="h-3 w-3" />
          View Full
        </button>
        <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CustomerProfileModal({ profile, onClose, onEdit }: any) {
  const c = profile.customer;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 text-white p-6">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {profile.photoUrls?.[0] ? (
                <img src={profile.photoUrls[0]} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/20" />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-extrabold">
                  {c?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-extrabold">{c?.name || 'Customer'}</h2>
                {c?.phone && <div className="text-sm font-bold text-white/80">{c.phone}</div>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <Edit3 className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
              <div className="text-[9px] uppercase font-extrabold text-white/70">Visits</div>
              <div className="text-xl font-extrabold tabular-nums">{profile.totalVisits}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
              <div className="text-[9px] uppercase font-extrabold text-white/70">Total Spent</div>
              <div className="text-xl font-extrabold tabular-nums text-emerald-300">{formatPKR(profile.totalSpent)}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
              <div className="text-[9px] uppercase font-extrabold text-white/70 inline-flex items-center justify-center gap-0.5">
                <Star className="h-2 w-2 fill-current" />
                Rating
              </div>
              <div className="text-xl font-extrabold tabular-nums text-amber-300">
                {profile.avgRating ? profile.avgRating.toFixed(1) : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Alerts */}
          {(profile.allergies?.length > 0 || profile.medicalConditions) && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                <AlertCircle className="h-4 w-4" />
                MEDICAL ALERTS
              </div>
              {profile.allergies?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-rose-700 mb-1">Allergies</div>
                  <div className="flex flex-wrap gap-1">
                    {profile.allergies.map((a: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-700 text-xs font-extrabold">
                        ⚠️ {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.medicalConditions && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-rose-700 mb-1">Medical Conditions</div>
                  <p className="text-xs font-bold text-slate-900">{profile.medicalConditions}</p>
                </div>
              )}
              {profile.medications && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-rose-700 mb-1">Current Medications</div>
                  <p className="text-xs font-bold text-slate-900">{profile.medications}</p>
                </div>
              )}
              {profile.pregnancyStatus && profile.pregnancyStatus !== 'No' && (
                <div className="rounded-lg bg-pink-100 dark:bg-pink-950/40 border border-pink-300 p-2">
                  <div className="text-xs font-extrabold text-pink-800 inline-flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    Pregnancy Status: {profile.pregnancyStatus}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hair Info */}
          <div className="rounded-2xl border-2 border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/20 p-4">
            <div className="text-sm font-extrabold text-pink-900 dark:text-pink-300 mb-2 flex items-center gap-2">
              <Sparkle className="h-4 w-4" />
              Hair Profile
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <ProfileField label="Type" value={profile.hairType} />
              <ProfileField label="Length" value={profile.hairLength} />
              <ProfileField label="Color" value={profile.hairColor} />
              <ProfileField label="Texture" value={profile.hairTexture} />
            </div>
          </div>

          {/* Skin Info */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
              <Droplet className="h-4 w-4" />
              Skin Profile
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ProfileField label="Type" value={profile.skinType} />
              <ProfileField label="Tone" value={profile.skinTone} />
            </div>
          </div>

          {/* Preferences */}
          {(profile.preferredServices?.length > 0 || profile.favoriteBrands?.length > 0) && (
            <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4">
              <div className="text-sm font-extrabold text-violet-900 dark:text-violet-300 mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Preferences
              </div>
              {profile.preferredServices?.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] uppercase font-extrabold text-violet-700 mb-1">Favorite Services</div>
                  <div className="flex flex-wrap gap-1">
                    {profile.preferredServices.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-800 text-xs font-extrabold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.favoriteBrands?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-violet-700 mb-1">Favorite Brands</div>
                  <div className="flex flex-wrap gap-1">
                    {profile.favoriteBrands.map((b: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-violet-300 text-violet-800 text-xs font-extrabold">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {profile.notes && (
            <div className="rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/50 p-4">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mb-2">Internal Notes</div>
              <p className="text-sm text-slate-700 dark:text-slate-300 italic">{profile.notes}</p>
            </div>
          )}

          {/* Photos gallery */}
          {profile.photoUrls?.length > 1 && (
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Reference Photos
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {profile.photoUrls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-cyan-500 transition">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-sm font-extrabold text-slate-900 dark:text-white">{value || '—'}</div>
    </div>
  );
}

function CustomerProfileForm({ editing, onClose, onSaved }: {
  editing: SalonCustomerProfile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({
    customerId: editing?.customerId ?? '',
    hairType: editing?.hairType ?? '',
    hairLength: editing?.hairLength ?? '',
    hairColor: editing?.hairColor ?? '',
    hairTexture: editing?.hairTexture ?? '',
    skinType: editing?.skinType ?? '',
    skinTone: editing?.skinTone ?? '',
    allergies: editing?.allergies?.join(', ') ?? '',
    preferredStaffId: editing?.preferredStaffId ?? '',
    preferredServices: editing?.preferredServices?.join(', ') ?? '',
    favoriteBrands: editing?.favoriteBrands?.join(', ') ?? '',
    medicalConditions: editing?.medicalConditions ?? '',
    medications: editing?.medications ?? '',
    pregnancyStatus: editing?.pregnancyStatus ?? '',
    notes: editing?.notes ?? '',
    photoUrls: editing?.photoUrls ?? [],
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(!editing);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-profile', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showPicker,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-for-preferred'],
    queryFn: () => staffProfilesApi.list({ bookable: true }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        allergies: form.allergies ? form.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        preferredServices: form.preferredServices ? form.preferredServices.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        favoriteBrands: form.favoriteBrands ? form.favoriteBrands.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        pregnancyStatus: form.pregnancyStatus || undefined,
        preferredStaffId: form.preferredStaffId || undefined,
      };
      return salonCustomerProfilesApi.upsert(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Profile updated' : 'Profile created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-cyan-300 dark:border-cyan-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Customer Profile' : 'New Customer Profile'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Customer picker */}
        {!editing && (
          selectedCustomer ? (
            <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border-2 border-cyan-200 dark:border-cyan-800 p-3 flex items-center gap-3">
              <User className="h-5 w-5 text-cyan-600" />
              <div className="flex-1">
                <div className="font-extrabold text-slate-900 dark:text-white">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div className="text-xs text-slate-600 font-bold">{selectedCustomer.phone}</div>}
              </div>
              <button onClick={() => { setSelectedCustomer(null); setForm({ ...form, customerId: '' }); setShowPicker(true); }} className="text-xs font-extrabold text-cyan-600 hover:underline">
                Change
              </button>
            </div>
          ) : (
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Select Customer *</label>
              <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search by name/phone..." className="h-11 w-full rounded-xl border-2 border-cyan-200 bg-cyan-50 dark:bg-cyan-950/30 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
              <div className="mt-2 max-h-52 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-neutral-700 p-1">
                {(customersData?.items ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCustomer(c); setForm({ ...form, customerId: c.id }); setShowPicker(false); }}
                    className="w-full px-3 py-2 flex items-center gap-2 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-left"
                  >
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {form.customerId && (
          <>
            {/* Hair Profile */}
            <div className="rounded-xl border-2 border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/30 p-4 space-y-3">
              <div className="text-sm font-extrabold text-pink-900 dark:text-pink-300 flex items-center gap-2">
                <Sparkle className="h-4 w-4" />
                Hair Profile
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <SelectField label="Hair Type" value={form.hairType} options={HAIR_TYPES} onChange={(v) => setForm({ ...form, hairType: v })} color="pink" />
                <SelectField label="Hair Length" value={form.hairLength} options={HAIR_LENGTHS} onChange={(v) => setForm({ ...form, hairLength: v })} color="pink" />
                <SelectField label="Hair Color" value={form.hairColor} options={HAIR_COLORS} onChange={(v) => setForm({ ...form, hairColor: v })} color="pink" />
                <SelectField label="Hair Texture" value={form.hairTexture} options={HAIR_TEXTURES} onChange={(v) => setForm({ ...form, hairTexture: v })} color="pink" />
              </div>
            </div>

            {/* Skin Profile */}
            <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <Droplet className="h-4 w-4" />
                Skin Profile
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <SelectField label="Skin Type" value={form.skinType} options={SKIN_TYPES} onChange={(v) => setForm({ ...form, skinType: v })} color="amber" />
                <SelectField label="Skin Tone" value={form.skinTone} options={SKIN_TONES} onChange={(v) => setForm({ ...form, skinTone: v })} color="amber" />
              </div>
            </div>

            {/* Medical / Alerts */}
            <div className="rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 space-y-3">
              <div className="text-sm font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Medical & Safety
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Allergies (comma separated)</label>
                <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Nuts, Ammonia, Perfume..." className="h-11 w-full rounded-xl border-2 border-rose-300 bg-white dark:bg-rose-950/40 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Medical Conditions</label>
                <textarea rows={2} value={form.medicalConditions} onChange={(e) => setForm({ ...form, medicalConditions: e.target.value })} placeholder="Diabetes, sensitive scalp, eczema..." className="w-full rounded-xl border-2 border-rose-300 bg-white dark:bg-rose-950/40 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 resize-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Current Medications</label>
                <input value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} placeholder="Optional" className="h-11 w-full rounded-xl border-2 border-rose-300 bg-white dark:bg-rose-950/40 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Pregnancy Status</label>
                <select value={form.pregnancyStatus} onChange={(e) => setForm({ ...form, pregnancyStatus: e.target.value })} className="h-11 w-full rounded-xl border-2 border-rose-300 bg-white dark:bg-rose-950/40 px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
                  <option value="">-- Optional --</option>
                  {PREGNANCY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Preferences */}
            <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 space-y-3">
              <div className="text-sm font-extrabold text-violet-900 dark:text-violet-300 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Preferences
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-violet-700 mb-1 block">Preferred Staff</label>
                <select value={form.preferredStaffId} onChange={(e) => setForm({ ...form, preferredStaffId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                  <option value="">Any staff</option>
                  {staffList.map((s) => {
                    const nm = s.staff ? ((s.staff.firstName || '') + ' ' + (s.staff.lastName || '')).trim() : '';
                    return <option key={s.id} value={s.id}>{nm} ({s.role})</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-violet-700 mb-1 block">Favorite Services (comma separated)</label>
                <input value={form.preferredServices} onChange={(e) => setForm({ ...form, preferredServices: e.target.value })} placeholder="Hair Color, Facial, Manicure..." className="h-11 w-full rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-violet-700 mb-1 block">Favorite Brands (comma separated)</label>
                <input value={form.favoriteBrands} onChange={(e) => setForm({ ...form, favoriteBrands: e.target.value })} placeholder="L'Oreal, MAC, Wella..." className="h-11 w-full rounded-xl border-2 border-violet-300 bg-white dark:bg-violet-950/40 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Internal Notes</label>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions, preferences, past reactions..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />
            </div>

            {/* Photos */}
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block items-center gap-1">
                <Camera className="h-3 w-3" />
                Reference Photos
              </label>
              {form.photoUrls.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 mb-2">
                  {form.photoUrls.map((url: string, i: number) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setForm({ ...form, photoUrls: form.photoUrls.filter((_: any, idx: number) => idx !== i) })}
                        className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center"
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
                  setForm({ ...form, photoUrls: [...form.photoUrls, ...urls] });
                }}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.customerId}>
                <Save className="h-4 w-4" />
                {editing ? 'Update Profile' : 'Save Profile'}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SelectField({ label, value, options, onChange, color }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  color: string;
}) {

  const colors: Record<string, string> = {
    pink: 'border-pink-300 focus:border-pink-500 bg-white dark:bg-pink-950/40',
    amber: 'border-amber-300 focus:border-amber-500 bg-white dark:bg-amber-950/40',
  };
  return (
    <div>
      <label className={'text-[10px] uppercase font-extrabold mb-1 block ' + (color === 'pink' ? 'text-pink-700' : 'text-amber-700')}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={'h-11 w-full rounded-xl border-2 px-3 text-sm font-bold focus:outline-none ' + (colors[color] || colors.pink)}>
        <option value="">-- Select --</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  User, Phone, Mail, MapPin, Star, Ban, Award, AlertCircle,
  Camera, Play, Globe,
} from 'lucide-react';
import { guestsApi, type HotelGuest } from '../api/guests.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ID_TYPES = [
  { value: 'CNIC', label: 'CNIC' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
  { value: 'NADRA', label: 'NADRA' },
  { value: 'NIC', label: 'NIC' },
  { value: 'IQAMA', label: 'Iqama' },
  { value: 'OTHER', label: 'Other' },
];

const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sheikh', 'Haji', 'Hajja'];

const NATIONALITIES = ['Pakistani', 'Indian', 'Bangladeshi', 'Afghan', 'Iranian', 'Turkish', 'Saudi', 'Emirati', 'British', 'American', 'Canadian', 'Australian', 'Chinese', 'Malaysian', 'Other'];

const VIP_LEVELS = ['Silver', 'Gold', 'Platinum', 'Diamond'];

export default function GuestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HotelGuest | null>(null);
  const [viewing, setViewing] = useState<HotelGuest | null>(null);

  const { data: guests = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hotel-guests', filter, search],
    queryFn: () => guestsApi.list({
      isVIP: filter === 'vip' ? true : undefined,
      isBlacklisted: filter === 'blacklist' ? true : undefined,
      search: search.trim() || undefined,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['hotel-guests-stats'],
    queryFn: () => guestsApi.stats(),
  });

  const blacklistMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => guestsApi.blacklist(id, reason),
    onSuccess: () => { toast.success('Guest blacklisted'); queryClient.invalidateQueries({ queryKey: ['hotel-guests'] }); },
  });

  const unblacklistMutation = useMutation({
    mutationFn: (id: string) => guestsApi.unblacklist(id),
    onSuccess: () => { toast.success('Removed from blacklist'); queryClient.invalidateQueries({ queryKey: ['hotel-guests'] }); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => guestsApi.remove(id),
    onSuccess: () => { toast.success('Guest removed'); queryClient.invalidateQueries({ queryKey: ['hotel-guests'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Users className="h-3.5 w-3.5 text-amber-300" />
              Guest Registry
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👥 Hotel Guests</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">CNIC/passport, VIP, loyalty, blacklist</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Register Guest
            </Button>
          </div>
        </div>
      </section>

      {stats && (
        <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Guests" value={stats.total} icon={Users} color="teal" />
          <StatCard label="VIP Guests" value={stats.vip} icon={Star} color="amber" />
          <StatCard label="Blacklisted" value={stats.blacklisted} icon={Ban} color="rose" />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, CNIC/passport..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-teal-500" />
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'all', label: 'All' },
            { v: 'vip', label: '⭐ VIP' },
            { v: 'blacklist', label: '🚫 Blacklisted' },
          ].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (filter === f.v ? 'bg-teal-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{f.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <GuestForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['hotel-guests'] }); queryClient.invalidateQueries({ queryKey: ['hotel-guests-stats'] }); }}
        />
      )}

      {viewing && (
        <GuestDetailModal
          guest={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); setShowForm(true); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : guests.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Users className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No guests registered</p>
          <Button className="mt-4 bg-gradient-to-r from-teal-600 to-cyan-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Register First Guest
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guests.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              onView={() => setViewing(guest)}
              onEdit={() => { setEditing(guest); setShowForm(true); }}
              onBlacklist={() => {
                const reason = prompt('Blacklist reason?');
                if (reason) blacklistMutation.mutate({ id: guest.id, reason });
              }}
              onUnblacklist={() => unblacklistMutation.mutate(guest.id)}
              onDelete={() => { if (confirm('Remove ' + guest.fullName + '?')) removeMutation.mutate(guest.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    teal: 'from-teal-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function GuestCard({ guest, onView, onEdit, onBlacklist, onUnblacklist, onDelete }: any) {
  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-lg transition p-4 space-y-3 ' +
      (guest.isBlacklisted ? 'border-rose-300 bg-rose-50/50 dark:bg-rose-950/20' :
       guest.isVIP ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start gap-3">
        {guest.photoUrl ? (
          <img src={guest.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0" />
        ) : (
          <div className={
            'h-16 w-16 rounded-2xl text-white flex items-center justify-center text-xl font-extrabold shrink-0 ' +
            (guest.isVIP ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-teal-500 to-cyan-600')
          }>
            {guest.fullName?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-900 dark:text-white truncate">{guest.title ? guest.title + ' ' : ''}{guest.fullName}</span>
            {guest.isVIP && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <Star className="h-2 w-2 fill-current" />
                {guest.vipLevel || 'VIP'}
              </span>
            )}
            {guest.isBlacklisted && (
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold uppercase animate-pulse">
                <Ban className="h-2 w-2 inline" />
                BLACKLIST
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-500">{guest.guestNumber}</div>
          {guest.phone && (
            <div className="flex items-center gap-1 text-xs text-slate-600 font-bold mt-0.5">
              <Phone className="h-3 w-3" />{guest.phone}
            </div>
          )}
          {guest.email && (
            <div className="flex items-center gap-1 text-xs text-slate-600 font-bold truncate">
              <Mail className="h-3 w-3" />{guest.email}
            </div>
          )}
        </div>
      </div>

      {guest.nationality && (
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <Globe className="h-3 w-3" />
          {guest.nationality}
          {guest.idType && guest.idNumber && (
            <span className="text-[10px] text-slate-500 font-mono">• {guest.idType}: {guest.idNumber}</span>
          )}
        </div>
      )}

      {guest.city && (
        <div className="flex items-center gap-1 text-xs text-slate-600 font-bold">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{[guest.city, guest.country].filter(Boolean).join(', ')}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Stays</div>
          <div className="font-extrabold tabular-nums">{guest.totalStays}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-blue-700">Nights</div>
          <div className="font-extrabold text-blue-700 tabular-nums">{guest.totalNights}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Spent</div>
          <div className="font-extrabold text-emerald-700 tabular-nums text-[10px]">{formatPKR(guest.totalSpent).replace('Rs', '').trim()}</div>
        </div>
      </div>

      {guest.loyaltyPoints > 0 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-amber-700 inline-flex items-center gap-1"><Award className="h-3 w-3" />Loyalty</span>
            <span className="font-extrabold text-amber-900 tabular-nums">{guest.loyaltyPoints} pts</span>
          </div>
        </div>
      )}

      {guest.blacklistReason && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs italic text-rose-700">
          ⚠️ {guest.blacklistReason}
        </div>
      )}

      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <button onClick={onView} className="flex-1 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/40 hover:bg-teal-200 text-teal-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
          View
        </button>
        <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        {guest.isBlacklisted ? (
          <button onClick={onUnblacklist} className="h-9 w-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Play className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button onClick={onBlacklist} className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <Ban className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function GuestDetailModal({ guest, onClose, onEdit }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="relative bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-800 text-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {guest.photoUrl ? (
                <img src={guest.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/20" />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-extrabold">
                  {guest.fullName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-extrabold">{guest.title ? guest.title + ' ' : ''}{guest.fullName}</h2>
                <div className="text-sm font-bold text-white/80">{guest.guestNumber}</div>
                {guest.isVIP && <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-extrabold uppercase inline-flex items-center gap-1 mt-1"><Star className="h-3 w-3 fill-current" />{guest.vipLevel || 'VIP'}</span>}
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
              <div className="text-[9px] uppercase font-extrabold text-white/70">Stays</div>
              <div className="text-xl font-extrabold tabular-nums">{guest.totalStays}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
              <div className="text-[9px] uppercase font-extrabold text-white/70">Total Spent</div>
              <div className="text-xl font-extrabold tabular-nums text-emerald-300">{formatPKR(guest.totalSpent)}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
              <div className="text-[9px] uppercase font-extrabold text-white/70">Nights</div>
              <div className="text-xl font-extrabold tabular-nums">{guest.totalNights}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {guest.isBlacklisted && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 p-4">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                <Ban className="h-4 w-4" />
                BLACKLISTED
              </div>
              <p className="mt-1 text-xs text-rose-600 font-bold">{guest.blacklistReason}</p>
            </div>
          )}

          {/* Contact */}
          <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border-2 border-slate-200 dark:border-neutral-700 p-4 space-y-2">
            <div className="text-sm font-extrabold">Contact Information</div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {guest.phone && <Info label="Phone" value={guest.phone} />}
              {guest.altPhone && <Info label="Alt Phone" value={guest.altPhone} />}
              {guest.email && <Info label="Email" value={guest.email} />}
              {guest.gender && <Info label="Gender" value={guest.gender} />}
              {guest.dateOfBirth && <Info label="DOB" value={format(new Date(guest.dateOfBirth), 'dd MMM yyyy')} />}
              {guest.nationality && <Info label="Nationality" value={guest.nationality} />}
            </div>
          </div>

          {/* ID */}
          {(guest.idType || guest.idNumber) && (
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 p-4 space-y-2">
              <div className="text-sm font-extrabold text-blue-900">Identity Document</div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <Info label="Type" value={guest.idType} />
                <Info label="Number" value={guest.idNumber} />
                {guest.idExpiryDate && <Info label="Expires" value={format(new Date(guest.idExpiryDate), 'dd MMM yyyy')} />}
              </div>
              {(guest.idFrontUrl || guest.idBackUrl) && (
                <div className="grid grid-cols-2 gap-2">
                  {guest.idFrontUrl && (
                    <a href={guest.idFrontUrl} target="_blank" rel="noreferrer" className="aspect-video rounded-lg overflow-hidden border border-blue-200">
                      <img src={guest.idFrontUrl} alt="ID Front" className="w-full h-full object-cover" />
                    </a>
                  )}
                  {guest.idBackUrl && (
                    <a href={guest.idBackUrl} target="_blank" rel="noreferrer" className="aspect-video rounded-lg overflow-hidden border border-blue-200">
                      <img src={guest.idBackUrl} alt="ID Back" className="w-full h-full object-cover" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Address */}
          {(guest.address || guest.city) && (
            <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border-2 border-slate-200 dark:border-neutral-700 p-4 space-y-2">
              <div className="text-sm font-extrabold">Address</div>
              <p className="text-sm">{[guest.address, guest.city, guest.state, guest.country, guest.zipCode].filter(Boolean).join(', ')}</p>
            </div>
          )}

          {/* Preferences & Allergies */}
          {(guest.allergies?.length > 0 || guest.dietaryRestrictions?.length > 0 || guest.specialRequests) && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 p-4 space-y-2">
              <div className="text-sm font-extrabold text-amber-900 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Preferences & Alerts
              </div>
              {guest.allergies?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-amber-700 mb-1">Allergies</div>
                  <div className="flex flex-wrap gap-1">
                    {guest.allergies.map((a: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-xs font-extrabold">⚠️ {a}</span>
                    ))}
                  </div>
                </div>
              )}
              {guest.dietaryRestrictions?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-amber-700 mb-1">Dietary</div>
                  <div className="flex flex-wrap gap-1">
                    {guest.dietaryRestrictions.map((d: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-extrabold">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {guest.specialRequests && (
                <p className="text-xs italic text-amber-800">📝 {guest.specialRequests}</p>
              )}
            </div>
          )}

          {guest.notes && (
            <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border-2 border-slate-200 dark:border-neutral-700 p-4">
              <div className="text-sm font-extrabold mb-2">Internal Notes</div>
              <p className="text-sm italic text-slate-700">{guest.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div>
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="font-bold">{value || '—'}</div>
    </div>
  );
}

function GuestForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    title: editing?.title ?? 'Mr',
    firstName: editing?.firstName ?? '',
    lastName: editing?.lastName ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
    altPhone: editing?.altPhone ?? '',
    idType: editing?.idType ?? 'CNIC',
    idNumber: editing?.idNumber ?? '',
    idExpiryDate: editing?.idExpiryDate ? editing.idExpiryDate.slice(0, 10) : '',
    idFrontUrl: editing?.idFrontUrl ?? '',
    idBackUrl: editing?.idBackUrl ?? '',
    dateOfBirth: editing?.dateOfBirth ? editing.dateOfBirth.slice(0, 10) : '',
    gender: editing?.gender ?? '',
    nationality: editing?.nationality ?? 'Pakistani',
    language: editing?.language ?? '',
    address: editing?.address ?? '',
    city: editing?.city ?? '',
    state: editing?.state ?? '',
    country: editing?.country ?? 'Pakistan',
    zipCode: editing?.zipCode ?? '',
    companyName: editing?.companyName ?? '',
    designation: editing?.designation ?? '',
    gstNumber: editing?.gstNumber ?? '',
    isVIP: editing?.isVIP ?? false,
    vipLevel: editing?.vipLevel ?? '',
    loyaltyNumber: editing?.loyaltyNumber ?? '',
    loyaltyPoints: editing?.loyaltyPoints ?? 0,
    allergies: editing?.allergies?.join(', ') ?? '',
    dietaryRestrictions: editing?.dietaryRestrictions?.join(', ') ?? '',
    specialRequests: editing?.specialRequests ?? '',
    photoUrl: editing?.photoUrl ?? '',
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        loyaltyPoints: Number(form.loyaltyPoints) || 0,
        allergies: form.allergies ? form.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        dietaryRestrictions: form.dietaryRestrictions ? form.dietaryRestrictions.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      };
      return editing ? guestsApi.update(editing.id, payload) : guestsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Guest updated' : 'Guest registered'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-teal-300 dark:border-teal-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-teal-50 dark:bg-teal-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Guest' : 'Register New Guest'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Photo */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Photo</label>
          {form.photoUrl ? (
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200">
              <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, photoUrl: url });
            }} />
          )}
        </div>

        {/* Personal */}
        <div className="grid sm:grid-cols-4 gap-3">
          <select value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500">
            {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last Name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500">
            <option value="">-- Gender --</option>
            <option value="Male">♂️ Male</option>
            <option value="Female">♀️ Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} placeholder="Alt Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <select value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500">
            {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="Language" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
        </div>

        {/* ID */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-blue-900">Identity Document</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })} className="h-11 rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} placeholder="ID Number" className="h-11 rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500" />
            <input type="date" value={form.idExpiryDate} onChange={(e) => setForm({ ...form, idExpiryDate: e.target.value })} className="h-11 rounded-xl border-2 border-blue-300 bg-white dark:bg-blue-950/40 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">ID Front</label>
              {form.idFrontUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-blue-200">
                  <img src={form.idFrontUrl} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, idFrontUrl: '' })} className="absolute top-1 right-1 h-5 w-5 rounded bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ) : (
                <UploadDropzone onUploaded={(records) => {
                  const first = Array.isArray(records) ? records[0] : records;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, idFrontUrl: url });
                }} />
              )}
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">ID Back</label>
              {form.idBackUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-blue-200">
                  <img src={form.idBackUrl} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, idBackUrl: '' })} className="absolute top-1 right-1 h-5 w-5 rounded bg-rose-600 text-white flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ) : (
                <UploadDropzone onUploaded={(records) => {
                  const first = Array.isArray(records) ? records[0] : records;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, idBackUrl: url });
                }} />
              )}
            </div>
          </div>
        </div>

        {/* Address */}
        <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-teal-500 resize-none" />
        <div className="grid sm:grid-cols-4 gap-3">
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} placeholder="ZIP" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
        </div>

        {/* Company */}
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Company" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Designation" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
          <input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="GST #" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-teal-500" />
        </div>

        {/* VIP */}
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isVIP} onChange={(e) => setForm({ ...form, isVIP: e.target.checked })} className="h-5 w-5 rounded" />
            <Star className={'h-5 w-5 ' + (form.isVIP ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
            <span className="text-sm font-extrabold text-amber-900">VIP Guest</span>
          </label>
          {form.isVIP && (
            <div className="grid sm:grid-cols-3 gap-3">
              <select value={form.vipLevel} onChange={(e) => setForm({ ...form, vipLevel: e.target.value })} className="h-11 rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">-- Level --</option>
                {VIP_LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <input value={form.loyaltyNumber} onChange={(e) => setForm({ ...form, loyaltyNumber: e.target.value })} placeholder="Loyalty Number" className="h-11 rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
              <input type="number" value={form.loyaltyPoints} onChange={(e) => setForm({ ...form, loyaltyPoints: e.target.value })} placeholder="Points" className="h-11 rounded-xl border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          )}
        </div>

        <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Allergies (comma separated)" className="h-11 w-full rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        <input value={form.dietaryRestrictions} onChange={(e) => setForm({ ...form, dietaryRestrictions: e.target.value })} placeholder="Dietary restrictions (Vegetarian, Halal, Vegan...)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
        <textarea rows={2} value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} placeholder="Special requests / preferences..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-teal-500 resize-none" />
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-teal-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.firstName || !form.phone}>
            <Save className="h-4 w-4" />
            {editing ? 'Update Guest' : 'Register Guest'}
          </Button>
        </div>
      </div>
    </section>
  );
}

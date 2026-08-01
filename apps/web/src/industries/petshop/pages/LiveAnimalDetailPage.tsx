import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Heart, Syringe, FileText, Calendar, MapPin,
  Trash2, AlertTriangle, CheckCircle2, XCircle, Sparkles, DollarSign,
  Clock, RotateCcw, Award, Activity, Plus, X, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { liveAnimalsApi } from '../api/live-animals.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';

export default function LiveAnimalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [imgIndex, setImgIndex] = useState(0);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showMedicalModal, setShowMedicalModal] = useState(false);

  const { data: animal, isLoading } = useQuery({
    queryKey: ['live-animal', id],
    queryFn: () => liveAnimalsApi.getOne(id!),
    enabled: !!id,
  });

  const reserve = useMutation({
    mutationFn: (name: string) => liveAnimalsApi.reserve(id!, name),
    onSuccess: () => {
      toast.success('Reserved');
      qc.invalidateQueries({ queryKey: ['live-animal', id] });
    },
  });

  const unreserve = useMutation({
    mutationFn: () => liveAnimalsApi.unreserve(id!),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      qc.invalidateQueries({ queryKey: ['live-animal', id] });
    },
  });

  const remove = useMutation({
    mutationFn: () => liveAnimalsApi.remove(id!),
    onSuccess: () => {
      toast.success('Animal removed');
      navigate('/petshop/live-animals');
    },
  });

  if (isLoading || !animal) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin" />
      </div>
    );
  }

  const isAvailable = animal.status === 'AVAILABLE';
  const isReserved = animal.status === 'RESERVED';

  return (
    <div className="space-y-5 pb-10">
      {showSellModal && <SellModal animal={animal} onClose={() => setShowSellModal(false)} onSold={() => { setShowSellModal(false); qc.invalidateQueries({ queryKey: ['live-animal', id] }); }} />}
      {showMedicalModal && <MedicalModal animal={animal} onClose={() => setShowMedicalModal(false)} onAdded={() => { setShowMedicalModal(false); qc.invalidateQueries({ queryKey: ['live-animal', id] }); }} />}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/petshop/live-animals')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Animals
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {isAvailable && (
            <button onClick={() => setShowSellModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-white text-sm font-extrabold shadow-md">
              <DollarSign className="h-4 w-4" /> Mark Sold
            </button>
          )}
          {isAvailable && (
            <button onClick={() => {
              const name = prompt('Reserve for customer:');
              if (name) reserve.mutate(name);
            }} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-700 text-sm font-extrabold">
              <Clock className="h-4 w-4" /> Reserve
            </button>
          )}
          {isReserved && (
            <button onClick={() => { if (confirm('Cancel reservation?')) unreserve.mutate(); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-extrabold">
              <RotateCcw className="h-4 w-4" /> Cancel Reserve
            </button>
          )}
          <button onClick={() => setShowMedicalModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-700 text-sm font-extrabold">
            <Syringe className="h-4 w-4" /> Medical Record
          </button>
          <Link to={`/petshop/live-animals/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          {animal.status !== 'SOLD' && (
            <button onClick={() => { if (confirm(`Delete ${animal.name || animal.animalNumber}?`)) remove.mutate(); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-extrabold">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-pink-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="space-y-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20">
              {animal.imageUrls?.[imgIndex] ? (
                <img src={animal.imageUrls[imgIndex]} alt={animal.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50"><Heart className="h-16 w-16" /></div>
              )}
              {animal.isFeatured && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-white" /> FEATURED
                </div>
              )}
              <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-extrabold shadow-lg ${
                animal.status === 'AVAILABLE' ? 'bg-emerald-500 text-white' :
                animal.status === 'RESERVED' ? 'bg-amber-500 text-white' :
                animal.status === 'SOLD' ? 'bg-blue-500 text-white' :
                'bg-slate-500 text-white'}`}>
                {animal.status}
              </div>
            </div>
            {animal.imageUrls.length > 1 && (
              <div className="grid grid-cols-5 gap-1.5">
                {animal.imageUrls.slice(0, 5).map((url: string, i: number) => (
                  <button key={i} onClick={() => setImgIndex(i)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${imgIndex === i ? 'border-white' : 'border-white/20 opacity-70'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Heart className="h-3.5 w-3.5 text-amber-300" /> Live Animal
              <span className="text-white/40">•</span>
              <span className="font-mono">#{animal.animalNumber}</span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              {animal.name || animal.species.replace(/_/g, ' ')}
            </h1>
            <p className="mt-1 text-sm text-white/85">
              {animal.breed || 'Unknown breed'} • {animal.gender || 'Gender unknown'}
              {animal.ageMonths && ` • ${animal.ageMonths} months`}
              {animal.color && ` • ${animal.color}`}
            </p>

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              {animal.isVaccinated && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/30 backdrop-blur px-2 py-0.5 font-bold border border-emerald-300/40">
                  <Syringe className="h-3 w-3" /> Vaccinated
                </span>
              )}
              {animal.isDewormed && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/30 backdrop-blur px-2 py-0.5 font-bold border border-blue-300/40">
                  🐛 Dewormed
                </span>
              )}
              {animal.hasHealthCertificate && (
                <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/30 backdrop-blur px-2 py-0.5 font-bold border border-violet-300/40">
                  <FileText className="h-3 w-3" /> Health Cert
                </span>
              )}
              {animal.weightKg && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white/10 backdrop-blur px-2 py-0.5 font-bold">
                  ⚖️ {animal.weightKg}kg
                </span>
              )}
            </div>

            <div className="mt-5 flex items-end gap-5 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Asking Price</div>
                <div className="text-4xl font-extrabold tabular-nums leading-none mt-1">{formatPKRFull(animal.askingPrice)}</div>
              </div>
              {animal.soldPrice && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Sold For</div>
                  <div className="text-xl font-extrabold tabular-nums text-emerald-300 leading-none mt-1">{formatPKRFull(animal.soldPrice)}</div>
                </div>
              )}
              {animal.computed?.profit != null && animal.status === 'SOLD' && (
                <div className={`rounded-xl px-3 py-2 backdrop-blur border ${animal.computed.profit >= 0 ? 'bg-emerald-400/20 border-emerald-300/40' : 'bg-rose-400/20 border-rose-300/40'}`}>
                  <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Profit</div>
                  <div className="text-lg font-extrabold tabular-nums leading-none mt-0.5">{formatPKRFull(animal.computed.profit)}</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Calendar} label="Days in Store" value={String(animal.computed?.daysInStore ?? '—')} sub="since acquired" tone="amber" />
              <HeroStat icon={MapPin} label="Location" value={animal.currentCage || 'Not set'} sub="cage / area" tone="blue" />
              <HeroStat icon={Activity} label="Medical Records" value={String(animal.medicalHistory?.length || 0)} sub="entries" tone="violet" />
              <HeroStat icon={Award} label="Source" value={animal.sourceType || 'Not set'} sub={animal.sourceName || ''} tone="emerald" />
            </div>
          </div>
        </div>
      </section>

      {animal.computed?.isLongStay && (
        <section className="rounded-3xl border-2 bg-gradient-to-br p-4 flex items-start gap-3 from-orange-50 to-white border-orange-300 text-orange-900">
          <div className="h-11 w-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-sm">Long-stay animal ({animal.computed.daysInStore} days)</h3>
            <p className="text-xs font-semibold opacity-90 mt-0.5">Consider discounting or promotional pricing</p>
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* HEALTH */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Syringe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Health Status</h3>
              <p className="text-xs text-slate-500 font-bold">Vaccination & wellness</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <FlagBox active={animal.isVaccinated} label="Vaccinated" emoji="💉" />
              <FlagBox active={animal.isDewormed} label="Dewormed" emoji="🐛" />
              <FlagBox active={animal.hasHealthCertificate} label="Certified" emoji="📄" />
            </div>
            {animal.vaccinationDetails && (
              <InfoField label="Vaccination Details" value={animal.vaccinationDetails} />
            )}
            {animal.dewormingDetails && (
              <InfoField label="Deworming Details" value={animal.dewormingDetails} />
            )}
            {animal.healthNotes && (
              <InfoField label="Health Notes" value={animal.healthNotes} />
            )}
          </div>
        </section>

        {/* CARE */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Care Details</h3>
              <p className="text-xs text-slate-500 font-bold">Feeding, location, notes</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {animal.currentCage && <InfoField label="Current Location" value={animal.currentCage} />}
            {animal.feedingSchedule && <InfoField label="Feeding Schedule" value={animal.feedingSchedule} />}
            {animal.specialNeeds && <InfoField label="Special Needs" value={animal.specialNeeds} />}
            {animal.birthDate && (
              <InfoField label="Birth Date" value={new Date(animal.birthDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} />
            )}
            {animal.acquiredDate && (
              <InfoField label="Acquired Date" value={new Date(animal.acquiredDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} />
            )}
            {animal.notes && <InfoField label="Notes" value={animal.notes} />}
          </div>
        </section>
      </div>

      {/* MEDICAL HISTORY */}
      {animal.medicalHistory && (animal.medicalHistory as any[]).length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Medical History</h3>
              <p className="text-xs text-slate-500 font-bold">{(animal.medicalHistory as any[]).length} records</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {(animal.medicalHistory as any[]).slice().reverse().map((rec: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-blue-50/40 transition">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Syringe className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-sm">{rec.type}</span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {new Date(rec.at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold mt-0.5">{rec.description}</div>
                  {rec.vetName && <div className="text-[10px] text-slate-500 font-bold mt-1">Vet: {rec.vetName}</div>}
                  {rec.nextDueDate && (
                    <div className="text-[10px] font-extrabold text-amber-700 mt-1">
                      ⏰ Next due: {new Date(rec.nextDueDate).toLocaleDateString('en-PK')}
                    </div>
                  )}
                </div>
                {rec.cost > 0 && (
                  <div className="text-right shrink-0">
                    <div className="text-[9px] uppercase font-extrabold text-slate-500">Cost</div>
                    <div className="font-extrabold text-slate-900 text-sm tabular-nums">{formatPKR(rec.cost)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SellModal({ animal, onClose, onSold }: any) {
  const [soldPrice, setSoldPrice] = useState(animal.askingPrice);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  const sell = useMutation({
    mutationFn: () => liveAnimalsApi.sell(animal.id, {
      soldPrice: Number(soldPrice),
      soldToCustomerName: customerName || undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Animal sold');
      onSold();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">💰 Mark as Sold</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Sold Price *</label>
            <input type="number" value={soldPrice} onChange={(e) => setSoldPrice(Number(e.target.value))}
              className="h-14 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-600" />
            <p className="mt-1 text-[10px] text-slate-500 font-bold">Asking price: {formatPKR(animal.askingPrice)}</p>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Customer Name</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Buyer's name"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special conditions..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </div>
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700"
            onClick={() => sell.mutate()} loading={sell.isPending} disabled={!soldPrice || soldPrice <= 0}>
            <CheckCircle2 className="h-4 w-4" /> Confirm Sale
          </Button>
        </div>
      </div>
    </div>
  );
}

function MedicalModal({ animal, onClose, onAdded }: any) {
  const [form, setForm] = useState({
    type: 'Vaccination',
    description: '',
    vetName: '',
    cost: '' as number | '',
    nextDueDate: '',
  });

  const add = useMutation({
    mutationFn: () => liveAnimalsApi.addMedicalRecord(animal.id, {
      type: form.type,
      description: form.description,
      vetName: form.vetName || undefined,
      cost: form.cost === '' ? undefined : Number(form.cost),
      nextDueDate: form.nextDueDate || undefined,
    }),
    onSuccess: () => {
      toast.success('Medical record added');
      onAdded();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">🩺 Add Medical Record</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option>Vaccination</option>
              <option>Deworming</option>
              <option>Check-up</option>
              <option>Treatment</option>
              <option>Surgery</option>
              <option>Emergency</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Description *</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="DHPP, Rabies, Antibiotics..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Vet Name</label>
            <input value={form.vetName} onChange={(e) => setForm({ ...form, vetName: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Cost</label>
              <input type="number" value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value === '' ? '' : Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Next Due</label>
              <input type="date" value={form.nextDueDate}
                onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700"
            onClick={() => add.mutate()} loading={add.isPending} disabled={!form.description.trim()}>
            <Plus className="h-4 w-4" /> Add Record
          </Button>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold text-white tabular-nums leading-none truncate">{value}</div>
      {sub && <div className="text-[10px] font-bold text-white/70 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
      <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">{label}</div>
      <div className="text-sm font-bold text-slate-900 whitespace-pre-line">{value}</div>
    </div>
  );
}

function FlagBox({ active, label, emoji }: any) {
  return (
    <div className={`rounded-xl border-2 p-3 text-center ${active ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
      <div className="text-2xl">{emoji}</div>
      <div className={`text-xs font-extrabold mt-1 ${active ? 'text-emerald-900' : 'text-slate-500'}`}>{label}</div>
      <div className={`text-[10px] font-bold mt-0.5 ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
        {active ? '✓ YES' : '✗ NO'}
      </div>
    </div>
  );
}

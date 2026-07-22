import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit3, Trash2, Dumbbell, Phone, Mail, MapPin, Calendar, Heart, Users, AlertTriangle, Activity, Award, Zap, Clock, Target, ShieldCheck, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { gymMembersApi } from '../api/members.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { format, differenceInYears } from 'date-fns';

const GOAL_LABELS: Record<string, { label: string; emoji: string }> = {
  WEIGHT_LOSS: { label: 'Weight Loss', emoji: '⬇️' },
  MUSCLE_GAIN: { label: 'Muscle Gain', emoji: '💪' },
  BODY_BUILDING: { label: 'Body Building', emoji: '🏆' },
  STRENGTH: { label: 'Strength', emoji: '⚡' },
  ENDURANCE: { label: 'Endurance', emoji: '🏃' },
  CARDIO: { label: 'Cardio', emoji: '❤️' },
  FLEXIBILITY: { label: 'Flexibility', emoji: '🤸' },
  GENERAL_FITNESS: { label: 'General Fit', emoji: '💯' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GymMemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: member, isLoading } = useQuery({
    queryKey: ['gym-member', id],
    queryFn: () => gymMembersApi.getOne(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => gymMembersApi.remove(id!),
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['gym-members'] });
      navigate('/gym/members');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="h-12 w-12 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" /></div>;
  if (!member) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Dumbbell className="h-16 w-16 text-slate-300" />
      <p className="font-extrabold">Member not found</p>
      <Link to="/gym/members" className="text-red-600 font-bold hover:underline">← Back</Link>
    </div>
  );

  const h = Number(member.heightCm || 0) / 100;
  const w = Number(member.currentWeightKg || 0);
  const bmi = h > 0 && w > 0 ? w / (h * h) : 0;
  const bmiCategory = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const age = member.dateOfBirth ? differenceInYears(new Date(), new Date(member.dateOfBirth)) : null;

  const activeMembership = member.memberships?.find((m: any) => m.status === 'ACTIVE');

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/gym/members" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 font-bold"><ArrowLeft className="h-4 w-4" /> Back to Members</Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={'/gym-members/' + id + '/edit'}>
            <Button className="bg-gradient-to-r from-red-600 to-orange-700"><Edit3 className="h-4 w-4" /> Edit Profile</Button>
          </Link>
          <Button variant="secondary" onClick={() => { if (confirm('Remove ' + member.customer?.name + '?')) removeMutation.mutate(); }} className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"><Trash2 className="h-4 w-4" /> Delete</Button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative grid lg:grid-cols-[auto_1fr] gap-6 items-start">
          <div className="relative">
            {member.photoUrl ? (
              <img src={member.photoUrl} alt="" className="h-48 w-48 rounded-3xl object-cover ring-4 ring-white/20 shadow-2xl" />
            ) : (
              <div className="h-48 w-48 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-6xl font-extrabold ring-4 ring-white/20 shadow-2xl">
                {member.customer?.name?.charAt(0).toUpperCase() ?? 'M'}
              </div>
            )}
            <div className={'absolute -bottom-2 -right-2 h-10 w-10 rounded-full ring-4 ring-slate-950 flex items-center justify-center text-white text-xs font-extrabold ' + (member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-500')}>
              {member.status === 'ACTIVE' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                💪 Gym Member
              </div>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight">{member.customer?.name ?? 'Member'}</h1>
              <div className="text-sm font-mono font-bold text-white/70 mt-1">{member.memberNumber}</div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-white/85">
              {member.customer?.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{member.customer.phone}</span>}
              {member.customer?.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{member.customer.email}</span>}
              {age !== null && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{age} years</span>}
              {member.gender && <span>{member.gender}</span>}
              {member.bloodGroup && <span className="px-2 py-0.5 rounded bg-red-500/30 border border-red-300/40 font-extrabold">{member.bloodGroup}</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatBadge label="Streak" value={member.currentStreak + ' days'} emoji="🔥" />
              <StatBadge label="Total Visits" value={member.totalVisits} emoji="✅" />
              <StatBadge label="Best Streak" value={member.longestStreak + ' days'} emoji="🏆" />
              <StatBadge label="Lifetime" value={formatPKR(member.totalSpent)} emoji="💰" />
            </div>
          </div>
        </div>
      </section>

      {activeMembership && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-green-50 border-2 border-emerald-300 shadow-lg p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow">
                <Award className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-extrabold text-emerald-700">Active Membership</div>
                <div className="text-2xl font-extrabold">{activeMembership.plan?.name}</div>
                <div className="text-sm text-slate-700 font-bold mt-0.5">
                  Valid till {format(new Date(activeMembership.endDate), 'dd MMM yyyy')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Balance</div>
              <div className={'text-2xl font-extrabold ' + (activeMembership.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                {formatPKR(activeMembership.balanceDue)}
              </div>
              {activeMembership.balanceDue > 0 && <div className="text-[10px] text-amber-700 font-bold">Payment pending</div>}
            </div>
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
          <SectionTitle icon={Activity} title="Body Composition" gradient="from-red-500 to-orange-600" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {member.heightCm && <InfoBox label="Height" value={member.heightCm + ' cm'} />}
            {member.currentWeightKg && <InfoBox label="Weight" value={member.currentWeightKg + ' kg'} />}
            {member.targetWeightKg && <InfoBox label="Target" value={member.targetWeightKg + ' kg'} highlight />}
            {bmi > 0 && <InfoBox label="BMI" value={bmi.toFixed(1)} sub={bmiCategory} />}
            {member.bodyFatPct && <InfoBox label="Body Fat" value={member.bodyFatPct + '%'} />}
            {member.muscleMassPct && <InfoBox label="Muscle" value={member.muscleMassPct + '%'} />}
          </div>
        </section>

        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
          <SectionTitle icon={Target} title="Fitness Goals" gradient="from-fuchsia-500 to-purple-600" />
          <div className="p-3 rounded-xl bg-gradient-to-br from-fuchsia-50 to-pink-50 border-2 border-fuchsia-200">
            <div className="text-[10px] uppercase font-extrabold text-fuchsia-700">Primary Goal</div>
            <div className="text-lg font-extrabold text-fuchsia-900 mt-1">
              {GOAL_LABELS[member.primaryGoal]?.emoji} {GOAL_LABELS[member.primaryGoal]?.label ?? member.primaryGoal}
            </div>
          </div>
          {member.secondaryGoals?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-1">Also targeting</div>
              <div className="flex flex-wrap gap-1">
                {member.secondaryGoals.map((g: string) => (
                  <span key={g} className="px-2 py-0.5 rounded bg-fuchsia-100 text-fuchsia-800 text-[10px] font-extrabold">
                    {GOAL_LABELS[g]?.emoji} {GOAL_LABELS[g]?.label ?? g}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <InfoBox label="Level" value={member.fitnessLevel ?? '—'} />
            <InfoBox label="Experience" value={(member.experienceYears ?? 0) + ' yr'} />
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
          <SectionTitle icon={Heart} title="Medical Info" gradient="from-rose-500 to-red-600" />
          {member.medicalConditions && <TextBlock label="Conditions" value={member.medicalConditions} />}
          {member.injuries && <TextBlock label="Injuries" value={member.injuries} />}
          {member.medications && <TextBlock label="Medications" value={member.medications} />}
          {member.allergies?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-extrabold text-amber-700 mb-1">Allergies</div>
              <div className="flex flex-wrap gap-1">
                {member.allergies.map((a: string) => (
                  <span key={a} className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">⚠️ {a}</span>
                ))}
              </div>
            </div>
          )}
          {member.doctorClearance && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-extrabold text-emerald-900">Doctor's clearance obtained</span>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
          <SectionTitle icon={Users} title="Emergency Contact" gradient="from-orange-500 to-red-600" />
          <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-4">
            <div className="text-lg font-extrabold text-orange-900">{member.emergencyContactName ?? '—'}</div>
            <div className="text-sm font-bold text-orange-700">{member.emergencyContactPhone ?? '—'}</div>
            {member.emergencyContactRelation && (
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-200 text-orange-800 text-[10px] font-extrabold uppercase">
                {member.emergencyContactRelation}
              </div>
            )}
          </div>
          <SectionTitle icon={Clock} title="Schedule" gradient="from-violet-500 to-purple-600" />
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-1">Preferred Time</div>
            <div className="font-extrabold">{member.preferredWorkoutTime ?? '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-1">Workout Days</div>
            <div className="flex gap-1">
              {DAYS.map((d, i) => (
                <div key={d} className={'h-8 w-10 rounded-lg flex items-center justify-center text-xs font-extrabold ' + (member.workoutDays?.includes(i) ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400')}>
                  {d}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {(member.bio || member.notes) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
          {member.bio && <TextBlock label="Bio" value={member.bio} />}
          {member.notes && <TextBlock label="Internal Notes" value={member.notes} />}
        </section>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, gradient }: any) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100">
      <div className={'h-10 w-10 rounded-xl bg-gradient-to-br ' + gradient + ' text-white flex items-center justify-center shadow-md'}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-extrabold text-slate-900 text-lg">{title}</h3>
    </div>
  );
}

function StatBadge({ label, value, emoji }: any) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 p-2 text-center">
      <div className="text-lg mb-0.5">{emoji}</div>
      <div className="text-[9px] uppercase font-extrabold text-white/70">{label}</div>
      <div className="text-sm font-extrabold text-white tabular-nums">{value}</div>
    </div>
  );
}

function InfoBox({ label, value, sub, highlight }: any) {
  return (
    <div className={'rounded-xl border-2 p-3 ' + (highlight ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{label}</div>
      <div className={'text-lg font-extrabold tabular-nums ' + (highlight ? 'text-red-900' : 'text-slate-900')}>{value}</div>
      {sub && <div className="text-[10px] font-bold text-slate-500">{sub}</div>}
    </div>
  );
}

function TextBlock({ label, value }: any) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1">{label}</div>
      <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
    </div>
  );
}

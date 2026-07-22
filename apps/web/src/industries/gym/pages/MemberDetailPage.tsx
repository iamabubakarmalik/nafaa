import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, User, Phone, Mail, Calendar, Award, Activity,
  Heart, AlertCircle, Flame, TrendingUp, Ruler, Weight, Target,
  Sparkles, Plus, LogIn, LogOut, Clock, DollarSign, Star, Camera, X, Save,
} from 'lucide-react';
import { gymMembersApi } from '../api/members.api';
import { measurementsApi } from '../api/measurements.api';
import { workoutsApi } from '../api/workouts.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { format, differenceInMinutes, differenceInDays } from 'date-fns';

export default function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'measurements' | 'workouts' | 'attendance'>('overview');
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);

  const { data: member, isLoading, refetch } = useQuery({
    queryKey: ['gym-member', id],
    queryFn: () => gymMembersApi.getOne(id!),
    enabled: !!id,
  });

  const { data: progressData } = useQuery({
    queryKey: ['member-progress', id],
    queryFn: () => measurementsApi.progress(id!),
    enabled: !!id && tab === 'measurements',
  });

  const { data: workoutSummary } = useQuery({
    queryKey: ['workout-summary', id],
    queryFn: () => workoutsApi.summary(id!),
    enabled: !!id && tab === 'workouts',
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts', id],
    queryFn: () => workoutsApi.byMember(id!),
    enabled: !!id && tab === 'workouts',
  });

  if (isLoading || !member) {
    return <div className="h-96 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  const activeMembership = member.memberships?.find((m: any) => m.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/gym/members')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-4">
              {member.photoUrl ? (
                <img src={member.photoUrl} className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/20" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-extrabold">
                  {member.customer?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  {member.memberNumber}
                </div>
                <h1 className="mt-1 text-3xl font-extrabold">{member.customer?.name}</h1>
                <div className="mt-1 flex items-center gap-3 text-sm flex-wrap">
                  {member.customer?.phone && (
                    <a href={'tel:' + member.customer.phone} className="inline-flex items-center gap-1 text-white/80 font-bold hover:text-white">
                      <Phone className="h-3 w-3" />
                      {member.customer.phone}
                    </a>
                  )}
                  {member.currentStreak > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-extrabold">
                      <Flame className="h-3 w-3" />
                      {member.currentStreak}d streak
                    </span>
                  )}
                  <span className={
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ' +
                    (member.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-slate-500')
                  }>
                    {member.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/gym/attendance">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <LogIn className="h-4 w-4" />
                Check-in
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Total Visits</div>
            <div className="text-2xl font-extrabold tabular-nums">{member.totalVisits}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Best Streak</div>
            <div className="text-2xl font-extrabold tabular-nums text-amber-300">{member.longestStreak}d</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Total Spent</div>
            <div className="text-2xl font-extrabold tabular-nums text-emerald-300">{formatPKR(member.totalSpent)}</div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Member Since</div>
            <div className="text-sm font-extrabold">{format(new Date(member.joinedAt), 'MMM yyyy')}</div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { v: 'overview', label: 'Overview', icon: User },
          { v: 'measurements', label: 'Measurements', icon: Ruler },
          { v: 'workouts', label: 'Workouts', icon: Activity },
          { v: 'attendance', label: 'Attendance', icon: Calendar },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.v} onClick={() => setTab(t.v as any)} className={
              'shrink-0 px-4 py-2 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition ' +
              (tab === t.v ? 'bg-red-600 text-white shadow' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700')
            }>
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-red-600" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoField label="Date of Birth" value={member.dateOfBirth ? format(new Date(member.dateOfBirth), 'dd MMM yyyy') : '—'} />
              <InfoField label="Gender" value={member.gender} />
              <InfoField label="Blood Group" value={member.bloodGroup} />
              <InfoField label="Fitness Level" value={member.fitnessLevel} />
              <InfoField label="Experience" value={member.experienceYears ? member.experienceYears + ' years' : '—'} />
              <InfoField label="RFID Card" value={member.rfidCard} />
              <InfoField label="QR Code" value={member.qrCode} />
              <InfoField label="Biometric ID" value={member.biometricId} />
            </div>
          </div>

          {/* Physical Stats */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Weight className="h-4 w-4 text-blue-600" />
              Physical Stats
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Height" value={member.heightCm ? member.heightCm + 'cm' : '—'} color="blue" />
              <StatBox label="Current" value={member.currentWeightKg ? member.currentWeightKg + 'kg' : '—'} color="emerald" />
              <StatBox label="Target" value={member.targetWeightKg ? member.targetWeightKg + 'kg' : '—'} color="amber" />
              <StatBox label="BMI" value={member.bmi ? member.bmi.toFixed(1) : '—'} color="violet" />
              <StatBox label="Body Fat" value={member.bodyFatPct ? member.bodyFatPct + '%' : '—'} color="orange" />
              <StatBox label="Muscle" value={member.muscleMassPct ? member.muscleMassPct + '%' : '—'} color="rose" />
            </div>
          </div>

          {/* Goals */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-fuchsia-600" />
              Fitness Goals
            </h3>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Primary Goal</div>
              <div className="rounded-xl bg-fuchsia-50 border-2 border-fuchsia-200 p-3 font-extrabold text-fuchsia-800">
                {member.primaryGoal.replace('_', ' ')}
              </div>
            </div>
            {member.secondaryGoals?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Secondary Goals</div>
                <div className="flex flex-wrap gap-1">
                  {member.secondaryGoals.map((g: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-xs font-extrabold uppercase">{g.replace('_', ' ')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Medical */}
          {(member.medicalConditions || member.allergies?.length > 0 || member.injuries || !member.doctorClearance) && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-200 dark:border-rose-800 shadow-sm p-5 space-y-3">
              <h3 className="font-extrabold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Medical Information
              </h3>
              {!member.doctorClearance && (
                <div className="rounded-lg bg-rose-100 border border-rose-300 p-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-700" />
                  <div className="text-sm font-extrabold text-rose-900">Doctor clearance NOT obtained</div>
                </div>
              )}
              {member.medicalConditions && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-rose-700 mb-1">Conditions</div>
                  <p className="text-sm font-bold text-slate-800">{member.medicalConditions}</p>
                </div>
              )}
              {member.injuries && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-rose-700 mb-1">Past Injuries</div>
                  <p className="text-sm font-bold text-slate-800">{member.injuries}</p>
                </div>
              )}
              {member.allergies?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-rose-700 mb-1">Allergies</div>
                  <div className="flex flex-wrap gap-1">
                    {member.allergies.map((a: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-xs font-extrabold">⚠️ {a}</span>
                    ))}
                  </div>
                </div>
              )}
              {member.medications && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-rose-700 mb-1">Medications</div>
                  <p className="text-sm font-bold text-slate-800">{member.medications}</p>
                </div>
              )}
            </div>
          )}

          {/* Emergency Contact */}
          {member.emergencyContactName && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Emergency Contact
              </h3>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
                <div className="font-extrabold text-slate-900">{member.emergencyContactName}</div>
                {member.emergencyContactRelation && <div className="text-xs font-bold text-slate-600">{member.emergencyContactRelation}</div>}
                {member.emergencyContactPhone && (
                  <a href={'tel:' + member.emergencyContactPhone} className="mt-1 inline-flex items-center gap-1 text-sm font-extrabold text-amber-800 hover:underline">
                    <Phone className="h-3 w-3" />
                    {member.emergencyContactPhone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Active Membership */}
          {activeMembership && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl p-5 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Award className="h-3.5 w-3.5" />
                Active Membership
              </div>
              <h3 className="text-2xl font-extrabold">{activeMembership.plan?.name}</h3>
              <div className="text-sm font-bold text-white/80">
                {format(new Date(activeMembership.startDate), 'dd MMM')} → {format(new Date(activeMembership.endDate), 'dd MMM yyyy')}
              </div>
              <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 p-3 flex items-center justify-between">
                <span className="text-sm font-extrabold">Days Left</span>
                <span className="text-2xl font-extrabold tabular-nums">
                  {differenceInDays(new Date(activeMembership.endDate), new Date())}
                </span>
              </div>
              {activeMembership.balanceDue > 0 && (
                <div className="rounded-xl bg-rose-500/30 backdrop-blur border border-white/20 p-2 text-xs font-extrabold">
                  Balance due: {formatPKR(activeMembership.balanceDue)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MEASUREMENTS TAB */}
      {tab === 'measurements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Body Measurements</h3>
            <Button onClick={() => setShowMeasurementForm(true)} className="bg-gradient-to-r from-blue-600 to-cyan-700">
              <Plus className="h-4 w-4" />
              Add Measurement
            </Button>
          </div>

          {showMeasurementForm && (
            <MeasurementForm
              memberId={id!}
              onClose={() => setShowMeasurementForm(false)}
              onSaved={() => {
                setShowMeasurementForm(false);
                queryClient.invalidateQueries({ queryKey: ['member-progress', id] });
                queryClient.invalidateQueries({ queryKey: ['gym-member', id] });
              }}
            />
          )}

          {progressData?.changes && (
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Progress (First → Latest)
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(progressData.changes).map(([key, val]: any) => (
                  <div key={key} className="rounded-2xl bg-slate-50 dark:bg-neutral-800/50 p-4">
                    <div className="text-[10px] uppercase font-extrabold text-slate-500">{key}</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-slate-400 tabular-nums text-sm">{val.from?.toFixed(1)}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-extrabold tabular-nums">{val.to?.toFixed(1)}</span>
                    </div>
                    <div className={
                      'mt-1 text-xs font-extrabold ' +
                      (val.change > 0 ? 'text-emerald-700' : val.change < 0 ? 'text-rose-700' : 'text-slate-500')
                    }>
                      {val.change > 0 ? '+' : ''}{val.change?.toFixed(1)} ({val.pctChange?.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {member.measurements && member.measurements.length > 0 ? (
            <section className="grid gap-3">
              {member.measurements.map((m: any) => (
                <div key={m.id} className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-extrabold text-slate-900">{format(new Date(m.measurementDate), 'dd MMM yyyy, HH:mm')}</div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                    {m.weightKg && <MeasurementBox label="Weight" value={m.weightKg + 'kg'} />}
                    {m.bmi && <MeasurementBox label="BMI" value={m.bmi.toFixed(1)} />}
                    {m.bodyFatPct && <MeasurementBox label="Body Fat" value={m.bodyFatPct + '%'} />}
                    {m.chestCm && <MeasurementBox label="Chest" value={m.chestCm + 'cm'} />}
                    {m.waistCm && <MeasurementBox label="Waist" value={m.waistCm + 'cm'} />}
                    {m.hipsCm && <MeasurementBox label="Hips" value={m.hipsCm + 'cm'} />}
                    {m.bicepsCm && <MeasurementBox label="Biceps" value={m.bicepsCm + 'cm'} />}
                    {m.thighsCm && <MeasurementBox label="Thighs" value={m.thighsCm + 'cm'} />}
                  </div>
                  {m.notes && <div className="mt-2 text-xs italic text-slate-500">📝 {m.notes}</div>}
                </div>
              ))}
            </section>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
              <Ruler className="h-16 w-16 text-slate-400 mx-auto mb-3" />
              <p className="font-extrabold text-slate-700">No measurements recorded</p>
            </div>
          )}
        </div>
      )}

      {/* WORKOUTS TAB */}
      {tab === 'workouts' && (
        <div className="space-y-4">
          {workoutSummary && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatBox label="Sessions" value={workoutSummary.total?._count?._all ?? 0} color="red" />
              <StatBox label="This Month" value={workoutSummary.thisMonth ?? 0} color="emerald" />
              <StatBox label="Total Weight" value={((workoutSummary.total?._sum?.totalWeight ?? 0) / 1000).toFixed(1) + 't'} color="orange" />
              <StatBox label="Calories" value={(workoutSummary.total?._sum?.caloriesBurned ?? 0).toFixed(0)} color="rose" />
            </section>
          )}

          {workouts.length > 0 ? (
            <section className="grid gap-3">
              {workouts.map((w: any) => (
                <div key={w.id} className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-extrabold">{w.workoutType || 'Workout'}</div>
                      <div className="text-xs text-slate-500 font-semibold">
                        {format(new Date(w.sessionDate), 'dd MMM yyyy, HH:mm')}
                        {w.focusArea && ' • Focus: ' + w.focusArea}
                      </div>
                    </div>
                    {w.memberRating && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-extrabold inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-current" />
                        {w.memberRating}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <StatBox label="Duration" value={w.durationMinutes ? w.durationMinutes + 'min' : '—'} color="blue" />
                    <StatBox label="Sets" value={w.totalSets} color="emerald" />
                    <StatBox label="Reps" value={w.totalReps} color="orange" />
                    <StatBox label="Volume" value={((w.totalWeight ?? 0) / 1000).toFixed(1) + 't'} color="rose" />
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
              <Activity className="h-16 w-16 text-slate-400 mx-auto mb-3" />
              <p className="font-extrabold text-slate-700">No workout sessions logged</p>
            </div>
          )}
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {tab === 'attendance' && (
        <div className="space-y-3">
          {member.attendances && member.attendances.length > 0 ? (
            member.attendances.map((a: any) => {
              const isInside = !a.checkOutAt;
              const duration = a.checkOutAt
                ? differenceInMinutes(new Date(a.checkOutAt), new Date(a.checkInAt))
                : differenceInMinutes(new Date(), new Date(a.checkInAt));
              return (
                <div key={a.id} className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 flex items-center gap-3">
                  <div className={
                    'h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 ' +
                    (isInside ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-slate-400 to-slate-600')
                  }>
                    {isInside ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm">{format(new Date(a.checkInAt), 'dd MMM yyyy, HH:mm')}</span>
                      {isInside && <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">INSIDE</span>}
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase">{a.method}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      {a.checkOutAt ? 'Duration: ' + duration + 'min' : duration + 'min (ongoing)'}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
              <Clock className="h-16 w-16 text-slate-400 mx-auto mb-3" />
              <p className="font-extrabold text-slate-700">No attendance records</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: any) {
  return (
    <div>
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="font-extrabold text-slate-900 dark:text-white">{value || '—'}</div>
    </div>
  );
}

function StatBox({ label, value, color }: any) {
  const colors: Record<string, string> = {
    red: 'bg-red-50 text-red-800 dark:bg-red-950/30',
    blue: 'bg-blue-50 text-blue-800 dark:bg-blue-950/30',
    emerald: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/30',
    violet: 'bg-violet-50 text-violet-800 dark:bg-violet-950/30',
    orange: 'bg-orange-50 text-orange-800 dark:bg-orange-950/30',
    rose: 'bg-rose-50 text-rose-800 dark:bg-rose-950/30',
  };
  return (
    <div className={'rounded-lg p-3 text-center ' + colors[color]}>
      <div className="text-[9px] uppercase font-extrabold opacity-70">{label}</div>
      <div className="text-lg font-extrabold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function MeasurementBox({ label, value }: any) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
      <div className="text-[9px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-sm font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function MeasurementForm({ memberId, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    weightKg: '', heightCm: '', bodyFatPct: '', muscleMassPct: '',
    chestCm: '', waistCm: '', hipsCm: '', bicepsCm: '', thighsCm: '',
    calvesCm: '', neckCm: '', shouldersCm: '',
    bloodPressure: '', restingHeartRate: '',
    notes: '',
    frontPhotoUrl: '', sidePhotoUrl: '', backPhotoUrl: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = { memberId };
      Object.keys(form).forEach((k) => {
        if (form[k] !== '' && form[k] !== null) {
          if (['weightKg', 'heightCm', 'bodyFatPct', 'muscleMassPct', 'chestCm', 'waistCm', 'hipsCm', 'bicepsCm', 'thighsCm', 'calvesCm', 'neckCm', 'shouldersCm', 'restingHeartRate'].includes(k)) {
            payload[k] = Number(form[k]);
          } else {
            payload[k] = form[k];
          }
        }
      });
      return measurementsApi.create(payload);
    },
    onSuccess: () => { toast.success('Measurement saved'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">📏 New Body Measurement</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="text-sm font-extrabold text-emerald-900 mb-3">Body Composition</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'weightKg', label: 'Weight (kg)' },
              { key: 'heightCm', label: 'Height (cm)' },
              { key: 'bodyFatPct', label: 'Body Fat %' },
              { key: 'muscleMassPct', label: 'Muscle %' },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">{f.label}</label>
                <input type="number" step="0.1" value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4">
          <div className="text-sm font-extrabold text-blue-900 mb-3">Body Measurements (cm)</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {[
              { key: 'chestCm', label: 'Chest' },
              { key: 'waistCm', label: 'Waist' },
              { key: 'hipsCm', label: 'Hips' },
              { key: 'bicepsCm', label: 'Biceps' },
              { key: 'thighsCm', label: 'Thighs' },
              { key: 'calvesCm', label: 'Calves' },
              { key: 'neckCm', label: 'Neck' },
              { key: 'shouldersCm', label: 'Shoulders' },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">{f.label}</label>
                <input type="number" step="0.1" value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="h-10 w-full rounded-lg border-2 border-blue-300 bg-white px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4">
          <div className="text-sm font-extrabold text-rose-900 mb-3">Vitals</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Blood Pressure</label>
              <input value={form.bloodPressure} onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })} placeholder="120/80" className="h-11 w-full rounded-xl border-2 border-rose-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Resting HR</label>
              <input type="number" value={form.restingHeartRate} onChange={(e) => setForm({ ...form, restingHeartRate: e.target.value })} placeholder="bpm" className="h-11 w-full rounded-xl border-2 border-rose-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
            </div>
          </div>
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            Save Measurement
          </Button>
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Trash2, Phone, Mail, MapPin, Calendar,
  User, Briefcase, Wallet, FileText, CheckCircle2, XCircle,
  Clock, Coffee, TrendingUp, ChevronRight, Building2,
  AlertTriangle, Download, MessageCircle,
} from 'lucide-react';
import { staffApi } from '@/api/staff.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

type Tab = 'overview' | 'attendance' | 'salary' | 'leaves' | 'documents';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
  { id: 'salary', label: 'Salary History', icon: Wallet },
  { id: 'leaves', label: 'Leaves', icon: Coffee },
  { id: 'documents', label: 'Documents', icon: FileText },
];

const formatDate = (d?: string | null) =>
  d ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(d)) : '—';

const formatTime = (d?: string | null) =>
  d ? new Intl.DateTimeFormat('en-PK', { hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';

export default function StaffDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => staffApi.getOne(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => staffApi.remove(id!),
    onSuccess: () => {
      toast.success('Staff terminated');
      navigate('/staff');
    },
  });

  if (isLoading || !staff) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  const presentDays = staff.attendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const totalAttendance = staff.attendances.length;
  const attendancePct = totalAttendance > 0 ? (presentDays / totalAttendance) * 100 : 0;

  const totalSalaryPaid = staff.salaryPayments
    .filter((p) => p.status === 'PAID' || p.status === 'PARTIAL')
    .reduce((sum, p) => sum + p.paidAmount, 0);

  const pendingLeaves = staff.leaves.filter((l) => l.status === 'PENDING').length;

  const handleWhatsApp = () => {
    const phone = staff.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600">
        <ArrowLeft className="h-4 w-4" /> Back to Staff
      </Link>

      {/* HEADER */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-center gap-4">
            {staff.avatarUrl ? (
              <img
                src={staff.avatarUrl}
                alt={staff.fullName}
                className="h-24 w-24 rounded-3xl object-cover border-4 border-white/20 shadow-xl"
              />
            ) : (
              <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-4xl font-extrabold shadow-xl">
                {staff.fullName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="text-xs font-mono text-white/60 font-bold">{staff.staffNumber}</div>
              <h1 className="text-3xl font-extrabold">{staff.fullName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-white/90">{staff.designation}</span>
                {staff.department && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-sm text-white/75">{staff.department}</span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  staff.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-200' :
                  staff.status === 'ON_LEAVE' ? 'bg-amber-500/20 text-amber-200' :
                  staff.status === 'SUSPENDED' ? 'bg-rose-500/20 text-rose-200' :
                  'bg-slate-500/20 text-slate-200'
                }`}>
                  {staff.status.replace('_', ' ')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white">
                  {staff.salaryType.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:ml-auto flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              className="bg-green-500/20 hover:bg-green-500/30 text-white border-green-400/30"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Link to={`/staff/${id}/edit`}>
              <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            {staff.status !== 'TERMINATED' && (
              <Button
                variant="secondary"
                className="bg-rose-500/20 hover:bg-rose-500/30 text-white border-rose-400/30"
                onClick={() => {
                  if (confirm(`Terminate "${staff.fullName}"?`)) removeMutation.mutate();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Terminate
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* QUICK STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Base Salary</div>
              <div className="text-xl font-extrabold text-slate-900">
                {staff.salaryType === 'COMMISSION' ? `${staff.baseSalary}%` : formatPKR(staff.baseSalary)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Paid</div>
              <div className="text-xl font-extrabold text-slate-900">{formatPKR(totalSalaryPaid)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Attendance</div>
              <div className="text-xl font-extrabold text-slate-900">{attendancePct.toFixed(0)}%</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Pending Leaves</div>
              <div className="text-xl font-extrabold text-slate-900">{pendingLeaves}</div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                tab === t.id
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-violet-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Personal */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-violet-600" /> Personal Info
              </h3>
              <InfoRow label="Father's Name" value={staff.fatherName} />
              <InfoRow label="Gender" value={staff.gender} />
              <InfoRow label="Date of Birth" value={staff.dateOfBirth ? formatDate(staff.dateOfBirth) : null} />
              <InfoRow label="CNIC" value={staff.cnic} mono />
              <InfoRow label="Email" value={staff.email} icon={Mail} />
              <InfoRow label="Phone" value={staff.phone} icon={Phone} />
              <InfoRow label="Alt Phone" value={staff.altPhone} icon={Phone} />
              <InfoRow label="Address" value={staff.address} icon={MapPin} />
              <InfoRow label="City" value={staff.city} icon={MapPin} />
            </div>

            {/* Job & Bank */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-violet-600" /> Job Details
                </h3>
                <InfoRow label="Designation" value={staff.designation} />
                <InfoRow label="Department" value={staff.department} />
                <InfoRow label="Join Date" value={formatDate(staff.joinDate)} icon={Calendar} />
                <InfoRow label="Working Hours/Day" value={`${staff.workingHoursPerDay} hours`} />
                <InfoRow label="Working Days/Month" value={`${staff.workingDaysPerMonth} days`} />
                {staff.shop && <InfoRow label="Shop" value={staff.shop.name} icon={Building2} />}
              </div>

              {staff.bankName && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-violet-600" /> Bank
                  </h3>
                  <InfoRow label="Bank" value={staff.bankName} />
                  <InfoRow label="Account #" value={staff.accountNumber} mono />
                  <InfoRow label="IBAN" value={staff.iban} mono />
                </div>
              )}

              {staff.emergencyName && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-600" /> Emergency Contact
                  </h3>
                  <InfoRow label="Name" value={staff.emergencyName} />
                  <InfoRow label="Relation" value={staff.emergencyRelation} />
                  <InfoRow label="Phone" value={staff.emergencyPhone} icon={Phone} />
                </div>
              )}
            </div>

            {staff.notes && (
              <div className="md:col-span-2">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Notes</h3>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-line">
                  {staff.notes}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'attendance' && (
          <div className="space-y-3">
            {staff.attendances.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No attendance records" subtitle="Attendance abhi track nahi hui" />
            ) : (
              <div className="space-y-2">
                {staff.attendances.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3 hover:border-violet-300 transition">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                        a.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                        a.status === 'ABSENT' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {a.status === 'PRESENT' || a.status === 'LATE' ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : a.status === 'ABSENT' ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <Coffee className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{formatDate(a.date)}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                          {a.checkIn && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> In: {formatTime(a.checkIn)}
                            </span>
                          )}
                          {a.checkOut && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Out: {formatTime(a.checkOut)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                        a.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                        a.status === 'ABSENT' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {a.status}
                      </span>
                      <div className="text-xs text-slate-500 mt-1">
                        {a.workedHours.toFixed(1)} hrs
                        {a.overtimeHours > 0 && <span className="text-amber-600 font-bold ml-1">+{a.overtimeHours.toFixed(1)} OT</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'salary' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">Salary Payments</h3>
              <Link to={`/staff/salary/new?staffId=${staff.id}`}>
                <Button>
                  <Wallet className="h-4 w-4" /> Process Salary
                </Button>
              </Link>
            </div>

            {staff.salaryPayments.length === 0 ? (
              <EmptyState icon={Wallet} title="No salary payments yet" subtitle="Process karne pe yahan dikhega" />
            ) : (
              <div className="space-y-2">
                {staff.salaryPayments.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-violet-300 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 font-mono text-sm">{p.paymentNumber}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                        </div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-semibold text-slate-700">{p.daysWorked} days</span>
                          {p.overtimePay > 0 && <span className="text-amber-700">OT: {formatPKR(p.overtimePay)}</span>}
                          {p.bonuses > 0 && <span className="text-emerald-700">Bonus: {formatPKR(p.bonuses)}</span>}
                          {p.advances > 0 && <span className="text-rose-700">Adv: {formatPKR(p.advances)}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-emerald-700">{formatPKR(p.netAmount)}</div>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>{p.status}</span>
                        </div>
                        {p.balanceAmount > 0 && (
                          <div className="text-[10px] text-rose-600 font-bold mt-1">
                            Balance: {formatPKR(p.balanceAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'leaves' && (
          <div className="space-y-3">
            {staff.leaves.length === 0 ? (
              <EmptyState icon={Coffee} title="No leave records" subtitle="Leaves apply kiye to yahan dikhenge" />
            ) : (
              <div className="space-y-2">
                {staff.leaves.map((l) => (
                  <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{l.type}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                            l.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            l.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{l.status}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDate(l.startDate)} → {formatDate(l.endDate)} ({l.days} days)
                        </div>
                        {l.reason && <div className="text-sm text-slate-700 mt-2">{l.reason}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {staff.cnicFrontUrl && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="aspect-[3/2] bg-slate-100">
                    <img src={staff.cnicFrontUrl} alt="CNIC Front" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 bg-white">
                    <div className="font-bold text-sm text-slate-900">CNIC Front</div>
                  </div>
                </div>
              )}
              {staff.cnicBackUrl && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="aspect-[3/2] bg-slate-100">
                    <img src={staff.cnicBackUrl} alt="CNIC Back" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 bg-white">
                    <div className="font-bold text-sm text-slate-900">CNIC Back</div>
                  </div>
                </div>
              )}
            </div>

            {staff.documents.length === 0 && !staff.cnicFrontUrl && !staff.cnicBackUrl && (
              <EmptyState icon={FileText} title="No documents uploaded" subtitle="CNIC aur additional docs add karein" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon: Icon, mono }: { label: string; value?: string | null; icon?: any; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
        <div className={`text-sm text-slate-900 font-semibold truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <div className="mt-3 font-bold text-slate-700">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
}

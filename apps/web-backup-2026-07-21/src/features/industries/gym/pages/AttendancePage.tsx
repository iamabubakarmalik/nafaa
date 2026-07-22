import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LogIn, LogOut, Sparkles, RefreshCw, User, Clock, Scan, Zap, Activity,
  Search, CheckCircle2, AlertCircle, Users,
} from 'lucide-react';
import { attendanceApi } from '../api/attendance.api';
import { gymMembersApi } from '../api/members.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [scanInput, setScanInput] = useState('');
  const [scanMethod, setScanMethod] = useState<string>('QR_CODE');
  const [foundMember, setFoundMember] = useState<any>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);

  const { data: currentlyInside = [], refetch: refetchInside } = useQuery({
    queryKey: ['currently-inside'],
    queryFn: () => attendanceApi.currentlyInside(),
    refetchInterval: 15_000,
  });

  const { data: todayAttendance = [], isLoading, refetch } = useQuery({
    queryKey: ['todays-attendance'],
    queryFn: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return attendanceApi.list({ from: start.toISOString(), to: end.toISOString() });
    },
    refetchInterval: 30_000,
  });

  const { data: manualSearchResults = [] } = useQuery({
    queryKey: ['members-manual-search', memberSearch],
    queryFn: () => gymMembersApi.list({ search: memberSearch, status: 'ACTIVE' }),
    enabled: showManualSearch && memberSearch.length >= 2,
  });

  const checkInMutation = useMutation({
    mutationFn: (data: any) => attendanceApi.checkIn(data),
    onSuccess: () => {
      toast.success('✅ Check-in successful!');
      setScanInput('');
      setFoundMember(null);
      queryClient.invalidateQueries({ queryKey: ['currently-inside'] });
      queryClient.invalidateQueries({ queryKey: ['todays-attendance'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Check-in failed'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => attendanceApi.checkOut(id),
    onSuccess: () => {
      toast.success('👋 Check-out successful');
      queryClient.invalidateQueries({ queryKey: ['currently-inside'] });
      queryClient.invalidateQueries({ queryKey: ['todays-attendance'] });
    },
  });

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    try {
      let member;
      if (scanMethod === 'QR_CODE') member = await gymMembersApi.byQr(scanInput.trim());
      else if (scanMethod === 'RFID_CARD') member = await gymMembersApi.byRfid(scanInput.trim());
      if (member) {
        setFoundMember(member);
      }
    } catch {
      toast.error('Member not found');
      setFoundMember(null);
    }
  };

  const confirmCheckIn = (memberId?: string) => {
    checkInMutation.mutate({
      memberId: memberId ?? foundMember?.id,
      method: scanMethod,
      entryPoint: 'Main Entrance',
    });
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Scan className="h-3.5 w-3.5 text-amber-300" />
              Check-in Kiosk
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">✅ Attendance</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">QR code, RFID, biometric, or manual check-in</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 px-6 py-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Currently Inside</div>
              <div className="text-4xl font-extrabold tabular-nums text-emerald-300">{currentlyInside.length}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* CHECK-IN KIOSK */}
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b bg-emerald-50 dark:bg-emerald-950/30">
            <h3 className="text-lg font-extrabold text-emerald-900 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Check-in
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {/* Method selector */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { v: 'QR_CODE', label: 'QR Code', emoji: '📱' },
                { v: 'RFID_CARD', label: 'RFID', emoji: '💳' },
                { v: 'BIOMETRIC', label: 'Fingerprint', emoji: '👆' },
                { v: 'MANUAL', label: 'Manual', emoji: '✍️' },
              ].map((m) => (
                <button key={m.v} onClick={() => { setScanMethod(m.v); setFoundMember(null); setShowManualSearch(m.v === 'MANUAL'); }} className={
                  'p-3 rounded-xl border-2 text-center transition ' +
                  (scanMethod === m.v ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-emerald-300')
                }>
                  <div className="text-2xl mb-1">{m.emoji}</div>
                  <div className="text-[10px] font-extrabold">{m.label}</div>
                </button>
              ))}
            </div>

            {/* Scanner */}
            {scanMethod !== 'MANUAL' ? (
              <>
                <div className="text-center">
                  <div className="text-[10px] uppercase font-extrabold text-emerald-700 mb-2">
                    {scanMethod === 'QR_CODE' && '📱 Scan QR Code'}
                    {scanMethod === 'RFID_CARD' && '💳 Tap RFID Card'}
                    {scanMethod === 'BIOMETRIC' && '👆 Place Finger on Scanner'}
                  </div>
                  <input
                    autoFocus
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    placeholder="Scan or enter code..."
                    className="h-16 w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-xl font-extrabold text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <Button size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-green-700" onClick={handleScan} disabled={!scanInput.trim()}>
                  <Scan className="h-5 w-5" />
                  Scan Now
                </Button>
              </>
            ) : (
              <>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search member by name or phone..."
                    className="h-14 w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 pl-10 pr-3 text-lg font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {memberSearch.length >= 2 && (
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {manualSearchResults.map((m: any) => (
                      <button key={m.id} onClick={() => confirmCheckIn(m.id)} className="w-full p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-3 text-left transition">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} className="h-10 w-10 rounded-xl object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center font-extrabold">
                            {m.customer?.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold truncate">{m.customer?.name}</div>
                          <div className="text-xs font-mono font-bold text-slate-500">{m.memberNumber}</div>
                        </div>
                        <LogIn className="h-5 w-5 text-emerald-600" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Found member preview */}
            {foundMember && (
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white p-5">
                <div className="flex items-center gap-3">
                  {foundMember.photoUrl ? (
                    <img src={foundMember.photoUrl} className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white/20" />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-extrabold">
                      {foundMember.customer?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-lg font-extrabold">{foundMember.customer?.name}</div>
                    <div className="text-xs font-mono font-bold text-white/80">{foundMember.memberNumber}</div>
                    {foundMember.currentStreak > 0 && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold">
                        🔥 {foundMember.currentStreak} day streak!
                      </div>
                    )}
                  </div>
                </div>
                <Button size="lg" className="w-full mt-4 bg-white text-emerald-700 hover:bg-emerald-50" onClick={() => confirmCheckIn()} loading={checkInMutation.isPending}>
                  <CheckCircle2 className="h-5 w-5" />
                  Confirm Check-in
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* CURRENTLY INSIDE */}
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600 animate-pulse" />
                Currently Inside ({currentlyInside.length})
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Live count</p>
            </div>
            <button onClick={() => refetchInside()} className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-[500px] overflow-y-auto">
            {currentlyInside.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No one currently inside
              </div>
            ) : (
              currentlyInside.map((att: any) => {
                const duration = differenceInMinutes(new Date(), new Date(att.checkInAt));
                return (
                  <div key={att.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shrink-0 shadow">
                      <LogIn className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate">
                        {att.member?.memberNumber || att.guestName || 'Guest'}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        In since {format(new Date(att.checkInAt), 'HH:mm')} • {duration}min
                      </div>
                    </div>
                    <button onClick={() => checkOutMutation.mutate(att.id)} className="h-9 px-3 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1">
                      <LogOut className="h-3.5 w-3.5" />
                      Check-out
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* TODAY'S HISTORY */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Today's Activity ({todayAttendance.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500 font-semibold">Loading...</div>
          ) : todayAttendance.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 font-semibold">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              No check-ins yet today
            </div>
          ) : (
            todayAttendance.map((att: any) => {
              const isInside = !att.checkOutAt;
              const duration = att.checkOutAt
                ? differenceInMinutes(new Date(att.checkOutAt), new Date(att.checkInAt))
                : differenceInMinutes(new Date(), new Date(att.checkInAt));
              return (
                <div key={att.id} className="px-6 py-3 flex items-center gap-3">
                  <div className={
                    'h-9 w-9 rounded-lg text-white flex items-center justify-center shrink-0 ' +
                    (isInside ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-slate-400 to-slate-600')
                  }>
                    {isInside ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm">{att.member?.memberNumber || att.guestName || 'Guest'}</span>
                      {isInside && <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">INSIDE</span>}
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 text-[9px] font-extrabold uppercase">{att.method}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      {format(new Date(att.checkInAt), 'HH:mm')}
                      {att.checkOutAt && ' → ' + format(new Date(att.checkOutAt), 'HH:mm')}
                      {' • ' + duration + 'min' + (isInside ? ' (ongoing)' : '')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

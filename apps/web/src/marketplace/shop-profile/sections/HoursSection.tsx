import { Clock, Copy, Info, Moon, Sun } from 'lucide-react';
import type { MarketplaceShopProfile } from '../../shared/types';
import { toast } from 'sonner';

const DAYS = [
  { key: 'mon', label: 'Monday',    urdu: 'Somwar' },
  { key: 'tue', label: 'Tuesday',   urdu: 'Mangal' },
  { key: 'wed', label: 'Wednesday', urdu: 'Budh' },
  { key: 'thu', label: 'Thursday',  urdu: 'Jumeraat' },
  { key: 'fri', label: 'Friday',    urdu: 'Jummah' },
  { key: 'sat', label: 'Saturday',  urdu: 'Sanichar' },
  { key: 'sun', label: 'Sunday',    urdu: 'Itwar' },
];

const PRAYERS = [
  { key: 'fajr',    label: 'Fajr',    urdu: 'Fajr',    icon: '🌅', defaultTime: '05:00' },
  { key: 'zohar',   label: 'Zohar',   urdu: 'Zohar',   icon: '☀️', defaultTime: '13:00' },
  { key: 'asr',     label: 'Asr',     urdu: 'Asr',     icon: '🌤️', defaultTime: '16:30' },
  { key: 'maghrib', label: 'Maghrib', urdu: 'Maghrib', icon: '🌆', defaultTime: '18:30' },
  { key: 'isha',    label: 'Isha',    urdu: 'Isha',    icon: '🌙', defaultTime: '20:00' },
];

// Format time helpers
function formatTime12h(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function addMinutesToTime(time24: string, minutes: number): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [h, m] = time24.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor((total + 24 * 60) % (24 * 60) / 60);
  const newM = (total + 24 * 60) % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

interface Props {
  s: MarketplaceShopProfile;
  set: <K extends keyof MarketplaceShopProfile>(key: K, value: MarketplaceShopProfile[K]) => void;
}

export default function HoursSection({ s, set }: Props) {
  const hours = (s.workingHours as any) || {};
  const prayerConfig = (hours._prayerConfig) || {};
  const ramzanConfig = (hours._ramzanConfig) || {};

  const updateDay = (day: string, field: 'open' | 'close' | 'closed', value: any) => {
    const newHours = { ...hours };
    newHours[day] = { ...(newHours[day] || {}), [field]: value };
    if (field === 'closed' && value) {
      newHours[day].open = undefined;
      newHours[day].close = undefined;
    }
    set('workingHours', newHours as any);
  };

  const copyToAllDays = (sourceDay: string) => {
    const source = hours[sourceDay];
    if (!source) return;
    const newHours: any = { ...hours };
    DAYS.forEach((d) => { newHours[d.key] = { ...source }; });
    set('workingHours', newHours);
    toast.success('Sab din ke liye timings copy ho gayi');
  };

  const setPreset = (preset: '9-9' | '10-10' | '24hr') => {
    const configs: any = {
      '9-9': { open: '09:00', close: '21:00', closed: false },
      '10-10': { open: '10:00', close: '22:00', closed: false },
      '24hr': { open: '00:00', close: '23:59', closed: false },
    };
    const newHours: any = { ...hours };
    DAYS.forEach((d) => { newHours[d.key] = configs[preset]; });
    set('workingHours', newHours);
    toast.success('Preset apply ho gaya');
  };

  const updatePrayer = (prayerKey: string, field: string, value: any) => {
    const newHours = { ...hours };
    newHours._prayerConfig = {
      ...prayerConfig,
      [prayerKey]: {
        ...(prayerConfig[prayerKey] || {}),
        [field]: value,
      },
    };
    set('workingHours', newHours as any);
  };

  const updatePrayerSetting = (field: string, value: any) => {
    const newHours = { ...hours };
    newHours._prayerConfig = { ...prayerConfig, [field]: value };
    set('workingHours', newHours as any);
  };

  const updateRamzan = (field: string, value: any) => {
    const newHours = { ...hours };
    newHours._ramzanConfig = { ...ramzanConfig, [field]: value };
    set('workingHours', newHours as any);
  };

  const pauseBefore = prayerConfig.pauseBeforeMinutes ?? 5;
  const resumeAfter = prayerConfig.resumeAfterMinutes ?? 20;

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-black text-blue-900 text-sm">Working Hours Setup</div>
            <p className="text-xs text-blue-700 font-medium mt-1">
              Customers ko sirf usi waqt orders lene denge jab aap open ho. Prayer time break aur Ramzan schedule bhi manually set kar sakte hain.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs font-black text-slate-600 self-center">Quick presets:</span>
        <button
          onClick={() => setPreset('9-9')}
          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black border border-emerald-200 transition"
        >
          9 AM - 9 PM (all days)
        </button>
        <button
          onClick={() => setPreset('10-10')}
          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black border border-blue-200 transition"
        >
          10 AM - 10 PM
        </button>
        <button
          onClick={() => setPreset('24hr')}
          className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-black border border-purple-200 transition"
        >
          24/7 Open
        </button>
      </div>

      {/* Days */}
      <div className="space-y-2">
        <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-500" />
          Daily Working Hours
        </h4>
        {DAYS.map((day) => {
          const daySettings = hours[day.key] || {};
          const isClosed = daySettings.closed;
          return (
            <div
              key={day.key}
              className={`rounded-xl border-2 p-3 flex items-center gap-3 flex-wrap ${
                isClosed ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className="min-w-[100px]">
                <div className="text-sm font-black text-slate-900">{day.label}</div>
                <div className="text-[10px] text-slate-500 font-medium">{day.urdu}</div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!isClosed}
                  onChange={(e) => updateDay(day.key, 'closed', !e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className={`text-xs font-black ${isClosed ? 'text-slate-500' : 'text-emerald-700'}`}>
                  {isClosed ? 'Closed' : 'Open'}
                </span>
              </label>

              {!isClosed && (
                <>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={daySettings.open || '09:00'}
                      onChange={(e) => updateDay(day.key, 'open', e.target.value)}
                      className="h-9 px-2 rounded-lg border-2 border-slate-200 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-500">to</span>
                    <input
                      type="time"
                      value={daySettings.close || '22:00'}
                      onChange={(e) => updateDay(day.key, 'close', e.target.value)}
                      className="h-9 px-2 rounded-lg border-2 border-slate-200 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="text-[10px] text-slate-500 font-bold">
                    ({formatTime12h(daySettings.open || '09:00')} - {formatTime12h(daySettings.close || '22:00')})
                  </div>

                  <button
                    onClick={() => copyToAllDays(day.key)}
                    className="ml-auto text-[10px] font-black text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    title="Copy to all days"
                  >
                    <Copy className="h-3 w-3" />
                    Copy to all
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Prayer Times — Full Manual Control */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 overflow-hidden">
        <div className="p-4 border-b-2 border-emerald-200 bg-emerald-100/60">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={s.prayerTimeMode || false}
              onChange={(e) => set('prayerTimeMode', e.target.checked)}
              className="h-5 w-5 rounded mt-0.5"
            />
            <div className="flex-1">
              <div className="font-black text-emerald-900 text-sm flex items-center gap-2">
                🕌 Namaz Time Break
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                  MANUAL CONTROL
                </span>
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-0.5">
                Aap khud decide karain kaun si namaz pe shop band karna hai, kitni der pehle aur baad
              </div>
            </div>
          </label>
        </div>

        {s.prayerTimeMode && (
          <div className="p-4 space-y-4">
            {/* Break buffer */}
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-emerald-900 mb-1.5 block">
                  Pause Kitni Der Pehle (minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={pauseBefore}
                  onChange={(e) => updatePrayerSetting('pauseBeforeMinutes', Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border-2 border-emerald-300 bg-white text-sm font-black outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-emerald-700 font-bold mt-1">Namaz se pehle shop band ho jayegi</p>
              </div>
              <div>
                <label className="text-xs font-black text-emerald-900 mb-1.5 block">
                  Resume Kitni Der Baad (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={resumeAfter}
                  onChange={(e) => updatePrayerSetting('resumeAfterMinutes', Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border-2 border-emerald-300 bg-white text-sm font-black outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-emerald-700 font-bold mt-1">Namaz ke baad kitni der mein khulegi</p>
              </div>
            </div>

            {/* Per-prayer controls */}
            <div>
              <div className="text-xs font-black text-emerald-900 mb-2">
                Kaun Si Namaz Pe Shop Pause Ho? (khud enable karain)
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                {PRAYERS.map((prayer) => {
                  const pConfig = prayerConfig[prayer.key] || {};
                  const enabled = pConfig.enabled ?? false;
                  const prayerTime = pConfig.time || prayer.defaultTime;
                  const breakStart = addMinutesToTime(prayerTime, -pauseBefore);
                  const breakEnd = addMinutesToTime(prayerTime, resumeAfter);
                  return (
                    <div
                      key={prayer.key}
                      className={`rounded-lg border-2 p-3 ${
                        enabled ? 'bg-white border-emerald-400' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => updatePrayer(prayer.key, 'enabled', e.target.checked)}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-lg">{prayer.icon}</span>
                        <div className="flex-1">
                          <div className={`text-sm font-black ${enabled ? 'text-emerald-900' : 'text-slate-500'}`}>
                            {prayer.label}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">{prayer.urdu}</div>
                        </div>
                      </label>

                      {enabled && (
                        <div className="mt-2 pt-2 border-t border-emerald-200">
                          <label className="text-[10px] font-black text-emerald-900 mb-1 block">
                            Namaz Ka Waqt (approximate)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={prayerTime}
                              onChange={(e) => updatePrayer(prayer.key, 'time', e.target.value)}
                              className="h-9 px-2 rounded-lg border-2 border-emerald-300 bg-white text-xs font-bold outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] font-black text-emerald-700">
                              {formatTime12h(prayerTime)}
                            </span>
                          </div>
                          <div className="mt-1.5 rounded bg-emerald-100/70 p-1.5">
                            <p className="text-[10px] text-emerald-800 font-bold">
                              🚫 Shop pause: <span className="font-black">{formatTime12h(breakStart)}</span> se <span className="font-black">{formatTime12h(breakEnd)}</span> tak
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Jummah special */}
            <div className="rounded-lg border-2 border-purple-300 bg-purple-50 p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prayerConfig.jummahEnabled ?? false}
                  onChange={(e) => updatePrayerSetting('jummahEnabled', e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-black text-purple-900">🕌 Jummah (Friday) Extended Break</div>
                  <div className="text-[10px] text-purple-700 font-bold">Friday ko lambi break lein Zohar ki jagah</div>
                </div>
              </label>
              {prayerConfig.jummahEnabled && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-purple-900 mb-1 block">Break Start</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={prayerConfig.jummahStart || '12:30'}
                        onChange={(e) => updatePrayerSetting('jummahStart', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-purple-300 bg-white text-xs font-bold outline-none focus:border-purple-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-purple-700 whitespace-nowrap">
                        {formatTime12h(prayerConfig.jummahStart || '12:30')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-purple-900 mb-1 block">Break End</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={prayerConfig.jummahEnd || '14:30'}
                        onChange={(e) => updatePrayerSetting('jummahEnd', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-purple-300 bg-white text-xs font-bold outline-none focus:border-purple-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-purple-700 whitespace-nowrap">
                        {formatTime12h(prayerConfig.jummahEnd || '14:30')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ramzan Schedule — Full Manual Control */}
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 overflow-hidden">
        <div className="p-4 border-b-2 border-amber-200 bg-amber-100/60">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={s.ramzanScheduleActive || false}
              onChange={(e) => set('ramzanScheduleActive', e.target.checked)}
              className="h-5 w-5 rounded mt-0.5"
            />
            <div className="flex-1">
              <div className="font-black text-amber-900 text-sm flex items-center gap-2">
                🌙 Ramzan Special Schedule
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-600 text-white">
                  MANUAL CONTROL
                </span>
              </div>
              <div className="text-xs text-amber-700 font-medium mt-0.5">
                Ramzan mein alag timings — Sehri, Iftar, aur Taraweeh ke waqt ke hisaab se
              </div>
            </div>
          </label>
        </div>

        {s.ramzanScheduleActive && (
          <div className="p-4 space-y-4">
            {/* Sehri */}
            <div className="rounded-lg border-2 border-amber-300 bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-black text-amber-900">🌃 Sehri Time Delivery</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={ramzanConfig.sehriEnabled ?? false}
                  onChange={(e) => updateRamzan('sehriEnabled', e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-xs font-bold text-amber-800">Enable Sehri delivery slots</span>
              </label>
              {ramzanConfig.sehriEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-amber-900 mb-1 block">Sehri Start</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={ramzanConfig.sehriStart || '02:00'}
                        onChange={(e) => updateRamzan('sehriStart', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-amber-300 bg-white text-xs font-bold outline-none focus:border-amber-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-amber-700 whitespace-nowrap">
                        {formatTime12h(ramzanConfig.sehriStart || '02:00')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-amber-900 mb-1 block">Sehri End</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={ramzanConfig.sehriEnd || '04:30'}
                        onChange={(e) => updateRamzan('sehriEnd', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-amber-300 bg-white text-xs font-bold outline-none focus:border-amber-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-amber-700 whitespace-nowrap">
                        {formatTime12h(ramzanConfig.sehriEnd || '04:30')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fasting hours — shop pause */}
            <div className="rounded-lg border-2 border-amber-300 bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-black text-amber-900">☀️ Fasting Hours Behavior</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={ramzanConfig.pauseDuringFast ?? false}
                  onChange={(e) => updateRamzan('pauseDuringFast', e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-xs font-bold text-amber-800">Fasting hours mein shop pause karain</span>
              </label>
              {ramzanConfig.pauseDuringFast && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-amber-900 mb-1 block">Pause Start (after Sehri)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={ramzanConfig.fastStart || '05:00'}
                        onChange={(e) => updateRamzan('fastStart', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-amber-300 bg-white text-xs font-bold outline-none focus:border-amber-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-amber-700 whitespace-nowrap">
                        {formatTime12h(ramzanConfig.fastStart || '05:00')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-amber-900 mb-1 block">Resume (before Iftar)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={ramzanConfig.fastEnd || '17:00'}
                        onChange={(e) => updateRamzan('fastEnd', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-amber-300 bg-white text-xs font-bold outline-none focus:border-amber-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-amber-700 whitespace-nowrap">
                        {formatTime12h(ramzanConfig.fastEnd || '17:00')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Iftar boost */}
            <div className="rounded-lg border-2 border-orange-300 bg-orange-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>🌆</span>
                <span className="text-sm font-black text-orange-900">Iftar Rush Hours</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={ramzanConfig.iftarBoostEnabled ?? false}
                  onChange={(e) => updateRamzan('iftarBoostEnabled', e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-xs font-bold text-orange-800">Iftar boost mode — extra rider, priority orders</span>
              </label>
              {ramzanConfig.iftarBoostEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-orange-900 mb-1 block">Boost Start</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={ramzanConfig.iftarStart || '16:00'}
                        onChange={(e) => updateRamzan('iftarStart', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-orange-300 bg-white text-xs font-bold outline-none focus:border-orange-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-orange-700 whitespace-nowrap">
                        {formatTime12h(ramzanConfig.iftarStart || '16:00')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-orange-900 mb-1 block">Boost End</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={ramzanConfig.iftarEnd || '19:00'}
                        onChange={(e) => updateRamzan('iftarEnd', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-orange-300 bg-white text-xs font-bold outline-none focus:border-orange-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-orange-700 whitespace-nowrap">
                        {formatTime12h(ramzanConfig.iftarEnd || '19:00')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Taraweeh break */}
            <div className="rounded-lg border-2 border-purple-300 bg-purple-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>🕌</span>
                <span className="text-sm font-black text-purple-900">Taraweeh Break</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={ramzanConfig.taraweehEnabled ?? false}
                  onChange={(e) => updateRamzan('taraweehEnabled', e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-xs font-bold text-purple-800">Taraweeh ke waqt shop pause</span>
              </label>
              {ramzanConfig.taraweehEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-purple-900 mb-1 block">Pause Start</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={ramzanConfig.taraweehStart || '20:30'}
                        onChange={(e) => updateRamzan('taraweehStart', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-purple-300 bg-white text-xs font-bold outline-none focus:border-purple-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-purple-700 whitespace-nowrap">
                        {formatTime12h(ramzanConfig.taraweehStart || '20:30')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-purple-900 mb-1 block">Pause End</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={ramzanConfig.taraweehEnd || '22:00'}
                        onChange={(e) => updateRamzan('taraweehEnd', e.target.value)}
                        className="h-9 px-2 rounded-lg border-2 border-purple-300 bg-white text-xs font-bold outline-none focus:border-purple-500 flex-1"
                      />
                      <span className="text-[10px] font-black text-purple-700 whitespace-nowrap">
                        {formatTime12h(ramzanConfig.taraweehEnd || '22:00')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-amber-100 border border-amber-300 p-2 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 font-bold">
                Ramzan schedule sirf Ramzan ke mahine mein active hoga. Normal working hours override ho jayenge.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

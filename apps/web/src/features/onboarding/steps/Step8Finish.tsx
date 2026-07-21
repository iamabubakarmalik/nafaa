import { Sparkles, BookOpen, Bell, CheckCircle2 } from 'lucide-react';
import { STEP_CONFIG } from '../constants/step-config';

interface Props {
  data: { wantsTutorial: boolean; subscribedToTips: boolean };
  onChange: (data: any) => void;
  progress: any;
}

export function Step8Finish({ data, onChange, progress }: Props) {
  const cfg = STEP_CONFIG[8];

  const summary = [
    { icon: '🏪', label: 'Business Type', value: progress.businessType || '—' },
    { icon: '📍', label: 'City', value: progress.city || '—' },
    { icon: '📦', label: 'Products Added', value: `${progress.productsAddedCount || 0} items` },
    { icon: '📁', label: 'Categories', value: `${progress.enabledCategories?.length || 0} categories` },
    { icon: '👥', label: 'Team Members', value: `${progress.teamMembersAdded || 0} members` },
    { icon: '💳', label: 'Payment Methods', value: `${progress.paymentMethods?.length || 0} methods` },
  ];

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <div className={`rounded-3xl bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo} p-6 text-white relative overflow-hidden`}>
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-black border border-white/30">
            <Sparkles className="h-3 w-3" />
            SETUP COMPLETE
          </div>
          <h2 className="text-3xl font-black mt-3">Aap sab tayyar hain! 🎉</h2>
          <p className="text-white/90 mt-1 font-medium">
            Aap ka {progress.businessType || 'business'} software configure ho gaya hai. Ab dashboard pe jayen aur pehla sale karein!
          </p>
        </div>
      </div>

      {/* Summary */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-3 block">Setup Summary</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {summary.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white border-2 border-slate-100">
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{s.label}</div>
                <div className="text-sm font-black text-slate-900 truncate">{s.value}</div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          ))}
        </div>
      </section>

      {/* Preferences */}
      <section>
        <label className="text-sm font-black text-slate-800 mb-3 block">Final Preferences</label>
        <div className="space-y-2">
          <PreferenceToggle
  icon={BookOpen}
  title="Show tutorial when I open dashboard"
  desc="Quick walkthrough of key features"
  value={data.wantsTutorial}
  onChange={(v: boolean) => onChange({ wantsTutorial: v })}
/>
<PreferenceToggle
  icon={Bell}
  title="Send me tips & tricks by email"
  desc="Weekly emails to help you get more from the app"
  value={data.subscribedToTips}
  onChange={(v: boolean) => onChange({ subscribedToTips: v })}

          />
        </div>
      </section>
    </div>
  );
}

interface PreferenceToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function PreferenceToggle({ icon: Icon, title, desc, value, onChange }: PreferenceToggleProps) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 p-4 flex items-center gap-3 bg-white hover:border-slate-300 transition">
      <div className="h-10 w-10 rounded-xl bg-fuchsia-50 flex items-center justify-center">
        <Icon className="h-5 w-5 text-fuchsia-600" />
      </div>
      <div className="flex-1">
        <div className="font-black text-slate-900 text-sm">{title}</div>
        <div className="text-xs text-slate-500 font-medium mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`h-7 w-12 rounded-full p-0.5 transition shrink-0 ${
          value ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500' : 'bg-slate-300'
        }`}
      >
        <div
          className={`h-6 w-6 bg-white rounded-full shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

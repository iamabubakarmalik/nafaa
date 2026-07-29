import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { NavLink } from 'react-router-dom';
import {
  Shield, CheckCircle2, AlertCircle, Info, ExternalLink,
  Zap, Lock, Sparkles, RefreshCw, FileText, TrendingUp,
  ChevronRight, Building2, Percent, Save, Eye, EyeOff, X,
} from 'lucide-react';
import { fbrApi } from '../api/fbr.api';
import type { FbrEnvironment, FbrSubmissionMode } from '../api/fbr.types';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { Badge } from '@core/ui/Badge';
import { SkeletonCard } from '@core/ui/Skeleton';
import { cn } from '@core/lib/cn';

export default function FbrSetupPage() {
  const qc = useQueryClient();
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [dirty, setDirty] = useState<Record<string, any>>({});

  const { data: config, isLoading } = useQuery({
    queryKey: ['fbr-config'],
    queryFn: fbrApi.getConfig,
  });

  const saveMutation = useMutation({
    mutationFn: () => fbrApi.updateConfig(dirty),
    onSuccess: () => {
      toast.success('FBR settings save ho gaye');
      qc.invalidateQueries({ queryKey: ['fbr-config'] });
      setDirty({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  });

  const testMutation = useMutation({
    mutationFn: fbrApi.testConnection,
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message, { duration: 5000 });
        qc.invalidateQueries({ queryKey: ['fbr-config'] });
      } else {
        toast.error(r.message, {
          duration: 8000,
          description: r.missing?.length ? `Missing: ${r.missing.join(', ')}` : undefined,
        });
      }
    },
  });

  const retryMutation = useMutation({
    mutationFn: fbrApi.retryPending,
    onSuccess: (r) => {
      const okCount = r.results.filter((x) => x.success).length;
      toast.success(`${okCount}/${r.retried} invoices retry ho gaye`);
      qc.invalidateQueries({ queryKey: ['fbr-config'] });
    },
  });

  const value = <K extends string>(key: K) => {
    if (key in dirty) return dirty[key];
    return (config as any)?.[key] ?? '';
  };

  const set = (key: string, val: any) => setDirty((d) => ({ ...d, [key]: val }));

  if (isLoading) {
    return <div className="max-w-5xl mx-auto p-6 space-y-4"><SkeletonCard /><SkeletonCard /></div>;
  }

  const isEnabled = value('isEnabled');
  const submissionMode = value('submissionMode') as FbrSubmissionMode;
  const environment = value('environment') as FbrEnvironment;
  const stats = config?.stats;
  const hasDirty = Object.keys(dirty).length > 0;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

      {/* ═══ HERO / STATUS BANNER ═══ */}
      <div className={cn(
        'relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl',
        isEnabled && config?.isVerified
          ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800'
          : isEnabled
            ? 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600'
            : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900',
      )}>
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30 shrink-0">
            <Shield className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-black">FBR Tax Integration</h1>
              {isEnabled && config?.isVerified && (
                <Badge className="bg-white/20 text-white border-white/30" size="sm">
                  <CheckCircle2 className="h-3 w-3" /> VERIFIED
                </Badge>
              )}
              {isEnabled && !config?.isVerified && (
                <Badge className="bg-white/20 text-white border-white/30" size="sm">
                  <AlertCircle className="h-3 w-3" /> NOT VERIFIED
                </Badge>
              )}
              {!isEnabled && (
                <Badge className="bg-white/20 text-white border-white/30" size="sm">
                  <Lock className="h-3 w-3" /> DISABLED
                </Badge>
              )}
            </div>
            <p className="text-white/90 text-sm">
              {isEnabled
                ? config?.isVerified
                  ? 'Aap ka FBR integration active hai. Sales automatically submit ho rahi hain.'
                  : 'FBR credentials save hain, magar connection verified nahi. "Test Connection" dabaein.'
                : 'FBR use karna optional hai. Chahein toh niche settings enable karein.'}
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2 py-1 rounded-lg bg-white/15 font-bold">
                Mode: {submissionMode.replace('_', ' ')}
              </span>
              <span className="px-2 py-1 rounded-lg bg-white/15 font-bold">
                Env: {environment}
              </span>
              <span className="px-2 py-1 rounded-lg bg-white/15 font-bold">
                Tax: {value('defaultTaxRate') || 17}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STATS CARDS ═══ */}
      {isEnabled && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Submitted" value={stats.submitted} color="emerald" />
          <StatCard icon={<AlertCircle className="h-4 w-4" />} label="Rejected" value={stats.rejected} color="rose" />
          <StatCard icon={<RefreshCw className="h-4 w-4" />} label="Pending" value={stats.pending} color="amber" />
          <StatCard icon={<X className="h-4 w-4" />} label="Skipped" value={stats.skipped} color="slate" />
        </div>
      )}

      {isEnabled && stats && stats.last30DaysAmount > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Last 30 days — Gross</div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
              Rs {stats.last30DaysAmount.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Tax Collected (30 days)</div>
            <div className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1">
              Rs {stats.last30DaysTax.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      {isEnabled && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => testMutation.mutate()} loading={testMutation.isPending} leftIcon={<Zap className="h-4 w-4" />}>
            Test Connection
          </Button>
          {stats && stats.pending > 0 && (
            <Button variant="outline" onClick={() => retryMutation.mutate()} loading={retryMutation.isPending} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Retry {stats.pending} Pending
            </Button>
          )}
          <NavLink to="/fbr/invoices">
            <Button variant="outline" leftIcon={<FileText className="h-4 w-4" />} rightIcon={<ChevronRight className="h-3 w-3" />}>
              View All Invoices
            </Button>
          </NavLink>
          <NavLink to="/fbr/reports">
            <Button variant="outline" leftIcon={<TrendingUp className="h-4 w-4" />} rightIcon={<ChevronRight className="h-3 w-3" />}>
              Monthly Reports
            </Button>
          </NavLink>
        </div>
      )}

      {/* ═══ SETUP GUIDE (COLLAPSIBLE) ═══ */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-neutral-800 transition"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="font-black text-slate-900 dark:text-white">FBR Kya Hai? Credentials Kaise Milte Hain?</div>
              <div className="text-xs text-slate-500 mt-0.5">Step-by-step guide — 5 min padho</div>
            </div>
          </div>
          <ChevronRight className={cn('h-5 w-5 text-slate-400 transition', showGuide && 'rotate-90')} />
        </button>
        {showGuide && <SetupGuide />}
      </div>

      {/* ═══ MAIN ENABLE TOGGLE ═══ */}
      <div className={cn(
        'p-5 rounded-2xl border-2 transition',
        isEnabled
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
          : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800',
      )}>
        <label className="flex items-center gap-4 cursor-pointer">
          <div className={cn(
            'h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition',
            isEnabled ? 'bg-emerald-500 shadow-lg' : 'bg-slate-200 dark:bg-neutral-800',
          )}>
            <Shield className={cn('h-7 w-7', isEnabled ? 'text-white' : 'text-slate-500')} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-lg text-slate-900 dark:text-white">
              FBR Integration Enable Karo
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Jab tak ye off hai, koi sale FBR ko nahi jaye gi. Aap ki private sales alag rahengi.
            </p>
          </div>
          <div className="relative shrink-0">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => set('isEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-300 dark:bg-neutral-700 peer-checked:bg-emerald-500 rounded-full transition" />
            <div className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition peer-checked:translate-x-7" />
          </div>
        </label>
      </div>

      {isEnabled && (
        <>
          {/* ═══ SUBMISSION MODE ═══ */}
          <Section title="Submission Mode" subtitle="Kaise submit karni hain sales — auto ya manual?">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ModeCard
                active={submissionMode === 'MANUAL'}
                onClick={() => set('submissionMode', 'MANUAL')}
                icon="👆"
                title="Manual (Recommended for start)"
                desc="Har sale ke baad button dabao FBR ko bhejne ke liye."
              />
              <ModeCard
                active={submissionMode === 'AUTO_ALL'}
                onClick={() => set('submissionMode', 'AUTO_ALL')}
                icon="⚡"
                title="Auto — Sab Sales"
                desc="Har sale automatically FBR ko chali jaye gi."
              />
              <ModeCard
                active={submissionMode === 'AUTO_ABOVE_LIMIT'}
                onClick={() => set('submissionMode', 'AUTO_ABOVE_LIMIT')}
                icon="🎯"
                title="Auto — Sirf Bare Sales"
                desc="Sirf woh sales jo threshold se upar hain."
              />
              <ModeCard
                active={submissionMode === 'DISABLED'}
                onClick={() => set('submissionMode', 'DISABLED')}
                icon="🔒"
                title="Nothing Submit"
                desc="Enabled hai magar submit nahi karna abhi."
              />
            </div>

            {submissionMode === 'AUTO_ABOVE_LIMIT' && (
              <div className="mt-4">
                <Input
                  label="Threshold (PKR)"
                  type="number"
                  value={value('autoSubmitThreshold') || ''}
                  onChange={(e) => set('autoSubmitThreshold', Number(e.target.value))}
                  placeholder="e.g. 5000 — is se upar wali sales auto submit"
                />
              </div>
            )}
          </Section>

          {/* ═══ ENVIRONMENT ═══ */}
          <Section title="Environment" subtitle="Testing ke liye sandbox, real filing ke liye production">
            <div className="grid grid-cols-2 gap-3">
              <ModeCard
                active={environment === 'SANDBOX'}
                onClick={() => set('environment', 'SANDBOX')}
                icon="🧪"
                title="Sandbox (Testing)"
                desc="FBR ke test server. Koi real submission nahi."
                accent="amber"
              />
              <ModeCard
                active={environment === 'PRODUCTION'}
                onClick={() => set('environment', 'PRODUCTION')}
                icon="🚀"
                title="Production (Live)"
                desc="Real FBR server. Sales real submit hongi."
                accent="rose"
              />
            </div>
          </Section>

          {/* ═══ CREDENTIALS ═══ */}
          <Section title="FBR Credentials" subtitle="Ye info FBR portal se milegi (iris.fbr.gov.pk)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="POS ID *"
                value={value('posId')}
                onChange={(e) => set('posId', e.target.value)}
                placeholder="FBR se mila POS ID"
                hint="e.g. FBR-POS-12345"
              />
              <Input
                label="NTN *"
                value={value('ntn')}
                onChange={(e) => set('ntn', e.target.value)}
                placeholder="National Tax Number"
                hint="7-15 digits"
              />
              <Input
                label="STRN (Optional)"
                value={value('strn')}
                onChange={(e) => set('strn', e.target.value)}
                placeholder="Sales Tax Registration No."
              />
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  API Token *
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={value('apiToken')}
                    onChange={(e) => set('apiToken', e.target.value)}
                    placeholder="FBR API Token"
                    className="w-full h-11 px-3 pr-10 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center justify-center"
                  >
                    {showToken ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* ═══ BUSINESS INFO ═══ */}
          <Section title="Business Info" subtitle="Ye info FBR ki invoice pe print hogi">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Business Name" value={value('businessName')} onChange={(e) => set('businessName', e.target.value)} />
              <Input label="City" value={value('city')} onChange={(e) => set('city', e.target.value)} />
              <div className="md:col-span-2">
                <Input label="Address" value={value('businessAddress')} onChange={(e) => set('businessAddress', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">Province</label>
                <select
                  value={value('province') || 'PUNJAB'}
                  onChange={(e) => set('province', e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold"
                >
                  <option value="PUNJAB">Punjab</option>
                  <option value="SINDH">Sindh</option>
                  <option value="KPK">Khyber Pakhtunkhwa</option>
                  <option value="BALOCHISTAN">Balochistan</option>
                  <option value="ICT">Islamabad Capital Territory</option>
                  <option value="AJK">Azad Jammu & Kashmir</option>
                  <option value="GB">Gilgit-Baltistan</option>
                </select>
              </div>
            </div>
          </Section>

          {/* ═══ TAX RULES ═══ */}
          <Section title="Tax Rules" subtitle="Default GST rate aur invoice formatting">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Default Tax Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={value('defaultTaxRate') || 17}
                    onChange={(e) => set('defaultTaxRate', Number(e.target.value))}
                    className="w-full h-11 px-3 pr-10 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <ToggleField
                label="Tax Inclusive"
                hint="Prices mein tax pehle se included hai?"
                value={value('taxInclusive')}
                onChange={(v: boolean) => set('taxInclusive', v)}
              />
              <ToggleField
                label="Ask Before Submit"
                hint="Manual mode mein confirm karo pehle"
                value={value('askBeforeSubmit')}
                onChange={(v: boolean) => set('askBeforeSubmit', v)}
              />
            </div>
          </Section>

          {/* ═══ RECEIPT PREFERENCES ═══ */}
          <Section title="Receipt Preferences" subtitle="Bill/receipt pe FBR info print karna hai?">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ToggleField
                label="QR Code on Receipt"
                hint="Customer scan karke verify kar sake"
                value={value('printQrOnReceipt')}
                onChange={(v: boolean) => set('printQrOnReceipt', v)}
              />
              <ToggleField
                label="FBR Logo on Receipt"
                hint="'FBR Verified' badge print ho"
                value={value('printFbrLogo')}
                onChange={(v: boolean) => set('printFbrLogo', v)}
              />
            </div>
          </Section>

          {/* ═══ PRIVACY ═══ */}
          <Section title="Privacy" subtitle="Aap ki private sales alag rahengi">
            <ToggleField
              label="Hide Non-FBR Sales in Reports"
              hint="Reports mein sirf FBR-submitted sales dikhayen"
              value={value('hideNonFbrSales')}
              onChange={(v: boolean) => set('hideNonFbrSales', v)}
            />
          </Section>
        </>
      )}

      {/* ═══ STICKY SAVE BAR ═══ */}
      {hasDirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-700 px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {Object.keys(dirty).length} unsaved change{Object.keys(dirty).length > 1 ? 's' : ''}
            </span>
          </div>
          <Button variant="ghost" onClick={() => setDirty({})}>Cancel</Button>
          <Button variant="gradient" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} leftIcon={<Save className="h-4 w-4" />}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    emerald: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    rose:    'from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    amber:   'from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    slate:   'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
  return (
    <div className={cn('p-3 rounded-2xl border bg-gradient-to-br', colors[color])}>
      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
        {icon} {label}
      </div>
      <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function Section({ title, subtitle, children }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, desc, accent }: any) {
  const accentClass = accent === 'amber'
    ? 'ring-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-300'
    : accent === 'rose'
      ? 'ring-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-300'
      : 'ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300';

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-xl border-2 text-left transition',
        active
          ? `${accentClass} ring-2`
          : 'border-slate-200 dark:border-neutral-700 hover:border-slate-300',
      )}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-black text-sm text-slate-900 dark:text-white">{title}</div>
      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{desc}</div>
    </button>
  );
}

function ToggleField({ label, hint, value, onChange }: any) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-neutral-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-slate-900 dark:text-white">{label}</div>
        {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
      </div>
      <div className="relative shrink-0">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-slate-300 dark:bg-neutral-700 peer-checked:bg-emerald-500 rounded-full transition" />
        <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

function SetupGuide() {
  return (
    <div className="p-5 border-t border-slate-200 dark:border-neutral-800 space-y-4">
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <div className="font-black text-blue-900 dark:text-blue-300 mb-1">FBR Kya Hai?</div>
        <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
          FBR = Federal Board of Revenue. Pakistan ka tax department. 2024 se rule hai ke jo bhi POS use karta hai
          (restaurant, retail, medical store), usko har sale FBR ke server pe live report karni hoti hai. Ye
          <b> optional</b> hai lekin jinki turnover Rs 5 million+ hai, unke liye <b>zaroori</b> hai.
        </p>
      </div>

      <div>
        <div className="font-black text-slate-900 dark:text-white mb-2">Credentials Kaise Milte Hain?</div>
        <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <Step n={1} title="NTN Banao">
            <a href="https://iris.fbr.gov.pk" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
              iris.fbr.gov.pk <ExternalLink className="h-3 w-3" />
            </a>{' '}
            pe jao aur NTN register karo. Individual: CNIC se, Company: SECP registration ke baad.
          </Step>
          <Step n={2} title="STRN (Optional)">
            Agar aap Rs 5M+ yearly karte hain ya 17% GST charge karte hain, STRN maango.
          </Step>
          <Step n={3} title="POS Integration Request">
            FBR portal → <b>e.Sahulat → POS Integration</b> pe request submit karo. POS software: <b>Nafaa POS</b>.
          </Step>
          <Step n={4} title="Approval (5-15 din)">
            FBR aap ka business register karta hai aur email pe deta hai:
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge size="xs" variant="brand">POS ID</Badge>
              <Badge size="xs" variant="brand">API Token</Badge>
              <Badge size="xs" variant="brand">Sandbox Access</Badge>
            </div>
          </Step>
          <Step n={5} title="Nafaa Mein Enter Karo">
            Neeche wale form mein POS ID, NTN, API Token daalo. Sandbox pe test karo pehle, phir production pe switch karo.
          </Step>
        </ol>
      </div>

      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300">
          <b>Free hai</b> — koi fee nahi. FBR helpline: <b>051-111-772-772</b> · Email:{' '}
          <a href="mailto:psid@fbr.gov.pk" className="underline">psid@fbr.gov.pk</a>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: any) {
  return (
    <li className="flex items-start gap-3">
      <div className="h-6 w-6 rounded-lg bg-emerald-500 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div className="flex-1">
        <div className="font-black text-slate-900 dark:text-white">{title}</div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{children}</div>
      </div>
    </li>
  );
}

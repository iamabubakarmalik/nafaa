import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Shield, ExternalLink, ArrowRight, ArrowLeft, CheckCircle2,
  Sparkles, Copy, Eye, EyeOff, Zap,
} from 'lucide-react';
import { fbrApi } from '../api/fbr.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { cn } from '@core/lib/cn';

const STEPS = [
  { key: 'intro',       label: 'Kya Hai FBR?' },
  { key: 'credentials', label: 'FBR Credentials' },
  { key: 'enter',       label: 'Enter Details' },
  { key: 'test',        label: 'Test Connection' },
  { key: 'mode',        label: 'Submission Mode' },
  { key: 'done',        label: 'Ho Gaya!' },
];

export default function FbrSetupWizard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({
    posId: '', ntn: '', strn: '', apiToken: '',
    environment: 'SANDBOX' as 'SANDBOX' | 'PRODUCTION',
    submissionMode: 'MANUAL' as 'MANUAL' | 'AUTO_ALL' | 'AUTO_ABOVE_LIMIT',
    autoSubmitThreshold: 5000,
    businessName: '', city: '', province: 'PUNJAB',
  });

  const saveMutation = useMutation({
    mutationFn: () => fbrApi.updateConfig({
      ...form,
      isEnabled: true,
      askBeforeSubmit: form.submissionMode === 'MANUAL',
      printQrOnReceipt: true,
      printFbrLogo: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fbr-config'] });
      setStep(5);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  });

  const testMutation = useMutation({
    mutationFn: fbrApi.testConnection,
    onSuccess: (r) => {
      if (r.success) {
        toast.success(r.message);
        setStep(4);
      } else {
        toast.error(r.message);
      }
    },
  });

  const current = STEPS[step];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Step {step + 1} / {STEPS.length}
          </div>
          <div className="text-xs font-black text-emerald-600">
            {Math.round(((step + 1) / STEPS.length) * 100)}%
          </div>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className={cn(
              'shrink-0 px-2 py-1 rounded text-[10px] font-black',
              i <= step ? 'text-emerald-600' : 'text-slate-400',
            )}>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xl p-6 md:p-8 min-h-[500px] flex flex-col">
        <div className="flex-1">
          {current.key === 'intro' && (
            <div className="space-y-4">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">FBR Tax Integration Setup</h2>
              <p className="text-slate-600 dark:text-slate-400">
                FBR (Federal Board of Revenue) Pakistan ka tax department hai. Ye setup wizard aap ko 5 minute mein FBR se connect kar dega.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <FeatureBox icon="✅" title="Free" desc="Koi fee nahi" />
                <FeatureBox icon="🔒" title="Optional" desc="Chahen to skip karo" />
                <FeatureBox icon="⚡" title="Auto-submit" desc="Sales background mein bhejain" />
                <FeatureBox icon="📊" title="Reports" desc="Monthly filing CSV" />
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
                <b>Zaroori:</b> FBR use karna optional hai. Sirf jinki yearly turnover Rs 5 million+ hai unke liye zaroori.
              </div>
            </div>
          )}

          {current.key === 'credentials' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">FBR se Credentials Kaise Lo</h2>
              <ol className="space-y-3">
                <Step n={1} title="NTN banao">
                  <a href="https://iris.fbr.gov.pk" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    iris.fbr.gov.pk <ExternalLink className="h-3 w-3" />
                  </a>{' '}pe register karo. Individual: CNIC se, Company: SECP ke baad.
                </Step>
                <Step n={2} title="POS Integration Request">
                  FBR portal → e.Sahulat → POS Integration. POS Software mein "Nafaa POS" likhein.
                </Step>
                <Step n={3} title="Approval (5-15 din)">
                  FBR email kartay hain: <b>POS ID</b>, <b>API Token</b>, sandbox access.
                </Step>
                <Step n={4} title="Yahan Enter Karo">
                  Agli step mein details enter karo. Sandbox pe pehle test.
                </Step>
              </ol>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                💡 Helpline: <b>051-111-772-772</b> · Email: <a href="mailto:psid@fbr.gov.pk" className="underline">psid@fbr.gov.pk</a>
              </div>
            </div>
          )}

          {current.key === 'enter' && (
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Apni Details Enter Karo</h2>
              <Input label="POS ID *" value={form.posId} onChange={(e) => setForm({ ...form, posId: e.target.value })} placeholder="FBR-POS-xxxxx" />
              <Input label="NTN *" value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} placeholder="7-15 digits" />
              <Input label="STRN (Optional)" value={form.strn} onChange={(e) => setForm({ ...form, strn: e.target.value })} />
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">API Token *</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={form.apiToken}
                    onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                    className="w-full h-11 px-3 pr-10 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-mono"
                  />
                  <button type="button" onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100">
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Input label="Business Name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
              <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">Environment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setForm({ ...form, environment: 'SANDBOX' })}
                    className={cn('p-3 rounded-xl border-2 text-left transition',
                      form.environment === 'SANDBOX' ? 'border-amber-500 bg-amber-50' : 'border-slate-200')}>
                    <div className="font-black text-sm">🧪 Sandbox</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Testing ke liye</div>
                  </button>
                  <button
                    onClick={() => setForm({ ...form, environment: 'PRODUCTION' })}
                    className={cn('p-3 rounded-xl border-2 text-left transition',
                      form.environment === 'PRODUCTION' ? 'border-rose-500 bg-rose-50' : 'border-slate-200')}>
                    <div className="font-black text-sm">🚀 Production</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Real filing</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {current.key === 'test' && (
            <div className="space-y-4 text-center py-8">
              <div className="h-20 w-20 rounded-3xl bg-blue-500 mx-auto flex items-center justify-center">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Test Connection</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Chalo pehle credentials save karke test karte hain. Ye check karega ke FBR se connection ban raha hai ya nahi.
              </p>
              <Button
                variant="gradient"
                size="lg"
                loading={saveMutation.isPending || testMutation.isPending}
                onClick={async () => {
                  await saveMutation.mutateAsync();
                  await testMutation.mutateAsync();
                }}
                leftIcon={<Zap className="h-5 w-5" />}
              >
                Save & Test Connection
              </Button>
            </div>
          )}

          {current.key === 'mode' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Submission Mode Chuno</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Sales FBR ko kaise bhejni hain — auto ya manual?</p>
              <div className="space-y-2">
                <ModeCard
                  active={form.submissionMode === 'MANUAL'}
                  onClick={() => setForm({ ...form, submissionMode: 'MANUAL' })}
                  icon="👆"
                  title="Manual (Recommended for start)"
                  desc="Har sale ke baad button dabao 'Submit to FBR'"
                />
                <ModeCard
                  active={form.submissionMode === 'AUTO_ALL'}
                  onClick={() => setForm({ ...form, submissionMode: 'AUTO_ALL' })}
                  icon="⚡"
                  title="Auto — Sab Sales"
                  desc="Har sale automatically FBR ko background mein bhej dungi"
                />
                <ModeCard
                  active={form.submissionMode === 'AUTO_ABOVE_LIMIT'}
                  onClick={() => setForm({ ...form, submissionMode: 'AUTO_ABOVE_LIMIT' })}
                  icon="🎯"
                  title="Auto — Sirf Bare Sales"
                  desc="Sirf woh sales jo threshold se upar hon"
                />
              </div>
              {form.submissionMode === 'AUTO_ABOVE_LIMIT' && (
                <Input
                  label="Threshold (PKR)"
                  type="number"
                  value={form.autoSubmitThreshold}
                  onChange={(e) => setForm({ ...form, autoSubmitThreshold: Number(e.target.value) })}
                />
              )}
            </div>
          )}

          {current.key === 'done' && (
            <div className="text-center py-8 space-y-4">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto flex items-center justify-center shadow-xl">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">FBR Ready! 🎉</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Aap ka FBR integration setup ho gaya hai. Ab jab bhi sale karenge, mode ke hisaab se automatically ya manually FBR ko submit hogi.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <Button variant="outline" onClick={() => nav('/fbr')}>Settings</Button>
                <Button variant="gradient" onClick={() => nav('/pos')} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Test Sale Karo
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        {step !== 5 && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-neutral-800 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            {step === 3 ? null : step === 4 ? (
              <Button variant="gradient" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} rightIcon={<CheckCircle2 className="h-4 w-4" />}>
                Save & Finish
              </Button>
            ) : (
              <Button variant="gradient" onClick={() => setStep(step + 1)} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Next
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureBox({ icon, title, desc }: any) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
      <div className="text-2xl">{icon}</div>
      <div className="font-black text-sm text-slate-900 dark:text-white mt-1">{title}</div>
      <div className="text-[11px] text-slate-500">{desc}</div>
    </div>
  );
}

function Step({ n, title, children }: any) {
  return (
    <li className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white text-xs font-black flex items-center justify-center shrink-0">{n}</div>
      <div className="flex-1">
        <div className="font-black text-slate-900 dark:text-white">{title}</div>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{children}</div>
      </div>
    </li>
  );
}

function ModeCard({ active, onClick, icon, title, desc }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-2xl border-2 text-left transition flex items-start gap-3',
        active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-md' : 'border-slate-200 dark:border-neutral-700 hover:border-slate-300',
      )}
    >
      <div className="text-3xl shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="font-black text-slate-900 dark:text-white">{title}</div>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{desc}</div>
      </div>
      {active && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
    </button>
  );
}

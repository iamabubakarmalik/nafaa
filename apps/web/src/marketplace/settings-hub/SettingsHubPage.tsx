import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Settings, Zap, CreditCard, Truck, MessageCircle, FileText, Shield,
  Sparkles, X, CheckCircle2, AlertCircle, TestTube, Webhook, Ban,
  History, Download, RefreshCw, Save, Plus, Trash2,
} from 'lucide-react';
import { settingsHubApi, type MarketplaceSettings } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { relativeTime } from '../shared/status-utils';
import { Button } from '@core/ui/Button';

type SectionKey = 'integrations' | 'tax' | 'fees' | 'policies' | 'webhooks' | 'blacklist' | 'audit';

const SECTIONS: Array<{ key: SectionKey; label: string; icon: any; color: string; desc: string }> = [
  { key: 'integrations', label: 'Integrations',   icon: Zap,        color: 'purple', desc: 'Payment, courier, WhatsApp' },
  { key: 'tax',          label: 'Tax Config',     icon: FileText,   color: 'blue',   desc: 'GST, FBR, invoice settings' },
  { key: 'fees',         label: 'Fees',           icon: CreditCard, color: 'amber',  desc: 'Service fees, tips' },
  { key: 'policies',     label: 'Policies',       icon: Shield,     color: 'emerald', desc: 'Returns, cancellations' },
  { key: 'webhooks',     label: 'Webhooks',       icon: Webhook,    color: 'indigo', desc: 'API event notifications' },
  { key: 'blacklist',    label: 'Blacklist',      icon: Ban,        color: 'rose',   desc: 'Block customers, phones, IPs' },
  { key: 'audit',        label: 'Audit Log',      icon: History,    color: 'slate',  desc: 'Recent changes' },
];

export default function SettingsHubPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [activeSection, setActiveSection] = useState<SectionKey>('integrations');

  const { data: settings } = useQuery({
    queryKey: ['settings-hub'],
    queryFn: settingsHubApi.get,
  });

  const [draft, setDraft] = useState<Partial<MarketplaceSettings>>({});
  const merged = { ...settings, ...draft } as MarketplaceSettings;
  const hasChanges = Object.keys(draft).length > 0;

  const saveMutation = useMutation({
    mutationFn: () => {
      const promises = Object.entries(draft).map(([key, value]) =>
        settingsHubApi.updateSection(key as any, value),
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('✅ Settings saved');
      qc.invalidateQueries({ queryKey: ['settings-hub'] });
      setDraft({});
    },
  });

  if (!settings) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Settings className="h-3.5 w-3.5" />
              Marketplace Settings
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Settings Hub</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Master control panel — integrations, policies, security, audit
            </p>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-3xl bg-white border-2 border-slate-200 p-3 shadow-sm space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.key;
              const colors: any = {
                purple:  isActive ? 'bg-purple-600 text-white'   : 'hover:bg-purple-50 text-purple-700',
                blue:    isActive ? 'bg-blue-600 text-white'     : 'hover:bg-blue-50 text-blue-700',
                amber:   isActive ? 'bg-amber-500 text-white'    : 'hover:bg-amber-50 text-amber-700',
                emerald: isActive ? 'bg-emerald-600 text-white'  : 'hover:bg-emerald-50 text-emerald-700',
                indigo:  isActive ? 'bg-indigo-600 text-white'   : 'hover:bg-indigo-50 text-indigo-700',
                rose:    isActive ? 'bg-rose-600 text-white'     : 'hover:bg-rose-50 text-rose-700',
                slate:   isActive ? 'bg-slate-800 text-white'    : 'hover:bg-slate-100 text-slate-700',
              };
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition ${colors[s.color]}`}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white/20 backdrop-blur' : 'bg-slate-100'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black truncate">{s.label}</div>
                    <div className={`text-[10px] font-medium truncate ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                      {s.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <main>
          {activeSection === 'integrations' && (
            <IntegrationsSection settings={merged} onChange={(data: any) => setDraft({ ...draft, integrations: data })} />
          )}
          {activeSection === 'tax' && (
            <TaxSection settings={merged.taxConfig} onChange={(data: any) => setDraft({ ...draft, taxConfig: data })} />
          )}
          {activeSection === 'fees' && (
            <FeesSection settings={merged.fees} onChange={(data: any) => setDraft({ ...draft, fees: data })} />
          )}
          {activeSection === 'policies' && (
            <PoliciesSection settings={merged.policies} onChange={(data: any) => setDraft({ ...draft, policies: data })} />
          )}
          {activeSection === 'webhooks' && <WebhooksSection webhooks={merged.webhooks} />}
          {activeSection === 'blacklist' && <BlacklistSection blacklist={merged.blacklist} />}
          {activeSection === 'audit' && <AuditLogSection />}
        </main>
      </div>

      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border-2 border-emerald-500">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span className="text-sm font-black">{Object.keys(draft).length} unsaved change{Object.keys(draft).length > 1 ? 's' : ''}</span>
          <div className="w-px h-6 bg-emerald-400" />
          <button onClick={() => setDraft({})} className="text-xs font-black text-emerald-100 hover:text-white">Discard</button>
          <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} className="bg-white text-emerald-700 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Save All
          </Button>
        </div>
      )}
    </div>
  );
}

const INTEGRATIONS = [
  { key: 'jazzcash',  label: 'JazzCash',  icon: '💳', category: 'Payment', description: 'Accept JazzCash payments' },
  { key: 'easypaisa', label: 'Easypaisa', icon: '📱', category: 'Payment', description: 'Accept Easypaisa payments' },
  { key: 'stripe',    label: 'Stripe',    icon: '💰', category: 'Payment', description: 'International card payments' },
  { key: 'postex',    label: 'PostEx',    icon: '📦', category: 'Courier', description: 'Automated shipping labels' },
  { key: 'leopards',  label: 'Leopards',  icon: '🚚', category: 'Courier', description: 'COD & delivery' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: '💬', category: 'Messaging', description: 'Business messaging' },
  { key: 'fbr',       label: 'FBR',       icon: '🏛️', category: 'Tax', description: 'Pakistan tax filing' },
];

function IntegrationsSection({ settings, onChange }: any) {
  const testMutation = useMutation({
    mutationFn: (provider: string) => settingsHubApi.testIntegration(provider),
    onSuccess: (result) => {
      if (result.success) toast.success(`✅ ${result.message}`);
      else toast.error(`❌ ${result.message}`);
    },
  });

  return (
    <div className="space-y-4">
      {['Payment', 'Courier', 'Messaging', 'Tax'].map((cat) => (
        <div key={cat} className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b-2 border-slate-100 bg-slate-50">
            <h3 className="font-black text-slate-900">{cat}</h3>
          </div>
          <div className="p-4 grid md:grid-cols-2 gap-3">
            {INTEGRATIONS.filter((i) => i.category === cat).map((integ) => {
              const state = settings.integrations?.[integ.key] || { enabled: false, isConnected: false };
              return (
                <div key={integ.key} className="rounded-2xl border-2 border-slate-200 p-4 hover:border-slate-300 transition">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{integ.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900">{integ.label}</span>
                        {state.isConnected ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Not Configured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{integ.description}</p>
                      <div className="mt-2 flex gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.enabled}
                            onChange={(e) => onChange({
                              ...settings.integrations,
                              [integ.key]: { ...state, enabled: e.target.checked },
                            })}
                            className="h-4 w-4 rounded"
                          />
                          <span className="text-xs font-black text-slate-700">{state.enabled ? 'Enabled' : 'Disabled'}</span>
                        </label>
                        {state.enabled && (
                          <button
                            onClick={() => testMutation.mutate(integ.key)}
                            disabled={testMutation.isPending}
                            className="ml-auto text-[10px] font-black text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                          >
                            <TestTube className="h-3 w-3" />
                            Test
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaxSection({ settings, onChange }: any) {
  const s = settings || {};
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border-2 border-blue-200">
        <div>
          <div className="font-black text-blue-900">Enable Tax on Orders</div>
          <div className="text-xs text-blue-700 font-medium">Apply tax to all marketplace orders</div>
        </div>
        <label className="cursor-pointer">
          <input
            type="checkbox"
            checked={s.enableTax || false}
            onChange={(e) => onChange({ ...s, enableTax: e.target.checked })}
            className="sr-only"
          />
          <div className={`h-7 w-12 rounded-full transition ${s.enableTax ? 'bg-emerald-500' : 'bg-slate-300'} relative`}>
            <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${s.enableTax ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      {s.enableTax && (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={s.taxRate || 0}
                onChange={(e) => onChange({ ...s, taxRate: Number(e.target.value) })}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-black text-slate-700 mb-1.5 block">Tax Label</label>
              <input
                value={s.taxLabel || 'GST'}
                onChange={(e) => onChange({ ...s, taxLabel: e.target.value })}
                placeholder="e.g. GST, VAT, Sales Tax"
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Tax Registration Number</label>
            <input
              value={s.taxRegistrationNumber || ''}
              onChange={(e) => onChange({ ...s, taxRegistrationNumber: e.target.value })}
              placeholder="e.g. NTN 1234567-8"
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={s.priceIncludesTax || false}
              onChange={(e) => onChange({ ...s, priceIncludesTax: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <div>
              <div className="text-sm font-black text-slate-900">Prices Include Tax</div>
              <div className="text-[10px] text-slate-500 font-bold">Tax already baked into displayed prices</div>
            </div>
          </label>
        </>
      )}
    </div>
  );
}

function FeesSection({ settings, onChange }: any) {
  const s = settings || {};
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm space-y-4">
      <div>
        <label className="text-sm font-black text-slate-700 mb-1.5 block">Service Fee (%)</label>
        <input
          type="number"
          step="0.01"
          value={s.serviceFeePercent || 0}
          onChange={(e) => onChange({ ...s, serviceFeePercent: Number(e.target.value) })}
          className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-amber-500"
        />
        <p className="text-xs text-slate-500 font-medium mt-1">Applied to each order subtotal</p>
      </div>
      <div>
        <label className="text-sm font-black text-slate-700 mb-1.5 block">Processing Fee (Fixed, PKR)</label>
        <input
          type="number"
          value={s.processingFeeFixed || 0}
          onChange={(e) => onChange({ ...s, processingFeeFixed: Number(e.target.value) })}
          className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label className="text-sm font-black text-slate-700 mb-1.5 block">Default Rider Tip Suggestion (%)</label>
        <input
          type="number"
          value={s.riderTipPercent || 10}
          onChange={(e) => onChange({ ...s, riderTipPercent: Number(e.target.value) })}
          className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-amber-500"
        />
      </div>
    </div>
  );
}

function PoliciesSection({ settings, onChange }: any) {
  const s = settings || {};
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-black text-slate-700 mb-1.5 block">Return Window (days)</label>
          <input
            type="number"
            value={s.returnWindow || 7}
            onChange={(e) => onChange({ ...s, returnWindow: Number(e.target.value) })}
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-sm font-black text-slate-700 mb-1.5 block">Cancellation Window (minutes)</label>
          <input
            type="number"
            value={s.cancellationWindow || 5}
            onChange={(e) => onChange({ ...s, cancellationWindow: Number(e.target.value) })}
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-sm font-black text-slate-700 mb-1.5 block">Auto-accept Time (minutes)</label>
          <input
            type="number"
            value={s.autoAcceptTime || 15}
            onChange={(e) => onChange({ ...s, autoAcceptTime: Number(e.target.value) })}
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-emerald-500"
          />
          <p className="text-[10px] text-slate-500 font-bold mt-1">Orders auto-accept after this time</p>
        </div>
        <div>
          <label className="text-sm font-black text-slate-700 mb-1.5 block">Min Order Amount (PKR)</label>
          <input
            type="number"
            value={s.minOrderAmount || 0}
            onChange={(e) => onChange({ ...s, minOrderAmount: Number(e.target.value) })}
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-sm font-black text-slate-700 mb-1.5 block">Max COD Order Amount (PKR)</label>
          <input
            type="number"
            value={s.maxCodOrderAmount || 50000}
            onChange={(e) => onChange({ ...s, maxCodOrderAmount: Number(e.target.value) })}
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
        <input
          type="checkbox"
          checked={s.allowGuestCheckout ?? true}
          onChange={(e) => onChange({ ...s, allowGuestCheckout: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        <div>
          <div className="text-sm font-black text-slate-900">Allow Guest Checkout</div>
          <div className="text-[10px] text-slate-500 font-bold">Customers can order without signing up</div>
        </div>
      </label>
    </div>
  );
}

function WebhooksSection({ webhooks }: any) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2">
            <Webhook className="h-5 w-5 text-indigo-600" />
            Webhooks
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Send real-time event notifications to your systems</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      <div className="p-4 space-y-2">
        {!webhooks?.length ? (
          <div className="py-8 text-center text-sm font-black text-slate-500">No webhooks configured</div>
        ) : (
          webhooks.map((w: any) => (
            <div key={w.id} className="rounded-xl border-2 border-slate-200 p-3">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${w.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs font-black text-slate-900 truncate">{w.url}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.events.map((e: string) => (
                      <span key={e} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                        {e}
                      </span>
                    ))}
                  </div>
                  {w.lastFiredAt && (
                    <div className="text-[10px] text-slate-500 font-bold mt-1">
                      Last fired: {relativeTime(w.lastFiredAt)}
                      {w.failureCount > 0 && (
                        <span className="ml-2 text-rose-700">· {w.failureCount} failures</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    const result = await settingsHubApi.testWebhook(w.id);
                    if (result.success) toast.success('✅ Test successful');
                    else toast.error('❌ Test failed');
                  }}
                  className="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black"
                >
                  Test
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Delete this webhook?')) {
                      await settingsHubApi.deleteWebhook(w.id);
                      qc.invalidateQueries({ queryKey: ['settings-hub'] });
                      toast.success('Webhook deleted');
                    }
                  }}
                  className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && <AddWebhookModal onClose={() => setShowAdd(false)} onSuccess={() => { qc.invalidateQueries({ queryKey: ['settings-hub'] }); setShowAdd(false); }} />}
    </div>
  );
}

function BlacklistSection({ blacklist }: any) {
  const qc = useQueryClient();
  const [type, setType] = useState<'customer' | 'phone' | 'email' | 'ip'>('phone');
  const [value, setValue] = useState('');

  const addMutation = useMutation({
    mutationFn: () => settingsHubApi.addToBlacklist(type, value),
    onSuccess: () => {
      toast.success('Added to blacklist');
      setValue('');
      qc.invalidateQueries({ queryKey: ['settings-hub'] });
    },
  });

  const lists = [
    { key: 'phoneNumbers', label: 'Phone Numbers', type: 'phone' as const, items: blacklist?.phoneNumbers || [] },
    { key: 'emails', label: 'Emails', type: 'email' as const, items: blacklist?.emails || [] },
    { key: 'ipAddresses', label: 'IP Addresses', type: 'ip' as const, items: blacklist?.ipAddresses || [] },
  ];

  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b-2 border-slate-100 bg-rose-50">
        <h3 className="font-black text-slate-900 flex items-center gap-2">
          <Ban className="h-5 w-5 text-rose-600" />
          Blacklist
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Block problematic customers, phones, emails, or IP addresses</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-rose-500"
          >
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="ip">IP Address</option>
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Enter ${type} to block...`}
            className="flex-1 h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-rose-500"
          />
          <Button onClick={() => value && addMutation.mutate()} loading={addMutation.isPending} className="bg-rose-600 hover:bg-rose-700">
            <Ban className="h-4 w-4" />
            Block
          </Button>
        </div>

        {lists.map((list) => (
          <div key={list.key} className="rounded-xl border-2 border-slate-200 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">{list.label}</span>
              <span className="text-[10px] font-black text-slate-500">{list.items.length} blocked</span>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
              {list.items.length === 0 ? (
                <div className="py-4 text-center text-xs font-bold text-slate-400">None blocked</div>
              ) : (
                list.items.map((val: string) => (
                  <div key={val} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                    <span className="text-xs font-mono font-bold text-slate-700">{val}</span>
                    <button
                      onClick={async () => {
                        await settingsHubApi.removeFromBlacklist(list.type, val);
                        qc.invalidateQueries({ queryKey: ['settings-hub'] });
                        toast.success('Removed from blacklist');
                      }}
                      className="text-[10px] font-black text-emerald-600 hover:text-emerald-700"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLogSection() {
  const { data } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => settingsHubApi.auditLog({ limit: 50 }),
  });

  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b-2 border-slate-100 bg-slate-50">
        <h3 className="font-black text-slate-900 flex items-center gap-2">
          <History className="h-5 w-5 text-slate-600" />
          Recent Changes
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Track all system modifications with timestamps</p>
      </div>

      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
        {!data?.items.length ? (
          <div className="p-8 text-center">
            <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-black text-slate-500">No audit log entries</p>
          </div>
        ) : (
          data.items.map((entry) => (
            <div key={entry.id} className="p-3 hover:bg-slate-50 transition">
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                  {entry.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-black text-slate-900">{entry.userName}</span>{' '}
                    <span className="font-bold text-slate-600">{entry.action}</span>{' '}
                    <span className="font-mono text-xs text-slate-500">{entry.entityType}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {relativeTime(entry.createdAt)}
                    {entry.ipAddress && <> · IP {entry.ipAddress}</>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AddWebhookModal({ onClose, onSuccess }: any) {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const ALL_EVENTS = [
    'order.created', 'order.updated', 'order.delivered', 'order.cancelled',
    'payment.received', 'review.submitted', 'customer.registered', 'product.updated',
  ];

  const submit = async () => {
    if (!url.trim() || events.length === 0) return toast.error('URL and events required');
    setProcessing(true);
    try {
      await settingsHubApi.createWebhook({ url, events });
      toast.success('✅ Webhook created');
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <Webhook className="h-3 w-3" />
              New Webhook
            </div>
            <h2 className="mt-2 text-xl font-black">Add Webhook Endpoint</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Endpoint URL *</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-mono outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Subscribe to Events *</label>
            <div className="space-y-1 max-h-60 overflow-y-auto rounded-xl border-2 border-slate-200 p-2">
              {ALL_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={events.includes(event)}
                    onChange={(e) => {
                      setEvents(e.target.checked
                        ? [...events, event]
                        : events.filter((ev) => ev !== event),
                      );
                    }}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-xs font-mono font-black text-slate-700">{event}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
          <Button onClick={submit} loading={processing} className="bg-gradient-to-r from-indigo-600 to-purple-700">
            <Webhook className="h-4 w-4" />
            Create Webhook
          </Button>
        </div>
      </div>
    </div>
  );
}

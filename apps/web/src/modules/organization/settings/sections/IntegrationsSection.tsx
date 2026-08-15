import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Zap, Check, X, TestTube, ChevronRight, Sparkles, Search,
  ExternalLink, Trash2, Loader2, Plug,
} from 'lucide-react';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { Button } from '@core/ui/Button';
import { Field, TextInput, SectionCard, Select, Alert, StatPill } from '../components/UI';
import {
  INTEGRATION_CATALOG,
  CATEGORY_META,
  type IntegrationDefinition,
} from '../constants/integrations-catalog';

export function IntegrationsSection() {
  const qc = useQueryClient();
  const { data: installed, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: settingsApi.listIntegrations,
  });
  const [selected, setSelected] = useState<IntegrationDefinition | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const installedMap = useMemo(() => {
    const m = new Map<string, any>();
    (installed || []).forEach((i) => m.set(i.type, i));
    return m;
  }, [installed]);

  const categories = ['ALL', ...Object.keys(CATEGORY_META)];

  const filtered = useMemo(() => {
    let list = INTEGRATION_CATALOG;
    if (activeCategory !== 'ALL') list = list.filter((i) => i.category === activeCategory);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);

  const activeCount = installed?.filter((i) => i.isEnabled).length || 0;
  const configuredCount = installed?.length || 0;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-5 shadow-2xl">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest">
            <Sparkles className="h-3 w-3 text-amber-300" />
            {INTEGRATION_CATALOG.length} Integrations Available
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold mt-2 leading-tight">🔌 Connect Your Business</h3>
          <p className="text-sm text-white/85 mt-1 font-semibold">
            FBR, Daraz, FoodPanda, WhatsApp, Stripe, JazzCash — sab yahan connect karo
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3 max-w-sm">
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-2.5">
              <div className="text-2xl font-extrabold tabular-nums">{activeCount}</div>
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/70">Active</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-2.5">
              <div className="text-2xl font-extrabold tabular-nums">{configuredCount}</div>
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/70">Configured</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-2.5">
              <div className="text-2xl font-extrabold tabular-nums">{INTEGRATION_CATALOG.length - configuredCount}</div>
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/70">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search integrations (FBR, Daraz, WhatsApp...)"
          className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = activeCategory === cat;
          const count = cat === 'ALL'
            ? INTEGRATION_CATALOG.length
            : INTEGRATION_CATALOG.filter((i) => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                'shrink-0 px-3 h-10 rounded-xl border-2 text-xs font-extrabold transition active:scale-95 inline-flex items-center gap-1.5',
                active
                  ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 shadow-md'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600',
              ].join(' ')}
            >
              {meta ? <span>{meta.icon}</span> : null}
              <span>{meta?.label || 'All'}</span>
              <span className={[
                'px-1.5 rounded-md text-[10px] tabular-nums',
                active ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800',
              ].join(' ')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
          <Plug className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <div className="font-extrabold text-slate-900 dark:text-white">Kuch nahi mila</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Different keyword ya category try karo</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((intg) => {
            const install = installedMap.get(intg.type);
            const isActive = install?.isEnabled;
            const isConfigured = !!install;
            return (
              <button
                key={intg.type}
                onClick={() => setSelected(intg)}
                disabled={intg.status === 'COMING_SOON'}
                className={[
                  'text-left rounded-2xl border-2 p-4 transition-all group relative overflow-hidden',
                  isActive
                    ? 'border-emerald-400 dark:border-emerald-500/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900 shadow-md hover:-translate-y-0.5'
                    : intg.status === 'COMING_SOON'
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-500/60 hover:shadow-md hover:-translate-y-0.5',
                ].join(' ')}
                style={{ borderColor: isActive ? undefined : (isConfigured ? intg.color + '40' : undefined) }}
              >
                {/* Active glow */}
                {isActive && (
                  <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
                )}

                <div className="relative">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-3xl">{intg.icon}</div>
                    <div className="flex flex-col gap-1 items-end">
                      {isActive && (
                        <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest inline-flex items-center gap-1">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} /> Active
                        </span>
                      )}
                      {isConfigured && !isActive && (
                        <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-widest">
                          Off
                        </span>
                      )}
                      {intg.status === 'BETA' && (
                        <span className="text-[9px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest">
                          Beta
                        </span>
                      )}
                      {intg.status === 'COMING_SOON' && (
                        <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-widest">
                          Soon
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">{intg.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-semibold line-clamp-2 leading-snug">
                    {intg.description}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      {CATEGORY_META[intg.category]?.label || intg.category}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-violet-500 transition" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <IntegrationModal
          definition={selected}
          installed={installedMap.get(selected.type)}
          onClose={() => setSelected(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['integrations'] });
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

/* ══════════ INTEGRATION MODAL ══════════ */
function IntegrationModal({ definition, installed, onClose, onSaved }: any) {
  const [formData, setFormData] = useState<any>(installed?.config || {});
  const [credentials, setCredentials] = useState<any>({});
  const [isEnabled, setIsEnabled] = useState(installed?.isEnabled ?? true);

  const isCredentialField = (f: any) => {
    const k = f.key.toLowerCase();
    return f.type === 'password' ||
      k.includes('key') || k.includes('secret') || k.includes('token') ||
      k.includes('password') || k.includes('salt');
  };

  const setField = (f: any, v: any) => {
    if (isCredentialField(f)) setCredentials((c: any) => ({ ...c, [f.key]: v }));
    else setFormData((d: any) => ({ ...d, [f.key]: v }));
  };

  const upsert = useMutation({
    mutationFn: () => settingsApi.upsertIntegration({
      type: definition.type,
      isEnabled,
      displayName: definition.name,
      credentials,
      config: formData,
    }),
    onSuccess: () => { toast.success(`${definition.name} save ho gaya ✅`); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail'),
  });

  const test = useMutation({
    mutationFn: () => settingsApi.testIntegration(definition.type),
    onSuccess: (data: any) =>
      data?.success
        ? toast.success(data?.message || 'Connection successful ✅')
        : toast.error(data?.message || 'Test fail — credentials check karo'),
  });

  const remove = useMutation({
    mutationFn: () => settingsApi.removeIntegration(definition.type),
    onSuccess: () => { toast.success('Integration remove ho gayi'); onSaved(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[94vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200">
        {/* Head */}
        <div
          className="relative p-5 text-white overflow-hidden shrink-0"
          style={{ background: `linear-gradient(135deg, ${definition.color}, ${definition.color}cc)` }}
        >
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-5xl shrink-0">{definition.icon}</div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/70">
                  {CATEGORY_META[definition.category]?.label}
                </div>
                <h3 className="text-xl font-extrabold leading-tight">{definition.name}</h3>
                <p className="text-xs text-white/85 font-semibold mt-1 line-clamp-2">{definition.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Enabled toggle */}
          {installed && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className={[
                  'h-7 w-12 rounded-full p-0.5 transition shrink-0',
                  isEnabled ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-slate-300 dark:bg-slate-600',
                ].join(' ')}
              >
                <div className="h-6 w-6 bg-white rounded-full shadow transition" style={{ transform: `translateX(${isEnabled ? 20 : 0}px)` }} />
              </button>
              <div className="flex-1">
                <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {isEnabled ? 'Integration Enabled' : 'Integration Disabled'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  {isEnabled ? 'Active hai — events send/receive ho rahe hain' : 'Off hai — enable karke start karo'}
                </div>
              </div>
            </div>
          )}

          {/* Fields */}
          {definition.fields.map((f: any) => (
            <Field key={f.key} label={f.label} required={f.required} hint={f.hint}>
              {f.type === 'select' ? (
                <Select
                  value={isCredentialField(f) ? credentials[f.key] : formData[f.key]}
                  onChange={(v) => setField(f, v)}
                  placeholder="Choose..."
                  options={(f.options || []).map((o: string) => ({ value: o, label: o }))}
                />
              ) : (
                <TextInput
                  type={f.type === 'password' ? 'password' : f.type === 'url' ? 'url' : 'text'}
                  value={isCredentialField(f) ? credentials[f.key] ?? '' : formData[f.key] ?? ''}
                  onChange={(v: string) => setField(f, v)}
                  placeholder={f.placeholder}
                />
              )}
            </Field>
          ))}

          {definition.docsUrl && (
            <a
              href={definition.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Documentation dekhein
            </a>
          )}

          {installed?.lastTestResult && (
            <Alert
              tone={installed.lastTestResult.success ? 'emerald' : 'rose'}
              icon={installed.lastTestResult.success ? Check : X}
              title={installed.lastTestResult.success ? 'Last test: Success' : 'Last test: Failed'}
            >
              {installed.lastTestResult.message}
              {installed.lastTestedAt && (
                <div className="text-[10px] mt-1 opacity-70">
                  {new Date(installed.lastTestedAt).toLocaleString()}
                </div>
              )}
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={onClose} className="font-extrabold">
            Cancel
          </Button>

          {installed && (
            <>
              <Button
                variant="secondary"
                onClick={() => test.mutate()}
                loading={test.isPending}
                className="font-extrabold"
              >
                <TestTube className="h-4 w-4" /> Test
              </Button>
              <button
                onClick={() => confirm('Ye integration completely remove kar dein?') && remove.mutate()}
                disabled={remove.isPending}
                className="h-10 px-3 rounded-xl text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 inline-flex items-center gap-1 transition"
              >
                {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remove
              </button>
            </>
          )}

          <div className="flex-1" />

          <Button
            onClick={() => upsert.mutate()}
            loading={upsert.isPending}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold shadow-lg shadow-emerald-500/30"
          >
            <Check className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

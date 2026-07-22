import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Zap, Check, X, Settings as SettingsIcon, TestTube, ChevronRight, Sparkles } from 'lucide-react';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { Button } from '@core/ui/Button';
import { Field, TextInput, SectionCard } from '../components/UI';
import { INTEGRATION_CATALOG, CATEGORY_META, type IntegrationDefinition } from '../constants/integrations-catalog';

export default function IntegrationsSection() {
  const qc = useQueryClient();
  const { data: installed } = useQuery({ queryKey: ['integrations'], queryFn: settingsApi.listIntegrations });
  const [selected, setSelected] = useState<IntegrationDefinition | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const installedMap = useMemo(() => {
    const m = new Map<string, any>();
    (installed || []).forEach((i) => m.set(i.type, i));
    return m;
  }, [installed]);

  const categories = ['ALL', ...Object.keys(CATEGORY_META)];
  const filtered = activeCategory === 'ALL' ? INTEGRATION_CATALOG : INTEGRATION_CATALOG.filter((i) => i.category === activeCategory);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 text-white p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
            <Sparkles className="h-3 w-3 text-amber-300" />
            {INTEGRATION_CATALOG.length} INTEGRATIONS AVAILABLE
          </div>
          <h3 className="text-2xl font-black mt-2">Connect Your Business</h3>
          <p className="text-sm text-white/85 mt-1 font-medium">
            FBR, Daraz, FoodPanda, WhatsApp aur bahot kuch — sab yahan connect karo
          </p>
          <div className="flex gap-4 mt-3">
            <div>
              <div className="text-2xl font-black">{installed?.filter((i) => i.isEnabled).length || 0}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Active</div>
            </div>
            <div>
              <div className="text-2xl font-black">{installed?.length || 0}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Configured</div>
            </div>
            <div>
              <div className="text-2xl font-black">{INTEGRATION_CATALOG.length - (installed?.length || 0)}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Available</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 h-10 rounded-xl border-2 text-xs font-black transition ${
                active ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {meta ? `${meta.icon} ${meta.label}` : 'All'}
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((intg) => {
          const install = installedMap.get(intg.type);
          const isActive = install?.isEnabled;
          return (
            <button
              key={intg.type}
              onClick={() => setSelected(intg)}
              disabled={intg.status === 'COMING_SOON'}
              className={`text-left rounded-2xl border-2 p-4 transition group ${
                isActive
                  ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-white shadow-md'
                  : intg.status === 'COMING_SOON'
                  ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-3xl">{intg.icon}</div>
                {isActive && <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-widest">Active</span>}
                {install && !isActive && <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest">Off</span>}
                {intg.status === 'BETA' && <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-widest">Beta</span>}
                {intg.status === 'COMING_SOON' && <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest">Soon</span>}
              </div>
              <div className="font-black text-sm text-slate-900">{intg.name}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium line-clamp-2">{intg.description}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {CATEGORY_META[intg.category]?.label || intg.category}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <IntegrationModal
          definition={selected}
          installed={installedMap.get(selected.type)}
          onClose={() => setSelected(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['integrations'] }); setSelected(null); }}
        />
      )}
    </div>
  );
}

function IntegrationModal({ definition, installed, onClose, onSaved }: any) {
  const [formData, setFormData] = useState<any>(installed?.config || {});
  const [credentials, setCredentials] = useState<any>({});
  const [isEnabled, setIsEnabled] = useState(installed?.isEnabled ?? true);

  const upsert = useMutation({
    mutationFn: () => settingsApi.upsertIntegration({
      type: definition.type,
      isEnabled,
      displayName: definition.name,
      credentials,
      config: formData,
    }),
    onSuccess: () => { toast.success(`${definition.name} save ho gaya`); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail'),
  });

  const test = useMutation({
    mutationFn: () => settingsApi.testIntegration(definition.type),
    onSuccess: (data: any) => data?.success ? toast.success(data?.message || 'Test successful ✅') : toast.error(data?.message || 'Test fail'),
  });

  const remove = useMutation({
    mutationFn: () => settingsApi.removeIntegration(definition.type),
    onSuccess: () => { toast.success('Integration remove ho gayi'); onSaved(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${definition.color}, ${definition.color}dd)` }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-5xl">{definition.icon}</div>
              <div>
                <h3 className="text-2xl font-black">{definition.name}</h3>
                <p className="text-sm text-white/85 font-medium">{definition.description}</p>
              </div>
            </div>
            <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {installed && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border-2 border-slate-100">
              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`h-7 w-12 rounded-full p-0.5 transition shrink-0 ${isEnabled ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-slate-300'}`}
              >
                <div className="h-6 w-6 bg-white rounded-full shadow transition" style={{ transform: `translateX(${isEnabled ? 20 : 0}px)` }} />
              </button>
              <div className="flex-1">
                <div className="font-black text-slate-900 text-sm">{isEnabled ? 'Enabled' : 'Disabled'}</div>
                <div className="text-xs text-slate-500 font-medium">{isEnabled ? 'Integration active hai' : 'Bandh hai — enable karein use karne ke liye'}</div>
              </div>
            </div>
          )}

          {definition.fields.map((f: any) => (
            <Field key={f.key} label={f.label} required={f.required} hint={f.hint}>
              {f.type === 'select' ? (
                <select
                  value={credentials[f.key] ?? formData[f.key] ?? ''}
                  onChange={(e) => {
                    if (f.type === 'password' || f.key.toLowerCase().includes('key') || f.key.toLowerCase().includes('secret') || f.key.toLowerCase().includes('token') || f.key.toLowerCase().includes('password')) {
                      setCredentials({ ...credentials, [f.key]: e.target.value });
                    } else {
                      setFormData({ ...formData, [f.key]: e.target.value });
                    }
                  }}
                  className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-medium bg-white outline-none focus:border-emerald-500"
                >
                  <option value="">Choose...</option>
                  {f.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <TextInput
                  type={f.type === 'password' ? 'password' : f.type === 'url' ? 'url' : 'text'}
                  value={credentials[f.key] ?? formData[f.key] ?? ''}
                  onChange={(v: string) => {
                    if (f.type === 'password' || f.key.toLowerCase().includes('key') || f.key.toLowerCase().includes('secret') || f.key.toLowerCase().includes('token') || f.key.toLowerCase().includes('password')) {
                      setCredentials({ ...credentials, [f.key]: v });
                    } else {
                      setFormData({ ...formData, [f.key]: v });
                    }
                  }}
                  placeholder={f.placeholder}
                />
              )}
            </Field>
          ))}

          {definition.docsUrl && (
            <a href={definition.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-blue-600 hover:underline inline-flex items-center gap-1">
              📖 Documentation dekhein →
            </a>
          )}
        </div>

        <div className="px-6 py-4 border-t-2 border-slate-100 bg-slate-50 flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {installed && (
            <>
              <Button variant="secondary" onClick={() => test.mutate()} loading={test.isPending}>
                <TestTube className="h-4 w-4" /> Test Connection
              </Button>
              <button
                onClick={() => confirm('Remove this integration completely?') && remove.mutate()}
                className="text-xs font-black text-rose-600 hover:text-rose-700 underline"
              >
                Remove
              </button>
            </>
          )}
          <div className="flex-1" />
          <Button onClick={() => upsert.mutate()} loading={upsert.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            <Check className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}
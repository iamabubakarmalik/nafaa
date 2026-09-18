import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MessageCircle, Save, RotateCcw, Eye, Loader2, Smartphone,
  CheckCircle2, Info, Send, Copy,
} from 'lucide-react';
import { SectionCard, Alert, Field } from '../components/UI';
import { Button } from '@core/ui/Button';
import { settingsApi, type TenantSettings } from '../api/settings.api';
import { useAuthStore } from '@core/stores/auth.store';
import {
  TEMPLATE_META, FIELD_HELP, DEFAULT_TEMPLATES, resolveTemplates,
  fillTemplate, waLink, type TemplateKey,
} from '@core/lib/whatsapp/templates';

/* ═════════════════════════════════════════════════════════════
   SETTINGS → WHATSAPP
   ─────────────────────────────────────────────────────────────
   Pehle WhatsApp ka sirf ek on/off switch tha jo "WhatsApp
   Business API" maangta tha. Aam dukaan-daar ke paas wo hoti hi
   nahi — is liye feature kisi kaam ka nahi tha.

   Yahan koi API nahi chahiye. Paighaam malik apne alfaaz me
   likhta hai; bhejte waqt `wa.me` link khulta hai aur paighaam
   pehle se likha hua milta hai — bas Send dabana hai.
   ═════════════════════════════════════════════════════════════ */

export function WhatsappSection({ settings }: { settings: TenantSettings }) {
  const qc = useQueryClient();
  const shopName = useAuthStore((s: any) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone) || '';

  const saved = (settings as any)?.whatsappTemplates as Record<string, string> | undefined;
  const [drafts, setDrafts] = useState<Record<TemplateKey, string>>(() => resolveTemplates(saved));
  const [active, setActive] = useState<TemplateKey>('receipt');
  const [testPhone, setTestPhone] = useState('');

  const dirty = useMemo(
    () => (Object.keys(drafts) as TemplateKey[]).some((k) => drafts[k] !== resolveTemplates(saved)[k]),
    [drafts, saved],
  );

  const meta = TEMPLATE_META.find((m) => m.key === active)!;

  const saveMut = useMutation({
    mutationFn: () => settingsApi.update({ whatsappTemplates: drafts } as any),
    onSuccess: () => {
      toast.success('Paighaam save ho gaye ✓');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  /** Misal ke a'daad — taake malik dekh sake ke asal me kaisa jayega */
  const sample = {
    customer: 'Aslam Sahib',
    shop: shopName,
    phone: shopPhone,
    bill: 'INV-1043',
    total: 'Rs 4,250',
    paid: 'Rs 3,000',
    baqi: 'Rs 1,250',
    tareekh: new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date()),
    cheezein: '• Dalda 5L × 1\n• Surf Excel 1kg × 2',
  };

  const preview = fillTemplate(drafts[active], sample);

  const insertField = (f: string) => {
    setDrafts((d) => ({ ...d, [active]: `${d[active]}{{${f}}}` }));
  };

  const resetOne = () => {
    setDrafts((d) => ({ ...d, [active]: DEFAULT_TEMPLATES[active] }));
    toast.success('Tayyar paighaam wapas aa gaya');
  };

  const testLink = waLink(testPhone, preview);

  return (
    <SectionCard
      title="💬 WhatsApp Paighaam"
      desc="Apne alfaaz me likhein — bhejte waqt yehi paighaam khulega"
      icon={MessageCircle}
      color="emerald"
    >
      <Alert tone="emerald" icon={Smartphone} title="Koi API ki zaroorat nahi">
        Bhejte waqt aap ke phone/computer par <strong>WhatsApp khud khulta hai</strong> aur paighaam
        pehle se likha hua milta hai — bas <strong>Send</strong> dabana hai. Na koi setup, na koi fees.
      </Alert>

      {/* Kaun sa paighaam */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TEMPLATE_META.map((m) => (
          <button key={m.key} onClick={() => setActive(m.key)}
            className={`rounded-2xl border-2 p-3 text-left transition ${
              active === m.key
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-200 dark:ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-400'
            }`}>
            <div className="text-xl leading-none">{m.emoji}</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-1">{m.label}</div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{m.hint}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Likhne ki jagah */}
        <div className="space-y-2">
          <Field label={`${meta.emoji} ${meta.label} ka paighaam`} hint="apne alfaaz me">
            <textarea
              value={drafts[active]}
              onChange={(e) => setDrafts((d) => ({ ...d, [active]: e.target.value }))}
              rows={12}
              className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3 text-sm font-semibold leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition resize-y"
            />
          </Field>

          {/* Khane */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <Info className="h-3 w-3" /> Khane — click karke paighaam me daalein
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {meta.fields.map((f) => (
                <button key={f} onClick={() => insertField(f)}
                  title={FIELD_HELP[f]}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-[11px] font-black text-slate-600 dark:text-slate-300 font-mono transition">
                  {`{{${f}}}`}
                </button>
              ))}
            </div>
            <div className="mt-1.5 text-[10px] font-bold text-slate-400 leading-relaxed">
              {meta.fields.map((f) => `{{${f}}} = ${FIELD_HELP[f]}`).join(' · ')}
            </div>
          </div>

          <button onClick={resetOne}
            className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <RotateCcw className="h-3.5 w-3.5" /> Tayyar paighaam wapas lein
          </button>
        </div>

        {/* Jaisa jayega */}
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Eye className="h-3 w-3" /> Jaisa customer ko jayega
          </div>

          {/* WhatsApp ki nakal — taake asal shakl nazar aaye */}
          <div className="rounded-2xl bg-[#e5ddd5] dark:bg-slate-800 p-4 min-h-[280px]">
            <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] dark:bg-emerald-900/60 p-3 shadow-sm">
              <pre className="whitespace-pre-wrap break-words font-sans text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                {preview || <span className="text-slate-400">Paighaam khali hai…</span>}
              </pre>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 text-right mt-1 font-bold">
                {new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())} ✓✓
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Ye misal ke a'daad hain — asal me har customer ke apne naam aur raqam aayenge.
          </div>

          {/* Khud par test */}
          <Field label="Khud par test karein" hint="apna number likhein">
            <div className="flex gap-2">
              <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
                placeholder="0300-1234567"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm font-bold font-mono focus:outline-none focus:border-emerald-500 transition" />
              {testLink ? (
                <a href={testLink} target="_blank" rel="noreferrer"
                  className="h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow transition">
                  <Send className="h-4 w-4" /> Bhejein
                </a>
              ) : (
                <button disabled
                  className="h-11 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-400 text-xs font-black inline-flex items-center gap-1.5">
                  <Send className="h-4 w-4" /> Bhejein
                </button>
              )}
              <button onClick={() => { navigator.clipboard.writeText(preview); toast.success('Copy ho gaya'); }}
                title="Paighaam copy karein"
                className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </Field>
        </div>
      </div>

      {dirty && (
        <div className="flex gap-2 items-center flex-wrap">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="bg-gradient-to-r from-emerald-600 to-green-700 text-white font-black shadow-lg shadow-emerald-500/30">
            {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Paighaam Save Karein
          </Button>
          <Button variant="secondary" onClick={() => setDrafts(resolveTemplates(saved))} className="font-black">
            Cancel
          </Button>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
            <Info className="h-3.5 w-3.5" /> Tabdeeli abhi save nahi hui
          </span>
        </div>
      )}

      {!dirty && (
        <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Sab save hai — ye paighaam har jagah use honge
        </div>
      )}
    </SectionCard>
  );
}

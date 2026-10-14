/**
 * WhatsApp messages: the ready texts for a bill, a credit reminder and a
 * thank-you, in the owner's own words. No API is needed — when staff send,
 * WhatsApp opens with the text filled in and they press Send. The preview
 * fills the placeholders with sample values; a test opens WhatsApp on the
 * owner's own number.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Eye, Info, MessageCircle, RotateCcw, Save, Send, Smartphone } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Button } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import {
  TEMPLATE_META, FIELD_HELP, DEFAULT_TEMPLATES, resolveTemplates, fillTemplate, waLink, type TemplateKey,
} from '@core/lib/whatsapp/templates';
import { settingsApi, type TenantSettings } from '../api/settings.api';
import { Alert, Field, SectionCard, TextInput } from '../components/UI';
import { HeaderActions } from '../components/SettingsFrame';
import { SaveStatusBar } from './_SaveStatus';

export function WhatsappSection({ settings }: { settings: TenantSettings }) {
  const qc = useQueryClient();
  const shopName = useAuthStore((s: any) => s.tenant?.name) || settings.shopName || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone) || settings.shopPhone || '';

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
      toast.success('Messages save ho gaye');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  /** Sample values so the owner sees how a real message reads. */
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
  const testLink = waLink(testPhone, preview);

  const insertField = (f: string) => setDrafts((d) => ({ ...d, [active]: `${d[active]}{{${f}}}` }));
  const resetOne = () => {
    setDrafts((d) => ({ ...d, [active]: DEFAULT_TEMPLATES[active] }));
    toast.success('Tayyar message wapas aa gaya');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(preview); toast.success('Copy ho gaya'); } catch { toast.error('Copy nahi hua'); }
  };

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saveMut.isPending} dirty={dirty} />
      {dirty && (
        <HeaderActions>
          <Button size="sm" variant="secondary" onClick={() => setDrafts(resolveTemplates(saved))}>Cancel</Button>
          <Button size="sm" loading={saveMut.isPending} onClick={() => saveMut.mutate()} leftIcon={<Save className="h-4 w-4" />}>Save</Button>
        </HeaderActions>
      )}

      <Alert tone="emerald" icon={Smartphone} title="Koi API ya fees nahi">
        Bhejte waqt aap ke phone ya computer par <strong>WhatsApp khud khulta hai</strong> aur message pehle se likha hota hai — bas <strong>Send</strong> dabana hai.
      </Alert>

      <SectionCard title="WhatsApp messages" desc="Kaun sa message badalna hai — chunein" icon={MessageCircle} color="emerald">
        <div role="tablist" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TEMPLATE_META.map((m) => (
            <button key={m.key} type="button" role="tab" aria-selected={active === m.key} onClick={() => setActive(m.key)}
              className={cn('rounded-xl border p-3 text-left transition',
                active === m.key ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300')}>
              <span className="text-xl leading-none">{m.emoji}</span>
              <span className="mt-1 block text-sm font-semibold text-slate-900">{m.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500">{m.hint}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={`${meta.label} ka message`} desc="Apne alfaaz me likhein; {{khane}} me har customer ki asal maloomat aati hai" icon={Info} color="blue"
          action={<Button size="sm" variant="ghost" onClick={resetOne} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>Tayyar message</Button>}>
          <Field label="Message" hint="Lambi line theek hai — WhatsApp khud tod deta hai.">
            <textarea value={drafts[active]} onChange={(e) => setDrafts((d) => ({ ...d, [active]: e.target.value }))} rows={12}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
          </Field>
          <div className="mt-3">
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">Khane — dabayein to message me jur jata hai</p>
            <div className="flex flex-wrap gap-1.5">
              {meta.fields.map((f) => (
                <button key={f} type="button" onClick={() => insertField(f)} title={FIELD_HELP[f]}
                  className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-[0.75rem] font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700">
                  {`{{${f}}}`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{meta.fields.map((f) => `{{${f}}} = ${FIELD_HELP[f]}`).join(' · ')}</p>
          </div>
        </SectionCard>

        <SectionCard title="Customer ko aisa jayega" desc="Misaal ki maloomat ke saath — asal me har customer ka naam aur Amount aata hai" icon={Eye} color="emerald">
          <div className="min-h-[16rem] rounded-xl bg-[#e5ddd5] p-4 dark:bg-ink-800">
            <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] p-3 shadow-sm dark:bg-emerald-900/60">
              <pre className="whitespace-pre-wrap break-words font-sans text-[0.8125rem] leading-relaxed text-slate-900 dark:text-ink-100">
                {preview || <span className="text-slate-400">Message khaali hai…</span>}
              </pre>
              <div className="mt-1 text-right text-[0.6875rem] text-slate-500 dark:text-ink-400">
                {new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())} ✓✓
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Field label="Khud par test karein" hint="Apna number likhein — WhatsApp yahi message le kar khulega.">
              <div className="flex gap-2">
                <div className="min-w-0 flex-1"><TextInput value={testPhone} onChange={setTestPhone} placeholder="0300 1234567" /></div>
                {testLink ? (
                  <a href={testLink} target="_blank" rel="noreferrer"
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700">
                    <Send className="h-4 w-4" /> Bhejein
                  </a>
                ) : (
                  <Button variant="secondary" disabled leftIcon={<Send className="h-4 w-4" />}>Bhejein</Button>
                )}
                <Button variant="secondary" size="icon" onClick={copy} aria-label="Message copy karein" title="Message copy karein"><Copy className="h-4 w-4" /></Button>
              </div>
            </Field>
          </div>
        </SectionCard>
      </div>

      {dirty && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-100">
          <Info className="h-4 w-4 shrink-0" /> Tabdeeli abhi save nahi hui.
          <Button size="sm" className="ml-auto" loading={saveMut.isPending} onClick={() => saveMut.mutate()} leftIcon={<Save className="h-4 w-4" />}>Save karein</Button>
        </div>
      )}
    </div>
  );
}

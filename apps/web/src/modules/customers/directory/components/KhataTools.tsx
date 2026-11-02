/** Khata helpers: pick a customer, step through WhatsApp reminders, edit reminder wording. */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MessageCircle, Plus, Search, SkipForward } from 'lucide-react';
import { Avatar, Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { directoryApi, type DirectoryCustomer } from '../api';
import { DEFAULT_TEMPLATES, loadTemplates, reminderText, saveTemplates, toneFor, waLink, type Salutation, type Tone } from '../messages';
import { QuickAddModal } from './QuickAddModal';
import { t as tr } from '@core/i18n';

const TONES: Array<{ v: Tone; l: string; d: string }> = [
  { v: 'polite', l: tr('Narm'), d: 'Pehli dafa' }, { v: 'firm', l: tr('Sakht'), d: 'Dobara' }, { v: 'final', l: tr('Aakhri'), d: 'Bohat purana' },
];
const SALUTATIONS: Array<{ v: Salutation; l: string }> = [
  { v: 'auto', l: tr('Khud') }, { v: 'bhai', l: tr('Bhai') }, { v: 'baji', l: tr('Baji') }, { v: 'uncle', l: tr('Uncle') }, { v: 'aunty', l: tr('Aunty') },
  { v: 'sahib', l: tr('Sahib') }, { v: 'none', l: tr('Kuch nahi') },
];

export function CustomerPicker({ title, onPick, onClose, money }: { title: string; onPick: (c: DirectoryCustomer) => void; onClose: () => void; money: (n: number) => string }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [adding, setAdding] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  const { data, isFetching } = useQuery({
    queryKey: ['customer-picker', debounced],
    queryFn: () => directoryApi.list({ search: debounced, status: 'active', type: 'all', activity: 'all', sort: debounced ? 'name' : 'lastVisit', scope: 'all' }, 1, 12),
    placeholderData: (p) => p,
  });
  if (adding) {
    return <QuickAddModal onClose={() => setAdding(false)} onCreated={async (id) => {
      const res = await directoryApi.list({ search: '', status: 'all', type: 'all', activity: 'all', sort: 'recent', scope: 'all' }, 1, 5);
      const c = res.items.find((x) => x.id === id);
      setAdding(false);
      if (c) onPick(c);
    }} />;
  }
  return (
    <Modal open onClose={onClose} size="md" title={title} description={tr('Naam ya phone likhein')}>
      <div className="space-y-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Ahmed, 0300…')} className="h-11 w-full rounded-xl border border-slate-200 bg-white ps-9 pe-3 text-[0.9375rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
        </label>
        <ul className={cn('max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200', isFetching && 'opacity-70')}>
          {(data?.items ?? []).map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onPick(c)} className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-slate-50">
                <Avatar name={c.name} url={c.avatarUrl ?? undefined} size={32} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[0.875rem] font-medium text-slate-900">{c.name}</span><span className="block text-[0.75rem] text-slate-500">{c.phone ?? '—'}</span></span>
                {Math.abs(c.balance) > 0.009 && <span className={cn('text-[0.8125rem] font-semibold tabular-nums', c.balance > 0 ? 'text-rose-700' : 'text-success-700')}>{money(Math.abs(c.balance))}</span>}
                <ChevronRight className="h-4 w-4 text-slate-300 rtl-flip" />
              </button>
            </li>
          ))}
          {data && data.items.length === 0 && <li className="px-3 py-6 text-center text-[0.8125rem] text-slate-500">{tr('Koi nahi mila')}</li>}
        </ul>
        <Button variant="secondary" fullWidth leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>{tr('Naya customer banayein')}</Button>
      </div>
    </Modal>
  );
}

/** Steps through customers one by one: pick the tone and greeting, edit if needed, then send or skip. */
export function ReminderWizard({ customers, shop, money, onClose }: { customers: DirectoryCustomer[]; shop: string; money: (n: number) => string; onClose: () => void }) {
  const list = useMemo(() => customers.filter((c) => c.phone && c.balance > 0.009), [customers]);
  const [i, setI] = useState(0);
  const [sent, setSent] = useState(0);
  const [sal, setSal] = useState<Salutation>('auto');
  const templates = useMemo(loadTemplates, []);
  const c = list[i];
  const [tone, setTone] = useState<Tone>(toneFor(c?.dueDays ?? 0));
  const [text, setText] = useState('');
  useEffect(() => { if (c) { const t = toneFor(c.dueDays); setTone(t); setText(reminderText(templates[t], c, shop, sal)); } }, [c, templates, shop]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (c) setText(reminderText(templates[tone], c, shop, sal)); }, [tone, sal]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => setI((x) => x + 1);

  if (!list.length) {
    return <Modal open onClose={onClose} size="sm" title={tr('Yaad-dihani')}><p className="text-[0.875rem] text-slate-600">{tr('Is list mein kisi udhaar wale ka phone nahi.')}</p></Modal>;
  }
  if (!c) {
    return (
      <Modal open onClose={onClose} size="sm" title={tr('Ho gaya')} footer={<Button onClick={onClose}>{tr('Band karein')}</Button>}>
        <p className="text-[0.875rem] text-slate-700">{tr('{{sent}} customers ko yaad-dihani bheji, {{value}} chhor diye.', { sent, value: list.length - sent })}</p>
      </Modal>
    );
  }
  const link = waLink(c.phone, text);
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Yaad-dihani {{value}} / {{count}}', { value: i + 1, count: list.length })} description={tr('{{name}} · {{balance}} baqi{{value}}', { name: c.name, balance: money(c.balance), value: c.dueDays !== null ? tr(' · {{dueDays}} din se', { dueDays: c.dueDays }) : '' })}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{tr('Band karein')}</Button>
        <Button variant="secondary" leftIcon={<SkipForward className="h-4 w-4" />} onClick={next}>{tr('Chhor dein')}</Button>
        <Button variant="success" leftIcon={<MessageCircle className="h-4 w-4" />} onClick={() => { if (link) window.open(link, '_blank'); setSent((s) => s + 1); next(); }}>{tr('WhatsApp par bhejein')}</Button>
      </>}>
      <div className="space-y-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(i / list.length) * 100}%` }} /></div>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button key={t.v} type="button" onClick={() => setTone(t.v)}
              className={cn('rounded-xl border p-2 text-center transition', tone === t.v ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 hover:bg-slate-50')}>
              <span className="block text-[0.8125rem] font-semibold text-slate-900">{t.l}</span><span className="block text-[0.6875rem] text-slate-500">{t.d}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SALUTATIONS.map((s) => (
            <button key={s.v} type="button" onClick={() => setSal(s.v)} className={cn('h-7 rounded-full px-2.5 text-[0.75rem] font-medium', sal === s.v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{s.l}</button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[0.875rem] leading-relaxed outline-none focus:border-brand-500" />
      </div>
    </Modal>
  );
}

export function TemplatesModal({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState(loadTemplates);
  const [tone, setTone] = useState<Tone>('polite');
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Yaad-dihani ke messages')} description={tr('{name} {sal} {amount} {days} {shop} khud bhar jate hain')}
      footer={<>
        <Button variant="ghost" onClick={() => setT({ ...DEFAULT_TEMPLATES })}>{tr('Pehle jaisa')}</Button>
        <Button onClick={() => { saveTemplates(t); onClose(); }}>{tr('Save karein')}</Button>
      </>}>
      <div className="space-y-3">
        <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
          {TONES.map((x) => <button key={x.v} type="button" onClick={() => setTone(x.v)} className={cn('h-8 rounded-lg px-3 text-[0.8125rem] font-semibold', tone === x.v ? 'bg-white shadow-sm' : 'text-slate-600')}>{x.l}</button>)}
        </div>
        <textarea value={t[tone]} onChange={(e) => setT({ ...t, [tone]: e.target.value })} rows={11} className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-[0.8125rem] leading-relaxed outline-none focus:border-brand-500" />
      </div>
    </Modal>
  );
}

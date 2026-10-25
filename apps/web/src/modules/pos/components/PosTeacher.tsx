/** POS guide: the fastest ways to bill, payments, voice and keyboard. */

import { Banknote, BookOpen, Calculator, Mic, Pause, Pencil, ScanLine, Search, Tag, type LucideIcon } from 'lucide-react';
import { Modal } from '@/design-system/components';

const TIPS: Array<{ icon: LucideIcon; color: string; title: string; text: string; keys?: string[] }> = [
  { icon: ScanLine, color: '#2563eb', title: 'Scan aur F12', text: 'Barcode scan karein, F12 dabayein — cash sale aur bill print. Do second.', keys: ['F12'] },
  { icon: Search, color: '#7c3aed', title: 'Naam se search', text: 'Search mein naam likhein, Enter se pehla result bill mein. Card par − + se ginti.', keys: ['/', 'Enter'] },
  { icon: Pencil, color: '#d97706', title: 'Mol-tol', text: 'Bill ki line par rate par click karein aur naya rate likhein.' },
  { icon: Tag, color: '#db2777', title: 'Discount aur gol karna', text: 'Percent, rupay, ya bill ko 10/50/100 par gol karein.' },
  { icon: Calculator, color: '#16a34a', title: 'Return khud', text: 'Customer ne jitna diya likhein ya note dabayein — kitna wapas dena hai khud aata hai.', keys: ['F8'] },
  { icon: BookOpen, color: '#ea580c', title: 'Udhaar', text: 'Customer chunein, phir Udhaar. Kuch paisa mila to baqi khud udhaar.' },
  { icon: Pause, color: '#0891b2', title: 'Hold', text: 'Customer ruk gaya? Bill hold karein, agla customer lein, baad mein wapas.' },
  { icon: Banknote, color: '#475569', title: 'Offline bhi', text: 'Internet chala jaye to bhi bechte rahein — wapas aate hi sab chala jayega.' },
];

const VOICE = ['2 kilo cheeni', 'sau ka doodh', 'dedh kilo aata', 'ek dozen anday aur ek bread', '5 percent discount', 'udhaar', 'bill saaf karo'];

const KEYS: Array<[string, string]> = [
  ['?', 'Sab shortcuts'], ['F2', 'Customer'], ['F3', 'Bill ki lines'], ['F4', 'Discount'], ['F6', 'Hold'],
  ['F8', 'Payment'], ['F9', 'Aur kaam'], ['F12', 'Cash + print'], ['Ctrl Enter', 'Checkout'], ['Esc', 'Band'],
];

export function PosTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="xl" title="POS kaise chalayein" description="Ye 8 baatein yaad kar lein — har bill do second ka">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map((t) => (
            <div key={t.title} className="flex gap-3 rounded-2xl p-3.5 ring-1 ring-slate-200/80 transition hover:shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${t.color}14`, color: t.color }}>
                <t.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.875rem] font-semibold text-slate-900">{t.title}</span>
                  {t.keys?.map((k) => <kbd key={k} className="rounded-md border border-slate-200 bg-slate-50 px-1.5 font-mono text-[0.6875rem] text-slate-600">{k}</kbd>)}
                </div>
                <p className="mt-0.5 text-[0.8125rem] leading-snug text-slate-600">{t.text}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="rounded-2xl bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-brand-100">
          <h3 className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900"><Mic className="h-4 w-4 text-brand-600" /> Awaaz se bill <kbd className="rounded-md border border-slate-200 bg-white px-1.5 font-mono text-[0.6875rem] text-slate-600">F6</kbd></h3>
          <p className="mt-1 text-[0.8125rem] text-slate-600">Urdu ya Roman mein bolein, “aur” se kai cheezein ek saath. Mic bolte rehne tak sunta rehta hai.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {VOICE.map((v) => <span key={v} className="rounded-full bg-white px-3 py-1 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">“{v}”</span>)}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Keyboard</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {KEYS.map(([k, v]) => (
              <div key={k} className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 py-3">
                <kbd className="min-w-[2.5rem] rounded-lg border border-b-[3px] border-slate-300 bg-white px-2 py-1 text-center font-mono text-[0.875rem] font-semibold text-slate-800 shadow-sm">{k}</kbd>
                <span className="text-[0.75rem] text-slate-600">{v}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}

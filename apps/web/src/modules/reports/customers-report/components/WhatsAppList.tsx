/**
 * WhatsApp list for a group of customers: one prefilled message per person
 * through wa.me links (no API needed). Segments get an editable message;
 * khata lists use the shop's saved reminder wording in the right tone.
 * Tracks who was sent on this screen and opens the next one with one click.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, MessageCircle, Send } from 'lucide-react';
import { Button, Modal, Segmented, Textarea } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { loadTemplates, reminderText, salutationFor, toneFor, waLink, type Tone } from '@modules/customers/directory/messages';
import { fillMessage } from './meta';

interface WaPerson { id: string; name: string; phone: string | null; gender?: string | null; days?: number | null; balance?: number }

const TONES: Array<{ value: 'auto' | Tone; label: string }> = [
  { value: 'auto', label: 'Khud' }, { value: 'polite', label: 'Narm' }, { value: 'firm', label: 'Sakht' }, { value: 'final', label: 'Aakhri' },
];

export function WhatsAppList({ title, people, kind, message, onClose }: {
  title: string;
  people: WaPerson[];
  kind: 'segment' | 'khata';
  /** Starting text for segments; {name} and {shop} are filled per person. */
  message?: string;
  onClose: () => void;
}) {
  const shop = useAuthStore((s) => s.tenant?.name) || 'Hamari dukaan';
  const [text, setText] = useState(message ?? '');
  const [tone, setTone] = useState<'auto' | Tone>('auto');
  const [sent, setSent] = useState<Set<string>>(() => new Set());
  const templates = useMemo(loadTemplates, []);
  const withPhone = useMemo(() => people.filter((p) => p.phone?.replace(/\D/g, '')), [people]);
  const missing = people.length - withPhone.length;

  const textFor = (p: WaPerson) => (kind === 'khata'
    ? reminderText(templates[tone === 'auto' ? toneFor(p.days ?? null) : tone], { name: p.name, gender: p.gender, phone: p.phone, balance: p.balance ?? 0, dueDays: p.days }, shop)
    : fillMessage(text, p.name, shop, salutationFor(p.name, p.gender)));

  const send = (p: WaPerson) => {
    const link = waLink(p.phone, textFor(p));
    if (!link) return;
    window.open(link, '_blank', 'noopener');
    setSent((s) => new Set(s).add(p.id));
  };
  const next = withPhone.find((p) => !sent.has(p.id));
  const copy = async () => {
    const nums = withPhone.map((p) => p.phone).join('\n');
    try { await navigator.clipboard.writeText(nums); toast.success(`${withPhone.length} number copy ho gaye`); } catch { toast.error('Copy nahi hua'); }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={<span className="inline-flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" />{title}</span>}
      description={`${withPhone.length} ke paas phone hai${missing ? ` · ${missing} bina number` : ''} · har ek ke liye WhatsApp khulega, bas "Send" dabayein`}
      footer={<>
        <Button variant="secondary" onClick={() => void copy()} disabled={!withPhone.length}><Copy className="h-4 w-4" />Number copy</Button>
        <Button onClick={() => next && send(next)} disabled={!next}><Send className="h-4 w-4" />{next ? `Agla bhejein (${sent.size + 1}/${withPhone.length})` : 'Sab ko bhej diya'}</Button>
      </>}>
      {kind === 'segment' ? (
        <label className="block">
          <span className="text-[0.75rem] font-semibold text-slate-600">Paighaam — {'{name}'} ki jagah naam aur {'{shop}'} ki jagah dukaan ka naam aayega</span>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-1" />
        </label>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <span className="text-[0.75rem] text-slate-600">Lehja: "Khud" me 7 din se kam narm, 30 din tak sakht, us se purana aakhri. Alfaaz Khata page par badal sakte hain.</span>
          <Segmented label="Lehja" value={tone} onChange={setTone} items={TONES} />
        </div>
      )}
      {withPhone[0] && (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-[0.8125rem] text-emerald-950 ring-1 ring-emerald-100">
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-emerald-700">Namoona — {withPhone[0].name}</p>
          <p className="whitespace-pre-wrap">{textFor(withPhone[0])}</p>
        </div>
      )}
      <ul className="mt-3 max-h-[45vh] divide-y divide-slate-100 overflow-y-auto rounded-2xl ring-1 ring-slate-200">
        {withPhone.map((p) => {
          const done = sent.has(p.id);
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[0.875rem] font-medium text-slate-900">{p.name}</p>
                <p className="text-[0.6875rem] text-slate-500">{p.phone}{p.balance ? ` · Rs ${Math.round(p.balance).toLocaleString('en-PK')}` : ''}</p>
              </div>
              <button type="button" onClick={() => send(p)}
                className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[0.75rem] font-semibold transition',
                  done ? 'bg-slate-100 text-slate-500' : 'bg-emerald-600 text-white hover:bg-emerald-700')}>
                {done ? <><Check className="h-3.5 w-3.5" />Bhej diya</> : <><Send className="h-3.5 w-3.5" />Bhejein</>}
              </button>
            </li>
          );
        })}
        {!withPhone.length && <li className="px-3 py-8 text-center text-[0.8125rem] text-slate-500">Is list me kisi ka phone number nahi</li>}
      </ul>
    </Modal>
  );
}

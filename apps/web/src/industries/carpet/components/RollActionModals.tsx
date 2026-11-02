/** Roll stock changes by hand: adjust length, mark damaged, close (finish) and remove. Each asks for a reason that stays on the roll's history. */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Input, Modal, Segmented } from '@/design-system/components';
import { carpetRollsApi, type CarpetRoll } from '../api/carpet-rolls.api';
import { ftIn, realFt } from '../lib/meta';
import { t, Trans } from '@core/i18n';

const digits = (v: string) => v.replace(/[^\d.]/g, '');
const errText = (e: unknown, fb: string) => (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fb;
const REASONS = ['Naap ghalat thi', 'Naap dobara li', 'Kharab hissa kata', 'Supplier ne kam diya', 'Wapas mila'];

export function AdjustRollModal({ roll, onClose, onDone }: { roll: CarpetRoll; onClose: () => void; onDone: () => void }) {
  const [dir, setDir] = useState<'minus' | 'plus'>('minus');
  const [ft, setFt] = useState('');
  const [inch, setInch] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const delta = realFt(Number(ft || 0), Number(inch || 0));
  const left = realFt(roll.remainingLengthFt, roll.remainingLengthInch);
  const after = dir === 'minus' ? left - delta : left + delta;
  const error = Number(inch || 0) >= 12 ? t('Inch 12 se kam likhein') : !(delta > 0) ? t('Kitni lambai likhein') : after < -0.001 ? t('Itni lambai roll me nahi') : !reason.trim() ? t('Wajah likhein') : null;
  const save = async () => {
    if (error) return;
    setBusy(true);
    try {
      const sign = dir === 'minus' ? -1 : 1;
      await carpetRollsApi.adjust(roll.id, { lengthDeltaFt: sign * Number(ft || 0), lengthDeltaInch: Number(inch || 0) * (Number(ft || 0) === 0 ? sign : 1), reason: reason.trim() });
      toast.success(t('Roll adjust ho gaya'));
      onDone();
    } catch (e) { toast.error(errText(e, t('Adjust nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} size="md" title={t('Adjust — {{rollNumber}}', { rollNumber: roll.rollNumber })} description={t('Abhi {{remainingLengthFt}} bacha hai. Har badlao history me likha jata hai.', { remainingLengthFt: ftIn(roll.remainingLengthFt, roll.remainingLengthInch) })}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Band karein')}</Button><Button onClick={() => void save()} loading={busy} disabled={!!error}>{t('Save')}</Button></>}>
      <div className="space-y-3">
        <Segmented value={dir} onChange={setDir} items={[{ value: 'minus', label: t('Kam karein') }, { value: 'plus', label: t('Zyada karein') }]} />
        <div className="grid grid-cols-2 gap-2">
          <Input label={t('Feet')} inputMode="decimal" value={ft} onChange={(e) => setFt(digits(e.target.value))} autoFocus />
          <Input label={t('Inch')} inputMode="decimal" value={inch} onChange={(e) => setInch(digits(e.target.value))} />
        </div>
        <Input label={t('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Kyun badla?')} />
        <div className="flex flex-wrap gap-1.5">{REASONS.map((r) => <button key={r} type="button" onClick={() => setReason(r)} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{r}</button>)}</div>
        <p className="text-[0.875rem] text-slate-700">{t('Baad me:')}{' '} <b>{after >= 0 ? ftIn(Math.floor(after + 1e-9), Math.round((after - Math.floor(after + 1e-9)) * 12)) : '—'}</b>{error && delta > 0 && <span className="ms-2 font-medium text-rose-600">{error}</span>}</p>
      </div>
    </Modal>
  );
}

type Action = 'damage' | 'finish' | 'remove';
const ACTION: Record<Action, { title: string; text: string; button: string; ok: string }> = {
  damage: { title: t('Damage mark karein'), text: t('Roll stock se bahar ho jayega aur counter par nahi bikega. Baad me Edit se dobara chalu kar sakte hain.'), button: t('Damage mark karein'), ok: t('Roll damage mark ho gaya') },
  finish: { title: t('Roll khatam karein'), text: t('Jo lambai abhi bachi hai woh waste me likhi jayegi aur stock se nikal jayegi.'), button: t('Khatam karein'), ok: t('Roll khatam ho gaya') },
  remove: { title: t('Roll stock se hatayein'), text: t('Ghalat entry ke liye. Roll ka record aur history baqi rahegi, sirf stock se nikal jayega.'), button: t('Stock se hatayein'), ok: t('Roll stock se hat gaya') },
};

export function RollActionModal({ roll, action, onClose, onDone }: { roll: CarpetRoll; action: Action; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const a = ACTION[action];
  const run = async () => {
    setBusy(true);
    try {
      if (action === 'damage') await carpetRollsApi.markDamaged(roll.id, reason.trim() || undefined);
      else if (action === 'finish') await carpetRollsApi.markFinished(roll.id, reason.trim() || undefined);
      else await carpetRollsApi.remove(roll.id);
      toast.success(a.ok);
      onDone();
    } catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} size="sm" title={`${a.title} — ${roll.rollNumber}`} description={a.text}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button><Button variant="danger" onClick={() => void run()} loading={busy}>{a.button}</Button></>}>
      <p className="mb-3 text-[0.875rem] text-slate-700"><Trans text="Abhi bacha: {{length}} · {{sqft}} sqft" values={{ length: <b>{ftIn(roll.remainingLengthFt, roll.remainingLengthInch)}</b>, sqft: String(roll.remainingSqft) }} /></p>
      {action !== 'remove' && <Input label={t('Wajah (zaroori nahi)')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={action === 'damage' ? t('Pani lag gaya, keera…') : t('Aakhri tukra chhota tha')} />}
    </Modal>
  );
}

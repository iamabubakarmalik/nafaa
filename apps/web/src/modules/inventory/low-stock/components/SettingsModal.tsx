/**
 * How the page works out "how many days left" and "how much to order".
 * Saved on this device; every number has a plain hint.
 */

import { useState } from 'react';
import { Button, Field, Modal } from '@/design-system/components';
import type { LowSettings } from '../api';

const FIELDS: Array<{ key: keyof LowSettings; label: string; hint: string; min: number; max: number }> = [
  { key: 'days', label: 'Sale ka hisaab kitne din se', hint: 'Pichhle itne din ki bikri se roz ki ausat nikalti hai. 30 aam hai; mausami maal ho to 14.', min: 7, max: 90 },
  { key: 'targetDays', label: 'Order kitne din ka', hint: 'Order itna banta hai ke maal itne din chale. Supplier jaldi deta ho to kam rakhein.', min: 1, max: 180 },
  { key: 'soonDays', label: '"Jaldi khatam" kab kahein', hint: 'Jo maal itne din ya kam me khatam ho jayega, woh "Jaldi khatam" me aata hai — supplier ko jitne din lagte hain utna rakhein.', min: 1, max: 60 },
  { key: 'expiryDays', label: 'Expiry kitne din pehle dikhayein', hint: 'Jis batch ki expiry itne din me hai, woh "Expiry" me dikhta hai.', min: 1, max: 180 },
];

export function SettingsModal({ value, defaults, onSave, onClose }: {
  value: LowSettings; defaults: LowSettings; onSave: (v: LowSettings) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<keyof LowSettings, string>>(() => ({
    days: String(value.days), targetDays: String(value.targetDays), soonDays: String(value.soonDays), expiryDays: String(value.expiryDays),
  }));
  const num = (k: keyof LowSettings) => Math.round(Number(draft[k]));
  const parsed: LowSettings = { days: num('days'), targetDays: num('targetDays'), soonDays: num('soonDays'), expiryDays: num('expiryDays') };
  const bad = FIELDS.find((f) => !(parsed[f.key] >= f.min && parsed[f.key] <= f.max));

  return (
    <Modal open onClose={onClose} title="Hisaab ki settings" description="Ye number sirf is device par yaad rehte hain"
      footer={<>
        <Button variant="ghost" onClick={() => onSave(defaults)}>Pehle jaisa</Button>
        <Button disabled={!!bad} onClick={() => onSave(parsed)}>Save</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint} error={bad?.key === f.key ? `${f.min} se ${f.max} din tak` : undefined}>
            {(id, describedBy) => (
              <div className="relative">
                <input id={id} aria-describedby={describedBy} type="number" min={f.min} max={f.max} value={draft[f.key]} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-12 text-sm tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.75rem] text-slate-400">din</span>
              </div>
            )}
          </Field>
        ))}
      </div>
    </Modal>
  );
}

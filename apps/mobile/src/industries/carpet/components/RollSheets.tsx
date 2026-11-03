/** Roll stock changes by hand (web RollActionModals): adjust length, mark damaged, finish and remove. Each keeps a reason in the roll's history. */

import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { msg, t } from '@/core/i18n';
import { Button, ChipGroup, Input, Segmented, Sheet, Text, toast, useTheme } from '@/design';
import { carpetRollsApi, type CarpetRoll } from '../api';
import { ftIn, realFt, refreshCarpet, splitFt } from '../meta';
import { SizeInput } from './SizeInput';

const REASONS = [msg('Naap ghalat thi'), msg('Naap dobara li'), msg('Kharab hissa kata'), msg('Supplier ne kam diya'), msg('Wapas mila')];

export function AdjustRollSheet({ roll, open, onClose }: { roll: CarpetRoll; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [dir, setDir] = useState<'minus' | 'plus'>('minus');
  const [ft, setFt] = useState<number | null>(null);
  const [inch, setInch] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const delta = realFt(ft ?? 0, inch ?? 0);
  const left = realFt(roll.remainingLengthFt, roll.remainingLengthInch);
  const after = dir === 'minus' ? left - delta : left + delta;
  const error = (inch ?? 0) >= 12 ? t('Inch 12 se kam likhein') : !(delta > 0) ? t('Kitni lambai likhein') : after < -0.001 ? t('Itni lambai roll me nahi') : !reason.trim() ? t('Wajah likhein') : null;
  const save = async () => {
    if (error) return;
    setBusy(true);
    try {
      const sign = dir === 'minus' ? -1 : 1;
      await carpetRollsApi.adjust(roll.id, { lengthDeltaFt: sign * (ft ?? 0), lengthDeltaInch: (inch ?? 0) * ((ft ?? 0) === 0 ? sign : 1), reason: reason.trim() });
      toast.success(t('Roll adjust ho gaya'));
      refreshCarpet();
      setFt(null); setInch(null); setReason('');
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Adjust nahi hua'))); } finally { setBusy(false); }
  };
  const a = after >= 0 ? splitFt(after) : null;
  return (
    <Sheet open={open} onClose={onClose} title={t('Adjust — {{rollNumber}}', { rollNumber: roll.rollNumber })}
      description={t('Abhi {{remainingLengthFt}} bacha hai. Har badlao history me likha jata hai.', { remainingLengthFt: ftIn(roll.remainingLengthFt, roll.remainingLengthInch) })}
      footer={<Button fullWidth size="lg" loading={busy} disabled={!!error} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Segmented value={dir} onChange={setDir} options={[{ value: 'minus', label: t('Kam karein') }, { value: 'plus', label: t('Zyada karein') }]} />
        <SizeInput label={t('Kitni lambai')} ft={ft} inch={inch} onChange={(f, i) => { setFt(f); setInch(i); }} />
        <Input label={t('Wajah')} value={reason} onChangeText={setReason} placeholder={t('Kyun badla?')} />
        <ChipGroup wrap value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: t(r) }))} />
        <Text size="sm">{t('Baad me:')} <Text size="sm" weight="bold">{a ? ftIn(a.ft, a.inch) : '—'}</Text>{error && delta > 0 ? <Text size="sm" tone="danger">{`  ${error}`}</Text> : null}</Text>
      </View>
    </Sheet>
  );
}

export type RollAction = 'damage' | 'finish' | 'remove';
const ACTION: Record<RollAction, { title: string; text: string; button: string; ok: string }> = {
  damage: { title: msg('Damage mark karein'), text: msg('Roll stock se bahar ho jayega aur counter par nahi bikega. Baad me Edit se dobara chalu kar sakte hain.'), button: msg('Damage mark karein'), ok: msg('Roll damage mark ho gaya') },
  finish: { title: msg('Roll khatam karein'), text: msg('Jo lambai abhi bachi hai woh waste me likhi jayegi aur stock se nikal jayegi.'), button: msg('Khatam karein'), ok: msg('Roll khatam ho gaya') },
  remove: { title: msg('Roll stock se hatayein'), text: msg('Ghalat entry ke liye. Roll ka record aur history baqi rahegi, sirf stock se nikal jayega.'), button: msg('Stock se hatayein'), ok: msg('Roll stock se hat gaya') },
};

export function RollActionSheet({ roll, action, onClose, onDone }: { roll: CarpetRoll; action: RollAction | null; onClose: () => void; onDone: (a: RollAction) => void }) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const a = action ? ACTION[action] : null;
  const run = async () => {
    if (!action || !a) return;
    setBusy(true);
    try {
      if (action === 'damage') await carpetRollsApi.markDamaged(roll.id, reason.trim() || undefined);
      else if (action === 'finish') await carpetRollsApi.markFinished(roll.id, reason.trim() || undefined);
      else await carpetRollsApi.remove(roll.id);
      toast.success(t(a.ok));
      refreshCarpet();
      setReason('');
      onDone(action);
    } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!action} onClose={onClose} title={a ? `${t(a.title)} — ${roll.rollNumber}` : ''} description={a ? t(a.text) : undefined}
      footer={<Button fullWidth size="lg" variant="danger" loading={busy} onPress={() => void run()}>{a ? t(a.button) : ''}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm">{t('Abhi bacha: {{length}} · {{sqft}} sqft', { length: ftIn(roll.remainingLengthFt, roll.remainingLengthInch), sqft: String(roll.remainingSqft) })}</Text>
        {action !== 'remove' && <Input label={t('Wajah (zaroori nahi)')} value={reason} onChangeText={setReason} placeholder={action === 'damage' ? t('Pani lag gaya, keera…') : t('Aakhri tukra chhota tha')} />}
      </View>
    </Sheet>
  );
}

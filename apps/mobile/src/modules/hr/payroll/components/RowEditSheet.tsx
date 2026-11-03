/**
 * Changes to one unsaved salary line before it is saved: units, overtime,
 * how much to pay now, the absent cut, commission, bonuses and cuts. The net
 * pay updates as the user types (same rules as the server).
 */

import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Chip, DetailRow, IconButton, Input, MoneyInput, Sheet, Switch, Text, useTheme } from '@/design';
import type { PayLine, RunEdit, RunRow } from '../api/payroll';
import { applyEdit } from '../lib/calc';
import { SALARY_TYPE, hours, days, qty } from '../lib/meta';

const ADD_CHIPS = [t('Eid bonus'), t('Inaam'), t('Safar / kiraya'), t('Khana')];
const CUT_CHIPS = [t('Tor phor'), t('Udhaar return'), t('Late aana'), t('Maal kam')];

export function RowEditSheet({ row, edit, canPayCommission, onSave, onClose }: {
  row: RunRow | null; edit?: RunEdit; canPayCommission: boolean; onSave: (e: RunEdit | undefined) => void; onClose: () => void;
}) {
  return (
    <Sheet open={!!row} onClose={onClose} height={0.92}
      title={row ? t('{{fullName}} — tankhwah badlein', { fullName: row.staff.fullName }) : undefined}
      description={row ? `${row.staff.designation} · ${t(SALARY_TYPE[row.staff.salaryType].label)} · ${formatPKR(row.staff.baseSalary)}` : undefined}>
      {row && <Body key={row.staff.id} row={row} edit={edit} canPayCommission={canPayCommission} onSave={onSave} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ row, edit, canPayCommission, onSave, onClose }: { row: RunRow; edit?: RunEdit; canPayCommission: boolean; onSave: (e: RunEdit | undefined) => void; onClose: () => void }) {
  const th = useTheme();
  const p0 = row.preview;
  const [units, setUnits] = useState<number | null>(edit?.units ?? null);
  const [overtime, setOvertime] = useState<number | null>(edit?.overtimePay ?? null);
  const [skipAbsent, setSkipAbsent] = useState(!!edit?.skipAbsentCut);
  const [commission, setCommission] = useState(edit?.includeCommission !== false);
  const [adds, setAdds] = useState<PayLine[]>(edit?.adds ?? []);
  const [cuts, setCuts] = useState<PayLine[]>(edit?.cuts ?? []);
  const [pay, setPay] = useState<number | null>(edit?.payAmount ?? null);
  const [note, setNote] = useState(edit?.note ?? '');

  const clean = (l: PayLine[]) => l.filter((x) => x.label.trim() && x.amount > 0).map((x) => ({ label: x.label.trim(), amount: Math.round(x.amount) }));
  const draft: RunEdit = {
    units: units ?? undefined, overtimePay: overtime ?? undefined, skipAbsentCut: skipAbsent || undefined,
    includeCommission: commission ? undefined : false, adds: clean(adds), cuts: clean(cuts), payAmount: pay ?? undefined, note: note.trim() || undefined,
  };
  const p = applyEdit(row, draft);
  const variable = p0.unitKind === 'days' || p0.unitKind === 'hours' || p0.unitKind === 'tasks';
  const unit = t(SALARY_TYPE[row.staff.salaryType].unit);
  const commissionAvailable = canPayCommission && !!row.commission && row.commission.earned > 0 && !row.commission.paidSeparately;
  const badLines = [...adds, ...cuts].some((x) => (x.label.trim() && !(x.amount > 0)) || (!x.label.trim() && x.amount > 0));
  const payTooMuch = draft.payAmount != null && draft.payAmount > p.net;
  const blocked = badLines || payTooMuch || p.advanceTooBig;

  const save = () => {
    const empty = draft.units == null && draft.overtimePay == null && !draft.skipAbsentCut && draft.includeCommission == null
      && !draft.adds?.length && !draft.cuts?.length && draft.payAmount == null && !draft.note;
    onSave(empty ? undefined : draft);
    onClose();
  };

  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      {variable && (
        <MoneyInput label={t('Kitne {{unit}}', { unit })} value={units} onChangeValue={setUnits} placeholder={String(p0.units)}
          hint={t('Hazri se {{units}} · rate {{rate}} — khali chhorein to hazri wala', { units: qty(p0.units, unit), rate: formatPKR(p0.rate) })} />
      )}
      <MoneyInput label={t('Overtime (Rs)')} value={overtime} onChangeValue={setOvertime} placeholder={String(p0.overtimePay)}
        hint={row.attendance.overtimeHours > 0 ? t('{{qty}} × {{hourRate}} — khali to yahi', { qty: hours(Math.round(row.attendance.overtimeHours * 10) / 10), hourRate: formatPKR(p0.hourRate) }) : t('Khali chhorein to hazri wala')} />
      <MoneyInput label={t('Abhi kitna dena hai (Rs)')} value={pay} onChangeValue={setPay} placeholder={String(p.net)}
        error={payTooMuch ? t('Banti tankhwah {{net}} se zyada nahi', { net: formatPKR(p.net) }) : undefined}
        hint={t('Khali chhorein to poori. Kam likhein to baqi amount baad me de sakte hain')} />

      {(p0.absentCut > 0 || commissionAvailable) && (
        <View style={{ gap: 12, padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
          {p0.absentCut > 0 && (
            <Switch value={!skipAbsent} onChange={(v) => setSkipAbsent(!v)} label={t('Ghair hazri ki katauti ({{absentCut}})', { absentCut: formatPKR(p0.absentCut) })}
              description={t('{{absentDays}} ghair hazir / bina tankhwah chhutti × {{dayRate}} roz. Band karein to poori tankhwah milegi', { absentDays: days(p0.absentDays), dayRate: formatPKR(p0.dayRate) })} />
          )}
          {commissionAvailable && (
            <Switch value={commission} onChange={setCommission} label={t('Is mahine ki commission saath dein ({{earned}})', { earned: formatPKR(row.commission!.earned) })}
              description={t('Commission page par bhi ada likhi jayegi. Band karein to wahan se alag deni hogi')} />
          )}
        </View>
      )}

      <Lines title={t('Bonus / inaam')} icon={Plus} chips={ADD_CHIPS} lines={adds} onChange={setAdds} hint={t('Wajah zaroor likhein — payslip par yahi chhapti hai')} />
      <Lines title={t('Katauti')} icon={Minus} chips={CUT_CHIPS} lines={cuts} onChange={setCuts} hint={t('Advance khud kat jata hai — yahan sirf koi aur katauti')} />
      <Input label={t('Note (marzi se)')} value={note} onChangeText={setNote} maxLength={300} placeholder={t('Masalan: 3 din ki chhutti approve thi')} hint={t('Payslip aur record par dikhega')} />

      <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border }}>
        <DetailRow label={t('Asal tankhwah')} value={<Amount value={p.basePay} />} />
        <DetailRow label={t('+ Overtime')} value={<Amount value={p.overtimePay} />} />
        <DetailRow label={t('+ Commission')} value={<Amount value={p.commission} />} />
        <DetailRow label={t('+ Bonus')} value={<Amount value={p.bonuses} />} />
        <DetailRow label={t('− Ghair hazri')} value={<Amount value={p.absentCut} />} />
        <DetailRow label={t('− Advance')} value={<Amount value={p.advance} />} />
        <DetailRow label={t('− Katauti')} value={<Amount value={p.otherCuts} />} />
        <DetailRow label={t('Haath me (net)')} value={<Amount value={p.net} weight="bold" size="lg" />} last />
      </View>
      {p.advanceTooBig && <Text size="sm" tone="danger">{t('Advance is mahine ki tankhwah se zyada hai — katauti kam karein ya advance ki qist chhoti rakhein.')}</Text>}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="ghost" onPress={() => { onSave(undefined); onClose(); }}>{t('Sab wapas pehle jaisa')}</Button>
        <Button style={{ flex: 1 }} disabled={blocked} onPress={save}>{t('Theek hai')}</Button>
      </View>
    </View>
  );
}

function Lines({ title, icon, chips, lines, onChange, hint }: {
  title: string; icon: typeof Plus; chips: string[]; lines: PayLine[]; onChange: (l: PayLine[]) => void; hint: string;
}) {
  const th = useTheme();
  const set = (i: number, patch: Partial<PayLine>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <View style={{ gap: 8 }}>
      <Text size="sm" weight="semibold">{title}</Text>
      {lines.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <View style={{ flex: 1.4 }}><Input value={l.label} onChangeText={(v) => set(i, { label: v })} maxLength={60} placeholder={t('Wajah')} /></View>
          <View style={{ flex: 1 }}><MoneyInput value={l.amount || null} onChangeValue={(v) => set(i, { amount: v ?? 0 })} placeholder={t('Amount')} /></View>
          <IconButton icon={Trash2} label={t('Hatayein')} onPress={() => onChange(lines.filter((_, j) => j !== i))} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {chips.map((c) => <Chip key={c} label={c} icon={icon} onPress={() => onChange([...lines, { label: c, amount: 0 }])} />)}
        <Chip label={t('Aur')} icon={icon} onPress={() => onChange([...lines, { label: '', amount: 0 }])} />
      </View>
      <Text size="xs" tone="muted">{hint}</Text>
    </View>
  );
}

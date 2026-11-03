/**
 * Small pieces the optical screens share: the eye power grid (entry and a
 * print-like view), customer name and phone with lookup, status pills and a
 * stat row.
 */

import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { cleanPowerInput, fmtPower, POWER_KEYS, type Power, type PowerDraft, type PowerErrorKey, type PowerKey } from '@nafaa/core/industries/optical';
import { msg, t } from '@/core/i18n';
import { useCustomerSearch } from '@/core/offline';
import { Chip, Field, Input, Row, StatusPill, Text, useTheme, type InputProps, type StatusTone } from '@/design';
import { digits, phoneOk } from '../meta';

export const Pill = ({ meta }: { meta: { label: string; tone: StatusTone } }) => <StatusPill tone={meta.tone}>{t(meta.label)}</StatusPill>;

const ERROR_TEXT: Record<PowerErrorKey, string> = {
  sph: msg('-30 se +30, 0.25 ke qadam'), cyl: msg('-10 se +10, 0.25 ke qadam'), axis: msg('0 se 180'), axisNeeded: msg('CYL ke saath AXIS likhein'), add: msg('+0.50 se +4.00'), pd: msg('40 se 80 mm'),
};
export const powerErrorText = (e: Partial<Record<PowerKey, PowerErrorKey>>): string | undefined => {
  const first = POWER_KEYS.map((k) => e[k]).find(Boolean);
  return first ? t(ERROR_TEXT[first]) : undefined;
};

const COLS: Array<{ key: 'Sph' | 'Cyl' | 'Axis' | 'Add'; label: string; hint: string }> = [
  { key: 'Sph', label: 'SPH', hint: '-1.25' }, { key: 'Cyl', label: 'CYL', hint: '-0.50' }, { key: 'Axis', label: 'AXIS', hint: '180' }, { key: 'Add', label: 'ADD', hint: '+2.00' },
];

function Cell({ value, onChange, hint, bad, label }: { value: string; onChange: (v: string) => void; hint: string; bad?: boolean; label: string }) {
  const th = useTheme();
  const c = th.colors;
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value} onChangeText={onChange} placeholder={hint} placeholderTextColor={c.textSubtle} keyboardType="numbers-and-punctuation" inputMode="decimal"
      selectionColor={c.brand.solid} accessibilityLabel={label} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} maxFontSizeMultiplier={1.2}
      style={{
        flex: 1, minWidth: 0, height: 46, textAlign: 'center', writingDirection: 'ltr', fontSize: 16, color: c.text, fontFamily: th.fontFamily('medium'),
        backgroundColor: c.surface, borderRadius: th.radius('md'), borderWidth: focused ? 1.5 : 1, borderColor: bad ? c.danger.solid : focused ? c.brand.solid : c.borderStrong,
      }}
    />
  );
}

/** Entry grid for both eyes, the way a prescription is written: R and L rows, SPH CYL AXIS ADD, and PD. */
export function PowerGrid({ value, onChange, errors = {}, showAdd = true }: {
  value: PowerDraft; onChange: (v: PowerDraft) => void; errors?: Partial<Record<PowerKey, PowerErrorKey>>; showAdd?: boolean;
}) {
  const th = useTheme();
  const cols = showAdd ? COLS : COLS.filter((c) => c.key !== 'Add');
  const set = (k: PowerKey, v: string) => onChange({ ...value, [k]: cleanPowerInput(k, v) });
  const msgText = powerErrorText(errors);
  return (
    <View style={{ gap: th.space(2) }}>
      <Row gap={1.5}>
        <View style={{ width: 44 }} />
        {cols.map((c) => <Text key={c.key} size="xs" weight="semibold" tone="secondary" align="center" style={{ flex: 1 }} ltr>{c.label}</Text>)}
      </Row>
      {(['right', 'left'] as const).map((side) => (
        <Row key={side} gap={1.5}>
          <Text size="sm" weight="bold" tone="secondary" style={{ width: 44 }} ltr>{side === 'right' ? 'R' : 'L'}</Text>
          {cols.map((c) => {
            const k = `${side}${c.key}` as PowerKey;
            return <Cell key={k} label={`${side === 'right' ? 'R' : 'L'} ${c.label}`} value={value[k]} onChange={(v) => set(k, v)} hint={c.hint} bad={!!errors[k]} />;
          })}
        </Row>
      ))}
      <Row gap={2}>
        <Text size="sm" weight="medium" tone="secondary" ltr>PD (mm)</Text>
        <View style={{ width: 90 }}><Cell label="PD" value={value.pupilDistance} onChange={(v) => set('pupilDistance', v)} hint="62" bad={!!errors.pupilDistance} /></View>
      </Row>
      {msgText ? <Text size="xs" weight="medium" tone="danger">{msgText}</Text> : <Text size="xs" tone="muted">{t('Minus number ke aage "-" likhein. CYL ho to AXIS zaroori. 0.25 ke qadam.')}</Text>}
    </View>
  );
}

/** Read-only eye power, like the printed prescription. */
export function PowerTable({ p }: { p: Power }) {
  const th = useTheme();
  const cell = (v?: number | null, axis?: boolean) => (v == null ? '—' : axis ? `${v}°` : fmtPower(v, t('Plano')));
  const head = (h: string) => <Text key={h} size="xs" weight="medium" tone="muted" align="center" style={{ flex: 1 }} ltr>{h}</Text>;
  return (
    <View style={{ gap: th.space(1.5) }}>
      <Row>
        <Text size="xs" weight="medium" tone="muted" style={{ width: 36 }}>{t('Aankh')}</Text>
        {['SPH', 'CYL', 'AXIS', 'ADD'].map(head)}
      </Row>
      {(['right', 'left'] as const).map((side) => (
        <Row key={side} style={{ borderTopWidth: 0.5, borderTopColor: th.colors.border, paddingTop: th.space(1.5) }}>
          <Text size="sm" weight="bold" tone="secondary" style={{ width: 36 }} ltr>{side === 'right' ? 'R' : 'L'}</Text>
          {([['Sph', false], ['Cyl', false], ['Axis', true], ['Add', false]] as const).map(([k, axis]) => (
            <Text key={k} size="sm" weight="medium" align="center" tabular ltr style={{ flex: 1 }}>{cell(p[`${side}${k}` as keyof Power], axis)}</Text>
          ))}
        </Row>
      ))}
      {p.pupilDistance != null && <Text size="xs" tone="muted">{t('PD:')} <Text size="xs" weight="semibold" ltr>{`${p.pupilDistance} mm`}</Text></Text>}
    </View>
  );
}

export interface PartyDraft { customerId?: string; name: string; phone: string }
export const emptyParty: PartyDraft = { name: '', phone: '' };

export function partyErrors(p: PartyDraft, phoneRequired = true): Partial<Record<'name' | 'phone', string>> {
  const e: Partial<Record<'name' | 'phone', string>> = {};
  if (p.name.trim().length < 2) e.name = t('Customer ka naam likhein');
  if ((phoneRequired || p.phone.trim()) && !phoneOk(p.phone)) e.phone = t('Sahi mobile number likhein (03xx-xxxxxxx)');
  return e;
}

/** Customer name and phone; typing either offers saved customers (from the phone's own copy) to fill from. */
export function PartyFields({ value, onChange, errors = {}, phoneRequired = true }: {
  value: PartyDraft; onChange: (v: PartyDraft) => void; errors?: Partial<Record<'name' | 'phone', string>>; phoneRequired?: boolean;
}) {
  const th = useTheme();
  const [q, setQ] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQ(value.customerId ? '' : digits(value.phone).length >= 4 ? value.phone : value.name.trim().length >= 3 ? value.name.trim() : ''), 250);
    return () => clearTimeout(id);
  }, [value.phone, value.name, value.customerId]);
  const found = useCustomerSearch({ query: q || undefined, limit: 4 }, { enabled: q.length >= 3 });
  const matches = value.customerId ? [] : found.data ?? [];
  const set = (patch: Partial<PartyDraft>) => onChange({ ...value, ...patch, customerId: undefined });
  return (
    <View style={{ gap: th.space(3) }}>
      <Input label={t('Customer ka naam')} value={value.name} onChangeText={(name) => set({ name })} placeholder={t('Ali Raza')} error={errors.name} maxLength={120} />
      <Input label={t('Mobile')} value={value.phone} onChangeText={(phone) => set({ phone })} placeholder="0300-1234567" keyboardType="phone-pad" maxLength={20}
        error={errors.phone ?? (value.phone && !phoneOk(value.phone) ? t('03xx-xxxxxxx likhein') : undefined)} hint={t('Isi number se customer ka record aur khata judta hai')} />
      {matches.length > 0 && (
        <Field label={t('Pehle se customer:')}>
          <Row gap={2} wrap>
            {matches.map((c) => <Chip key={c.id} label={`${c.name}${c.phone ? ` · ${c.phone}` : ''}`} onPress={() => onChange({ customerId: c.id, name: c.name, phone: c.phone ?? value.phone })} />)}
          </Row>
        </Field>
      )}
      {value.customerId ? (
        <Row gap={2}>
          <Text size="xs" tone="success" style={{ flexShrink: 1 }}>{t('Saved customer — record aur khata isi ke naam.')}</Text>
          <Chip label={t('Alag customer')} onPress={() => onChange({ ...value, customerId: undefined })} />
        </Row>
      ) : null}
    </View>
  );
}

/** Raw-text choices as chips; tapping the chosen one clears it when `clearable`. */
export function Choices({ options, value, onChange, clearable }: { options: string[]; value: string; onChange: (v: string) => void; clearable?: boolean }) {
  return <Row gap={2} wrap>{options.map((o) => <Chip key={o} label={t(o)} selected={value === o} onPress={() => onChange(clearable && value === o ? '' : o)} />)}</Row>;
}

/** Several raw-text choices (coatings, repair kinds). */
export function MultiChoices({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return <Row gap={2} wrap>{options.map((o) => <Chip key={o} label={t(o)} selected={value.includes(o)} onPress={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])} />)}</Row>;
}

/** Number field that accepts a minus sign (lens power ranges); empty is null. */
export function SignedNumber({ value, onValue, ...rest }: Omit<InputProps, 'value' | 'onChangeText'> & { value: number | null; onValue: (v: number | null) => void }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    const typed = text === '' || text === '-' || text === '+' ? null : Number(text);
    if (value !== typed) setText(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input {...rest} value={text} keyboardType="numbers-and-punctuation" ltr
      onChangeText={(raw) => {
        const clean = cleanPowerInput('rightSph', raw);
        setText(clean);
        const n = Number(clean);
        onValue(clean === '' || clean === '-' || clean === '+' || !Number.isFinite(n) ? null : n);
      }} />
  );
}

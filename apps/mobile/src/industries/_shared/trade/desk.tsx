/**
 * Pieces shared by the appliances and hardware packs: the customer box, the
 * pay and reason sheets, rating stars, time-slot chips, WhatsApp links and
 * small form helpers. Screens stay on the design kit; this only joins its parts.
 */

import { Star, UserRound, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOfflineManifest } from '@/core/offline';
import { Button, ChipGroup, IconButton, Input, ListRow, MoneyInput, PressableScale, Row, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { CustomerPickerSheet } from '@/modules/customers/components/CustomerPickerSheet';
import { MethodChips } from '../deskKit';

export { MethodChips };
export { OfflineNote, dateToKey, keyToDate, numIn, todayKey, useDeskOnline, shiftKey, daysFromToday } from '../deskKit';

export interface CustomerValue { customerId: string; name: string; phone: string; address?: string; area?: string; balance?: number }
export const emptyCustomer: CustomerValue = { customerId: '', name: '', phone: '' };

/** Customer of a job: pick a saved one, or type a new name and phone; address when the job goes to the customer's door. */
export function CustomerBox({ value, onChange, error, phoneError, addressError, address, locked }: {
  value: CustomerValue; onChange: (v: CustomerValue) => void; error?: string; phoneError?: string; addressError?: string; address?: boolean; locked?: boolean;
}) {
  const th = useTheme();
  const [pick, setPick] = useState(false);
  return (
    <View style={{ gap: th.space(2) }}>
      {value.customerId ? (
        <Row gap={2} style={{ alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <ListRow icon={UserRound} iconTone="brand" title={value.name} subtitle={value.phone || undefined}
              trailing={Math.abs(value.balance ?? 0) > 0.009 ? <Text size="xs" tone={(value.balance ?? 0) > 0 ? 'danger' : 'success'}>{t('Khata {{amount}}', { amount: formatMoney(Math.abs(value.balance ?? 0)) })}</Text> : undefined} />
          </View>
          {!locked && <IconButton icon={X} label={t('Change')} onPress={() => onChange({ ...emptyCustomer, address: value.address, area: value.area })} />}
        </Row>
      ) : (
        <>
          <Input label={t('Customer ka naam')} value={value.name} onChangeText={(name) => onChange({ ...value, name })} error={error} />
          <Input label={t('Phone')} value={value.phone} onChangeText={(phone) => onChange({ ...value, phone })} keyboardType="phone-pad" ltr error={phoneError} placeholder="0300-1234567" />
          <Button variant="soft" icon={UserRound} onPress={() => setPick(true)}>{t('Saved customer chunein')}</Button>
        </>
      )}
      {address && (
        <>
          <Input label={t('Pata')} value={value.address ?? ''} onChangeText={(a) => onChange({ ...value, address: a })} error={addressError} placeholder={t('House 12, Street 4')} />
          <Input label={t('Ilaqa')} value={value.area ?? ''} onChangeText={(a) => onChange({ ...value, area: a })} placeholder={t('Gulberg')} />
        </>
      )}
      <CustomerPickerSheet open={pick} title={t('Customer')} onClose={() => setPick(false)}
        onPick={(c) => { onChange({ ...value, customerId: c.id, name: c.name, phone: c.phone ?? '', balance: c.balance }); setPick(false); }} />
    </View>
  );
}

/** Shop the stock and bill belong to: the chosen branch, else the main one. */
export function useShopId(): string | null {
  const current = useAuthStore((s) => s.currentShopId);
  const manifest = useOfflineManifest();
  if (current && current !== 'all') return current;
  return manifest.data?.shops.find((s) => s.isMain)?.id ?? manifest.data?.shops[0]?.id ?? null;
}

/** Pakistani mobile number: 03xx-xxxxxxx (11 digits) or +92. */
export const phoneOk = (v: string) => /^(\+?92|0)3\d{9}$/.test(v.replace(/[\s-]/g, ''));
export const cnicOk = (v: string) => !v.trim() || /^\d{5}-?\d{7}-?\d$/.test(v.trim());
export const digits = (v: string) => v.replace(/\D/g, '');
/** Empty text becomes undefined so the API keeps optional fields out. */
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
export const errText = (e: unknown, fallback: string) => apiErrorMessage(e, fallback);

/** Customer errors for jobs that need a name, a valid phone and, at the door, an address. */
export function customerErrors(c: CustomerValue, needAddress = true) {
  const e: { name?: string; phone?: string; address?: string } = {};
  if (c.name.trim().length < 2) e.name = t('Customer ka naam likhein');
  if (!phoneOk(c.phone)) e.phone = t('Sahi mobile number likhein (03xx-xxxxxxx)');
  if (needAddress && (c.address ?? '').trim().length < 5) e.address = t('Poora pata likhein');
  return e;
}

/** WhatsApp message to a Pakistani number (03xx… or 923xx…). */
export function openWhatsApp(phone: string | null | undefined, text: string) {
  const d = digits(phone ?? '');
  if (d.length < 10) { toast.warning(t('Phone number nahi hai')); return; }
  const intl = d.startsWith('92') ? d : d.startsWith('0') ? `92${d.slice(1)}` : `92${d}`;
  void Linking.openURL(`https://wa.me/${intl}?text=${encodeURIComponent(text)}`);
}
export const callPhone = (phone?: string | null) => { if (phone) void Linking.openURL(`tel:${phone}`); };
export const openMap = (address: string) => void Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(address)}`);

export const TIME_SLOTS = [
  { value: '09:00-12:00', label: msg('Subah 9–12') }, { value: '12:00-15:00', label: msg('Dopahar 12–3') },
  { value: '15:00-18:00', label: msg('Sham 3–6') }, { value: '18:00-21:00', label: msg('Raat 6–9') },
];
export const slotLabel = (s?: string | null) => { const x = TIME_SLOTS.find((v) => v.value === s); return x ? t(x.label) : s ?? ''; };

export function SlotChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text size="sm" weight="semibold" tone="secondary">{t('Waqt')}</Text>
      <ChipGroup wrap value={value} onChange={(v) => onChange(v === value ? '' : v)} options={TIME_SLOTS.map((s) => ({ value: s.value, label: t(s.label) }))} />
    </View>
  );
}

/** Five tappable stars; tapping the current rating clears it. */
export function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const th = useTheme();
  return (
    <Row gap={1}>
      {[1, 2, 3, 4, 5].map((n) => (
        <PressableScale key={n} onPress={() => onChange(value === n ? 0 : n)} accessibilityLabel={t('{{n}} star', { n })} style={{ padding: 4 }}>
          <Star size={26} color={n <= value ? th.colors.warning.solid : th.colors.textMuted} fill={n <= value ? th.colors.warning.solid : 'transparent'} />
        </PressableScale>
      ))}
    </Row>
  );
}

/** Asks for the reason before a cancel or a failed visit; preset reasons fill the box in one tap. */
export function ReasonSheet({ open, title, confirm, presets = [], onConfirm, onClose }: {
  open: boolean; title: string; confirm: string; presets?: string[]; onConfirm: (reason: string) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(''); }, [open]);
  const ok = reason.trim().length >= 3;
  const run = async () => {
    setBusy(true);
    try { await onConfirm(reason.trim()); onClose(); } catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title}
      footer={<Button fullWidth size="lg" variant="danger" loading={busy} disabled={!ok} onPress={() => void run()}>{confirm}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {presets.length > 0 && <ChipGroup wrap value={reason} onChange={setReason} options={presets.map((p) => ({ value: p, label: p }))} />}
        <TextArea label={t('Wajah')} value={reason} onChangeText={setReason} error={reason && !ok ? t('Thori si wajah likhein') : undefined} />
      </View>
    </Sheet>
  );
}

/** Money taken against a job or bill: up to what is due, how it came, a note. */
export function PayMoneySheet({ open, title, description, due, onConfirm, onClose }: {
  open: boolean; title: string; description?: string; due: number;
  onConfirm: (v: { amount: number; paymentMethod: string; note?: string }) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(due);
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAmount(due > 0 ? due : null); setMethod('CASH'); setNote(''); } }, [open, due]);
  const n = amount ?? 0;
  const over = n > due + 0.01;
  const run = async () => {
    setBusy(true);
    try { await onConfirm({ amount: Math.round(n * 100) / 100, paymentMethod: method, note: opt(note) }); onClose(); }
    catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description ?? t('Baqi: {{due}}', { due: formatMoney(due) })}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={n <= 0 || over} onPress={() => void run()}>{n > 0 ? t('{{amount}} lein', { amount: formatMoney(n) }) : t('Paisa lein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Kitna mila')} value={amount} onChangeValue={setAmount} size="xl" error={over ? t('Sirf {{due}} baqi hai', { due: formatMoney(due) }) : undefined} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Payment kaise mili')}</Text>
        <MethodChips value={method} onChange={setMethod} />
        <Input label={t('Note')} value={note} onChangeText={setNote} placeholder={t('Marzi hai')} />
      </View>
    </Sheet>
  );
}

/** Label and value on one line, for plain facts on detail screens. */
export function Fact({ k, v }: { k: string; v?: string | number | null }) {
  if (v === undefined || v === null || v === '') return null;
  return (
    <Row gap={2} style={{ alignItems: 'flex-start' }}>
      <Text size="sm" tone="muted" style={{ width: 104 }}>{k}</Text>
      <Text size="sm" style={{ flex: 1 }}>{String(v)}</Text>
    </Row>
  );
}

/** Plain-text date helpers on yyyy-mm-dd keys. */
export const addDaysKey = (key: string, n: number) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const addMonthsKey = (key: string, n: number) => { const d = new Date(`${key}T12:00:00`); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

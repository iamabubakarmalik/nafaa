/**
 * Small helpers shared by the shop-desk industry packs (pet shop, florist,
 * bookstore): number and day-key helpers, the online-only guard, a state
 * banner and the "money received / pay at pickup" sheet.
 */

import { CloudOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney, businessDayKey } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { offline, onlineNeededText, type OnlineFeature } from '@/core/offline';
import { Button, ChipGroup, MoneyInput, Row, Sheet, Text, toast, useTheme } from '@/design';

/** "1,200" typed in a box becomes 1200; empty is null. */
export const numIn = (v: string): number | null => {
  const s = v.replace(/[^\d.-]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const todayKey = () => businessDayKey();
/** `yyyy-mm-dd` of a picked wall-clock date. */
export const dateToKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const keyToDate = (k?: string | null) => (k ? new Date(`${k.slice(0, 10)}T12:00:00`) : null);
export const shiftKey = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dateToKey(new Date(y, m - 1, d + days));
};
/** Whole days from today to a date (negative: past). */
export const daysFromToday = (v?: string | null) => {
  if (!v) return null;
  const a = Date.parse(`${v.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${todayKey()}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
};

/** Screens that need the server: `guard(run)` runs it online and explains offline. */
export function useDeskOnline(feature: OnlineFeature) {
  const online = useOnlineStatus();
  const guard = (run: () => void) => {
    if (!online) { toast.warning(onlineNeededText(feature)); return; }
    run();
  };
  return { online, guard };
}

/** The "needs internet" reasons of these packs (core/offline rules), marked so the catalogs carry them. */
export const PACK_ONLINE_TEXT = [msg('Live animals, grooming visits and groomers'), msg('Flower orders, wedding contracts and subscriptions'), msg('Schools, school lists, book rentals and publishers')];

export const errorText = (e: unknown, fallback: string) => apiErrorMessage(e, fallback);

/** One line under a header when the phone is offline. */
export function OfflineNote({ feature }: { feature: OnlineFeature }) {
  const th = useTheme();
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <Row gap={1.5}>
      <CloudOff size={14} color={th.colors.textMuted} />
      <Text size="xs" tone="muted" style={{ flex: 1 }}>{onlineNeededText(feature)}</Text>
    </Row>
  );
}

export const PAY_METHODS = [
  { value: 'CASH', label: msg('Cash') }, { value: 'JAZZCASH', label: msg('JazzCash') }, { value: 'EASYPAISA', label: msg('EasyPaisa') },
  { value: 'BANK_TRANSFER', label: msg('Bank') }, { value: 'CARD', label: msg('Card') },
];

export function MethodChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <ChipGroup wrap options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} value={value} onChange={onChange} />;
}

export interface PayResult { paymentMethod: string; paidAmount: number }

/**
 * Money at a pickup or delivery: how much came and by what method. Less than
 * the balance stays on the customer's khata (the server does that).
 */
export function PaySheet({ open, title, name, due, allowPart = true, advance, cta, onConfirm, onClose }: {
  open: boolean; title: string; name: string; due: number; allowPart?: boolean; /** Money in advance: needs an amount above zero. */ advance?: boolean; cta: string;
  onConfirm: (pay: PayResult) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(due);
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAmount(due); setMethod('CASH'); } }, [open, due]);
  const n = amount ?? 0;
  const bad = n < 0 || (!!advance && n <= 0) || n > due + 0.005 || (!allowPart && Math.abs(n - due) > 0.005);
  const run = async () => {
    setBusy(true);
    try { await onConfirm({ paymentMethod: method, paidAmount: Math.round(n * 100) / 100 }); onClose(); }
    catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} description={t('{{name}} · {{due}} baqi', { name, due: formatMoney(due) })}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={bad} onPress={() => void run()}>{cta}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Kitne mile')} value={amount} onChangeValue={setAmount} size="xl" error={n > due + 0.005 ? t('Baqi sirf {{due}} hai', { due: formatMoney(due) }) : undefined} />
        {allowPart && !advance && (
          <ChipGroup options={[{ value: 'full', label: t('Poora') }, { value: 'zero', label: t('Udhaar') }]} value={n === due ? 'full' : n === 0 ? 'zero' : ''}
            onChange={(v) => setAmount(v === 'full' ? due : 0)} />
        )}
        <Text size="sm" weight="semibold" tone="secondary">{t('Payment kaise mili')}</Text>
        <MethodChips value={method} onChange={setMethod} />
        {allowPart && !advance && n < due && <Text size="xs" tone="muted">{t('Jo paisa baqi hai wo customer ke Khata me chala jayega.')}</Text>}
      </View>
    </Sheet>
  );
}

/**
 * A bill is saved on this phone first; its server id arrives when it is sent
 * (seconds online). Waits for it, so a follow-up call (animals sold, delivery
 * order) can name the real bill. Null when it does not arrive in time.
 */
export async function waitServerSaleId(localId: string, tries = 40): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    const s = await offline.sales.get(localId).catch(() => null);
    if (s && !s.pending && !String(s.id).startsWith('tmp_')) return s.id;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

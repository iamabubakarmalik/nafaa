/**
 * Money sheets for orders and bookings (web components/money.tsx): the
 * hand-over bill with split payment (what is left goes on the customer's khata,
 * where the advance cancels it), and the cash refund of a cancelled record's
 * advance (the refund PIN rule applies). An advance or later payment uses the
 * shared PaySheet; cancelling uses ReasonSheet.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { checkoutSplit } from '@nafaa/core/industries/meat';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, ChipGroup, DetailRow, IconButton, MoneyInput, Row, Sheet, Text, toast, useTheme } from '@/design';
import { Plus, Trash2 } from 'lucide-react-native';
import { withManagerPin } from '@/core/security/ManagerPin';
import { errorText } from '../../_shared/deskKit';
import { PAY_METHODS } from '../meta';

interface Part { method: string; amount: number | null }

export function CheckoutSheet({ open, title, total, held, legacy = 0, customerName, lines, onConfirm, onClose }: {
  open: boolean; title: string; total: number; held: number; legacy?: number; customerName?: string | null; lines?: Array<{ label: string; value: string }>;
  onConfirm: (parts: Array<{ method: string; amount: number }>) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const due = Math.max(Math.round((total - held - legacy) * 100) / 100, 0);
  const [parts, setParts] = useState<Part[]>([{ method: 'CASH', amount: due }]);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(false);
  if (open && !seen) { setSeen(true); setParts([{ method: 'CASH', amount: due }]); }
  if (!open && seen) setSeen(false);
  const split = checkoutSplit(total, held, legacy, parts.map((p) => p.amount ?? 0));
  const set = (i: number, patch: Partial<Part>) => setParts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const go = async () => {
    setBusy(true);
    try { await onConfirm(parts.map((p) => ({ method: p.method, amount: p.amount ?? 0 })).filter((p) => p.amount > 0)); onClose(); }
    catch (e) { toast.error(errorText(e, t('Bill nahi bana'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.92} title={t('Bill banayein aur de dein')} description={title}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={split.over} onPress={() => void go()}>{t('Bill banayein · {{total}}', { total: formatMoney(total) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {lines && lines.length > 0 && <Card flush>{lines.map((l, i) => <DetailRow key={i} label={l.label} value={l.value} last={i === lines.length - 1} />)}</Card>}
        <Card flush>
          <DetailRow label={t('Kul bill')} value={formatMoney(total)} />
          <DetailRow label={t('Advance mila')} value={formatMoney(held + legacy)} />
          <DetailRow label={t('Ab lena')} value={formatMoney(split.due)} last />
        </Card>
        {parts.map((p, i) => (
          <View key={i} style={{ gap: th.space(2) }}>
            <Row gap={2} align="end">
              <View style={{ flex: 1 }}><MoneyInput label={t('Amount')} value={p.amount} onChangeValue={(v) => set(i, { amount: v })} /></View>
              {parts.length > 1 && <IconButton icon={Trash2} label={t('Hatayein')} variant="ghost" onPress={() => setParts((ps) => ps.filter((_, j) => j !== i))} />}
            </Row>
            <ChipGroup wrap value={p.method} onChange={(method) => set(i, { method })} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
          </View>
        ))}
        {parts.length < 3 && <Button variant="ghost" icon={Plus} onPress={() => setParts((ps) => [...ps, { method: ps.some((x) => x.method === 'CASH') ? 'CARD' : 'CASH', amount: split.credit || null }])}>{t('Doosra tareeqa')}</Button>}
        {split.over && <Text size="sm" tone="danger" weight="medium">{t('Baqi sirf {{due}} hai', { due: formatMoney(split.due) })}</Text>}
        {split.credit > 0 && !split.over && <Card tone="warning"><Text size="sm">{t('{{credit}} {{value}} khate me udhaar jayega.', { credit: formatMoney(split.credit), value: customerName ? t('{{customerName}} ke', { customerName }) : t('customer ke') })}</Text></Card>}
        <Text size="xs" tone="muted">{t('Bill se stock kam hota hai, Sale aur Profit me aata hai aur paisa drawer me. Bill void karne se order wapas khul jata hai.')}</Text>
      </View>
    </Sheet>
  );
}

/** Cash refund of a cancelled record's advance; the manager PIN is asked when the shop's refund rule needs it. */
export function RefundSheet({ open, title, held, legacy, onRefund, onClose }: {
  open: boolean; title: string; held: number; legacy: number; onRefund: (pin?: string) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await withManagerPin(t('Advance wapsi'), (pin) => onRefund(pin), 'refund'); toast.success(t('{{held}} advance wapas — drawer se cash nikla', { held: formatMoney(held) })); onClose(); }
    catch (e) { toast.error(errorText(e, t('Wapas nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Advance wapas karein?')} description={title}
      footer={<Button fullWidth size="lg" variant="danger" loading={busy} disabled={held <= 0} onPress={() => void go()}>{t('Wapas karein · {{amount}}', { amount: formatMoney(held) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Card flush>
          <DetailRow label={t('Khate me jama advance')} value={formatMoney(held)} last />
        </Card>
        <Text size="sm" tone="secondary">{t('Customer ke khate se advance hat jayega aur utna cash is branch ke khule drawer se nikalega. Day book me "Advance wapas" likha jayega.')}</Text>
        {legacy > 0.5 && <Card tone="warning"><Text size="sm">{t('{{legacy}} purane tareeqe se liya gaya tha aur khate me nahi — wo yahan se wapas nahi hota.', { legacy: formatMoney(legacy) })}</Text></Card>}
      </View>
    </Sheet>
  );
}

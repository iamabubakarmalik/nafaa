/**
 * Counter pieces the service packs share: a split-payment sheet (several
 * methods on one bill, the rest on the customer's khata) and a product picker
 * that searches the phone's own list.
 */

import { Minus, Plus, ScanLine, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useProductSearch, type ProductRow } from '@/core/offline';
import { Amount, Button, EmptyState, IconButton, Input, ListRow, MoneyInput, Row, SearchBar, Sheet, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { MethodChips, PAY_METHODS, errorText } from './deskKit';

export interface SplitPart { method: string; amount: number }
export interface SplitResult { paymentMethod: string; paidAmount: number; payments?: SplitPart[] }

let seq = 1;
interface Row_ { key: number; method: string; amount: number | null }

/**
 * Takes the bill's money in one or more parts. With a customer the unpaid rest
 * goes to khata; without one the parts must cover the whole bill.
 */
export function SplitPaySheet({ open, title, name, due, allowPart, cta, onConfirm, onClose }: {
  open: boolean; title: string; name: string; due: number; allowPart: boolean; cta: string;
  onConfirm: (r: SplitResult) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const [rows, setRows] = useState<Row_[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setRows([{ key: seq++, method: 'CASH', amount: due }]); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const paid = Math.round(rows.reduce((s, r) => s + (r.amount ?? 0), 0) * 100) / 100;
  const left = Math.round((due - paid) * 100) / 100;
  const bad = paid > due + 0.005 || paid < 0 || (!allowPart && Math.abs(left) > 0.005);
  const set = (key: number, p: Partial<Row_>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const addPart = () => setRows((rs) => [...rs, { key: seq++, method: PAY_METHODS.find((m) => !rs.some((r) => r.method === m.value))?.value ?? 'CASH', amount: left > 0 ? left : null }]);
  const run = async () => {
    const parts = rows.filter((r) => (r.amount ?? 0) > 0).map((r) => ({ method: r.method, amount: r.amount as number }));
    setBusy(true);
    try {
      await onConfirm({ paymentMethod: parts[0]?.method ?? 'CASH', paidAmount: paid, payments: parts.length > 1 ? parts : undefined });
      onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} description={t('{{name}} · {{due}} baqi', { name, due: formatMoney(due) })}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={bad} onPress={() => void run()}>{cta}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {rows.map((r, i) => (
          <View key={r.key} style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
            <Row gap={2}>
              <View style={{ flex: 1 }}><MoneyInput label={rows.length > 1 ? t('Part {{n}}', { n: i + 1 }) : t('Kitne mile')} value={r.amount} onChangeValue={(v) => set(r.key, { amount: v })} size="lg" /></View>
              {rows.length > 1 && <IconButton icon={Trash2} label={t('Delete')} variant="danger" onPress={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} />}
            </Row>
            <MethodChips value={r.method} onChange={(m) => set(r.key, { method: m })} />
          </View>
        ))}
        {rows.length < PAY_METHODS.length && <Button variant="soft" icon={Plus} onPress={addPart}>{t('Split payment')}</Button>}
        {paid > due + 0.005 && <Text size="sm" tone="danger">{t('Baqi sirf {{due}} hai', { due: formatMoney(due) })}</Text>}
        {left > 0.005 && (allowPart
          ? <Text size="xs" tone="muted">{t('Jo paisa baqi hai wo customer ke Khata me chala jayega.')} <Amount value={left} size="xs" /></Text>
          : <Text size="sm" tone="danger">{t('Poora paisa lena zaroori hai')}</Text>)}
      </View>
    </Sheet>
  );
}

/** Search the shop's products (works offline) and pick one. */
export function ProductPickerSheet({ open, title, onPick, onClose, onScan }: { open: boolean; title?: string; onPick: (p: ProductRow) => void; onClose: () => void; onScan?: () => void }) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const needle = useDebouncedValue(q, 120);
  const list = useProductSearch({ query: needle || undefined, limit: 40 }, { enabled: open });
  useEffect(() => { if (open) setQ(''); }, [open]);
  const rows = (list.data ?? []).filter((p) => p.isActive && !p.hasVariants);
  return (
    <Sheet open={open} onClose={onClose} title={title ?? t('Products')} height={0.8}>
      <View style={{ gap: th.space(2) }}>
        <Row gap={2}>
          <View style={{ flex: 1 }}><SearchBar value={q} onChangeText={setQ} placeholder={t('Naam ya barcode')} /></View>
          {onScan && <IconButton icon={ScanLine} label={t('Scan')} onPress={onScan} />}
        </Row>
        {rows.length === 0 && <EmptyState title={t('Koi product nahi')} />}
        {rows.map((p) => <ListRow key={p.id} title={p.name} subtitle={p.categoryName ?? undefined} trailing={<Amount value={p.price} weight="bold" />} divider onPress={() => { onPick(p); onClose(); }} />)}
      </View>
    </Sheet>
  );
}

/** Plus and minus around a count; going below 1 sends 0 so the caller can remove the line. */
export function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <Row gap={2}>
      <IconButton icon={value <= 1 ? Trash2 : Minus} label={t('Kam')} onPress={() => onChange(value - 1)} />
      <Text weight="bold" style={{ minWidth: 24, textAlign: 'center' }} ltr>{value}</Text>
      <IconButton icon={Plus} label={t('Zyada')} onPress={() => onChange(value + 1)} />
    </Row>
  );
}

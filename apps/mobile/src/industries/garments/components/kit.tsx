/**
 * Pieces used by several garments screens: the customer box (pick a saved
 * customer or type a new name and phone), the tailor list, a paged-list hook
 * for the server's page endpoints, and the cancel-with-reason sheet.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { UserRound, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiClient } from '@/core/api/client';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOfflineManifest } from '@/core/offline';
import { Button, ChipGroup, IconButton, Input, ListRow, MoneyInput, Row, Select, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { CustomerPickerSheet } from '@/modules/customers/components/CustomerPickerSheet';

export interface CustomerValue { customerId: string; name: string; phone: string; balance?: number }
export const emptyCustomer: CustomerValue = { customerId: '', name: '', phone: '' };

/** Customer of a job: pick a saved one, or type a new name and phone (the khata opens by itself when money is held). */
export function CustomerBox({ value, onChange, error, locked }: { value: CustomerValue; onChange: (v: CustomerValue) => void; error?: string; locked?: boolean }) {
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
          {!locked && <IconButton icon={X} label={t('Change')} onPress={() => onChange(emptyCustomer)} />}
        </Row>
      ) : (
        <>
          <Input label={t('Customer ka naam')} value={value.name} onChangeText={(name) => onChange({ ...value, name })} error={error} />
          <Input label={t('Phone')} value={value.phone} onChangeText={(phone) => onChange({ ...value, phone })} keyboardType="phone-pad" ltr />
          <Button variant="soft" icon={UserRound} onPress={() => setPick(true)}>{t('Saved customer chunein')}</Button>
        </>
      )}
      <CustomerPickerSheet open={pick} title={t('Customer')} onClose={() => setPick(false)}
        onPick={(c) => { onChange({ customerId: c.id, name: c.name, phone: c.phone ?? '', balance: c.balance }); setPick(false); }} />
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

export function useTailors() {
  const q = useQuery({
    queryKey: ['staff', 'garments-tailors'], staleTime: 5 * 60_000,
    queryFn: () => apiClient.get<Array<{ id: string; fullName: string; designation?: string | null }>>('/staff', { params: { status: 'ACTIVE' } }).then((r) => r.data).catch(() => []),
  });
  return (Array.isArray(q.data) ? q.data : []).map((s) => ({ id: s.id, name: s.fullName, job: s.designation }));
}

export function TailorSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const tailors = useTailors();
  return (
    <Select label={t('Karigar')} value={value} onChange={onChange} placeholder={t('— Baad me —')}
      options={[{ value: '', label: tailors.length ? t('— Baad me —') : t('Staff me karigar nahi') }, ...tailors.map((x) => ({ value: x.id, label: x.job ? `${x.name} · ${x.job}` : x.name }))]} />
  );
}

/** A server page endpoint as an infinite list (page and pages come from the API). */
export function usePaged<P extends { page: number; pages: number }>(key: unknown[], fn: (page: number) => Promise<P>, enabled = true) {
  return useInfiniteQuery({
    queryKey: key, queryFn: ({ pageParam }) => fn(pageParam), initialPageParam: 1, enabled, refetchInterval: 60_000,
    getNextPageParam: (l: P) => (l.page < l.pages ? l.page + 1 : undefined), placeholderData: (p) => p,
  });
}

/** Cancel with a reason; reminds that money taken stays on the customer's khata. */
export function CancelSheet({ open, title, paid, onConfirm, onClose }: { open: boolean; title: string; paid: number; onConfirm: (reason: string) => Promise<unknown>; onClose: () => void }) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(reason.trim()); setReason(''); onClose(); } catch (e) { toast.error(apiErrorMessage(e, t('Cancel nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title}
      footer={<Button fullWidth size="lg" variant="danger" loading={busy} onPress={() => void run()}>{t('Cancel karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <TextArea label={t('Wajah')} value={reason} onChangeText={setReason} placeholder={t('Customer ne mana kar diya…')} />
        {paid > 0 && <Text size="sm" tone="warning">{t('{{paid}} advance mil chuka hai — wo customer ke khata me jama rahega.', { paid: formatMoney(paid) })}</Text>}
      </View>
    </Sheet>
  );
}

/** Money taken against a balance: any amount up to `max`, with the payment method. */
export function TakeMoneySheet({ open, title, name, amount, max, cta, onConfirm, onClose }: {
  open: boolean; title: string; name: string; amount: number; max: number; cta: string;
  onConfirm: (pay: { paidAmount: number; paymentMethod: string }) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const [value, setValue] = useState<number | null>(amount);
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setValue(amount); setMethod('CASH'); } }, [open, amount]);
  const n = value ?? 0;
  const bad = n <= 0 || n > max + 0.005;
  const run = async () => {
    setBusy(true);
    try { await onConfirm({ paidAmount: Math.round(n * 100) / 100, paymentMethod: method }); onClose(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} description={t('{{name}} · {{due}} baqi', { name, due: formatMoney(max) })}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={bad} onPress={() => void run()}>{cta}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Kitne mile')} value={value} onChangeValue={setValue} size="xl" error={n > max + 0.005 ? t('Baqi sirf {{due}} hai', { due: formatMoney(max) }) : undefined} />
        <ChipGroup wrap value={method} onChange={setMethod} options={[['CASH', t('Cash')], ['JAZZCASH', t('JazzCash')], ['EASYPAISA', t('EasyPaisa')], ['BANK_TRANSFER', t('Bank')], ['CARD', t('Card')]].map(([v, l]) => ({ value: v, label: l }))} />
      </View>
    </Sheet>
  );
}

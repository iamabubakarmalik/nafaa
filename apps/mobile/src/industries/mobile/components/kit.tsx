/** Small pieces shared by the mobile shop and electronics screens: branch id, customer and product fields, IMEI input with a camera scan, status pill. */

import { Boxes, ScanLine, UserRound, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOfflineManifest } from '@/core/offline';
import { Button, IconButton, Input, ListRow, Row, StatusPill, Text, useTheme, type InputProps } from '@/design';
import { CustomerPickerSheet } from '@/modules/customers/components/CustomerPickerSheet';
import { ProductPicker, type PickedProduct } from '@/modules/inventory/components/ProductPicker';
import { CameraScan } from '@/modules/pos/components/CameraScan';
import { isLuhnValid } from '@nafaa/core/industries/mobile';
import { metaText, type Meta } from '../meta';

/** Shop the stock and bills belong to: the chosen branch, else the main one. */
export function useShopId(): string | null {
  const current = useAuthStore((s) => s.currentShopId);
  const manifest = useOfflineManifest();
  if (current && current !== 'all') return current;
  return manifest.data?.shops.find((s) => s.isMain)?.id ?? manifest.data?.shops[0]?.id ?? null;
}

export const MetaPill = ({ m }: { m: Meta }) => <StatusPill tone={m.tone}>{metaText(m)}</StatusPill>;

export interface CustomerValue { customerId: string; name: string; phone: string; balance?: number }
export const emptyCustomer: CustomerValue = { customerId: '', name: '', phone: '' };

/** A saved customer, or a typed name and phone. */
export function CustomerBox({ value, onChange, error, locked, nameLabel }: { value: CustomerValue; onChange: (v: CustomerValue) => void; error?: string; locked?: boolean; nameLabel?: string }) {
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
          {!locked && <IconButton icon={X} label={t('Badlein')} onPress={() => onChange(emptyCustomer)} />}
        </Row>
      ) : (
        <>
          <Input label={nameLabel ?? t('Customer ka naam')} value={value.name} onChangeText={(name) => onChange({ ...value, name })} error={error} />
          <Input label={t('Phone')} value={value.phone} onChangeText={(phone) => onChange({ ...value, phone })} keyboardType="phone-pad" ltr />
          <Button variant="soft" icon={UserRound} onPress={() => setPick(true)}>{t('Saved customer chunein')}</Button>
        </>
      )}
      <CustomerPickerSheet open={pick} title={t('Customer')} onClose={() => setPick(false)}
        onPick={(c) => { onChange({ customerId: c.id, name: c.name, phone: c.phone ?? '', balance: c.balance }); setPick(false); }} />
    </View>
  );
}

/** A product chosen from the phone's own copy (instant search or scan). */
export function ProductField({ label, value, onChange, variants = false, hint, error, title }: {
  label: string; value: { id: string; name: string; variantName?: string | null } | null; onChange: (p: PickedProduct) => void; variants?: boolean; hint?: string; error?: string; title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Text size="sm" weight="medium" tone="secondary">{label}</Text>
      <ListRow icon={Boxes} iconTone={value ? 'brand' : 'neutral'} title={value ? [value.name, value.variantName].filter(Boolean).join(' · ') : t('Chunein…')} chevron onPress={() => setOpen(true)} />
      {error ? <Text size="xs" tone="danger">{error}</Text> : hint ? <Text size="xs" tone="muted">{hint}</Text> : null}
      <ProductPicker open={open} onClose={() => setOpen(false)} title={title ?? label} variants={variants} includeRaw={false} onPick={(p) => { setOpen(false); onChange(p); }} />
    </View>
  );
}

/** 15-digit IMEI box with a camera scan button and a check-digit warning. */
export function ImeiInput({ label, value, onValue, hint, error, onScanned, ...rest }: Omit<InputProps, 'value' | 'onChangeText' | 'onChange'> & { value: string; onValue: (v: string) => void; onScanned?: (code: string) => void }) {
  const [scan, setScan] = useState(false);
  const bad = value.length === 15 && !isLuhnValid(value);
  return (
    <>
      <Input {...rest} label={label} value={value} onChangeText={(v) => onValue(v.replace(/\D/g, '').slice(0, 15))} keyboardType="number-pad" maxLength={15} ltr
        hint={bad ? t('Check digit nahi milta — dobara dekhein') : hint} error={error}
        trailing={<IconButton icon={ScanLine} label={t('Scan')} size="sm" onPress={() => setScan(true)} />} />
      {scan && (
        <CameraScan title={t('Dabba scan karein')} onClose={() => setScan(false)}
          onCode={(c) => { const d = c.replace(/\D/g, ''); if (d.length < 8) return false; setScan(false); (onScanned ?? onValue)(d.slice(0, 15)); return true; }} />
      )}
    </>
  );
}

/** Light wrapper for a block with a heading inside forms and sheets. */
export function Block({ title, children, gap = 2 }: { title?: string; children: ReactNode; gap?: number }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(gap) }}>
      {title ? <Text size="sm" weight="semibold" tone="secondary">{title}</Text> : null}
      {children}
    </View>
  );
}

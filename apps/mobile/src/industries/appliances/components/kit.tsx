/**
 * Pieces shared by the appliances screens: the technician list and picker,
 * the assign sheet (technician, day, slot), the serial box that checks the
 * register and reports warranty and AMC, and the appliance profile map.
 */

import { useQuery } from '@tanstack/react-query';
import { Barcode, CalendarClock, ScanLine, ShieldCheck, ShieldX } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, DatePicker, IconButton, Input, Row, Select, Sheet, Text, toast, useTheme } from '@/design';
import { CameraScan } from '@/modules/pos/components/CameraScan';
import { SlotChips, dateToKey, errText, keyToDate, todayKey } from '../../_shared/trade/desk';
import { applianceProductsApi, applianceSerialApi, techniciansApi, type ApplianceProfile, type SerialWarrantyCheck } from '../api';
import { KEYS, dayOnly } from '../meta';

export function useTechnicians() {
  const q = useQuery({ queryKey: [KEYS.tech, 'active'], queryFn: () => techniciansApi.list({ active: true }), staleTime: 60_000 });
  return q.data ?? [];
}

export function TechSelect({ value, onChange, label, hint }: { value: string; onChange: (id: string) => void; label?: string; hint?: string }) {
  const techs = useTechnicians();
  return (
    <Select label={label ?? t('Technician')} hint={hint} value={value} onChange={onChange} placeholder={t('Baad me lagayein')} searchable
      options={[{ value: '', label: t('Baad me lagayein') }, ...techs.map((x) => ({ value: x.id, label: `${x.name}${x.currentZone ? ` · ${x.currentZone}` : ''}${x.openJobs ? ` · ${t('{{n}} kaam', { n: x.openJobs })}` : ''}` }))]} />
  );
}

/** Technician, day and slot for a job (installation or repair). */
export function AssignSheet({ open, title, initial, onConfirm, onClose }: {
  open: boolean; title: string; initial: { technicianId?: string | null; date?: string | null; slot?: string | null };
  onConfirm: (v: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const [tech, setTech] = useState('');
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setTech(initial.technicianId ?? ''); setDate(initial.date?.slice(0, 10) ?? todayKey()); setSlot(initial.slot ?? ''); } }, [open, initial.technicianId, initial.date, initial.slot]);
  const past = !!date && date < todayKey();
  const run = async () => {
    setBusy(true);
    try { await onConfirm({ technicianId: tech, scheduledDate: date || undefined, scheduledTimeSlot: slot || undefined }); onClose(); }
    catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title}
      footer={<Button fullWidth size="lg" icon={CalendarClock} loading={busy} disabled={!tech || past} onPress={() => void run()}>{t('Laga dein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <TechSelect value={tech} onChange={setTech} hint={t('Sirf active technician. Naya banda Technicians page par jorein.')} />
        <DatePicker label={t('Kis din')} value={keyToDate(date)} minimumDate={new Date()} onChange={(d) => setDate(dateToKey(d))} error={past ? t('Guzri hui date nahi') : undefined} />
        <SlotChips value={slot} onChange={setSlot} />
      </View>
    </Sheet>
  );
}

/** Serial number box that checks the register and reports warranty and AMC; the camera can scan the code. */
export function SerialLookup({ value, onChange, onFound }: { value: string; onChange: (v: string) => void; onFound: (r: SerialWarrantyCheck) => void }) {
  const th = useTheme();
  const [code, setCode] = useState('');
  const [scan, setScan] = useState(false);
  const q = useQuery({ queryKey: ['appliance-warranty-check', code], queryFn: () => applianceSerialApi.warrantyCheck(code), enabled: code.length >= 3, staleTime: 60_000 });
  const r = q.data;
  const found = useRef(onFound);
  found.current = onFound;
  useEffect(() => { if (r?.found) found.current(r); }, [r]);
  const w = r?.warranty;
  return (
    <View style={{ gap: th.space(2) }}>
      <Row gap={2} style={{ alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Input label={t('Serial number')} value={value} onChangeText={onChange} placeholder={t('Unit par likha number')} icon={Barcode} ltr autoCapitalize="characters"
            hint={t('Hamari dukaan se bika ho to product, customer aur warranty khud aa jati hai')} returnKeyType="search" onSubmitEditing={() => setCode(value.trim())} />
        </View>
        <IconButton icon={ScanLine} label={t('Scan')} onPress={() => setScan(true)} />
        <Button variant="soft" loading={q.isFetching} disabled={value.trim().length < 3} onPress={() => setCode(value.trim())}>{t('Check')}</Button>
      </Row>
      {r && code ? (
        r.found && w ? (
          <Row gap={1.5} style={{ alignItems: 'flex-start', padding: th.space(2.5), borderRadius: th.radius('lg'), backgroundColor: w.isValid ? th.colors.success.soft : th.colors.warning.soft }}>
            {w.isValid ? <ShieldCheck size={16} color={th.colors.success.text} /> : <ShieldX size={16} color={th.colors.warning.text} />}
            <Text size="xs" style={{ flex: 1 }} color={w.isValid ? th.colors.success.text : th.colors.warning.text}>
              {`${r.serial?.product?.name ?? t('Unit')} — ${!w.isValid ? t('warranty khatam') : w.daysRemaining > 0 && w.endDate ? t('company warranty {{endDate}} tak', { endDate: dayOnly(w.endDate) }) : t('warranty chal rahi hai')}`}
              {w.shopValid && w.shopEndDate ? t(' · dukaan warranty {{shopEndDate}} tak (kharcha dukaan ka)', { shopEndDate: dayOnly(w.shopEndDate) }) : ''}
              {w.compressorValid && w.compressorEndDate ? t(' · compressor {{compressorEndDate}} tak', { compressorEndDate: dayOnly(w.compressorEndDate) }) : ''}
              {r.amc ? t(' · AMC {{contractNumber}} ({{visitsLeft}} visit baqi)', { contractNumber: r.amc.contractNumber, visitsLeft: r.amc.visitsLeft }) : ''}
            </Text>
          </Row>
        ) : <Text size="xs" tone="muted">{t('Ye serial register me nahi — product ka naam khud likhein.')}</Text>
      ) : null}
      {scan && <CameraScan title={t('Serial scan karein')} onClose={() => setScan(false)} onCode={(c) => { onChange(c); setCode(c); }} />}
    </View>
  );
}

/** Appliance details (type, size, warranty, fitting) for every product, keyed by product id. */
export function useApplianceProfiles() {
  const { data } = useQuery({ queryKey: [KEYS.profile, 'all'], queryFn: () => applianceProductsApi.list(), staleTime: 5 * 60_000 });
  return useMemo(() => new Map<string, ApplianceProfile>((data ?? []).map((p) => [p.productId, p])), [data]);
}

/** Section label above grouped fields. */
export const Label = ({ children }: { children: string }) => <Text size="sm" weight="semibold" tone="secondary">{children}</Text>;

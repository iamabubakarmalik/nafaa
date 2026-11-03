/**
 * Floor setup (web TableForms): add or edit a table — number, seats,
 * section, name and flags — and reserve a table for a guest at a time.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Chip, DatePicker, Input, Row, Sheet, Text, useTheme } from '@/design';
import type { RestaurantTable, TableInput } from '../api';

// Section names are saved on tables and merged with existing ones, so they stay untranslated.
const SECTION_IDEAS = ['Hall', 'Family', 'Rooftop', 'Lawn', 'VIP'];

export function TableFormSheet({ open, table, sections, saving, onSave, onClose, onRemove }: {
  open: boolean; table: RestaurantTable | null; sections: string[]; saving?: boolean;
  onSave: (d: TableInput) => void; onClose: () => void; onRemove?: () => void;
}) {
  const th = useTheme();
  const init = () => ({
    tableNumber: table?.tableNumber ?? '', tableName: table?.tableName ?? '', section: table?.section ?? sections[0] ?? 'Hall',
    capacity: String(table?.capacity ?? 4), isFamilyArea: table?.isFamilyArea ?? false, isAcRoom: table?.isAcRoom ?? false,
    isVip: table?.isVip ?? false, isReservable: table?.isReservable ?? true, notes: table?.notes ?? '',
  });
  const [f, setF] = useState(init);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (open) { setF(init()); setTried(false); } }, [open, table]); // eslint-disable-line react-hooks/exhaustive-deps
  const cap = Number(f.capacity) || 0;
  const errors = {
    tableNumber: !f.tableNumber.trim() ? t('Table number likhein (jaise T1 ya 12)') : f.tableNumber.trim().length > 20 ? t('20 harf se zyada nahi') : '',
    capacity: !(cap >= 1 && cap <= 100) ? t('Kursiyan 1 se 100 tak') : '',
  };
  const ok = !errors.tableNumber && !errors.capacity;
  const submit = () => {
    setTried(true);
    if (!ok) return;
    onSave({
      tableNumber: f.tableNumber.trim(), tableName: f.tableName.trim() || undefined, section: f.section.trim() || 'Hall', capacity: cap,
      isFamilyArea: f.isFamilyArea, isAcRoom: f.isAcRoom, isVip: f.isVip, isReservable: f.isReservable, notes: f.notes.trim() || undefined,
    });
  };
  const all = [...new Set([...sections, ...SECTION_IDEAS])];
  const flag = (k: 'isFamilyArea' | 'isAcRoom' | 'isVip' | 'isReservable', label: string) => (
    <Chip label={label} selected={f[k]} onPress={() => setF((x) => ({ ...x, [k]: !x[k] }))} />
  );
  return (
    <Sheet open={open} onClose={onClose} height={0.85}
      title={table ? t('Table {{tableNumber}} badlein', { tableNumber: table.tableNumber }) : t('Nayi table')}
      description={t('Number wohi likhein jo table par likha hai — waiter isi se pehchanta hai')}
      footer={<Row gap={2}>
        {onRemove && <Button variant="ghost" onPress={onRemove}>{t('Hatayein')}</Button>}
        <Button size="lg" style={{ flex: 1 }} loading={saving} onPress={submit}>{t('Save karein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={2} align="start">
          <Input containerStyle={{ flex: 1 }} label={t('Table number')} value={f.tableNumber} onChangeText={(v) => setF({ ...f, tableNumber: v })} placeholder={t('T1')} error={tried && errors.tableNumber} autoFocus={!table} />
          <Input containerStyle={{ flex: 1 }} label={t('Kursiyan')} value={f.capacity} onChangeText={(v) => setF({ ...f, capacity: v.replace(/\D/g, '') })} keyboardType="number-pad" ltr error={tried && errors.capacity} />
        </Row>
        <Text size="sm" weight="medium">{t('Section')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
          {all.map((s) => <Chip key={s} label={s} selected={f.section === s} onPress={() => setF({ ...f, section: s })} />)}
        </View>
        <Input value={f.section} onChangeText={(v) => setF({ ...f, section: v.slice(0, 40) })} placeholder={t('Ya apna naam likhein')} hint={t('Floor par tables isi section ke hisaab se alag dikhti hain')} />
        <Input label={t('Naam (marzi)')} value={f.tableName} onChangeText={(v) => setF({ ...f, tableName: v.slice(0, 60) })} placeholder={t('Jaise: Khirki wali')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
          {flag('isFamilyArea', t('Family'))}{flag('isAcRoom', 'AC')}{flag('isVip', 'VIP')}{flag('isReservable', t('Reserve ho sakti hai'))}
        </View>
      </View>
    </Sheet>
  );
}

export interface ReserveDraft { reservedByName: string; reservedByPhone?: string; reservedFor: string; numberOfGuests?: number; reservationNote?: string }

export function ReserveSheet({ table, saving, onSave, onClose }: { table: RestaurantTable | null; saving?: boolean; onSave: (d: ReserveDraft) => void; onClose: () => void }) {
  const th = useTheme();
  const soon = () => { const d = new Date(Date.now() + 60 * 60_000); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); return d; };
  const [f, setF] = useState({ name: '', phone: '', at: soon(), guests: '2', note: '' });
  const [tried, setTried] = useState(false);
  useEffect(() => { if (table) { setF({ name: '', phone: '', at: soon(), guests: String(Math.min(table.capacity || 2, 4)), note: '' }); setTried(false); } }, [table]);
  const errors = {
    name: f.name.trim().length < 2 ? t('Mehman ka naam likhein') : '',
    phone: f.phone && f.phone.replace(/\D/g, '').length < 10 ? t('Phone poora likhein') : '',
    at: f.at.getTime() < Date.now() - 15 * 60_000 ? t('Aage ka waqt chunein') : '',
  };
  const ok = !errors.name && !errors.phone && !errors.at;
  const setDay = (d: Date) => { const x = new Date(f.at); x.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setF({ ...f, at: x }); };
  const setTime = (d: Date) => { const x = new Date(f.at); x.setHours(d.getHours(), d.getMinutes(), 0, 0); setF({ ...f, at: x }); };
  return (
    <Sheet open={!!table} onClose={onClose} title={table ? t('Table {{tableNumber}} reserve', { tableNumber: table.tableNumber }) : undefined}
      footer={<Button size="lg" fullWidth loading={saving} onPress={() => {
        setTried(true);
        if (ok) onSave({ reservedByName: f.name.trim(), reservedByPhone: f.phone.trim() || undefined, reservedFor: f.at.toISOString(), numberOfGuests: Number(f.guests) || undefined, reservationNote: f.note.trim() || undefined });
      }}>{t('Reserve karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Mehman ka naam')} value={f.name} onChangeText={(v) => setF({ ...f, name: v.slice(0, 80) })} error={tried && errors.name} />
        <Input label={t('Phone')} value={f.phone} onChangeText={(v) => setF({ ...f, phone: v.replace(/[^\d+\s-]/g, '') })} keyboardType="phone-pad" ltr error={tried && errors.phone} />
        <Row gap={2} align="start">
          <View style={{ flex: 1 }}><DatePicker label={t('Din')} value={f.at} onChange={setDay} minimumDate={new Date()} /></View>
          <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Waqt')} value={f.at} onChange={setTime} error={tried && errors.at} /></View>
        </Row>
        <Input label={t('Mehman')} value={f.guests} onChangeText={(v) => setF({ ...f, guests: v.replace(/\D/g, '') })} keyboardType="number-pad" ltr />
        <Input label={t('Note')} value={f.note} onChangeText={(v) => setF({ ...f, note: v.slice(0, 200) })} />
      </View>
    </Sheet>
  );
}

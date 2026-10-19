/**
 * Floor setup: add or edit a table (number, section, seats, family / AC /
 * VIP), and reserve a table for a guest at a given time.
 */

import { useState } from 'react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { RestaurantTable } from '../api/tables.api';

export const SECTION_IDEAS = ['Hall', 'Family', 'Rooftop', 'Lawn', 'VIP'];

export interface TableDraft {
  tableNumber: string; tableName: string; section: string; capacity: number;
  isFamilyArea: boolean; isAcRoom: boolean; isVip: boolean; isReservable: boolean; notes: string;
}

export function TableFormModal({ table, sections, saving, onSave, onClose }: {
  table?: RestaurantTable | null; sections: string[]; saving?: boolean;
  onSave: (d: TableDraft) => void; onClose: () => void;
}) {
  const [f, setF] = useState<TableDraft>({
    tableNumber: table?.tableNumber ?? '', tableName: table?.tableName ?? '', section: table?.section ?? sections[0] ?? 'Hall',
    capacity: table?.capacity ?? 4, isFamilyArea: table?.isFamilyArea ?? false, isAcRoom: table?.isAcRoom ?? false,
    isVip: table?.isVip ?? false, isReservable: table?.isReservable ?? true, notes: table?.notes ?? '',
  });
  const [tried, setTried] = useState(false);
  const errors = {
    tableNumber: !f.tableNumber.trim() ? 'Table number likhein (jaise T1 ya 12)' : f.tableNumber.trim().length > 20 ? '20 harf se zyada nahi' : '',
    capacity: !(f.capacity >= 1 && f.capacity <= 100) ? 'Kursiyan 1 se 100 tak' : '',
  };
  const ok = !errors.tableNumber && !errors.capacity;
  const submit = () => { setTried(true); if (ok) onSave({ ...f, tableNumber: f.tableNumber.trim(), section: f.section.trim() || 'Hall' }); };
  const allSections = [...new Set([...sections, ...SECTION_IDEAS])];
  const flag = (k: 'isFamilyArea' | 'isAcRoom' | 'isVip' | 'isReservable', label: string) => (
    <button type="button" onClick={() => setF((x) => ({ ...x, [k]: !x[k] }))} aria-pressed={f[k]}
      className={cn('rounded-xl px-3 py-2 text-[0.8125rem] font-semibold ring-1 transition', f[k] ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{label}</button>
  );
  return (
    <Modal open onClose={onClose} size="md" title={table ? `Table ${table.tableNumber} badlein` : 'Nayi table'}
      description="Number wohi likhein jo table par likha hai — waiter isi se pehchanta hai"
      footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={saving} onClick={submit}>Save karein</Button></div>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[0.8125rem] font-medium text-slate-700">Table number <span className="text-rose-500">*</span>
            <input data-autofocus value={f.tableNumber} onChange={(e) => setF({ ...f, tableNumber: e.target.value })} placeholder="T1"
              className={cn('mt-1 h-10 w-full rounded-xl border px-3 text-[0.875rem] font-normal outline-none focus:ring-2', tried && errors.tableNumber ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20')} />
            {tried && errors.tableNumber && <span className="mt-1 block text-[0.75rem] text-rose-600">{errors.tableNumber}</span>}
          </label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Kursiyan <span className="text-rose-500">*</span>
            <input value={f.capacity || ''} onChange={(e) => setF({ ...f, capacity: Number(e.target.value.replace(/\D/g, '')) || 0 })} inputMode="numeric"
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] font-normal tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            {tried && errors.capacity && <span className="mt-1 block text-[0.75rem] text-rose-600">{errors.capacity}</span>}
          </label>
        </div>
        <div>
          <p className="text-[0.8125rem] font-medium text-slate-700">Section</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {allSections.map((s) => (
              <button key={s} type="button" onClick={() => setF({ ...f, section: s })}
                className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-semibold', f.section === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{s}</button>
            ))}
          </div>
          <input value={f.section} onChange={(e) => setF({ ...f, section: e.target.value.slice(0, 40) })} placeholder="Ya apna naam likhein"
            className="mt-2 h-9 w-full rounded-xl border border-slate-300 px-3 text-[0.8125rem] outline-none focus:border-brand-500" />
          <p className="mt-1 text-[0.75rem] text-slate-500">Floor par tables isi section ke hisaab se alag dikhti hain</p>
        </div>
        <label className="block text-[0.8125rem] font-medium text-slate-700">Naam (marzi)
          <input value={f.tableName} onChange={(e) => setF({ ...f, tableName: e.target.value.slice(0, 60) })} placeholder="Jaise: Khirki wali"
            className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] font-normal outline-none focus:border-brand-500" />
        </label>
        <div className="flex flex-wrap gap-2">
          {flag('isFamilyArea', 'Family')}{flag('isAcRoom', 'AC')}{flag('isVip', 'VIP')}{flag('isReservable', 'Reserve ho sakti hai')}
        </div>
        <p className="text-[0.75rem] text-slate-400">Ctrl+S se save</p>
      </form>
    </Modal>
  );
}

export interface ReserveDraft { reservedByName: string; reservedByPhone?: string; reservedFor: string; numberOfGuests?: number; reservationNote?: string }

const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function ReserveModal({ table, saving, onSave, onClose }: {
  table: RestaurantTable; saving?: boolean; onSave: (d: ReserveDraft) => void; onClose: () => void;
}) {
  const soon = new Date(Date.now() + 60 * 60_000);
  soon.setMinutes(soon.getMinutes() < 30 ? 30 : 60, 0, 0);
  const [f, setF] = useState({ name: '', phone: '', at: localInput(soon), guests: String(Math.min(table.capacity || 2, 4)), note: '' });
  const [tried, setTried] = useState(false);
  const when = new Date(f.at);
  const errors = {
    name: f.name.trim().length < 2 ? 'Mehman ka naam likhein' : '',
    phone: f.phone && f.phone.replace(/\D/g, '').length < 10 ? 'Phone poora likhein' : '',
    at: Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 15 * 60_000 ? 'Aage ka waqt chunein' : '',
  };
  const ok = !errors.name && !errors.phone && !errors.at;
  const submit = () => {
    setTried(true);
    if (!ok) return;
    onSave({ reservedByName: f.name.trim(), reservedByPhone: f.phone.trim() || undefined, reservedFor: when.toISOString(), numberOfGuests: Number(f.guests) || undefined, reservationNote: f.note.trim() || undefined });
  };
  const field = 'mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] font-normal outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
  return (
    <Modal open onClose={onClose} size="md" title={`Table ${table.tableNumber} reserve`} description="Reserved table floor par peeli dikhti hai; mehman aane par seedha order lein"
      footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={saving} onClick={submit}>Reserve karein</Button></div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[0.8125rem] font-medium text-slate-700">Mehman ka naam <span className="text-rose-500">*</span>
          <input data-autofocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value.slice(0, 80) })} className={field} />
          {tried && errors.name && <span className="mt-1 block text-[0.75rem] text-rose-600">{errors.name}</span>}
        </label>
        <label className="text-[0.8125rem] font-medium text-slate-700">Phone
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 20) })} inputMode="tel" placeholder="03xx…" className={field} />
          {tried && errors.phone && <span className="mt-1 block text-[0.75rem] text-rose-600">{errors.phone}</span>}
        </label>
        <label className="text-[0.8125rem] font-medium text-slate-700">Kab <span className="text-rose-500">*</span>
          <input type="datetime-local" value={f.at} onChange={(e) => setF({ ...f, at: e.target.value })} className={field} />
          {tried && errors.at && <span className="mt-1 block text-[0.75rem] text-rose-600">{errors.at}</span>}
        </label>
        <label className="text-[0.8125rem] font-medium text-slate-700">Kitne log
          <input value={f.guests} onChange={(e) => setF({ ...f, guests: e.target.value.replace(/\D/g, '').slice(0, 3) })} inputMode="numeric" className={field} />
        </label>
        <label className="text-[0.8125rem] font-medium text-slate-700 sm:col-span-2">Note
          <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value.slice(0, 200) })} placeholder="Jaise: birthday, cake saath" className={field} />
        </label>
      </div>
    </Modal>
  );
}

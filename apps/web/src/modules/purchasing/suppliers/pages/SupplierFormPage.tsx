/**
 * Add or edit a supplier: name and contact, address, tax numbers, bank
 * details and payment terms. A new supplier can start with the balance owed
 * from before. Warns when the name or phone is already used.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, BookOpen, Building2, Landmark, Save, User } from 'lucide-react';
import { Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { suppliersApi, type UpsertSupplierPayload } from '../api/suppliers.api';
import { supplierLedgerApi } from '../api/supplier-ledger.api';

const EMPTY: UpsertSupplierPayload = {
  name: '', contactPerson: '', phone: '', altPhone: '', email: '', cnic: '', ntn: '', address: '', city: '', area: '',
  bankName: '', accountNumber: '', iban: '', paymentTerms: '', notes: '', isActive: true,
};
const TERMS = ['Cash on delivery', '7 din', '15 din', '30 din', 'Har hafte', 'Mahine ke aakhir'];
const input = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

/** 03001234567 → 0300-1234567 */
const phoneFmt = (raw: string) => {
  const d = raw.replace(/[^\d+]/g, '');
  return /^03\d{9}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4)}` : raw;
};

export default function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const editing = !!id;
  const [f, setF] = useState<UpsertSupplierPayload>(EMPTY);
  const [opening, setOpening] = useState('');
  const set = (k: keyof UpsertSupplierPayload, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  const existing = useQuery({ queryKey: ['supplier', id], queryFn: () => suppliersApi.getOne(id!), enabled: editing });
  useEffect(() => {
    const s = existing.data;
    if (s) setF(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, (s as any)[k] ?? (k === 'isActive' ? true : '')])) as unknown as UpsertSupplierPayload);
  }, [existing.data]);

  const all = useQuery({ queryKey: ['suppliers', 'picker'], queryFn: () => suppliersApi.list({ status: 'all', limit: 500 }), staleTime: 60_000 });
  const clash = useMemo(() => {
    const name = f.name.trim().toLowerCase();
    const phone = (f.phone ?? '').replace(/\D/g, '');
    return (all.data?.items ?? []).find((s) => s.id !== id && ((name && s.name.trim().toLowerCase() === name) || (phone.length >= 10 && (s.phone ?? '').replace(/\D/g, '') === phone)));
  }, [f.name, f.phone, all.data, id]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || undefined : v])) as UpsertSupplierPayload;
      payload.name = f.name.trim();
      const saved = editing ? await suppliersApi.update(id!, payload) : await suppliersApi.create(payload);
      if (!editing && Number(opening) > 0) {
        await supplierLedgerApi.setOpeningBalance(saved.id, { amount: Number(opening), note: 'Purana hisab — khata shuru hone se pehle ka baqi' });
      }
      return saved;
    },
    onSuccess: (s) => {
      toast.success(editing ? 'Save ho gaya' : `${s.name} jor diya`);
      ['suppliers', 'supplier'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate(`/suppliers/${s.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  if (editing && existing.isLoading) return <div className="flex justify-center py-24"><div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>;

  return (
    <form className="mx-auto max-w-4xl space-y-4 pb-24" onSubmit={(e) => { e.preventDefault(); if (f.name.trim()) save.mutate(); }}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="text-lg font-semibold text-slate-900">{editing ? `${existing.data?.name ?? 'Supplier'} — badlein` : 'Naya supplier'}</h1>
      </div>

      {clash && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100">
          <AlertTriangle className="h-4 w-4 shrink-0" /> "{clash.name}" pehle se hai{clash.phone ? ` (${clash.phone})` : ''} — kahin dobara to nahi bana rahe?
        </p>
      )}

      <Section icon={<User className="h-4 w-4" />} title="Supplier">
        <Field label="Naam *" span><input autoFocus required value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={120} placeholder="Misaal: Al-Madina Traders" className={input} /></Field>
        <Field label="Rabte wala banda"><input value={f.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} className={input} /></Field>
        <Field label="Phone"><input inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} onBlur={(e) => set('phone', phoneFmt(e.target.value))} placeholder="0300-1234567" className={input} /></Field>
        <Field label="Doosra phone"><input inputMode="tel" value={f.altPhone} onChange={(e) => set('altPhone', e.target.value)} onBlur={(e) => set('altPhone', phoneFmt(e.target.value))} className={input} /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={input} /></Field>
      </Section>

      <Section icon={<Building2 className="h-4 w-4" />} title="Pata aur tax">
        <Field label="Pata" span><input value={f.address} onChange={(e) => set('address', e.target.value)} className={input} /></Field>
        <Field label="Shehar"><input value={f.city} onChange={(e) => set('city', e.target.value)} className={input} /></Field>
        <Field label="Ilaqa"><input value={f.area} onChange={(e) => set('area', e.target.value)} className={input} /></Field>
        <Field label="CNIC"><input value={f.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder="35202-1234567-1" className={input} /></Field>
        <Field label="NTN"><input value={f.ntn} onChange={(e) => set('ntn', e.target.value)} className={input} /></Field>
      </Section>

      <Section icon={<Landmark className="h-4 w-4" />} title="Bank aur adaigi">
        <Field label="Bank"><input value={f.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="Meezan, HBL…" className={input} /></Field>
        <Field label="Account #"><input value={f.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} className={cn(input, 'font-mono')} /></Field>
        <Field label="IBAN" span><input value={f.iban} onChange={(e) => set('iban', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="PK36MEZN…" className={cn(input, 'font-mono')} /></Field>
        <Field label="Adaigi ki shart" span>
          <input value={f.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} className={input} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {TERMS.map((t) => <button key={t} type="button" onClick={() => set('paymentTerms', t)} className={cn('rounded-full px-2.5 py-0.5 text-[0.75rem] ring-1', f.paymentTerms === t ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-600 ring-slate-200')}>{t}</button>)}
          </div>
        </Field>
      </Section>

      {!editing && (
        <Section icon={<BookOpen className="h-4 w-4" />} title="Purana hisaab">
          <Field label="Is supplier ko pehle se kitna dena hai" hint="Khata shuru hone se pehle ka baqi; nahi to khali chhor dein" span>
            <input type="number" min={0} inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" className={cn(input, 'text-right tabular-nums')} />
          </Field>
        </Section>
      )}

      <Section title="Aur">
        <Field label="Note" span><textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={f.isActive !== false} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 accent-brand-600" /> Chalu supplier (band ho to kharidari me nahi dikhta)
        </label>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
          <Button type="submit" loading={save.isPending} disabled={!f.name.trim()} leftIcon={<Save className="h-4 w-4" />}>{editing ? 'Save karein' : 'Supplier jorein'}</Button>
        </div>
      </div>
    </form>
  );
}

function Section({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">{icon}{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, hint, span, children }: { label: string; hint?: string; span?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn('block text-[0.8125rem] font-medium text-slate-700', span && 'sm:col-span-2')}>
      {label}<div className="mt-1">{children}</div>{hint && <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

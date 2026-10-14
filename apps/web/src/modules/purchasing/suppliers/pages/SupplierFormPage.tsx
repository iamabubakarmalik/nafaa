/**
 * Add or edit a supplier: name and contact, address, tax numbers, bank
 * details and payment terms. A new supplier can start with the balance owed
 * from before. Warns when the name or phone is already used.
 *
 * Keys: Ctrl+S or Ctrl+Enter save · Esc back · G guide.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, BookOpen, Building2, GraduationCap, Landmark, Mail, Phone, Save, Truck, UserRound } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Button, Card, Input, Kbd, PageShell, Skeleton, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { suppliersApi, type UpsertSupplierPayload } from '../api/suppliers.api';
import { supplierLedgerApi } from '../api/supplier-ledger.api';

type Form = Required<Omit<UpsertSupplierPayload, 'isActive'>> & { isActive: boolean };
type TextKey = Exclude<keyof Form, 'isActive'>;

const EMPTY: Form = {
  name: '', contactPerson: '', phone: '', altPhone: '', email: '', cnic: '', ntn: '', address: '', city: '', area: '',
  logoUrl: '', bankName: '', accountNumber: '', iban: '', paymentTerms: '', notes: '', isActive: true,
};
const TEXT_KEYS = Object.keys(EMPTY).filter((k) => k !== 'isActive') as TextKey[];
const TERMS = ['Cash on delivery', '7 din', '15 din', '30 din', 'Har hafte', 'Mahine ke aakhir'];

/** 03001234567 → 0300-1234567 */
const phoneFmt = (raw: string) => {
  const d = raw.replace(/[^\d+]/g, '').replace(/^\+?92/, '0');
  return /^03\d{9}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4)}` : raw;
};
const digits = (v: string | null | undefined) => String(v ?? '').replace(/\D/g, '').replace(/^92/, '0');
/** Mobile (03…) or landline with area code, 10–11 digits. */
const phoneOk = (v: string) => /^0\d{9,10}$/.test(digits(v));

export default function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const editing = !!id;
  const lock = useRef(false);
  const [f, setF] = useState<Form>(EMPTY);
  const [baseline, setBaseline] = useState(JSON.stringify(EMPTY));
  const [opening, setOpening] = useState('');
  const [tried, setTried] = useState(false);
  const [blurred, setBlurred] = useState<Partial<Record<keyof Form | 'opening', boolean>>>({});
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const blur = (k: keyof Form | 'opening') => () => setBlurred((b) => (b[k] ? b : { ...b, [k]: true }));

  const existing = useQuery({ queryKey: ['supplier', id], queryFn: () => suppliersApi.getOne(id!), enabled: editing });
  useEffect(() => {
    const s = existing.data;
    if (!s) return;
    const next = { ...EMPTY, isActive: s.isActive !== false };
    TEXT_KEYS.forEach((k) => { next[k] = (s[k] as string | null | undefined) ?? ''; });
    setF(next);
    setBaseline(JSON.stringify(next));
  }, [existing.data]);

  const dirty = JSON.stringify(f) !== baseline || !!opening;
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const all = useQuery({ queryKey: ['suppliers', 'picker'], queryFn: () => suppliersApi.list({ status: 'all', limit: 500 }), staleTime: 60_000 });
  const clash = useMemo(() => {
    const name = f.name.trim().toLowerCase();
    const phones = [digits(f.phone), digits(f.altPhone)].filter((p) => p.length >= 10);
    const list = (all.data?.items ?? []).filter((s) => s.id !== id);
    return {
      name: name ? list.find((s) => s.name.trim().toLowerCase() === name) ?? null : null,
      phone: phones.length ? list.find((s) => [digits(s.phone), digits(s.altPhone)].some((p) => p && phones.includes(p))) ?? null : null,
    };
  }, [f.name, f.phone, f.altPhone, all.data, id]);

  // Format checks run only on values typed here, so an old record saved in another format can still be edited.
  const errors = useMemo(() => {
    const old = JSON.parse(baseline) as Form;
    const typed = (k: TextKey) => !!f[k].trim() && f[k] !== old[k];
    const e: Partial<Record<keyof Form | 'opening', string>> = {};
    if (!f.name.trim()) e.name = 'Supplier ka naam likhein';
    if (typed('phone') && !phoneOk(f.phone)) e.phone = 'Number theek nahi — misaal: 0300-1234567 ya 042-35761234';
    if (typed('altPhone') && !phoneOk(f.altPhone)) e.altPhone = 'Number theek nahi';
    if (typed('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Email theek nahi — misaal: orders@company.pk';
    if (typed('cnic') && f.cnic.replace(/\D/g, '').length !== 13) e.cnic = 'CNIC 13 hindsay ka hota hai';
    if (typed('iban') && !/^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(f.iban.trim())) e.iban = 'IBAN PK se shuru, 24 harf (misaal: PK36MEZN0000…)';
    if (opening.trim() && !(Number(opening) >= 0)) e.opening = 'Sirf number likhein';
    return e;
  }, [f, opening, baseline]);
  const err = (k: keyof Form | 'opening') => ((tried || blurred[k]) ? errors[k] : undefined);
  const problems = Object.values(errors);

  const save = useMutation({
    mutationFn: async () => {
      // On edit an emptied field is sent as null so it clears; on create it is left out.
      const body: Record<string, unknown> = { name: f.name.trim(), isActive: f.isActive };
      TEXT_KEYS.filter((k) => k !== 'name').forEach((k) => {
        const v = f[k].trim();
        if (v) body[k] = v;
        else if (editing) body[k] = null;
      });
      const payload = body as unknown as UpsertSupplierPayload;
      const saved = editing ? await suppliersApi.update(id!, payload) : await suppliersApi.create(payload);
      let openingFailed = false;
      if (!editing && Number(opening) > 0) {
        try {
          await supplierLedgerApi.setOpeningBalance(saved.id, { amount: Number(opening), note: 'Purana hisaab — khata shuru hone se pehle ka baqi' });
        } catch { openingFailed = true; }
      }
      return { saved, openingFailed };
    },
    onSuccess: ({ saved, openingFailed }) => {
      setBaseline(JSON.stringify(f));
      setOpening('');
      toast.success(editing ? 'Save ho gaya' : `${saved.name} jur gaya`);
      if (openingFailed) toast.error('Purana hisaab save nahi hua — supplier ke khata se dobara daalein');
      ['suppliers', 'supplier', 'supplier-ledger'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate(`/suppliers/${saved.id}`, { replace: true });
    },
    onError: (e: any) => {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'Save nahi hua — dobara koshish karein');
    },
    onSettled: () => { lock.current = false; },
  });

  const submit = useCallback(() => {
    if (lock.current || save.isPending) return;
    setTried(true);
    if (problems.length) { toast.error(problems[0]); return; }
    lock.current = true;
    save.mutate();
  }, [problems, save]);

  const goBack = useCallback(() => {
    if (dirty && !window.confirm('Tabdeeli save nahi hui — phir bhi wapas jayein?')) return;
    navigate(editing ? `/suppliers/${id}` : '/suppliers');
  }, [dirty, navigate, editing, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault();
        if (!isDialogOpen()) submit();
      } else if (e.key === 'Escape' && !isDialogOpen()) {
        goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, goBack]);

  if (editing && existing.isLoading) {
    return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  }
  if (editing && !existing.data) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Yeh supplier nahi mila</p>
          <Button className="mt-3" variant="secondary" onClick={() => navigate('/suppliers')}>Suppliers par wapas</Button>
        </div>
      </PageShell>
    );
  }

  const openingAmount = Number(opening) || 0;

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={goBack} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${existing.data?.name ?? 'Supplier'} — badlein` : 'Naya supplier'}</h1>
          <p className="text-[0.8125rem] text-white/75">{editing ? 'Jo badalna hai badlein — baqi waisa hi rahega' : 'Sirf naam zaroori hai. Phone ho to WhatsApp par order aur hisaab bhej sakenge.'}</p>
        </div>
        {dirty && <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[0.75rem] font-semibold text-amber-100 ring-1 ring-amber-300/40">Save nahi hua</span>}
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
        <button type="button" onClick={guide.open} title="Guide (G)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
      </div>

      {guide.isOpen && (
        <PageGuide title="Supplier kaise jorein" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#16a34a', title: 'Naam aur phone', text: 'Sirf naam zaroori hai. Phone daal dein to WhatsApp par order aur hisaab bhej sakenge.' },
            { icon: Landmark, color: '#2563eb', title: 'Bank', text: 'Bank aur IBAN likh dein — payment karte waqt yahin se nikal lein.' },
            { icon: BookOpen, color: '#d97706', title: 'Purana hisaab', text: 'Nafaa se pehle ka baqi ho to "Purana hisaab" me likhein — khata wahin se shuru hoga.' },
            { icon: Building2, color: '#7c3aed', title: 'Band karna', text: 'Jis se ab maal nahi lete use mitane ki bajaye "Chalu supplier" band kar dein — purana hisaab mehfooz rehta hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}

      {(clash.name || clash.phone) && (
        <div className="space-y-1 rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          {clash.name && (
            <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Is naam ka supplier pehle se hai: <Link to={`/suppliers/${clash.name.id}`} className="font-semibold underline">{clash.name.name}</Link>{clash.name.phone ? ` (${clash.name.phone})` : ''}{!clash.name.isActive ? ' — band hai, wahi chalu kar lein' : ''}. Kahin dobara to nahi bana rahe?</span>
            </p>
          )}
          {clash.phone && clash.phone.id !== clash.name?.id && (
            <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Yeh phone pehle se <Link to={`/suppliers/${clash.phone.id}`} className="font-semibold underline">{clash.phone.name}</Link> ka hai. Ek hi company ho to wahi kholein — hisaab ek jagah rahega.</span>
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Truck}>Supplier</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input autoFocus={!editing} label="Naam" required value={f.name} onChange={(e) => set('name', e.target.value)} onBlur={blur('name')} maxLength={120}
                placeholder="Misaal: Al-Madina Traders" size="lg" error={err('name')} wrapperClassName="sm:col-span-2" hint="Dukaan / company ka naam jo parchi par likha hota hai" />
              <Input label="Rabte wala banda" value={f.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} maxLength={100}
                leftIcon={<UserRound className="h-4 w-4" />} hint="Jis se aap baat karte hain — salesman ya malik" />
              <Input label="Email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} onBlur={blur('email')}
                leftIcon={<Mail className="h-4 w-4" />} error={err('email')} hint="Marzi hai — purchase order email karne ke liye" />
              <Input label="Phone" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} onBlur={(e) => { set('phone', phoneFmt(e.target.value)); blur('phone')(); }}
                placeholder="0300-1234567" leftIcon={<Phone className="h-4 w-4" />} error={err('phone')} maxLength={20} hint="WhatsApp wala number behtar — order aur hisaab seedha bhej sakenge" />
              <Input label="Doosra phone" inputMode="tel" value={f.altPhone} onChange={(e) => set('altPhone', e.target.value)} onBlur={(e) => { set('altPhone', phoneFmt(e.target.value)); blur('altPhone')(); }}
                leftIcon={<Phone className="h-4 w-4" />} error={err('altPhone')} maxLength={20} hint="Office ya delivery wale ka number (marzi hai)" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Building2}>Pata aur tax</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Pata" value={f.address} onChange={(e) => set('address', e.target.value)} maxLength={255} wrapperClassName="sm:col-span-2" hint="Godown ya dukaan ka pata — maal lene jana ho to kaam aata hai" />
              <Input label="Shehar" value={f.city} onChange={(e) => set('city', e.target.value)} maxLength={80} hint="Suppliers ko shehar se chhantne ke liye" />
              <Input label="Ilaqa" value={f.area} onChange={(e) => set('area', e.target.value)} maxLength={80} hint="Misaal: Akbari Mandi, Shah Alam" />
              <Input label="CNIC" inputMode="numeric" value={f.cnic} onChange={(e) => set('cnic', e.target.value)} onBlur={blur('cnic')} maxLength={20}
                placeholder="35202-1234567-1" className="font-mono" error={err('cnic')} hint="Marzi hai — bare len-den ke liye" />
              <Input label="NTN" value={f.ntn} onChange={(e) => set('ntn', e.target.value)} maxLength={20} className="font-mono" hint="Tax wala supplier ho to — tax invoice ke liye" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Landmark}>Bank aur payment</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Bank" value={f.bankName} onChange={(e) => set('bankName', e.target.value)} maxLength={80} placeholder="Meezan, HBL…" hint="Jis bank me aap paisa bhejte hain" />
              <Input label="Account #" value={f.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} maxLength={40} className="font-mono" hint="Supplier ka account number" />
              <Input label="IBAN" value={f.iban} onChange={(e) => set('iban', e.target.value.toUpperCase().replace(/\s/g, ''))} onBlur={blur('iban')} maxLength={40}
                placeholder="PK36MEZN…" className="font-mono" error={err('iban')} wrapperClassName="sm:col-span-2" hint="PK se shuru hone wala 24 harf ka number — online transfer ke liye" />
              <div className="sm:col-span-2">
                <Input label="Payment ki shart" value={f.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} maxLength={60} hint="Kitne din me paisa dena hota hai — neeche se jaldi chunein" />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {TERMS.map((t) => (
                    <button key={t} type="button" onClick={() => set('paymentTerms', t)}
                      className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1', f.paymentTerms === t ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {!editing && (
            <Card className="rounded-2xl" title={<T icon={BookOpen}>Purana hisaab</T>} description="Sirf naya supplier banate waqt — baad me khata se daalein">
              <Input label="Is supplier ko pehle se kitna dena hai (Rs)" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value.replace(/[^\d.]/g, ''))}
                onBlur={blur('opening')} placeholder="0" className="text-right font-semibold tabular-nums" error={err('opening')}
                hint={openingAmount > 0 ? `Khata ${formatPKR(openingAmount)} baqi se shuru hoga` : 'Khata shuru hone se pehle ka baqi; nahi to khali chhor dein'} />
            </Card>
          )}

          <Card className="rounded-2xl" title="Aur">
            <div className="space-y-3">
              <Textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} maxLength={500} label="Note" hint="Kuch bhi yaad rakhna ho — misaal: har mangal ko maal deta hai" />
              <Switch checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} label="Chalu supplier" description="Band ho to purchase me nahi aata; purana hisaab mehfooz rehta hai" />
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (tried || f.name || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{dirty ? 'Tabdeeli save nahi hui — Ctrl+S dabayein' : editing ? 'Sab save hai' : 'Sirf naam zaroori hai — baqi baad me bhi bhar sakte hain'}</p>}
        <Button variant="secondary" onClick={goBack}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>{editing ? 'Save karein' : 'Supplier jorein'}</Button>
      </div>
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof UserRound; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;

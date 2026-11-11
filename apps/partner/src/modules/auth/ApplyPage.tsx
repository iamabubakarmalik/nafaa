/**
 * Partner application: a short "how it works" and the form. Amounts are not
 * shown here; each partner sees their own plan on the dashboard after approval.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote, ClipboardCheck, Eye, EyeOff, Send, Smartphone, Store, Wallet } from 'lucide-react';
import { Alert, Button, Input } from '@/design-system/components';
import { errorText } from '@/api/client';
import { partnerApi } from '@/api/partner.api';
import type { PartnerType, PayoutMethod } from '@/api/types';
import { useAuthStore } from '@/store/auth.store';
import { PARTNER_TYPE, PAYOUT_METHOD } from '@/lib/labels';
import { isMobile, normalizePhone } from '@/lib/phone';
import { ChoiceGrid } from '@/ui/ChoiceGrid';
import { AuthLayout } from './AuthLayout';

const STEPS = [
  { icon: ClipboardCheck, title: 'Application dein', text: 'Nafaa team 1–2 kaam ke din me check karke approve karti hai.' },
  { icon: Store, title: 'Dukaanon tak Nafaa pohanchayein', text: 'Apna link ya code dein, ya dukaan par ja kar demo dikhayein.' },
  { icon: Wallet, title: 'Commission payein', text: 'Dukaan ke paid Signup par Commission. Aap ka plan approval ke baad Dashboard par dikhega.' },
];

const SELF_TYPES: PartnerType[] = ['REFERRAL', 'FIELD_AGENT', 'RESELLER', 'TRAINER'];

type Form = {
  fullName: string; phone: string; email: string; password: string; cnic: string; city: string; type: PartnerType;
  payoutMethod: PayoutMethod | ''; payoutAccount: string; payoutTitle: string; bankName: string; managerCode: string;
};

const EMPTY: Form = {
  fullName: '', phone: '', email: '', password: '', cnic: '', city: '', type: 'REFERRAL',
  payoutMethod: '', payoutAccount: '', payoutTitle: '', bankName: '', managerCode: '',
};

/** "3520212345671" → "35202-1234567-1" while typing. */
const formatCnic = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 13);
  return d.length > 12 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

function validate(f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.fullName.trim().length < 3) e.fullName = 'Poora naam likhein';
  if (!isMobile(f.phone)) e.phone = 'Mobile number 03xx xxxxxxx shakal me likhein';
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Email durust nahi';
  if (f.password.length < 8) e.password = 'Kam az kam 8 huroof';
  const cnic = f.cnic.replace(/\D/g, '');
  if (cnic && cnic.length !== 13) e.cnic = 'CNIC 13 hindsay ka hota hai';
  if (!f.city.trim()) e.city = 'Shehar likhein';
  if (f.payoutMethod && !f.payoutAccount.trim()) e.payoutAccount = f.payoutMethod === 'BANK' ? 'Account number ya IBAN likhein' : 'Account number likhein';
  if (f.payoutMethod === 'BANK' && !f.bankName.trim()) e.bankName = 'Bank ka naam likhein';
  return e;
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3.5">
      <legend className="mb-1">
        <span className="block text-base font-bold text-slate-900">{title}</span>
        {hint && <span className="block text-[0.8125rem] text-slate-500">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

export default function ApplyPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: undefined })); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(f);
    setErrors(found);
    if (Object.keys(found).length) {
      setError('Laal wali jagah theek karein');
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await partnerApi.apply({
        fullName: f.fullName.trim(),
        phone: normalizePhone(f.phone),
        email: f.email.trim() || undefined,
        password: f.password,
        cnic: f.cnic.replace(/\D/g, '') || undefined,
        city: f.city.trim(),
        type: f.type,
        payoutMethod: f.payoutMethod || undefined,
        payoutAccount: f.payoutMethod ? f.payoutAccount.trim() : undefined,
        payoutTitle: f.payoutMethod ? f.payoutTitle.trim() || undefined : undefined,
        bankName: f.payoutMethod === 'BANK' ? f.bankName.trim() : undefined,
        managerCode: f.managerCode.trim().toUpperCase() || undefined,
      });
      qc.clear();
      setSession(res);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorText(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout wide>
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-7">
        <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-brand-700">Partner program</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Partner kaise kamate hain</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white"><s.icon className="h-4 w-4" /></span>
                <span className="text-[0.75rem] font-bold text-slate-400">{i + 1}</span>
              </div>
              <p className="mt-2 font-semibold text-slate-900">{s.title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-slate-500">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <form onSubmit={submit} noValidate className="mt-4 space-y-7 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-7">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Application form</h2>
          <p className="mt-0.5 text-[0.9375rem] text-slate-500">Pehle se account hai? <Link to="/login" className="font-semibold text-brand-700">Sign in karein</Link></p>
        </div>
        {error && <Alert tone="danger">{error}</Alert>}

        <Group title="Aap ki maloomat">
          <Input label="Poora naam" size="lg" value={f.fullName} onChange={(e) => set('fullName', e.target.value)} error={errors.fullName} autoComplete="name" required />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input label="Mobile number" size="lg" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone}
              placeholder="03xx xxxxxxx" inputMode="tel" autoComplete="tel" leftIcon={<Smartphone className="h-4 w-4" />} required />
            <Input label="Email (zaroori nahi)" size="lg" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} error={errors.email} autoComplete="email" autoCapitalize="none" />
            <Input label="CNIC (zaroori nahi)" size="lg" value={f.cnic} onChange={(e) => set('cnic', formatCnic(e.target.value))} error={errors.cnic} placeholder="35202-1234567-1" inputMode="numeric" hint="Payout ke liye baad me zaroori hoga" />
            <Input label="Shehar" size="lg" value={f.city} onChange={(e) => set('city', e.target.value)} error={errors.city} placeholder="Lahore" autoComplete="address-level2" required />
          </div>
          <Input label="Password" size="lg" type={show ? 'text' : 'password'} value={f.password} onChange={(e) => set('password', e.target.value)} error={errors.password}
            autoComplete="new-password" hint="Kam az kam 8 huroof. Isi se sign in karenge."
            rightIcon={<button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Password chhupayein' : 'Password dikhayein'} className="text-slate-400 hover:text-slate-700">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />
        </Group>

        <Group title="Aap kaise kaam karenge?" hint="Jo aap ke kaam se sab se zyada milta ho">
          <ChoiceGrid label="Partner ki qisam" cols={2} value={f.type} onChange={(v) => set('type', v)}
            items={SELF_TYPES.map((t) => ({ value: t, label: PARTNER_TYPE[t].label, help: PARTNER_TYPE[t].help }))} />
        </Group>

        <Group title="Payment kahan chahiye?" hint="Abhi chhor sakte hain; payout se pehle Profile me likhna hoga">
          <ChoiceGrid label="Payout ka tareeqa" cols={3} compact value={f.payoutMethod} onChange={(v) => set('payoutMethod', f.payoutMethod === v ? '' : v)}
            items={(Object.keys(PAYOUT_METHOD) as PayoutMethod[]).map((m) => ({ value: m, label: m === 'BANK' ? 'Bank' : PAYOUT_METHOD[m], icon: m === 'BANK' ? <Banknote className="h-5 w-5 text-slate-500" /> : <Smartphone className="h-5 w-5 text-slate-500" /> }))} />
          {f.payoutMethod && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {f.payoutMethod === 'BANK' && <Input label="Bank ka naam" size="lg" value={f.bankName} onChange={(e) => set('bankName', e.target.value)} error={errors.bankName} placeholder="Meezan Bank" />}
              <Input label={f.payoutMethod === 'BANK' ? 'Account number ya IBAN' : `${PAYOUT_METHOD[f.payoutMethod]} number`} size="lg" value={f.payoutAccount}
                onChange={(e) => set('payoutAccount', e.target.value)} error={errors.payoutAccount} inputMode={f.payoutMethod === 'BANK' ? 'text' : 'tel'} placeholder={f.payoutMethod === 'BANK' ? 'PK00XXXX…' : '03xx xxxxxxx'} />
              <Input label="Account kis naam par hai" size="lg" value={f.payoutTitle} onChange={(e) => set('payoutTitle', e.target.value)} placeholder={f.fullName || 'Account title'} />
            </div>
          )}
        </Group>

        <Group title="Manager code (zaroori nahi)" hint="Agar kisi Nafaa area manager ne aap ko bheja hai to us ka code likhein">
          <Input size="lg" value={f.managerCode} onChange={(e) => set('managerCode', e.target.value.toUpperCase())} placeholder="NPXXXXXX" autoCapitalize="characters" />
        </Group>

        <Button type="submit" size="xl" fullWidth loading={busy} leftIcon={<Send className="h-5 w-5" />}>Application bhejein</Button>
      </form>
    </AuthLayout>
  );
}

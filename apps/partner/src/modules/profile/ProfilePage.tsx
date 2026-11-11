/**
 * The partner's own details: contact, payout account, password and log out.
 * Also open to partners under review, so they can fix their payout account.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, Copy, KeyRound, LogOut, Save, Smartphone } from 'lucide-react';
import { Badge, Button, Input, PageHero, PageShell } from '@/design-system/components';
import { errorText } from '@/api/client';
import { partnerApi } from '@/api/partner.api';
import type { PayoutMethod } from '@/api/types';
import { useAuthStore } from '@/store/auth.store';
import { PARTNER_TYPE, PAYOUT_METHOD } from '@/lib/labels';
import { day, pkr } from '@/lib/format';
import { prettyPhone } from '@/lib/phone';
import { copyText } from '@/lib/clipboard';
import { ChoiceGrid } from '@/ui/ChoiceGrid';
import { Section } from '@/ui/Section';
import { useLogout } from '@/modules/auth/useLogout';

const formatCnic = (v: string | null) => (v && v.length === 13 ? `${v.slice(0, 5)}-${v.slice(5, 12)}-${v.slice(12)}` : v ?? '—');

export default function ProfilePage() {
  const me = useAuthStore((s) => s.me)!;
  const qc = useQueryClient();
  const logout = useLogout();
  const { hash } = useLocation();

  const [contact, setContact] = useState({ email: me.email ?? '', city: me.city ?? '' });
  const [payout, setPayout] = useState({ payoutMethod: (me.payoutMethod ?? '') as PayoutMethod | '', payoutAccount: me.payoutAccount ?? '', payoutTitle: me.payoutTitle ?? '', bankName: me.bankName ?? '' });
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (hash === '#payout') setTimeout(() => document.getElementById('payout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [hash]);

  const save = useMutation({
    mutationFn: partnerApi.updateProfile,
    onSuccess: async () => {
      toast.success('Save ho gaya');
      await qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const changePw = useMutation({
    mutationFn: () => partnerApi.changePassword(pw.current, pw.next),
    onSuccess: () => { toast.success('Password badal gaya'); setPw({ current: '', next: '', again: '' }); },
    onError: (e) => setPwError(errorText(e)),
  });

  const submitPayout = (e: FormEvent) => {
    e.preventDefault();
    if (payout.payoutMethod && !payout.payoutAccount.trim()) { toast.error('Account number likhein'); return; }
    if (payout.payoutMethod === 'BANK' && !payout.bankName.trim()) { toast.error('Bank ka naam likhein'); return; }
    save.mutate({
      payoutMethod: payout.payoutMethod || null,
      payoutAccount: payout.payoutAccount.trim() || null,
      payoutTitle: payout.payoutTitle.trim() || null,
      bankName: payout.payoutMethod === 'BANK' ? payout.bankName.trim() || null : null,
    });
  };

  const submitPw = (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pw.next.length < 8) { setPwError('Naya password kam az kam 8 huroof ka ho'); return; }
    if (pw.next !== pw.again) { setPwError('Dono naye password ek jaise nahi'); return; }
    changePw.mutate();
  };

  const rows: Array<[string, string]> = [
    ['Mobile', prettyPhone(me.phone)],
    ['CNIC', formatCnic(me.cnic)],
    ['Qisam', `${PARTNER_TYPE[me.type]?.label ?? me.type}${me.isManager ? ' · Area manager' : ''}`],
    ...(me.territory ? [['Ilaqa', me.territory] as [string, string]] : []),
    ...(me.manager ? [['Manager', `${me.manager.fullName} · ${prettyPhone(me.manager.phone)}`] as [string, string]] : []),
    ...(me.type === 'EMPLOYEE' && me.salary ? [['Tankhwah', pkr(me.salary)] as [string, string]] : []),
    ['Partner bane', day(me.approvedAt ?? me.appliedAt)],
  ];

  return (
    <PageShell>
      <PageHero title={me.fullName} subtitle={PARTNER_TYPE[me.type]?.label}
        chip={<button type="button" className="inline-flex items-center gap-1 font-mono font-bold tracking-wider" onClick={async () => { if (await copyText(me.code)) toast.success('Code copy ho gaya'); }}>{me.code}<Copy className="h-3 w-3" /></button>} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Section title="Meri maloomat" action={<Badge variant={me.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">{me.status === 'ACTIVE' ? 'Active' : me.status === 'APPLIED' ? 'Review me' : 'Band'}</Badge>}>
            <dl className="divide-y divide-slate-100">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-[0.9375rem]">
                  <dt className="shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 truncate text-end font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ email: contact.email.trim() || null, city: contact.city.trim() || null }); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Email" type="email" size="lg" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} autoCapitalize="none" />
                <Input label="Shehar" size="lg" value={contact.city} onChange={(e) => setContact((c) => ({ ...c, city: e.target.value }))} />
              </div>
              <Button type="submit" variant="secondary" loading={save.isPending} disabled={contact.email === (me.email ?? '') && contact.city === (me.city ?? '')} leftIcon={<Save className="h-4 w-4" />}>Save</Button>
            </form>
            <p className="mt-3 text-[0.8125rem] text-slate-500">Naam, mobile ya CNIC badalna ho to Nafaa se rabta karein.</p>
          </Section>

          <Section title="Password badlein">
            <form className="space-y-3" onSubmit={submitPw}>
              <Input label="Purana password" type="password" size="lg" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Naya password" type="password" size="lg" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
                <Input label="Naya password dobara" type="password" size="lg" autoComplete="new-password" value={pw.again} onChange={(e) => setPw((p) => ({ ...p, again: e.target.value }))} />
              </div>
              {pwError && <p className="text-[0.875rem] font-medium text-rose-600">{pwError}</p>}
              <Button type="submit" variant="secondary" loading={changePw.isPending} disabled={!pw.current || !pw.next} leftIcon={<KeyRound className="h-4 w-4" />}>Password badlein</Button>
            </form>
          </Section>
        </div>

        <div className="space-y-4">
          <div id="payout" className="scroll-mt-20">
            <Section title="Payout account">
              <p className="-mt-1 mb-3 text-[0.875rem] text-slate-500">Commission isi account me bheja jayega.</p>
              <form className="space-y-3.5" onSubmit={submitPayout}>
                <ChoiceGrid<PayoutMethod> label="Payout ka tareeqa" cols={3} compact value={payout.payoutMethod} onChange={(v) => setPayout((p) => ({ ...p, payoutMethod: v }))}
                  items={(Object.keys(PAYOUT_METHOD) as PayoutMethod[]).map((m) => ({ value: m, label: m === 'BANK' ? 'Bank' : PAYOUT_METHOD[m], icon: m === 'BANK' ? <Banknote className="h-5 w-5 text-slate-500" /> : <Smartphone className="h-5 w-5 text-slate-500" /> }))} />
                {payout.payoutMethod && (
                  <>
                    {payout.payoutMethod === 'BANK' && <Input label="Bank ka naam" size="lg" value={payout.bankName} onChange={(e) => setPayout((p) => ({ ...p, bankName: e.target.value }))} placeholder="Meezan Bank" />}
                    <Input label={payout.payoutMethod === 'BANK' ? 'Account number ya IBAN' : `${PAYOUT_METHOD[payout.payoutMethod]} number`} size="lg" value={payout.payoutAccount}
                      onChange={(e) => setPayout((p) => ({ ...p, payoutAccount: e.target.value }))} inputMode={payout.payoutMethod === 'BANK' ? 'text' : 'tel'} />
                    <Input label="Account kis naam par hai" size="lg" value={payout.payoutTitle} onChange={(e) => setPayout((p) => ({ ...p, payoutTitle: e.target.value }))} placeholder={me.fullName} />
                  </>
                )}
                <Button type="submit" size="lg" loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>Payout account save karein</Button>
              </form>
            </Section>
          </div>

          <Button variant="critical" size="lg" fullWidth onClick={() => void logout()} leftIcon={<LogOut className="h-4 w-4" />}>Log out</Button>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * Actions on one person that need a confirm step: give an HR record a login,
 * set a new password, and mark someone as left / on leave / back at work
 * (with the choice to close or reopen their login too).
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Input, Modal, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import type { StaffStatus } from '@modules/organization/staff/api/staff.api';
import { peopleApi, type Profile } from '../api/people.api';
import { LoginFields, loginProblem, newLoginDraft, type LoginDraft } from './LoginFields';
import { LoginSlipModal } from './LoginSlipModal';
import { useRoleDefaults } from './PermissionPicker';
import { AFFECTED_KEYS, ROLES, apiError, makePassword } from './meta';
import { t } from '@core/i18n';

const refresh = (qc: ReturnType<typeof useQueryClient>) => AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

/** Login for a person who so far has only an HR record. */
export function GiveLoginModal({ p, onClose }: { p: Profile; onClose: () => void }) {
  const qc = useQueryClient();
  const defaults = useRoleDefaults();
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const [d, setD] = useState<LoginDraft>(() => ({ ...newLoginDraft(defaults, p.staff?.shopId ?? ''), email: p.staff?.email ?? '' }));
  const [done, setDone] = useState(false);
  const problem = loginProblem(d);
  const save = useMutation({
    mutationFn: () => peopleApi.invite({
      fullName: p.person.fullName, email: d.email.trim(), phone: p.person.phone && p.person.phone !== '—' ? p.person.phone : undefined,
      password: d.password, role: d.role, shopId: d.shopId || undefined, permissions: d.permissions, staffId: p.staff!.id, sendEmail: d.sendEmail,
    }),
    onSuccess: (r) => {
      refresh(qc);
      toast.success(t('Login ban gaya'));
      if (d.sendEmail && !r.emailSent) toast.error(t('Email nahi gaya — parchi ya WhatsApp se dein'));
      setDone(true);
    },
    onError: (e) => toast.error(apiError(e, t('Login nahi bana'))),
  });

  if (done) {
    return <LoginSlipModal title={t('Login ban gaya')} phone={p.person.phone} onClose={onClose}
      slip={{ name: p.person.fullName, email: d.email.trim(), password: d.password, role: ROLES[d.role].label, branch: shops.find((s) => s.id === d.shopId)?.name ?? null, staffNumber: p.person.staffNumber }} />;
  }
  return (
    <Modal open onClose={onClose} size="lg" closeOnBackdrop={false} title={t('{{fullName}} ko login dein', { fullName: p.person.fullName })} description={t('HR record wohi rahega; login us se jur jayega')}
      footer={<>
        {problem && <span className="me-auto text-[0.75rem] text-amber-800">{problem}</span>}
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!!problem}>{t('Login banayein')}</Button>
      </>}>
      <LoginFields value={d} onChange={setD} shops={shops} />
    </Modal>
  );
}

/** Owner sets a new password; the member is signed out everywhere. */
export function ResetPasswordModal({ p, onClose }: { p: Profile; onClose: () => void }) {
  const [password, setPassword] = useState(makePassword);
  const [done, setDone] = useState(false);
  const login = p.login!;
  const save = useMutation({
    mutationFn: () => peopleApi.resetPassword(login.id, password),
    onSuccess: (r) => { toast.success(r.sessionsClosed ? t('Password badal gaya — {{sessionsClosed}} device se logout', { sessionsClosed: r.sessionsClosed }) : t('Password badal gaya')); setDone(true); },
    onError: (e) => toast.error(apiError(e, t('Password nahi badla'))),
  });
  if (done) {
    return <LoginSlipModal title={t('Naya password')} phone={p.person.phone} onClose={onClose}
      slip={{ name: p.person.fullName, email: login.email, password, role: ROLES[login.role as keyof typeof ROLES]?.label ?? login.role, branch: login.shop?.name ?? null, staffNumber: p.person.staffNumber }} />;
  }
  return (
    <Modal open onClose={onClose} size="sm" title={t('Naya password dein')} description={t('{{fullName}} ka purana password band ho jayega aur woh har device se logout hoga', { fullName: p.person.fullName })}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button onClick={() => save.mutate()} loading={save.isPending} disabled={password.length < 8}>{t('Password badlein')}</Button></>}>
      <Input label={t('Naya password')} value={password} onChange={(e) => setPassword(e.target.value)} className="pe-10 font-mono"
        hint={t('Kam az kam 8 harf. Agle safhe par parchi aur WhatsApp ka button milega.')}
        rightIcon={<button type="button" onClick={() => setPassword(makePassword())} aria-label={t('Naya banayein')} className="rounded p-0.5 hover:text-slate-700"><RefreshCw className="h-4 w-4" /></button>} />
    </Modal>
  );
}

const LEAVE_OPTIONS: Array<{ id: StaffStatus; label: string; hint: string }> = [
  { id: 'RESIGNED', label: t('Khud chhor gaya'), hint: t('Istifa diya ya kaam chhor diya') },
  { id: 'TERMINATED', label: t('Kaam se hataya'), hint: t('Dukaan ne kaam khatam kiya') },
  { id: 'SUSPENDED', label: t('Kuch din ke liye band'), hint: t('Wapas aa sakta hai') },
  { id: 'ON_LEAVE', label: t('Lambi chhutti'), hint: t('Haazri me chhutti dikhegi') },
];

/**
 * Mark a person as gone, suspended or on leave, or bring them back. The HR
 * record and the login are separate switches; nothing is deleted, so sales,
 * salary and commission history stay intact.
 */
export function StatusModal({ p, back, onClose }: { p: Profile; back: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StaffStatus>(back ? 'ACTIVE' : 'RESIGNED');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const login = p.login;
  const canLogin = !!login && p.viewer.owner && login.role !== 'OWNER';
  const [touchLogin, setTouchLogin] = useState(canLogin && (back ? !login!.isActive : login!.isActive));
  const leaving = status === 'RESIGNED' || status === 'TERMINATED';
  const save = useMutation({
    mutationFn: async () => {
      if (p.staff && p.viewer.manage) await peopleApi.setStatus(p.staff.id, status, leaving ? endDate : undefined);
      if (touchLogin && canLogin) await peopleApi.setActive(login!.id, back);
    },
    onSuccess: () => { refresh(qc); toast.success(back ? t('Wapas kaam par') : t('Haal badal gaya')); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Nahi hua'))),
  });
  const nothing = (!p.staff || !p.viewer.manage) && !touchLogin;

  return (
    <Modal open onClose={onClose} size="md" title={back ? t('{{fullName}} wapas kaam par', { fullName: p.person.fullName }) : t('{{fullName}} — kaam ka haal', { fullName: p.person.fullName })}
      description={t('Kuch mitta nahi — sale, tankhwah aur commission ka hisaab waisa hi rehta hai')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button onClick={() => save.mutate()} loading={save.isPending} disabled={nothing} variant={back ? 'primary' : 'danger'}>{back ? t('Wapas laayein') : t('Save karein')}</Button></>}>
      <div className="space-y-4">
        {p.staff && p.viewer.manage && !back && (
          <div className="grid gap-2 sm:grid-cols-2">
            {LEAVE_OPTIONS.map((o) => (
              <button key={o.id} type="button" onClick={() => setStatus(o.id)} aria-pressed={status === o.id}
                className={cn('rounded-xl p-3 text-start ring-1 transition', status === o.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                <span className="block text-sm font-semibold text-slate-900">{o.label}</span><span className="block text-[0.6875rem] text-slate-500">{o.hint}</span>
              </button>
            ))}
          </div>
        )}
        {p.staff && p.viewer.manage && leaving && !back && (
          <Input label={t('Aakhri din')} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} hint={t('Tankhwah ka hisaab is din tak banega')} />
        )}
        {p.staff && !p.viewer.manage && <p className="text-[0.8125rem] text-slate-500">{t('HR record ka haal badalne ke liye "Staff sambhalna" ki permission chahiye.')}</p>}
        {canLogin && (
          <Switch checked={touchLogin} onChange={(e) => setTouchLogin(e.target.checked)}
            label={back ? (login!.isActive ? t('Login pehle se chalu hai') : t('Login bhi chalu karein')) : (login!.isActive ? t('Login bhi band karein') : t('Login pehle se band hai'))}
            description={back ? t('Banda phir se app khol sakega') : t('Har device se foran logout — app nahi khul sakegi')}
            disabled={back ? login!.isActive : !login!.isActive} />
        )}
        {!back && p.history?.any && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">
            {t('Is ke naam {{value}} hain. Yeh sab waisa hi rahega — record kabhi mitaya nahi jata.', { value: [
              p.history.sales && `${p.history.sales} bill`, p.history.returns && `${p.history.returns} return`, p.history.shifts && `${p.history.shifts} shift`,
              p.history.expenses && `${p.history.expenses} expenses`, p.history.purchases && `${p.history.purchases} purchase`,
            ].filter(Boolean).join(', ') })}
          </p>
        )}
        {!back && login?.isActive && !canLogin && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t('Is ka login abhi chalu hai. Login sirf malik band kar sakta hai.')}</p>
        )}
      </div>
    </Modal>
  );
}

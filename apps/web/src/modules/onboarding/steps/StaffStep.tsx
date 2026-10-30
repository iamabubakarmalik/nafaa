/** Onboarding step 5: logins for cashiers and managers. */

import { Mail, Plus, Trash2, UserPlus } from 'lucide-react';
import { Alert, Button, IconButton, Input, Select } from '@/design-system/components';
import { t } from '@core/i18n';

export interface StaffMember {
  fullName: string;
  email: string;
  password: string;
  role: 'MANAGER' | 'CASHIER' | 'STAFF';
}

export interface StaffForm {
  members: StaffMember[];
}

export type StaffErrors = Record<number, Partial<Record<keyof StaffMember, string>>>;

const ROLES = [
  { value: 'CASHIER', label: t('Cashier — counter par sale') },
  { value: 'MANAGER', label: t('Manager — billing ke ilawa sab') },
  { value: 'STAFF', label: t('Staff — stock ka kaam') },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MEMBERS = 10;

const emptyMember = (): StaffMember => ({ fullName: '', email: '', password: '', role: 'CASHIER' });

const isBlank = (m: StaffMember) => !m.fullName.trim() && !m.email.trim() && !m.password;

/** Members with anything typed in. */
export function filledMembers(f: StaffForm): StaffMember[] {
  return f.members.filter((m) => !isBlank(m));
}

export function validateStaff(f: StaffForm): StaffErrors {
  const errors: StaffErrors = {};
  const seen = new Set<string>();
  f.members.forEach((m, i) => {
    if (isBlank(m)) return;
    const e: Partial<Record<keyof StaffMember, string>> = {};
    if (m.fullName.trim().length < 2) e.fullName = t('Naam likhein');
    const email = m.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) e.email = t('Email sahi likhein');
    else if (seen.has(email)) e.email = t('Ye email upar bhi likha hai');
    seen.add(email);
    if (m.password.length < 6) e.password = t('Kam se kam 6 huroof');
    if (Object.keys(e).length) errors[i] = e;
  });
  return errors;
}

interface Props {
  value: StaffForm;
  onChange: (patch: Partial<StaffForm>) => void;
  errors: StaffErrors;
  addedCount: number;
  isOwner: boolean;
}

export function StaffStep({ value, onChange, errors, addedCount, isOwner }: Props) {
  const setMember = (i: number, patch: Partial<StaffMember>) =>
    onChange({ members: value.members.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });

  if (!isOwner) {
    return (
      <Alert tone="info" title={t('Staff sirf malik add kar sakta hai')}>
        {t('Ye step chhor dein. Malik baad me Staff page se logins bana sakta hai.')}
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      {addedCount > 0 && (
        <Alert tone="success" title={t('{{addedCount}} staff pehle hi add ho chuke', { addedCount })}>
          {t('Mazeed chahiye to neeche likhein, warna aage barh jayein.')}
        </Alert>
      )}
      <p className="text-sm text-slate-600">
        {t('Har banda apne email aur password se login karega, taake pata rahe kis ne kya becha. Branch aur permissions baad me Staff page se set hoti hain.')}
      </p>

      {value.members.length === 0 ? (
        <button
          type="button"
          onClick={() => onChange({ members: [emptyMember()] })}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-slate-600 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
        >
          <UserPlus className="h-6 w-6" aria-hidden />
          <span className="text-sm font-semibold">{t('Pehla staff member add karein')}</span>
          <span className="text-xs text-slate-500">{t('Ya abhi chhor dein — baad me bhi ho jayega')}</span>
        </button>
      ) : (
        <div className="space-y-3">
          {value.members.map((m, i) => {
            const e = errors[i] ?? {};
            return (
              <fieldset key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <legend className="sr-only">{t('Staff {{value}}', { value: i + 1 })}</legend>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Staff {{value}}', { value: i + 1 })}</span>
                  <IconButton label={t('Hatayein')} size="sm" onClick={() => onChange({ members: value.members.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label={t('Naam')} placeholder={t('Bilal')} value={m.fullName} onChange={(ev) => setMember(i, { fullName: ev.target.value })} error={e.fullName} />
                  <Select label={t('Kaam')} options={ROLES} value={m.role} onChange={(ev) => setMember(i, { role: ev.target.value as StaffMember['role'] })} />
                  <Input
                    label={t('Login email')}
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="bilal@gmail.com"
                    leftIcon={<Mail className="h-4 w-4" />}
                    value={m.email}
                    onChange={(ev) => setMember(i, { email: ev.target.value })}
                    error={e.email}
                  />
                  <Input
                    label={t('Password')}
                    type="text"
                    autoComplete="off"
                    placeholder={t('Kam se kam 6 huroof')}
                    hint={e.password ? undefined : t('Ye password staff ko bata dein.')}
                    value={m.password}
                    onChange={(ev) => setMember(i, { password: ev.target.value })}
                    error={e.password}
                  />
                </div>
              </fieldset>
            );
          })}
          {value.members.length < MAX_MEMBERS && (
            <Button variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => onChange({ members: [...value.members, emptyMember()] })}>
              {t('Ek aur staff')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

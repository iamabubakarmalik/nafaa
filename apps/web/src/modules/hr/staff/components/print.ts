/**
 * Printable staff list and the login slip handed to a new member. Both are
 * PrintDocs, so the shared print button gives A4, PDF and thermal.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { DirectoryPerson } from '../api/people.api';
import { STATUS, ago, day, roleOf } from './meta';
import { t } from '@core/i18n';

export function staffListDoc(people: DirectoryPerson[], filter: string): PrintDoc {
  const working = people.filter((p) => p.status === 'ACTIVE').length;
  const sales = people.some((p) => p.today);
  return {
    title: t('Staff ki list'),
    subtitle: new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    meta: [[t('Log'), String(people.length)], [t('Kaam par'), String(working)], ...(filter ? [[t('Filter'), filter] as [string, string]] : [])],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: t('Naam') }, { label: t('Role') }, { label: t('Kaam'), wideOnly: true }, { label: t('Branch'), wideOnly: true },
          { label: t('Phone'), wideOnly: true }, { label: t('Haal') }, { label: t('Aakhri login'), wideOnly: true },
          ...(sales ? [{ label: t('Aaj sale'), align: 'right' as const }] : []),
        ],
        rows: people.map((p) => [
          `${p.fullName}${p.staffNumber ? ` (${p.staffNumber})` : ''}`, roleOf(p.role).label, p.designation ?? '—', p.shop?.name ?? t('Sab branches'),
          p.phone ?? '—', STATUS[p.status].label, p.login ? ago(p.login.lastLoginAt) : p.hasLogin ? '—' : t('Login nahi'),
          ...(sales ? [p.today ? formatPKR(p.today.sales) : '—'] : []),
        ]),
      },
    ],
  };
}

export interface LoginSlip {
  name: string;
  email: string;
  password: string;
  role: string;
  branch: string | null;
  staffNumber?: string | null;
}

export function loginSlipDoc(s: LoginSlip): PrintDoc {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';
  return {
    title: t('Login parchi'),
    subtitle: s.name,
    meta: [[t('Date'), day(new Date().toISOString())]],
    sections: [
      {
        kind: 'rows',
        rows: [
          { label: t('Naam'), value: s.name },
          ...(s.staffNumber ? [{ label: t('Staff no.'), value: s.staffNumber }] : []),
          { label: t('Role'), value: s.role },
          { label: t('Branch'), value: s.branch ?? 'Sab branches' },
          { label: t('Login (email)'), value: s.email, strong: true },
          { label: t('Password'), value: s.password, strong: true },
          { label: t('Kahan kholein'), value: url },
        ],
      },
      { kind: 'text', text: t('Pehli dafa login ke baad Profile me ja kar apna password badal lein. Yeh parchi kisi ko na dikhayein.') },
    ],
  };
}

/**
 * Printable staff list and the login slip handed to a new member. Both are
 * PrintDocs, so the shared print button gives A4, PDF and thermal.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { DirectoryPerson } from '../api/people.api';
import { STATUS, ago, day, roleOf } from './meta';

export function staffListDoc(people: DirectoryPerson[], filter: string): PrintDoc {
  const working = people.filter((p) => p.status === 'ACTIVE').length;
  const sales = people.some((p) => p.today);
  return {
    title: 'Staff ki list',
    subtitle: new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    meta: [['Log', String(people.length)], ['Kaam par', String(working)], ...(filter ? [['Filter', filter] as [string, string]] : [])],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Naam' }, { label: 'Role' }, { label: 'Kaam', wideOnly: true }, { label: 'Branch', wideOnly: true },
          { label: 'Phone', wideOnly: true }, { label: 'Haal' }, { label: 'Aakhri login', wideOnly: true },
          ...(sales ? [{ label: 'Aaj bikri', align: 'right' as const }] : []),
        ],
        rows: people.map((p) => [
          `${p.fullName}${p.staffNumber ? ` (${p.staffNumber})` : ''}`, roleOf(p.role).label, p.designation ?? '—', p.shop?.name ?? 'Sab branches',
          p.phone ?? '—', STATUS[p.status].label, p.login ? ago(p.login.lastLoginAt) : p.hasLogin ? '—' : 'Login nahi',
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
    title: 'Login parchi',
    subtitle: s.name,
    meta: [['Tareekh', day(new Date().toISOString())]],
    sections: [
      {
        kind: 'rows',
        rows: [
          { label: 'Naam', value: s.name },
          ...(s.staffNumber ? [{ label: 'Staff no.', value: s.staffNumber }] : []),
          { label: 'Role', value: s.role },
          { label: 'Branch', value: s.branch ?? 'Sab branches' },
          { label: 'Login (email)', value: s.email, strong: true },
          { label: 'Password', value: s.password, strong: true },
          { label: 'Kahan kholein', value: url },
        ],
      },
      { kind: 'text', text: 'Pehli dafa login ke baad Profile me ja kar apna password badal lein. Yeh parchi kisi ko na dikhayein.' },
    ],
  };
}

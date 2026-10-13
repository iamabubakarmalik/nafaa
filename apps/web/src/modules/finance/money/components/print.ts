/**
 * Printed statements, as PrintDocs (A4, PDF or thermal slip via the shared
 * print button): the ledger for the current filter with a running net, and
 * one money account's statement with its running balance.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { AccountStatement, MoneyLedger } from '../api/money.api';
import { ACCOUNTS, KINDS, SOURCES, STATEMENT_KINDS, entryTitle, maskNumber, when } from './meta';

/** Ledger for the current filter: every printed movement, a running net from the first one, then totals. */
export function statementDoc(ledger: MoneyLedger, opts: { title: string; period: string; filter: string }): PrintDoc {
  // Oldest first, so the running net reads like a bank statement.
  const rows = [...ledger.items].reverse();
  let running = 0;
  const lines = rows.map((e) => {
    running += e.direction === 'in' ? e.amount : -e.amount;
    return [
      when(e.at),
      SOURCES[e.source].label,
      entryTitle(e),
      e.reference ?? '',
      ACCOUNTS[e.method].short,
      e.direction === 'in' ? formatPKR(e.amount) : '',
      e.direction === 'out' ? formatPKR(e.amount) : '',
      formatPKR(running),
    ];
  });

  const bySource = new Map<string, { amount: number; count: number; dir: 'in' | 'out' }>();
  for (const e of ledger.items) {
    const cur = bySource.get(e.source) ?? { amount: 0, count: 0, dir: e.direction };
    cur.amount += e.amount; cur.count += 1;
    bySource.set(e.source, cur);
  }
  const t = ledger.totals;

  return {
    title: opts.title,
    subtitle: opts.period,
    meta: [
      ['Entries', String(ledger.total)],
      ...(opts.filter ? [['Filter', opts.filter] as [string, string]] : []),
      ['Aaya', formatPKR(t.in)],
      ['Gaya', formatPKR(t.out)],
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Waqt' }, { label: 'Type', wideOnly: true }, { label: 'Details' }, { label: 'Ref', wideOnly: true },
          { label: 'Account', wideOnly: true }, { label: 'Aaya', align: 'right' }, { label: 'Gaya', align: 'right' }, { label: 'Net', align: 'right', wideOnly: true },
        ],
        rows: lines,
      },
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          ...[...bySource.entries()].map(([s, v]) => ({
            label: `${SOURCES[s as keyof typeof SOURCES].label} (${v.count})`,
            value: `${v.dir === 'in' ? '+' : '−'}${formatPKR(v.amount)}`,
            sub: true,
          })),
          { label: 'Kul aaya', value: formatPKR(t.in) },
          { label: 'Kul gaya', value: `−${formatPKR(t.out)}` },
          { label: 'Bacha (net)', value: formatPKR(t.net), strong: true },
        ],
      },
    ],
    footer: ledger.total > ledger.items.length
      ? `Pehli ${ledger.items.length} entries chhapi hain (kul ${ledger.total}). Khulasa poori period ka hai; source wali lines sirf chhapi hui entries ki hain.`
      : undefined,
  };
}

/**
 * One money account's statement: opening, every automatic and manual line
 * with the running balance, and closing.
 */
export function accountStatementDoc(s: AccountStatement, period: string): PrintDoc {
  const a = s.account;
  const number = [a.bankName, a.accountNumber && maskNumber(a.accountNumber)].filter(Boolean).join(' · ');
  return {
    title: `${a.name} statement`,
    subtitle: period,
    meta: [
      ['Type', KINDS[a.kind].label],
      ...(number ? [['Account', number] as [string, string]] : []),
      ...(a.accountTitle ? [['Title', a.accountTitle] as [string, string]] : []),
      ['Branch', a.shop ?? 'Poora karobar'],
      ['Shuru', formatPKR(s.opening)],
      ['Aakhir', formatPKR(s.closing)],
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Waqt' }, { label: 'Type', wideOnly: true }, { label: 'Details' }, { label: 'Ref', wideOnly: true },
          { label: 'Aaya', align: 'right' }, { label: 'Gaya', align: 'right' }, { label: 'Balance', align: 'right', wideOnly: true },
        ],
        rows: [
          ['', '', 'Shuru ka balance', '', '', '', formatPKR(s.opening)],
          ...s.lines.map((l) => [
            when(l.at),
            STATEMENT_KINDS[l.kind].label,
            [l.party, l.note].filter(Boolean).join(' · ') || STATEMENT_KINDS[l.kind].label,
            l.reference ?? '',
            l.direction === 'in' ? formatPKR(l.amount) : '',
            l.direction === 'out' ? formatPKR(l.amount) : '',
            formatPKR(l.balance),
          ]),
        ],
      },
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          { label: 'Shuru ka balance', value: formatPKR(s.opening) },
          { label: `Aaya (${s.lines.filter((l) => l.direction === 'in').length})`, value: `+${formatPKR(s.in)}`, sub: true },
          { label: `Gaya (${s.lines.filter((l) => l.direction === 'out').length})`, value: `−${formatPKR(s.out)}`, sub: true },
          { label: 'Aakhri balance', value: formatPKR(s.closing), strong: true },
        ],
      },
    ],
    footer: a.auto ? 'Sale, return, kharch aur payment is account ke payment tareeqe se khud judti hain.' : undefined,
  };
}

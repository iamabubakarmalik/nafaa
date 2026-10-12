/**
 * Account statement for the current filter: every printed movement with
 * money in, money out and a running net (from the first printed entry), then
 * totals. A PrintDoc, so the shared print button prints it on A4, as a PDF
 * or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { MoneyLedger } from '../api/money.api';
import { ACCOUNTS, SOURCES, entryTitle, when } from './meta';

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
          { label: 'Waqt' }, { label: 'Qism', wideOnly: true }, { label: 'Tafseel' }, { label: 'Ref', wideOnly: true },
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
      ? `Pehli ${ledger.items.length} entries chhapi hain (kul ${ledger.total}). Khulasa poori muddat ka hai; source wali lines sirf chhapi hui entries ki hain.`
      : undefined,
  };
}

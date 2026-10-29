/**
 * Builds SaleSettlement rows (when each khata bill was paid) for existing
 * data, so profit on khata bills can count when the money comes in.
 *
 * Until a customer has rows, their bills count all profit on the bill day,
 * exactly as before; the app also builds rows on its own when a report is
 * read. This script does it ahead of time and prints what it found.
 *
 * Tenant by tenant, customer by customer. Each customer's rows are rebuilt
 * from their khata, so running it again gives the same rows.
 *
 *   npx ts-node --transpile-only scripts/backfill-sale-settlements.ts            report only
 *   npx ts-node --transpile-only scripts/backfill-sale-settlements.ts --apply    write rows
 *
 * Optional: --tenant <tenantId> to limit to one business.
 */

import { PrismaClient } from '@prisma/client';
import {
  allocateSettlements, billProfits, loadAllocationInput, rebuildCustomerSettlements,
} from '../src/common/helpers/sale-settlement.helper';

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const money = (v: number) => v.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

async function main() {
  const apply = process.argv.includes('--apply');
  const only = arg('--tenant');
  const prisma = new PrismaClient();
  const url = process.env.DATABASE_URL ?? '';
  console.log(`Database: ${url.replace(/:\/\/([^:]+):[^@]*@/, '://$1:****@')}`);
  console.log(apply ? 'Mode: APPLY (rows are written)\n' : 'Mode: report only (nothing is written; add --apply to write)\n');

  const grand = { tenants: 0, customers: 0, bills: 0, rows: 0, billProfit: 0, realised: 0, pending: 0, writtenOff: 0 };
  try {
    const tenants = await prisma.tenant.findMany({
      where: { ...(only && { id: only }), customerLedgers: { some: { type: 'SALE_CREDIT' } } },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
    for (const t of tenants) {
      const customers = await prisma.customerLedger.groupBy({ by: ['customerId'], where: { tenantId: t.id } });
      const sum = { customers: 0, bills: 0, rows: 0, billProfit: 0, realised: 0, pending: 0, writtenOff: 0 };
      for (const { customerId } of customers) {
        const input = await loadAllocationInput(prisma, t.id, customerId);
        const rows = allocateSettlements(input);
        if (!rows.length) {
          if (apply) await rebuildCustomerSettlements(prisma as never, t.id, customerId);
          continue;
        }
        const profits = await billProfits(prisma, [...new Set(rows.map((r) => r.saleId))]);
        sum.customers++;
        sum.rows += rows.length;
        for (const [saleId, b] of profits) {
          const mine = rows.filter((r) => r.saleId === saleId);
          const share = (kinds: string[]) => (b.net > 0.005 ? mine.filter((r) => kinds.includes(r.kind)).reduce((s, r) => s + r.amount, 0) * b.profit / b.net : 0);
          const realised = share(['UPFRONT', 'PAYMENT']);
          const off = share(['WRITE_OFF']);
          sum.bills++;
          sum.billProfit += b.profit;
          sum.realised += realised;
          sum.writtenOff += off;
          sum.pending += b.profit - realised - off;
        }
        if (apply) await rebuildCustomerSettlements(prisma as never, t.id, customerId);
      }
      grand.tenants++;
      for (const k of Object.keys(sum) as Array<keyof typeof sum>) grand[k] += sum[k];
      console.log(
        `${t.name.padEnd(32).slice(0, 32)} customers ${String(sum.customers).padStart(4)}  khata bills ${String(sum.bills).padStart(5)}  rows ${String(sum.rows).padStart(6)}`
        + `  profit ${money(sum.billProfit).padStart(10)} = haath mein ${money(sum.realised).padStart(10)} + udhaar mein ${money(sum.pending).padStart(9)}`
        + (sum.writtenOff ? ` + maaf ${money(sum.writtenOff)}` : ''),
      );
    }
    console.log('\nTotal');
    console.log(`  tenants ${grand.tenants} · customers ${grand.customers} · khata bills ${grand.bills} · rows ${grand.rows}`);
    console.log(`  khata bills' profit ${money(r2(grand.billProfit))} = in hand ${money(r2(grand.realised))} + still on khata ${money(r2(grand.pending))} + forgiven ${money(r2(grand.writtenOff))}`);
    if (apply) {
      const written = await prisma.saleSettlement.count({ where: only ? { tenantId: only } : {} });
      console.log(`  SaleSettlement rows now in the database: ${written}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

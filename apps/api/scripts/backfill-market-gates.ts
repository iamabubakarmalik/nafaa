/**
 * Saves the Nafaa Market section ("gate") for shop profiles that were listed
 * before migration 20261210101000_market_engine added the column.
 *
 * The gate is worked out from the shop's POS business type, the same rule
 * the API uses when the column is empty (src/marketplace/_shared/
 * market-config.ts → gateForBusinessType). Saving it lets gate filters run
 * in the database, so listings paginate correctly. Rows that already have a
 * gate are never touched. Safe to run more than once.
 *
 *   npx ts-node scripts/backfill-market-gates.ts            report only
 *   npx ts-node scripts/backfill-market-gates.ts --apply    write
 */

import { PrismaClient } from '@prisma/client';
import { gateForBusinessType } from '../src/marketplace/_shared/market-config';

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.shopMarketplaceProfile.findMany({
      where: { gate: null },
      select: { id: true, publicName: true, isListedOnMarketplace: true, tenant: { select: { businessType: true } } },
    });
    const byGate = new Map<string, number>();
    for (const r of rows) {
      const { gate } = gateForBusinessType(r.tenant?.businessType);
      byGate.set(gate, (byGate.get(gate) ?? 0) + 1);
    }
    console.log(`Profiles without a gate: ${rows.length} (${rows.filter((r) => r.isListedOnMarketplace).length} listed)`);
    for (const [gate, count] of [...byGate.entries()].sort()) console.log(`  ${gate.padEnd(10)} ${count}`);
    if (!apply) {
      console.log('Report only. Run with --apply to save.');
      return;
    }
    let done = 0;
    for (const r of rows) {
      const { gate } = gateForBusinessType(r.tenant?.businessType);
      const res = await prisma.shopMarketplaceProfile.updateMany({ where: { id: r.id, gate: null }, data: { gate } });
      done += res.count;
    }
    console.log(`Saved the gate on ${done} profile(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

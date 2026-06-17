/**
 * One-time script: Backfill ShopStock entries for all existing carpet rolls + cut pieces.
 *
 * Usage:
 *   cd apps/api
 *   npx ts-node src/scripts/backfill-carpet-shopstock.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting carpet ShopStock backfill...\n');

  // Find unique tenantId + shopId + productId + variantId combinations from rolls
  const rollGroups = await prisma.carpetRoll.findMany({
    where: { status: 'ACTIVE', remainingLengthFt: { gt: 0 } },
    select: { tenantId: true, shopId: true, productId: true, variantId: true },
    distinct: ['tenantId', 'shopId', 'productId', 'variantId'],
  });

  const pieceGroups = await prisma.carpetCutPiece.findMany({
    where: { status: 'AVAILABLE' },
    select: { tenantId: true, shopId: true, productId: true, variantId: true },
    distinct: ['tenantId', 'shopId', 'productId', 'variantId'],
  });

  // Merge unique combinations
  const seen = new Set<string>();
  const allGroups: Array<{
    tenantId: string;
    shopId: string | null;
    productId: string;
    variantId: string | null;
  }> = [];

  for (const g of [...rollGroups, ...pieceGroups]) {
    if (!g.shopId) continue;
    const key = `${g.tenantId}:${g.shopId}:${g.productId}:${g.variantId ?? 'null'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    allGroups.push(g);
  }

  console.log(`📊 Found ${allGroups.length} unique product+shop+variant combinations\n`);

  let synced = 0;
  let created = 0;
  let updated = 0;

  for (const g of allGroups) {
    if (!g.shopId) continue;

    // Sum active rolls
    const rolls = await prisma.carpetRoll.findMany({
      where: {
        tenantId: g.tenantId,
        shopId: g.shopId,
        productId: g.productId,
        variantId: g.variantId,
        status: 'ACTIVE',
        remainingLengthFt: { gt: 0 },
      },
      select: { remainingSqft: true },
    });
    const totalRollSqft = rolls.reduce((s, r) => s + Number(r.remainingSqft), 0);

    // Sum available cut pieces
    const pieces = await prisma.carpetCutPiece.findMany({
      where: {
        tenantId: g.tenantId,
        shopId: g.shopId,
        productId: g.productId,
        variantId: g.variantId,
        status: 'AVAILABLE',
      },
      select: { totalSqft: true },
    });
    const totalCutSqft = pieces.reduce((s, p) => s + Number(p.totalSqft), 0);

    const grandTotal = Number((totalRollSqft + totalCutSqft).toFixed(2));

    // Upsert ShopStock
    const existing = await prisma.shopStock.findFirst({
      where: { shopId: g.shopId, productId: g.productId, variantId: g.variantId },
    });

    if (existing) {
      await prisma.shopStock.update({
        where: { id: existing.id },
        data: { stock: grandTotal },
      });
      updated++;
    } else if (grandTotal > 0) {
      await prisma.shopStock.create({
        data: {
          tenantId: g.tenantId,
          shopId: g.shopId,
          productId: g.productId,
          variantId: g.variantId,
          stock: grandTotal,
          isActive: true,
        },
      });
      created++;
    }

    synced++;
    console.log(
      `  ✅ ${g.productId.slice(0, 8)}.../${g.variantId?.slice(0, 8) ?? 'main'} @ shop=${g.shopId.slice(0, 8)}... → ${grandTotal} sqft`,
    );
  }

  // Now sync global Product.stock + ProductVariant.stock from ShopStock sums
  console.log('\n🔄 Syncing global product/variant stock from ShopStock totals...\n');

  const products = await prisma.product.findMany({
    where: { unit: { in: ['sqft', 'sqm', 'sqyd'] } },
    select: { id: true, tenantId: true },
  });

  for (const p of products) {
    const shopStocks = await prisma.shopStock.findMany({
      where: { tenantId: p.tenantId, productId: p.id },
      select: { stock: true },
    });
    const total = shopStocks.reduce((s, x) => s + Number(x.stock), 0);
    await prisma.product.update({
      where: { id: p.id },
      data: { stock: total },
    });
  }

  const variants = await prisma.productVariant.findMany({
    where: { product: { unit: { in: ['sqft', 'sqm', 'sqyd'] } } },
    select: { id: true, productId: true },
  });

  for (const v of variants) {
    const product = await prisma.product.findUnique({
      where: { id: v.productId },
      select: { tenantId: true },
    });
    if (!product) continue;

    const shopStocks = await prisma.shopStock.findMany({
      where: { tenantId: product.tenantId, productId: v.productId, variantId: v.id },
      select: { stock: true },
    });
    const total = shopStocks.reduce((s, x) => s + Number(x.stock), 0);
    await prisma.productVariant.update({
      where: { id: v.id },
      data: { stock: total },
    });
  }

  console.log('\n✅ Backfill complete!');
  console.log(`   - ShopStock entries created: ${created}`);
  console.log(`   - ShopStock entries updated: ${updated}`);
  console.log(`   - Total synced: ${synced}`);
  console.log(`   - Products updated: ${products.length}`);
  console.log(`   - Variants updated: ${variants.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

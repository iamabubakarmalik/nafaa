/**
 * One-time script: purane DELIVERED repair tickets ki Sale banata hai.
 *
 * Kyun zaroori hai:
 *   Pehle repair deliver hone par koi Sale nahi banti thi — is liye repair
 *   ki kamai dashboard, roz ke profit aur cash register me kabhi aati hi
 *   nahi thi. Ab delivery par Sale khud banti hai, lekin jo tickets us
 *   change se PEHLE deliver ho chuke the unki sale ab tak missing hai.
 *   Ye script unhe bana deti hai.
 *
 * Ye script mahfooz hai:
 *   • jis ticket ki sale pehle se hai, use chhor deti hai (saleId set)
 *   • Rs 0 wale ticket (warranty claim / goodwill) ki sale nahi banti
 *   • udhaar bacha ho lekin customer account na ho to skip kar deti hai
 *   • dobara chalane par kuch duplicate nahi hota
 *
 * Usage:
 *   cd apps/api
 *   npx ts-node src/scripts/backfill-repair-sales.ts            # dry run
 *   npx ts-node src/scripts/backfill-repair-sales.ts --apply    # asli kaam
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

type Skipped = { ticket: string; reason: string };

async function main() {
  console.log(
    APPLY
      ? '🔄 Repair sales backfill — ASLI (--apply)\n'
      : '🔍 Repair sales backfill — DRY RUN (kuch nahi badlega)\n',
  );

  const tickets = await prisma.repairTicket.findMany({
    where: { status: 'DELIVERED', saleId: null },
    include: { parts: true, shop: { select: { id: true, name: true } } },
    orderBy: { deliveredAt: 'asc' },
  });

  console.log(`Mile: ${tickets.length} delivered ticket jinki sale nahi bani\n`);
  if (tickets.length === 0) {
    console.log('✅ Kuch karne ki zaroorat nahi — sab tickets ki sale mojood hai.');
    return;
  }

  const created: { ticket: string; sale: string; total: number }[] = [];
  const skipped: Skipped[] = [];

  for (const ticket of tickets) {
    const grossTotal = Number(ticket.partsCost) + Number(ticket.laborCost);
    const discount = Number(ticket.discount) || 0;
    const netTotal = Number(ticket.totalCost) || 0;

    if (netTotal <= 0) {
      skipped.push({ ticket: ticket.ticketNumber, reason: 'Rs 0 ka ticket (warranty/goodwill)' });
      continue;
    }

    // Asli lagat = parts ka cost (jo customer se liya wo unitPrice hai, cost nahi)
    const costOfGoods = ticket.parts.reduce(
      (sum, part) => sum + Number(part.quantity) * Number(part.unitCost),
      0,
    );

    const paidAmount = Math.min(Number(ticket.paidAmount) || 0, netTotal);
    const creditAmount = Math.max(netTotal - paidAmount, 0);

    if (creditAmount > 0 && !ticket.customerId) {
      skipped.push({
        ticket: ticket.ticketNumber,
        reason: `Rs ${creditAmount} udhaar baqi hai lekin customer account nahi`,
      });
      continue;
    }

    const saleNumber = `RPR-${ticket.ticketNumber}`;

    // Kahin wohi saleNumber pehle se maujood na ho
    const clash = await prisma.sale.findFirst({
      where: { tenantId: ticket.tenantId, saleNumber },
      select: { id: true },
    });
    if (clash) {
      if (APPLY) {
        await prisma.repairTicket.update({
          where: { id: ticket.id },
          data: { saleId: clash.id },
        });
      }
      skipped.push({ ticket: ticket.ticketNumber, reason: `sale ${saleNumber} pehle se thi — link kar di` });
      continue;
    }

    if (!APPLY) {
      created.push({ ticket: ticket.ticketNumber, sale: saleNumber, total: netTotal });
      continue;
    }

    const label = `Repair ${ticket.ticketNumber} — ${ticket.deviceBrand} ${ticket.deviceModel}`;
    const workDone = ticket.diagnosedIssue || ticket.reportedIssue || 'Repair service';

    const sale = await prisma.$transaction(async (tx) => {
      const madeSale = await tx.sale.create({
        data: {
          tenantId: ticket.tenantId,
          shopId: ticket.shopId,
          customerId: ticket.customerId,
          createdById: ticket.createdById,
          saleNumber,
          subtotal: grossTotal,
          discount,
          total: netTotal,
          costOfGoods,
          paidAmount,
          changeAmount: 0,
          creditAmount,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          // Purani sale ko us din par rakho jab device deliver hua tha,
          // warna aaj ka profit galat barh jayega.
          soldAt: ticket.deliveredAt ?? ticket.updatedAt,
          serviceCharges: 0,
          serviceChargesBreakdown: [
            { label, amount: Number(ticket.laborCost) || 0, kind: 'REPAIR_LABOR' },
          ] as unknown as Prisma.InputJsonValue,
          items: {
            create: [
              {
                productId: null,
                quantity: 1,
                price: grossTotal,
                costPrice: costOfGoods,
                total: grossTotal,
                note: `${label} — ${workDone}`,
              },
            ],
          },
        },
      });

      if (creditAmount > 0 && ticket.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: ticket.customerId } });
        if (customer) {
          const newBalance = Number(customer.balance) + creditAmount;
          await tx.customer.update({
            where: { id: customer.id },
            data: { balance: newBalance },
          });
          await tx.customerLedger.create({
            data: {
              tenantId: ticket.tenantId,
              customerId: customer.id,
              createdById: ticket.createdById,
              type: 'SALE_CREDIT',
              amount: creditAmount,
              balanceAfter: newBalance,
              reference: madeSale.saleNumber,
              note: `Repair udhaar: ${ticket.ticketNumber}${ticket.shop ? ` (${ticket.shop.name})` : ''}`,
            },
          });
        }
      }

      await tx.repairTicket.update({
        where: { id: ticket.id },
        data: { saleId: madeSale.id },
      });

      return madeSale;
    });

    created.push({ ticket: ticket.ticketNumber, sale: sale.saleNumber, total: netTotal });
  }

  console.log(`${APPLY ? '✅ Bani' : '📋 Banegi'}: ${created.length}`);
  created.forEach((c) => console.log(`   ${c.ticket} → ${c.sale}  Rs ${c.total.toLocaleString()}`));

  if (skipped.length > 0) {
    console.log(`\n⏭️  Chhori gayi: ${skipped.length}`);
    skipped.forEach((sk) => console.log(`   ${sk.ticket} — ${sk.reason}`));
  }

  if (!APPLY) {
    console.log('\n👉 Asli kaam karne ke liye dobara chalao: --apply');
  }
}

main()
  .catch((e) => {
    console.error('❌ Backfill fail hua:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

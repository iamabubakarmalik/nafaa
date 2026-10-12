/**
 * One-off fix for customer khata balances of bookings converted to a sale
 * by the old code.
 *
 * The old conversion booked every booking payment (advance and the payment
 * at pickup) as money received, but never charged the bill itself, so each
 * customer shows the booking's total paid as extra credit ("jama"). The new
 * conversion posts an ADJUSTMENT of +totalPaid ("Booking advance bill me
 * laga"); this script posts the same correction for old conversions.
 *
 * Safe to run more than once: a booking is skipped when it already has the
 * new-style entry or an earlier correction from this script.
 *
 *   npx ts-node scripts/fix-booking-advance-khata.ts            report only
 *   npx ts-node scripts/fix-booking-advance-khata.ts --apply    write fixes
 *
 * Optional: --tenant <tenantId> to limit to one business.
 */

import { PrismaClient } from '@prisma/client';

const FIX_NOTE = 'Purani booking ka hisaab theek';
const NEW_NOTE = 'Booking advance bill me laga';

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const tenantId = arg('--tenant');
  const prisma = new PrismaClient();

  const url = process.env.DATABASE_URL ?? '';
  console.log(`Database: ${url.replace(/:\/\/([^:]+):[^@]*@/, '://$1:****@')}`);
  console.log(apply ? 'Mode: APPLY (khate badle jayenge)\n' : 'Mode: report only (kuch nahi badlega)\n');

  const bookings = await prisma.booking.findMany({
    where: { status: 'CONVERTED', totalPaid: { gt: 0 }, ...(tenantId && { tenantId }) },
    select: {
      id: true, tenantId: true, shopId: true, bookingNumber: true, totalPaid: true, convertedAt: true,
      customerId: true, customer: { select: { name: true, phone: true } },
    },
    orderBy: { convertedAt: 'asc' },
  });

  let pending = 0;
  let total = 0;
  for (const b of bookings) {
    if (!b.customerId) continue;
    const done = await prisma.customerLedger.count({
      where: {
        customerId: b.customerId, type: 'ADJUSTMENT',
        OR: [{ note: { startsWith: `${NEW_NOTE}: ${b.bookingNumber} ` } }, { note: { startsWith: `${FIX_NOTE}: ${b.bookingNumber}` } }],
      },
    });
    if (done) continue;
    pending++;
    total += b.totalPaid;
    console.log(`${b.bookingNumber}  ${b.customer?.name ?? '—'} (${b.customer?.phone ?? '—'})  +Rs ${b.totalPaid.toLocaleString('en-PK')}`);

    if (apply) {
      await prisma.$transaction(async (tx) => {
        const { balance } = await tx.customer.update({
          where: { id: b.customerId! }, data: { balance: { increment: b.totalPaid } }, select: { balance: true },
        });
        await tx.customerLedger.create({
          data: {
            tenantId: b.tenantId, shopId: b.shopId, customerId: b.customerId!, type: 'ADJUSTMENT',
            amount: b.totalPaid, balanceAfter: balance, reference: b.bookingNumber,
            note: `${FIX_NOTE}: ${b.bookingNumber} — advance do baar jama hua tha`,
          },
        });
      });
    }
  }

  console.log(`\n${pending} booking${pending === 1 ? '' : 's'}, kul farq Rs ${total.toLocaleString('en-PK')}`);
  console.log(apply ? 'Khate theek ho gaye.' : 'Theek karne ke liye --apply ke saath dobara chalayein.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

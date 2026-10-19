/**
 * Gold given to a karigar and what comes back. Issue takes raw metal out of
 * metal stock and adds it to what the karigar holds; receive takes the
 * finished piece weight, the wastage allowed and any raw metal handed back
 * (which goes into metal stock again) off what the karigar holds.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JewelryPurity, Prisma } from '@prisma/client';
import { metalTypeForPurity, postMetalEntry } from './metal-ledger';

type Db = Prisma.TransactionClient;
const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

async function lockKarigar(tx: Db, tenantId: string, karigarId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`karigar:${karigarId}`}))::text`;
  const k = await tx.jewelryKarigar.findFirst({ where: { id: karigarId, tenantId } });
  if (!k) throw new NotFoundException('Karigar nahi mila');
  return k;
}

export async function issueToKarigar(
  tx: Db, tenantId: string, userId: string,
  input: { karigarId: string; grams: number; purity: JewelryPurity; reference: string; notes?: string | null },
) {
  const grams = r3(input.grams);
  if (!(grams > 0)) throw new BadRequestException('Kitna sona diya — grams likhein');
  const k = await lockKarigar(tx, tenantId, input.karigarId);
  if (!k.isActive) throw new BadRequestException('Yeh karigar band hai — pehle chalu karein');
  await postMetalEntry(tx, tenantId, userId, {
    entryType: 'ISSUE', metalType: metalTypeForPurity(input.purity), purity: input.purity, grams,
    reference: input.reference, source: k.fullName, karigarId: k.id, notes: input.notes ?? 'Karigar ko diya',
  });
  return tx.jewelryKarigar.update({
    where: { id: k.id },
    data: { metalIssuedGrams: r3(k.metalIssuedGrams + grams), outstandingGrams: r3(k.outstandingGrams + grams) },
  });
}

export async function receiveFromKarigar(
  tx: Db, tenantId: string, userId: string,
  input: { karigarId: string; pieceGrams: number; wastageGrams: number; returnedGrams: number; purity: JewelryPurity; reference: string; notes?: string | null },
) {
  const piece = r3(Math.max(input.pieceGrams, 0));
  const wastage = r3(Math.max(input.wastageGrams, 0));
  const back = r3(Math.max(input.returnedGrams, 0));
  const settled = r3(piece + wastage + back);
  if (!(settled > 0)) throw new BadRequestException('Wapas aane wala wazan likhein');
  const k = await lockKarigar(tx, tenantId, input.karigarId);
  if (settled > k.outstandingGrams + 0.001) {
    throw new BadRequestException(`${k.fullName} ke paas sirf ${r3(k.outstandingGrams)}g hai — ${settled}g wapas nahi ho sakta`);
  }
  if (back > 0) {
    await postMetalEntry(tx, tenantId, userId, {
      entryType: 'RECEIVE', metalType: metalTypeForPurity(input.purity), purity: input.purity, grams: back,
      reference: input.reference, source: k.fullName, karigarId: k.id, notes: input.notes ?? 'Karigar se bacha sona wapas',
    });
  }
  return tx.jewelryKarigar.update({
    where: { id: k.id },
    data: {
      metalReturnedGrams: r3(k.metalReturnedGrams + piece + back),
      wastageGrams: r3(k.wastageGrams + wastage),
      outstandingGrams: r3(Math.max(k.outstandingGrams - settled, 0)),
    },
  });
}

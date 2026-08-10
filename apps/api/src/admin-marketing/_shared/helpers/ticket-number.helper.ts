import { PrismaClient } from '@prisma/client';

/**
 * Generate ticket numbers like:
 *   CT-20260810-0001 (contact form)
 *   DM-20260810-0001 (demo booking)
 *   LD-20260810-0001 (lead)
 *   CH-20260810-0001 (chat conversation)
 *   CP-20260810-0001 (campaign)
 */
export async function generateTicketNumber(
  prefix: 'CT' | 'DM' | 'LD' | 'CH' | 'CP',
  countFn: () => Promise<number>,
): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await countFn();
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${date}-${seq}`;
}

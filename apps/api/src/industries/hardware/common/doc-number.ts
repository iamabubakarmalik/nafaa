import { Prisma } from '@prisma/client';

/**
 * Creates a record with the next free document number (QT-2026-0007 and
 * similar).
 *
 * Numbers used to be `count + 1`, which repeats an existing number as soon as
 * any row is deleted, and the unique index then rejected every later create.
 * Here the next number follows the highest one already issued under the
 * prefix, and a clash with a parallel request is retried with the next number.
 */
export async function createWithDocNumber<T>(opts: {
  prefix: string;
  width: number;
  /** Latest numbers issued under the prefix (any order). */
  existing: () => Promise<string[]>;
  create: (docNumber: string) => Promise<T>;
}): Promise<T> {
  const { prefix, width } = opts;
  let next = 1;
  for (const num of await opts.existing()) {
    if (!num?.startsWith(prefix)) continue;
    const n = Number(num.slice(prefix.length));
    if (Number.isFinite(n) && n >= next) next = n + 1;
  }

  for (let attempt = 0; ; attempt++) {
    const docNumber = `${prefix}${String(next + attempt).padStart(width, '0')}`;
    try {
      return await opts.create(docNumber);
    } catch (e) {
      const clash = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
      if (!clash || attempt >= 5) throw e;
    }
  }
}

/** Highest numbers first, enough to find the next one even past 9999. */
export const LATEST_NUMBERS = 50;

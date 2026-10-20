/**
 * History rows for menus, settings and FAQs (`CmsRevision` with `entryId`
 * null; `subject` + `subjectKey` say which). A1's `GET /history` lists them.
 */
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { RevisionAction } from '../contract/cms-contract';

type Db = PrismaService | Prisma.TransactionClient;

export type SubjectKind = 'FAQ' | 'MENU' | 'SETTING';

/** `subjectKey` for a menu or setting: "<key>:<locale>". FAQs use their id. */
export function subjectKey(key: string, locale: string): string {
  return `${key}:${locale}`;
}

export async function writeSubjectRevision(
  db: Db,
  input: { subject: SubjectKind; key: string; action: RevisionAction; snapshot: unknown; note?: string | null; userId: string | null },
): Promise<string> {
  const last = await db.cmsRevision.findFirst({
    where: { entryId: null, subject: input.subject, subjectKey: input.key },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const row = await db.cmsRevision.create({
    data: {
      subject: input.subject,
      subjectKey: input.key,
      version: (last?.version ?? 0) + 1,
      action: input.action,
      snapshot: (input.snapshot ?? {}) as Prisma.InputJsonValue,
      note: input.note ?? null,
      createdById: input.userId,
    },
    select: { id: true },
  });
  return row.id;
}

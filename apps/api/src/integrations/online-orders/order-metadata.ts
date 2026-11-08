import { PrismaService } from '../../prisma/prisma.service';

/**
 * Atomic writes to ChannelOrder.metadata. A read-modify-write of the whole
 * JSON loses keys when two writers overlap (an accept and the courier
 * auto-book listener, for example); these run as one SQL statement each.
 */

/** Sets top-level keys, keeping every other key as it is in the row. */
export async function patchOrderMetadata(prisma: PrismaService, id: string, patch: Record<string, unknown>) {
  await prisma.$executeRaw`
    UPDATE "channel_orders"
    SET "metadata" = COALESCE("metadata", '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb
    WHERE "id" = ${id}`;
}

export interface TimelineEntry {
  at: string;
  by: string | null;
  byName: string | null;
  from: string;
  to: string;
  note?: string | null;
}

/** Appends to metadata.timeline and keeps the newest 100 entries. */
export async function appendTimeline(prisma: PrismaService, id: string, entry: TimelineEntry) {
  const row = JSON.stringify({ ...entry, note: entry.note ?? null });
  await prisma.$executeRaw`
    UPDATE "channel_orders"
    SET "metadata" = jsonb_set(COALESCE("metadata", '{}'::jsonb), '{timeline}', (
      SELECT COALESCE(jsonb_agg(e ORDER BY i), '[]'::jsonb) FROM (
        SELECT e, i FROM jsonb_array_elements(
          (CASE WHEN jsonb_typeof("metadata"->'timeline') = 'array' THEN "metadata"->'timeline' ELSE '[]'::jsonb END)
          || jsonb_build_array(${row}::jsonb)
        ) WITH ORDINALITY AS t(e, i)
        ORDER BY i DESC
        LIMIT 100
      ) newest
    ))
    WHERE "id" = ${id}`;
}

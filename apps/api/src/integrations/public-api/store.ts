import { PrismaService } from '../../prisma/prisma.service';

/**
 * Public API ka saara data SystemSetting me (JSON) — nayi table / migration
 * nahi chahiye. Keys (hash), webhooks, cursor, retry aur log.
 */
export const K = {
  keyIndex: (keyId: string) => `public_api_key:${keyId}`,
  keys: (tenantId: string) => `public_api_keys:${tenantId}`,
  hooks: (tenantId: string) => `webhooks:${tenantId}`,
  cursor: (tenantId: string) => `webhooks_cursor:${tenantId}`,
  retry: (tenantId: string) => `webhooks_retry:${tenantId}`,
  log: (tenantId: string) => `webhooks_log:${tenantId}`,
};

export async function readJson<T>(prisma: PrismaService, key: string): Promise<T | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row?.value) return null;
  try { return JSON.parse(row.value) as T; } catch { return null; }
}

export async function writeJson(prisma: PrismaService, key: string, v: unknown) {
  const value = JSON.stringify(v);
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value, category: 'public_api', isPublic: false },
    update: { value },
  });
}

export async function removeKey(prisma: PrismaService, key: string) {
  await prisma.systemSetting.deleteMany({ where: { key } });
}

import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/common/constants/permissions.constants';

async function main() {
  const prisma = new PrismaClient();

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, role: true, permissions: true },
  });

  let updated = 0;

  for (const u of users) {
    const normalized = DEFAULT_ROLE_PERMISSIONS[u.role] ?? [];

    if (JSON.stringify(u.permissions ?? []) !== JSON.stringify(normalized)) {
      await prisma.user.update({
        where: { id: u.id },
        data: { permissions: normalized },
      });
      updated++;
      console.log(`✓ ${u.fullName} (${u.role}) -> ${normalized.length} permissions`);
    }
  }

  console.log(`Done. Normalized ${updated} users.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

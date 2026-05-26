import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/common/constants/permissions.constants';

async function main() {
  const prisma = new PrismaClient();

  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, role: true, permissions: true },
  });

  let updated = 0;

  for (const u of users) {
    const defaults = DEFAULT_ROLE_PERMISSIONS[u.role] ?? [];
    const merged = Array.from(new Set([...(u.permissions ?? []), ...defaults]));

    if (JSON.stringify(merged) !== JSON.stringify(u.permissions ?? [])) {
      await prisma.user.update({
        where: { id: u.id },
        data: { permissions: merged },
      });
      updated++;
      console.log(`✓ ${u.fullName} (${u.role}) -> ${merged.length} permissions`);
    }
  }

  console.log(`Done. Updated ${updated} users.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

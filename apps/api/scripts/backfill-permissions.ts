import { PrismaClient } from '@prisma/client';

const ALL_PERMISSIONS = [
  'pos.use', 'pos.discount', 'pos.refund',
  'products.view', 'products.create', 'products.edit', 'products.delete',
  'inventory.view', 'inventory.adjust', 'inventory.transfer',
  'customers.view', 'customers.edit',
  'reports.view', 'reports.export',
  'expenses.view', 'expenses.create',
  'team.view', 'team.manage',
  'settings.view', 'settings.edit',
  'activity.view',
  'billing.view', 'billing.manage',
];

const DEFAULTS: Record<string, string[]> = {
  OWNER: ALL_PERMISSIONS,
  MANAGER: [
    'pos.use', 'pos.discount', 'pos.refund',
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'inventory.view', 'inventory.adjust', 'inventory.transfer',
    'customers.view', 'customers.edit',
    'reports.view', 'reports.export',
    'expenses.view', 'expenses.create',
    'activity.view', 'settings.view',
  ],
  CASHIER: ['pos.use', 'products.view', 'customers.view'],
  STAFF: ['products.view', 'inventory.view'],
};

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    select: { id: true, role: true, permissions: true, fullName: true },
  });

  console.log(`Found ${users.length} users in database`);
  let updated = 0;
  let skipped = 0;

  for (const u of users) {
    if (!u.permissions || u.permissions.length === 0) {
      const perms = DEFAULTS[u.role] ?? [];
      await prisma.user.update({
        where: { id: u.id },
        data: { permissions: perms },
      });
      console.log(`  ✓ ${u.fullName} (${u.role}) → ${perms.length} permissions`);
      updated++;
    } else {
      console.log(`  - ${u.fullName} (${u.role}) already has ${u.permissions.length} permissions, skipping`);
      skipped++;
    }
  }

  console.log(`\n[+] Backfill complete: ${updated} updated, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Backfill failed:', e);
  process.exit(1);
});

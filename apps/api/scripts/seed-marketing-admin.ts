/**
 * Seed a MarketingAdmin row so non-SUPER_ADMIN users can access
 * /admin/marketing/* endpoints.
 *
 * Usage:
 *   npx tsx scripts/seed-marketing-admin.ts <email> [role]
 *
 * Roles: SUPER | MARKETING_MANAGER | CONTENT | ANALYST | AGENT
 * Example:
 *   npx tsx scripts/seed-marketing-admin.ts ali@nafaa.pk MARKETING_MANAGER
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const role = (process.argv[3] ?? 'MARKETING_MANAGER').toUpperCase();

  if (!email) {
    console.error('❌ Usage: npx tsx scripts/seed-marketing-admin.ts <email> [role]');
    process.exit(1);
  }
  const VALID = ['SUPER', 'MARKETING_MANAGER', 'CONTENT', 'ANALYST', 'AGENT'];
  if (!VALID.includes(role)) {
    console.error(`❌ Invalid role. Use one of: ${VALID.join(', ')}`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  const admin = await prisma.marketingAdmin.upsert({
    where: { userId: user.id },
    create: { userId: user.id, role, isActive: true },
    update: { role, isActive: true },
  });

  console.log('✅ Marketing admin ready:');
  console.log(`   user:  ${user.email} (${user.id})`);
  console.log(`   role:  ${admin.role}`);
  console.log(`   active: ${admin.isActive}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

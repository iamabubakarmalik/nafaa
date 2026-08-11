/**
 * Seed a MarketingAdmin row for the ADMIN-side auth system.
 * The guard checks: request.user (from JwtAuthGuard) → marketingAdmin.findUnique({ userId: user.id })
 *
 * This script:
 *   1. Looks up the admin user by email in the users table
 *   2. If not found, checks if there's a separate admin table
 *   3. Creates/updates the MarketingAdmin row
 *
 * Usage:
 *   npx tsx scripts/seed-marketing-admin-v2.ts admin@nafaa.pk MARKETING_MANAGER
 *   npx tsx scripts/seed-marketing-admin-v2.ts admin@nafaa.pk SUPER
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const role = (process.argv[3] ?? 'MARKETING_MANAGER').toUpperCase();

  if (!email) {
    console.error('❌ Usage: npx tsx scripts/seed-marketing-admin-v2.ts <email> [role]');
    process.exit(1);
  }

  const VALID = ['SUPER', 'MARKETING_MANAGER', 'CONTENT', 'ANALYST', 'AGENT'];
  if (!VALID.includes(role)) {
    console.error(`❌ Invalid role. Use: ${VALID.join(', ')}`);
    process.exit(1);
  }

  // Try users table first
  let userId: string | null = null;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (user) {
    userId = user.id;
    console.log(`✅ Found in users table: ${user.email} (${user.id}), role=${user.role}`);
  }

  // If not in users, check if admin module has its own table
  if (!userId) {
    try {
      // Try common admin table patterns
      const tables: any[] = await prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND (table_name ILIKE '%admin%' OR table_name ILIKE '%Admin%')
      `;
      console.log('Admin-related tables found:', tables.map((t: any) => t.table_name));

      // Try AdminUser model if it exists
      if ((prisma as any).adminUser) {
        const admin = await (prisma as any).adminUser.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        });
        if (admin) {
          userId = admin.id;
          console.log(`✅ Found in AdminUser table: ${admin.email} (${admin.id})`);
        }
      }
    } catch (e) {
      console.log('⚠️ Could not check admin tables:', (e as Error).message);
    }
  }

  if (!userId) {
    console.error(`\n❌ User "${email}" not found in users or admin tables.`);
    console.error('');
    console.error('Options:');
    console.error('  1. Create this user first via your admin signup/seed');
    console.error('  2. Or use an existing user email from the list:');
    
    const users = await prisma.user.findMany({
      select: { email: true, role: true },
      take: 10,
    });
    console.table(users);
    process.exit(1);
  }

  // Create/update MarketingAdmin
  const admin = await prisma.marketingAdmin.upsert({
    where: { userId },
    create: { userId, role, isActive: true },
    update: { role, isActive: true },
  });

  console.log('\n✅ Marketing admin seeded:');
  console.log(`   userId:  ${admin.userId}`);
  console.log(`   role:    ${admin.role}`);
  console.log(`   active:  ${admin.isActive}`);
  console.log(`   email:   ${email}`);
  console.log('\n🎯 Ab aap /admin/marketing/* endpoints access kar sakte ho.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

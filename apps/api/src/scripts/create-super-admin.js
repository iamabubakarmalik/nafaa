const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

async function main() {
  const prisma = new PrismaClient();

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('\n❌ Error: Missing required environment variables\n');
    console.error('   Set these in your .env file:');
    console.error('   - SUPER_ADMIN_EMAIL=your@email.com');
    console.error('   - SUPER_ADMIN_PASSWORD=YourStrongPassword');
    console.error('   - SUPER_ADMIN_NAME=Your Name (optional)\n');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('\n❌ Error: Password must be at least 12 characters long\n');
    process.exit(1);
  }

  console.log('\n🚀 Creating Super Admin...');
  console.log('   Email:', email);
  console.log('   Password: [hidden for security]\n');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === UserRole.SUPER_ADMIN) {
      console.log('✅ Super Admin already exists');
      await prisma.$disconnect();
      return;
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: UserRole.SUPER_ADMIN, isActive: true },
    });
    console.log('✅ Existing user upgraded to SUPER_ADMIN');
    await prisma.$disconnect();
    return;
  }

  let systemTenant = await prisma.tenant.findUnique({
    where: { slug: 'nafaa-system' },
  });

  if (!systemTenant) {
    systemTenant = await prisma.tenant.create({
      data: {
        name: 'Nafaa System',
        slug: 'nafaa-system',
        country: 'Pakistan',
        currency: 'PKR',
        status: 'ACTIVE',
        referralCode: 'NAFAA-SYS' + randomUUID().slice(0, 4).toUpperCase(),
      },
    });
    console.log('✅ System tenant created');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      tenantId: systemTenant.id,
      fullName,
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('\n✅ Super Admin created successfully!');
  console.log('   ID:', admin.id);
  console.log('\n👉 Login at http://localhost:5174 with the credentials from your .env file\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});

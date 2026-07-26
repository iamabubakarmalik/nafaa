const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const hash = await bcrypt.hash('Malik1324', 10);
  const user = await prisma.user.update({
    where: { email: 'demo@kiryana.pk' },
    data: { passwordHash: hash, emailVerified: true, isActive: true },
  });
  console.log('✅ Password reset ho gaya');
  console.log('   Email:    demo@kiryana.pk');
  console.log('   Password: Malik1324');
  console.log('   Hash:    ', hash);
  console.log('   User ID: ', user.id);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('❌', e);
  await prisma.$disconnect();
  process.exit(1);
});

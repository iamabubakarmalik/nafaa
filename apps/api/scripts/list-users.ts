import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.findMany({
  select: { email: true, role: true },
  take: 30,
  orderBy: { createdAt: 'asc' },
})
  .then((u) => console.table(u))
  .finally(() => p.$disconnect());

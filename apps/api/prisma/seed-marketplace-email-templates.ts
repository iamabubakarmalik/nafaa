import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      slug: 'customer-verify-email',
      name: 'Customer — Verify Email',
      subject: 'Verify your email — Nafaa Bazaar',
      htmlFile: 'customer-verify-email.hbs',
      description: 'OTP code to verify customer email',
    },
  ];

  for (const t of templates) {
    const html = fs.readFileSync(
      path.join(__dirname, `../src/modules/email/templates/${t.htmlFile}`),
      'utf-8',
    );

    await prisma.emailTemplate.upsert({
      where: { slug: t.slug },
      update: { subject: t.subject, htmlContent: html, name: t.name },
      create: {
        slug: t.slug,
        name: t.name,
        subject: t.subject,
        htmlContent: html,
        description: t.description,
        variables: ['name', 'code', 'appUrl', 'verifyUrl'],
        isSystem: true,
      },
    });
    console.log(`✅ Seeded: ${t.slug}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

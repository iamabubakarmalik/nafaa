import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/* ════════════════════════════════════════════════════════════
   EMAIL TEMPLATES SEEDER — Best Version
   ────────────────────────────────────────────────────────────
   • Type-safe (TemplateDef interface)
   • htmlFile har template me REQUIRED — ab TS error kabhi nahi
   • File missing ho to CLEAR error batayega (silent fail nahi)
   • AUTO-SCAN mode: folder me naya .html daalo → auto seed
   • Har template ka result table me print hota hai
   ════════════════════════════════════════════════════════════ */

interface TemplateDef {
  slug: string;
  name: string;
  subject: string;
  htmlFile: string;        // ✅ REQUIRED — purana bug yehi tha
  variables: string[];
  isActive?: boolean;
}

const TEMPLATES_DIR = path.join(__dirname, '../src/modules/email/templates');

/* ── 1. Explicit templates (slug/subject control chahiye to yahan) ── */
const templates: TemplateDef[] = [
  {
    slug: 'customer-verify-email',
    name: 'Customer — Verify Email',
    subject: 'Verify your email — Nafaa Bazaar',
    htmlFile: 'customer-verify-email.html',
    variables: ['name', 'code', 'appUrl', 'verifyUrl'],
  },
  {
    slug: 'customer-welcome',
    name: 'Customer — Welcome',
    subject: 'Welcome to Nafaa Bazaar 🎉',
    htmlFile: 'customer-welcome.html',
    variables: ['name', 'appUrl', 'shopName'],
  },
  {
    slug: 'customer-password-reset',
    name: 'Customer — Password Reset',
    subject: 'Reset your password — Nafaa Bazaar',
    htmlFile: 'customer-password-reset.html',
    variables: ['name', 'resetUrl', 'expiresIn'],
  },
  {
    slug: 'customer-order-confirmation',
    name: 'Customer — Order Confirmation',
    subject: 'Order confirmed — Nafaa Bazaar 🧾',
    htmlFile: 'customer-order-confirmation.html',
    variables: ['name', 'orderNumber', 'orderTotal', 'orderUrl', 'shopName'],
  },
  {
    slug: 'staff-invite',
    name: 'Staff — Invite',
    subject: 'You are invited — Nafaa',
    htmlFile: 'staff-invite.html',
    variables: ['name', 'inviterName', 'shopName', 'inviteUrl'],
  },
];

/* ── 2. AUTO-SCAN: folder me jo .html hai par upar listed nahi ──
      unko bhi seed kar do (slug = filename)                      */
function autoScanTemplates(existingSlugs: Set<string>): TemplateDef[] {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];

  return fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.html'))
    .map((f) => {
      const slug = f.replace(/\.html$/, '');
      return {
        slug,
        name: slug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        subject: `Nafaa — ${slug}`,
        htmlFile: f,
        variables: [] as string[],
      };
    })
    .filter((t) => !existingSlugs.has(t.slug));
}

/* ── Seeder ── */
async function seedTemplate(t: TemplateDef): Promise<'created' | 'updated'> {
  const filePath = path.join(TEMPLATES_DIR, t.htmlFile);

  // ✅ File missing ho to seedha clear error — chhupa hua bug nahi
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file nahi mili: ${filePath}`);
  }

  const html = fs.readFileSync(filePath, 'utf-8');

  const existing = await prisma.emailTemplate.findUnique({
    where: { slug: t.slug },
    select: { id: true },
  });

  await prisma.emailTemplate.upsert({
    where: { slug: t.slug },
    update: {
      name: t.name,
      subject: t.subject,
      bodyHtml: html,
      variables: t.variables,
      ...(t.isActive !== undefined ? { isActive: t.isActive } : {}),
    },
    create: {
      slug: t.slug,
      name: t.name,
      subject: t.subject,
      bodyHtml: html,
      variables: t.variables,
      isActive: t.isActive ?? true,
    },
  });

  return existing ? 'updated' : 'created';
}

async function main() {
  console.log('🌱 Seeding email templates...\n');

  // Explicit + auto-scanned merge
  const explicitSlugs = new Set(templates.map((t) => t.slug));
  const auto = autoScanTemplates(explicitSlugs);
  const all = [...templates, ...auto];

  if (auto.length > 0) {
    console.log(`🔍 Auto-scan se ${auto.length} extra template(s) mile: ${auto.map((t) => t.slug).join(', ')}\n`);
  }

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const t of all) {
    try {
      const result = await seedTemplate(t);
      if (result === 'created') {
        created++;
        console.log(`  ✅ CREATED  ${t.slug}`);
      } else {
        updated++;
        console.log(`  ♻️  UPDATED  ${t.slug}`);
      }
    } catch (err: any) {
      failed++;
      console.error(`  ❌ FAILED   ${t.slug} — ${err.message}`);
    }
  }

  console.log('\n════════════════════════════════');
  console.log(`  Done: ${created} created, ${updated} updated, ${failed} failed`);
  console.log('════════════════════════════════\n');

  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('💥 Seeder crash:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

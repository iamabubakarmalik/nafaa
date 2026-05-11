import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    slug: 'welcome',
    name: 'Welcome Email',
    subject: 'Khush Aamdeed {{name}} — Welcome to Nafaa! 🎉',
    bodyHtml: `<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" style="padding:40px 20px"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:40px;text-align:center">
  <h1 style="color:#fff;margin:0;font-size:32px">🎉 Khush Aamdeed!</h1>
  <p style="color:#dcfce7;margin:8px 0 0;font-size:16px">Aap ka Nafaa account ready hai</p>
</td></tr>
<tr><td style="padding:32px">
  <p style="font-size:16px;color:#0f172a">Assalam-o-Alaikum <strong>{{name}}</strong>,</p>
  <p style="font-size:14px;color:#475569;line-height:1.7">
    <strong>{{shopName}}</strong> ko Nafaa pe register karne ka shukriya! Ab aap apne business ko digital banane ke liye tayar hain.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:28px auto">
    <tr><td style="background:#16a34a;border-radius:12px;padding:14px 32px">
      <a href="{{loginUrl}}" style="color:#fff;text-decoration:none;font-weight:bold;font-size:15px">Dashboard kholein →</a>
    </td></tr>
  </table>
  <h3 style="color:#0f172a;font-size:16px;margin-top:24px">✨ Aap kya kar sakte hain:</h3>
  <ul style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px">
    <li>📦 Products add karein aur inventory manage karein</li>
    <li>🛒 POS se sales karein</li>
    <li>📚 Khata book mein udhaar track karein</li>
    <li>📊 Reports dekhein aur profit calculate karein</li>
    <li>👥 Team members add karein</li>
  </ul>
  <p style="font-size:13px;color:#64748b;margin-top:24px">Koi sawaal ho? Email karein: <a href="mailto:support@nafaa.pk" style="color:#16a34a">support@nafaa.pk</a></p>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0">
  <p style="font-size:12px;color:#94a3b8;margin:0">Made with ❤️ in Pakistan 🇵🇰</p>
</td></tr>
</table></td></tr></table></body></html>`,
    bodyText: `Khush Aamdeed {{name}}! {{shopName}} ko Nafaa pe register karne ka shukriya. Dashboard kholein: {{loginUrl}}`,
    isActive: true,
  },
  {
    slug: 'otp-code',
    name: 'OTP Code',
    subject: 'Your Nafaa OTP: {{code}}',
    bodyHtml: `<!DOCTYPE html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" style="padding:40px 20px"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#16a34a;padding:32px;text-align:center">
  <h1 style="color:#fff;margin:0;font-size:24px">🔐 Verification Code</h1>
</td></tr>
<tr><td style="padding:32px;text-align:center">
  <p style="font-size:15px;color:#475569">Aap ka OTP code hai:</p>
  <div style="font-size:42px;font-weight:bold;color:#16a34a;letter-spacing:8px;margin:24px 0;padding:20px;background:#f0fdf4;border-radius:12px">{{code}}</div>
  <p style="font-size:13px;color:#dc2626;background:#fee2e2;padding:12px;border-radius:8px">⏰ Ye code sirf <strong>10 minutes</strong> ke liye valid hai</p>
  <p style="font-size:13px;color:#94a3b8;margin-top:20px">Agar aap ne request nahi kiya, is email ko ignore karein.</p>
</td></tr>
</table></td></tr></table></body></html>`,
    bodyText: `Aap ka Nafaa OTP code hai: {{code}}. Ye code 10 minutes ke liye valid hai.`,
    isActive: true,
  },
];

async function main() {
  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { slug: t.slug },
      create: t,
      update: t,
    });
    console.log(`✅ Seeded template: ${t.slug}`);
  }
}

main().finally(() => prisma.$disconnect());

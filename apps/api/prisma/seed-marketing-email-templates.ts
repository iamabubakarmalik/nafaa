import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BRAND = '#12b76a';

const layout = (title: string, body: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:${BRAND};padding:24px 32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">Nafaa</span>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">${title}</h1>
      ${body}
    </div>
    <div style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
      <p style="margin:0;font-size:12px;color:#71717a;">Nafaa Technologies · Gujranwala, Pakistan · <a href="https://nafaa.pk" style="color:${BRAND};">nafaa.pk</a></p>
    </div>
  </div>
</body></html>`;

const p = (text: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f46;">${text}</p>`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;margin:8px 0;">${label}</a>`;

const templates = [
  {
    slug: 'newsletter-welcome',
    name: 'Newsletter — Welcome',
    subject: 'Welcome to Nafaa — Pakistan ka POS newsletter 🎉',
    bodyHtml: layout(
      'Welcome aboard! 🎉',
      p('Assalam-o-Alaikum{{#if firstName}} {{firstName}}{{/if}},') +
        p('Aap Nafaa newsletter ke subscriber ban gaye hain. Har hafte hum bhejenge:') +
        `<ul style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.8;color:#3f3f46;">
           <li>Retail & POS growth tips (Pakistan market)</li>
           <li>FBR invoicing & compliance updates</li>
           <li>Nafaa feature releases & offers</li>
         </ul>` +
        btn('https://nafaa.pk/product', 'Explore Nafaa') +
        p('<span style="font-size:13px;color:#71717a;">Unsubscribe anytime: <a href="https://nafaa.pk/unsubscribe?email={{email}}" style="color:#71717a;">click here</a></span>'),
    ),
    bodyText: 'Welcome to Nafaa newsletter! Weekly retail & POS tips. Unsubscribe: https://nafaa.pk/unsubscribe?email={{email}}',
    variables: { email: 'string', firstName: 'string?' },
  },
  {
    slug: 'contact-form-received',
    name: 'Contact Form — Auto Confirmation',
    subject: 'We received your message — ticket {{ticketNumber}}',
    bodyHtml: layout(
      'Message received ✅',
      p('Thank you for contacting Nafaa. Your inquiry has been logged:') +
        `<div style="background:#f4f4f5;border-radius:10px;padding:16px;margin:0 0 14px;">
           <p style="margin:0 0 6px;font-size:14px;color:#3f3f46;"><strong>Ticket:</strong> {{ticketNumber}}</p>
           <p style="margin:0;font-size:14px;color:#3f3f46;"><strong>Subject:</strong> {{subject}}</p>
         </div>` +
        p('Our team replies <strong>within 24 hours</strong> (Mon–Fri, 9 AM – 9 PM PKT). For urgent queries, WhatsApp us at <a href="https://wa.me/923241772933" style="color:${BRAND};">+92 324 1772933</a>.'),
    ),
    bodyText: 'We received your message. Ticket: {{ticketNumber}} — {{subject}}. We reply within 24 hours.',
    variables: { ticketNumber: 'string', subject: 'string' },
  },
  {
    slug: 'contact-form-internal-alert',
    name: 'Contact Form — Internal Alert (Admin)',
    subject: '🔔 New contact form: {{ticketNumber}} — {{subject}}',
    bodyHtml: layout(
      'New contact form submission',
      `<div style="background:#f4f4f5;border-radius:10px;padding:16px;margin:0 0 14px;">
         <p style="margin:0 0 6px;font-size:14px;color:#3f3f46;"><strong>Ticket:</strong> {{ticketNumber}}</p>
         <p style="margin:0 0 6px;font-size:14px;color:#3f3f46;"><strong>From:</strong> {{senderName}} &lt;{{senderEmail}}&gt;</p>
         <p style="margin:0;font-size:14px;color:#3f3f46;"><strong>Subject:</strong> {{subject}}</p>
       </div>` +
        `<div style="border-left:3px solid ${BRAND};padding:12px 16px;background:#fafafa;margin:0 0 14px;">
           <p style="margin:0;font-size:14px;line-height:1.6;color:#3f3f46;white-space:pre-wrap;">{{message}}</p>
         </div>` +
        btn('https://admin.nafaa.pk/marketing/contact-forms', 'Open in Admin Panel'),
    ),
    bodyText: 'New contact form {{ticketNumber}} from {{senderName}} ({{senderEmail}}): {{subject}}\n\n{{message}}',
    variables: { ticketNumber: 'string', senderName: 'string', senderEmail: 'string', subject: 'string', message: 'string' },
  },
  {
    slug: 'demo-booking-received',
    name: 'Demo Booking — Customer Confirmation',
    subject: 'Your Nafaa demo is booked 📅',
    bodyHtml: layout(
      'Demo booked! 📅',
      p('Thank you for booking a Nafaa demo. Our team will confirm your slot shortly.') +
        `<div style="background:#f4f4f5;border-radius:10px;padding:16px;margin:0 0 14px;">
           <p style="margin:0 0 6px;font-size:14px;color:#3f3f46;"><strong>Booking:</strong> {{bookingNumber}}</p>
           <p style="margin:0 0 6px;font-size:14px;color:#3f3f46;"><strong>Date:</strong> {{preferredDate}}</p>
           <p style="margin:0;font-size:14px;color:#3f3f46;"><strong>Time:</strong> {{preferredTime}} (PKT)</p>
         </div>` +
        p('The demo takes ~30 minutes: POS walkthrough, FBR integration, aur aapke business ka workflow — sab cover hoga.') +
        btn('https://wa.me/923241772933', 'Reschedule via WhatsApp'),
    ),
    bodyText: 'Your Nafaa demo is booked ({{bookingNumber}}) for {{preferredDate}} at {{preferredTime}} PKT.',
    variables: { bookingNumber: 'string', preferredDate: 'string', preferredTime: 'string' },
  },
  {
    slug: 'demo-booking-internal-alert',
    name: 'Demo Booking — Internal Alert (Admin)',
    subject: '🔥 New demo booking: {{bookingNumber}} — {{companyName}}',
    bodyHtml: layout(
      'New demo booking (HOT lead)',
      `<div style="background:#fef3c7;border-radius:10px;padding:16px;margin:0 0 14px;">
         <p style="margin:0 0 6px;font-size:14px;color:#3f3f46;"><strong>Booking:</strong> {{bookingNumber}}</p>
         <p style="margin:0 0 6px;font-size:14px;color:#3f3f46;"><strong>Name:</strong> {{fullName}} ({{email}}, {{phone}})</p>
         <p style="margin:0 0 6px;font-size:14px;color:#3f3f46;"><strong>Company:</strong> {{companyName}} — {{industry}}</p>
         <p style="margin:0;font-size:14px;color:#3f3f46;"><strong>Requested:</strong> {{preferredDate}} at {{preferredTime}}</p>
       </div>` +
        btn('https://admin.nafaa.pk/marketing/demo-bookings', 'Open Demo Bookings'),
    ),
    bodyText: 'New demo booking {{bookingNumber}}: {{fullName}} ({{companyName}}) — {{preferredDate}} {{preferredTime}}.',
    variables: { bookingNumber: 'string', fullName: 'string', email: 'string', phone: 'string', companyName: 'string', industry: 'string', preferredDate: 'string', preferredTime: 'string' },
  },
];

async function main() {
  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { slug: t.slug },
      update: { name: t.name, subject: t.subject, bodyHtml: t.bodyHtml, bodyText: t.bodyText, variables: t.variables as any, isActive: true },
      create: { slug: t.slug, name: t.name, subject: t.subject, bodyHtml: t.bodyHtml, bodyText: t.bodyText, variables: t.variables as any, isActive: true },
    });
    console.log(`✅ ${t.slug}`);
  }
  console.log(`\n🎉 ${templates.length} marketing email templates seeded`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

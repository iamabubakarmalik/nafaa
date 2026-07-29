// Email templates — HTML strings ready for Resend / SendGrid / any ESP.
// All branded with Nafaa design, bilingual-ready.

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

const shell = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#12b76a,#027a48);padding:32px 40px;">
          <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Nafaa</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Pakistan's #1 Business Platform</div>
        </td></tr>
        <tr><td style="padding:40px;">${body}</td></tr>
        <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
            Nafaa Technologies · Citi Housing Phase 1, Gujranwala, Pakistan<br>
            <a href="${BASE_URL}" style="color:#12b76a;text-decoration:none;">nafaa.pk</a> ·
            <a href="mailto:support@nafaa.pk" style="color:#12b76a;text-decoration:none;">support@nafaa.pk</a> ·
            <a href="${BASE_URL}/privacy" style="color:#6b7280;text-decoration:none;">Privacy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (href: string, label: string) => `
  <a href="${href}" style="display:inline-block;background:#12b76a;color:#ffffff;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;margin:8px 0;">${label}</a>`;

export const emailTemplates = {
  welcome: (name: string) => shell('Welcome to Nafaa', `
    <h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#0a0e27;">Welcome to Nafaa, ${name}! 🎉</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">You are all set. Your free Nafaa account is ready — no credit card, no commitment.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">Here is what to do next:</p>
    <ol style="margin:0 0 24px;padding-left:20px;font-size:16px;line-height:1.8;color:#374151;">
      <li>Add your first products (Excel import takes 2 minutes)</li>
      <li>Make your first sale — try the playground if you want to practice</li>
      <li>Set up WhatsApp receipts for instant customer trust</li>
    </ol>
    ${btn(`${APP_URL}/dashboard`, 'Open your dashboard')}
    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">Questions? Reply to this email or WhatsApp us at +92 324 1772933.</p>
  `),

  trialReminder: (name: string, daysLeft: number) => shell(`${daysLeft} days left in your trial`, `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0a0e27;">${name}, your trial ends in ${daysLeft} days</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">You have been running your business on Nafaa — do not lose your data and momentum when the trial ends.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#166534;"><strong>What you keep:</strong> all products, sales history, customers, khata records, and reports.</p>
    </div>
    ${btn(`${APP_URL}/billing`, 'Choose your plan')}
    <p style="margin:16px 0 0;font-size:14px;color:#6b7280;">Plans start at Rs 2,500/month. 30-day money-back guarantee.</p>
  `),

  trialEnded: (name: string) => shell('Your Nafaa trial has ended', `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0a0e27;">Your trial ended, ${name}</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Your data is safely preserved for 90 days. Pick a plan to continue — or start fresh anytime.</p>
    ${btn(`${APP_URL}/billing`, 'Reactivate now')}
    <p style="margin:16px 0 0;font-size:14px;color:#6b7280;">Starter plan is free forever if you want to keep going without paid features.</p>
  `),

  newsletter: (email: string) => shell('You are subscribed', `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0a0e27;">You are in! 📬</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">You will now receive weekly business insights, Pakistani retail trends, and Nafaa product updates.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">No spam. Unsubscribe anytime with one click.</p>
    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">Sent to ${email}</p>
  `),

  contactReceived: (name: string, topic: string) => shell('We received your message', `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0a0e27;">Got it, ${name}!</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">We received your message about <strong>${topic}</strong>. Our team will reply within 24 hours — usually much faster.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#1e40af;">💡 For the fastest response, WhatsApp us at <a href="https://wa.me/923241772933" style="color:#1e40af;font-weight:700;">+92 324 1772933</a></p>
    </div>
  `),

  partnerWelcome: (name: string) => shell('Welcome to the Nafaa Partner Program', `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0a0e27;">You are a Nafaa Partner now, ${name}! 🤝</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">You earn 30% recurring commission on every customer you refer — forever.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Your partner portal is ready with your unique referral link, marketing materials, and live commission tracking.</p>
    ${btn(`${APP_URL}/partner-dashboard`, 'Open partner portal')}
    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">Your dedicated partner manager will reach out within 24 hours.</p>
  `),

  demoBooked: (name: string, day: string, time: string) => shell('Your Nafaa demo is booked', `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0a0e27;">See you soon, ${name}! 📅</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Your personalized demo is confirmed:</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#0a0e27;">${day}</div>
      <div style="font-size:18px;color:#374151;margin-top:4px;">${time} · 30 minutes · Google Meet</div>
    </div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">A calendar invite has been sent. Come with your questions — we will show you Nafaa on your industry.</p>
    <p style="margin:16px 0 0;font-size:14px;color:#6b7280;">Need to reschedule? Reply to this email.</p>
  `),

  migrationComplete: (name: string, count: number) => shell('Your data migration is complete!', `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0a0e27;">You are fully migrated, ${name}! 🎉</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">We have moved <strong>${count.toLocaleString()} records</strong> from your old system into Nafaa — zero data loss, verified field by field.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Your products, customers, sales history, and khata balances are all live and ready.</p>
    ${btn(`${APP_URL}/dashboard`, 'See your migrated data')}
  `),
};

export type EmailTemplateKey = keyof typeof emailTemplates;

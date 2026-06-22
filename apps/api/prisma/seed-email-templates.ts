import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Base Layout Helper ──────────────────────────────────────
const baseLayout = (content: string, footerNote = 'Made with ❤️ in Pakistan 🇵🇰') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.1);">
          ${content}
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin-top:24px;">
          <tr>
            <td align="center" style="padding:16px;">
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                © ${new Date().getFullYear()} <strong>Nafaa</strong> — Pakistan-first Retail OS<br/>
                ${footerNote}
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">
                <a href="{{appUrl}}/settings" style="color:#16a34a;text-decoration:none;">Email Preferences</a>
                &nbsp;•&nbsp;
                <a href="{{appUrl}}/help" style="color:#16a34a;text-decoration:none;">Help Center</a>
                &nbsp;•&nbsp;
                <a href="{{appUrl}}/legal" style="color:#16a34a;text-decoration:none;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const greenHeader = (title: string, subtitle: string) => `
<tr>
  <td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 50%,#166534 100%);padding:48px 40px;text-align:center;position:relative;">
    <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:-0.5px;">${title}</h1>
    <p style="margin:12px 0 0;color:#dcfce7;font-size:15px;font-weight:500;">${subtitle}</p>
  </td>
</tr>`;

const amberHeader = (title: string, subtitle: string) => `
<tr>
  <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 50%,#b45309 100%);padding:48px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:-0.5px;">${title}</h1>
    <p style="margin:12px 0 0;color:#fef3c7;font-size:15px;font-weight:500;">${subtitle}</p>
  </td>
</tr>`;

const roseHeader = (title: string, subtitle: string) => `
<tr>
  <td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 50%,#991b1b 100%);padding:48px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:-0.5px;">${title}</h1>
    <p style="margin:12px 0 0;color:#fee2e2;font-size:15px;font-weight:500;">${subtitle}</p>
  </td>
</tr>`;

const blueHeader = (title: string, subtitle: string) => `
<tr>
  <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 50%,#1e40af 100%);padding:48px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:-0.5px;">${title}</h1>
    <p style="margin:12px 0 0;color:#dbeafe;font-size:15px;font-weight:500;">${subtitle}</p>
  </td>
</tr>`;

const violetHeader = (title: string, subtitle: string) => `
<tr>
  <td style="background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 50%,#5b21b6 100%);padding:48px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:-0.5px;">${title}</h1>
    <p style="margin:12px 0 0;color:#ede9fe;font-size:15px;font-weight:500;">${subtitle}</p>
  </td>
</tr>`;

const button = (text: string, url: string, color = '#16a34a') => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;">
  <tr>
    <td style="border-radius:12px;background:${color};box-shadow:0 4px 12px ${color}40;">
      <a href="${url}" style="display:inline-block;padding:16px 36px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">${text}</a>
    </td>
  </tr>
</table>`;

// ═══════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const templates = [
  // ───────────────────────────────────────────────────────────
  // 1. WELCOME EMAIL (after signup)
  // ───────────────────────────────────────────────────────────
  {
    slug: 'welcome',
    name: 'Welcome Email',
    subject: '🎉 Khush Amdeed {{name}} — {{shopName}} ka safar shuru!',
    bodyHtml: baseLayout(`
      ${greenHeader('Khush Amdeed! 🎉', 'Aap ka Nafaa account ban gaya')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            <strong>{{shopName}}</strong> Nafaa par successfully register ho gaya hai! 🎊
            Aap ka <strong style="color:#16a34a;">7 din ka FREE trial</strong> abhi shuru ho gaya hai.
          </p>

          <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:24px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#15803d;font-size:18px;font-weight:700;">✨ Aap kya kar sakte hain:</h3>
            <ul style="margin:0;padding-left:20px;color:#166534;font-size:14px;line-height:1.9;">
              <li>POS se bills banayein (cash, card, JazzCash, EasyPaisa)</li>
              <li>Products aur stock manage karein</li>
              <li>Customers ka khata (udhaar) track karein</li>
              <li>Daily profit aur reports dekhain</li>
              <li>Multiple shops aur staff add karein</li>
            </ul>
          </div>

          ${button('Dashboard Kholein →', '{{loginUrl}}')}

          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:8px;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">
              💡 <strong>Pro Tip:</strong> Pehle onboarding complete karein takay aap ka shop perfect setup ho jaye.
              Bas 6 quick steps hain!
            </p>
          </div>

          <p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.6;">
            Koi sawal? Reply karein is email par — hum mauzood hain! 🤝<br/>
            <strong style="color:#16a34a;">— Nafaa Team</strong>
          </p>
        </td>
      </tr>
    `),
    bodyText: `Khush Amdeed {{name}}! Aap ka {{shopName}} Nafaa par register ho gaya hai. 7 din free trial shuru. Login: {{loginUrl}}`,
    variables: { name: 'string', shopName: 'string', loginUrl: 'string', appUrl: 'string' },
  },

  // ───────────────────────────────────────────────────────────
  // 2. EMAIL VERIFICATION (OTP)
  // ───────────────────────────────────────────────────────────
  {
    slug: 'email-verify',
    name: 'Email Verification OTP',
    subject: '🔐 Nafaa Verification Code: {{code}}',
    bodyHtml: baseLayout(`
      ${greenHeader('Email Verify Karein 🔐', 'Aap ka 6-digit code')}
      <tr>
        <td style="padding:40px;text-align:center;">
          <p style="margin:0 0 24px;font-size:16px;color:#1e293b;line-height:1.6;text-align:left;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;text-align:left;">
            Aap ka email verify karne ke liye ye 6-digit code use karein:
          </p>

          <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:3px solid #16a34a;border-radius:20px;padding:32px;margin:24px 0;">
            <div style="font-size:48px;font-weight:900;color:#15803d;letter-spacing:12px;font-family:'Courier New',monospace;">
              {{code}}
            </div>
          </div>

          <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:16px;margin:24px 0;text-align:left;">
            <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">
              ⏰ <strong>10 minutes</strong> ke liye valid hai. Kisi ko share na karein.
            </p>
          </div>

          <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;text-align:left;">
            Agar aap ne ye request nahi ki to is email ko ignore karein.
          </p>
        </td>
      </tr>
    `),
    bodyText: `Aap ka Nafaa verification code: {{code}} (10 min valid)`,
    variables: { name: 'string', code: 'string', appUrl: 'string' },
  },

  // ───────────────────────────────────────────────────────────
  // 3. PASSWORD RESET
  // ───────────────────────────────────────────────────────────
  {
    slug: 'password-reset',
    name: 'Password Reset',
    subject: '🔐 Password Reset Request — {{shopName}}',
    bodyHtml: baseLayout(`
      ${blueHeader('Password Reset 🔐', '{{shopName}}')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            Hum ne aap ki password reset request receive ki. Naya password set karne ke liye neeche button par click karein:
          </p>

          ${button('Reset Password →', '{{resetUrl}}', '#2563eb')}

          <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;border-radius:8px;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">
              ⏰ Link sirf <strong>1 ghante</strong> ke liye valid hai.<br/>
              🔒 Agar aap ne request nahi ki to is email ko ignore karein.
            </p>
          </div>

          <p style="margin:24px 0 0;font-size:13px;color:#64748b;word-break:break-all;">
            Button kaam nahi kar raha? Ye link copy karein:<br/>
            <a href="{{resetUrl}}" style="color:#2563eb;font-size:12px;">{{resetUrl}}</a>
          </p>
        </td>
      </tr>
    `),
    bodyText: `Password reset link: {{resetUrl}} (1 hour valid)`,
    variables: { name: 'string', resetUrl: 'string', shopName: 'string', appUrl: 'string' },
  },

  // ───────────────────────────────────────────────────────────
  // 4. NEW DEVICE LOGIN ALERT
  // ───────────────────────────────────────────────────────────
  {
    slug: 'new-device-login',
    name: 'New Device Login Alert',
    subject: '🚨 New Device Login Detected — {{shopName}}',
    bodyHtml: baseLayout(`
      ${amberHeader('Naye Device Se Login 🚨', 'Security Alert')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            Hum ne detect kiya ke aap ke <strong>{{shopName}}</strong> account mein naye device se login hua hai:
          </p>

          <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:16px;padding:20px;margin:24px 0;">
            <table style="width:100%;font-size:14px;">
              <tr>
                <td style="padding:8px 0;color:#64748b;width:40%;">📱 Device:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;">{{device}}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;">🌐 Browser:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;">{{browser}}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;">📍 Location:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;">{{location}}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;">🌐 IP Address:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;font-family:monospace;">{{ipAddress}}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;">⏰ Time:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;">{{loginTime}}</td>
              </tr>
            </table>
          </div>

          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #fbbf24;border-radius:16px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 12px;font-size:14px;color:#92400e;font-weight:700;">
              ✅ Agar ye aap thay:
            </p>
            <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
              Koi action ki zaroorat nahi — sab kuch theek hai!
            </p>
          </div>

          <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:16px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 12px;font-size:14px;color:#991b1b;font-weight:700;">
              ⚠️ Agar ye aap NAHI thay:
            </p>
            <p style="margin:0 0 12px;font-size:13px;color:#7f1d1d;line-height:1.6;">
              Foran ye actions lein:
            </p>
            <ol style="margin:0;padding-left:20px;font-size:13px;color:#7f1d1d;line-height:1.8;">
              <li>Apna password change karein</li>
              <li>Sare devices se logout karein</li>
              <li>Hum se contact karein</li>
            </ol>
          </div>

          ${button('Account Secure Karein →', '{{appUrl}}/settings', '#dc2626')}
        </td>
      </tr>
    `),
    bodyText: `New device login detected on {{shopName}}. Device: {{device}}, Location: {{location}}, IP: {{ipAddress}}. If not you, change password immediately.`,
    variables: {
      name: 'string', shopName: 'string', device: 'string', browser: 'string',
      location: 'string', ipAddress: 'string', loginTime: 'string', appUrl: 'string',
    },
  },

  // ───────────────────────────────────────────────────────────
  // 5. TEAM MEMBER INVITED (Password set link)
  // ───────────────────────────────────────────────────────────
  {
    slug: 'team-member-invited',
    name: 'Team Member Invitation',
    subject: '👋 {{shopName}} ne aap ko team mein add kiya hai',
    bodyHtml: baseLayout(`
      ${violetHeader('Team Mein Khush Amdeed! 👋', 'Aap ko {{shopName}} ne invite kiya')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            <strong>{{ownerName}}</strong> ne aap ko <strong>{{shopName}}</strong> ki team mein
            <strong style="color:#7c3aed;">{{role}}</strong> ke roop mein add kiya hai.
          </p>

          <div style="background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:2px solid #a78bfa;border-radius:16px;padding:24px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#5b21b6;font-size:16px;font-weight:700;">🔑 Aap ke Login Credentials:</h3>
            <table style="width:100%;font-size:14px;">
              <tr>
                <td style="padding:8px 0;color:#6d28d9;width:30%;">Email:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;">{{email}}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6d28d9;">Temp Password:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:700;font-family:monospace;background:#fff;padding:6px 10px;border-radius:6px;display:inline-block;">{{tempPassword}}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6d28d9;">Role:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;">{{role}}</td>
              </tr>
            </table>
          </div>

          ${button('Login Karein →', '{{loginUrl}}', '#7c3aed')}

          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:8px;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">
              🔒 <strong>Important:</strong> Login ke baad foran apna password change karein.
              Settings → Change Password se naya password set karein.
            </p>
          </div>
        </td>
      </tr>
    `),
    bodyText: `{{ownerName}} ne aap ko {{shopName}} mein {{role}} ke roop mein add kiya. Email: {{email}}, Temp Password: {{tempPassword}}. Login: {{loginUrl}}`,
    variables: {
      name: 'string', ownerName: 'string', shopName: 'string', email: 'string',
      tempPassword: 'string', role: 'string', loginUrl: 'string', appUrl: 'string',
    },
  },

  // ───────────────────────────────────────────────────────────
  // 6. ONBOARDING COMPLETE
  // ───────────────────────────────────────────────────────────
  {
    slug: 'onboarding-complete',
    name: 'Onboarding Complete',
    subject: '🎊 Mubarak ho! {{shopName}} ab production-ready hai',
    bodyHtml: baseLayout(`
      ${greenHeader('Mubarak Ho! 🎊', 'Aap ka shop fully setup ho gaya')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            <strong>{{shopName}}</strong> ab Nafaa par fully configured hai! 🚀
            Aap ne onboarding successfully complete kar liya hai.
          </p>

          <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:24px;margin:24px 0;">
            <h3 style="margin:0 0 16px;color:#15803d;font-size:18px;font-weight:700;">✅ Configured Successfully:</h3>
            <div style="display:grid;gap:8px;">
              <p style="margin:0;font-size:14px;color:#166534;">✓ Business type: <strong>{{businessType}}</strong></p>
              <p style="margin:0;font-size:14px;color:#166534;">✓ {{categoriesCount}} categories</p>
              <p style="margin:0;font-size:14px;color:#166534;">✓ {{paymentMethodsCount}} payment methods</p>
              <p style="margin:0;font-size:14px;color:#166534;">✓ {{productsCount}} products added</p>
              <p style="margin:0;font-size:14px;color:#166534;">✓ {{teamCount}} team members</p>
            </div>
          </div>

          ${button('Dashboard Kholein →', '{{appUrl}}/dashboard')}

          <h3 style="margin:32px 0 12px;color:#1e293b;font-size:18px;font-weight:700;">🎯 Ab Kya Karein:</h3>
          <ol style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.9;">
            <li><strong>POS try karein</strong> — Pehli sale banayein</li>
            <li><strong>Customers add karein</strong> — Khata system shuru karein</li>
            <li><strong>Reports dekhain</strong> — Daily profit track karein</li>
            <li><strong>Settings explore karein</strong> — Apni preferences set karein</li>
          </ol>

          <p style="margin:32px 0 0;font-size:14px;color:#64748b;line-height:1.6;">
            Help chahiye? Hum 24/7 mauzood hain — bas reply karein! 🤝<br/>
            <strong style="color:#16a34a;">— Nafaa Team</strong>
          </p>
        </td>
      </tr>
    `),
    bodyText: `Mubarak ho {{name}}! {{shopName}} ka setup complete ho gaya. Dashboard: {{appUrl}}/dashboard`,
    variables: {
      name: 'string', shopName: 'string', businessType: 'string',
      categoriesCount: 'number', paymentMethodsCount: 'number',
      productsCount: 'number', teamCount: 'number', appUrl: 'string',
    },
  },

  // ───────────────────────────────────────────────────────────
  // 7. TRIAL EXPIRING SOON (3 days left)
  // ───────────────────────────────────────────────────────────
  {
    slug: 'trial-expiring-soon',
    name: 'Trial Expiring Soon',
    subject: '⏰ {{daysLeft}} din baki — {{shopName}} ka trial khatam ho raha hai',
    bodyHtml: baseLayout(`
      ${amberHeader('Trial Khatam Ho Raha Hai ⏰', '{{daysLeft}} din baki hain')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            <strong>{{shopName}}</strong> ka free trial sirf <strong style="color:#dc2626;">{{daysLeft}} din</strong>
            mein khatam ho raha hai. Apna service continue rakhne ke liye abhi subscribe karein.
          </p>

          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #fbbf24;border-radius:16px;padding:24px;margin:24px 0;text-align:center;">
            <div style="font-size:14px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Trial Ends On</div>
            <div style="font-size:28px;color:#78350f;font-weight:900;margin-top:8px;">{{trialEndDate}}</div>
          </div>

          <h3 style="margin:24px 0 12px;color:#1e293b;font-size:16px;font-weight:700;">⚠️ Subscribe na karne par:</h3>
          <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:1.9;">
            <li>POS aur sales bandhi ho jayengi</li>
            <li>New products add nahi kar paayenge</li>
            <li>Reports access nahi hoga</li>
            <li>Customer data preserve rahega lekin readonly</li>
          </ul>

          ${button('Plans Dekhain & Subscribe Karein →', '{{appUrl}}/plans', '#dc2626')}

          <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border:2px solid #86efac;border-radius:16px;padding:20px;margin:24px 0;">
            <p style="margin:0;font-size:14px;color:#15803d;font-weight:700;">
              💚 <strong>Special Offer:</strong> Yearly plan par <strong>20% discount</strong> milta hai!
            </p>
          </div>
        </td>
      </tr>
    `),
    bodyText: `{{shopName}} ka trial {{daysLeft}} din mein khatam ho raha hai ({{trialEndDate}}). Subscribe: {{appUrl}}/plans`,
    variables: {
      name: 'string', shopName: 'string', daysLeft: 'number',
      trialEndDate: 'string', appUrl: 'string',
    },
  },

  // ───────────────────────────────────────────────────────────
  // 8. TRIAL EXPIRED
  // ───────────────────────────────────────────────────────────
  {
    slug: 'trial-expired',
    name: 'Trial Expired',
    subject: '❌ Aap ka trial khatam ho gaya — {{shopName}}',
    bodyHtml: baseLayout(`
      ${roseHeader('Trial Expired ❌', 'Subscribe karke continue karein')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            <strong>{{shopName}}</strong> ka free trial khatam ho chuka hai. 😔
            Aap ka data safe hai lekin features access nahi ho rahe.
          </p>

          <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:16px;padding:24px;margin:24px 0;text-align:center;">
            <p style="margin:0;font-size:16px;color:#991b1b;font-weight:700;">
              ⚠️ Aap ka account suspend ho gaya hai
            </p>
            <p style="margin:8px 0 0;font-size:14px;color:#7f1d1d;">
              Subscribe karke foran restore karein
            </p>
          </div>

          ${button('Abhi Subscribe Karein →', '{{appUrl}}/plans', '#dc2626')}

          <h3 style="margin:24px 0 12px;color:#1e293b;font-size:16px;font-weight:700;">📦 Aap ka data:</h3>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.9;">
            <li>✅ Sare products preserved hain</li>
            <li>✅ Customer khata records safe hain</li>
            <li>✅ Sales history available rahegi</li>
            <li>✅ Subscribe karte hi sab restore ho jayega</li>
          </ul>

          <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
            Koi sawal ya help chahiye? Reply karein is email par.
          </p>
        </td>
      </tr>
    `),
    bodyText: `{{shopName}} ka trial expire ho gaya. Subscribe: {{appUrl}}/plans`,
    variables: { name: 'string', shopName: 'string', appUrl: 'string' },
  },

  // ───────────────────────────────────────────────────────────
  // 9. SUBSCRIPTION PAYMENT SUBMITTED (waiting approval)
  // ───────────────────────────────────────────────────────────
  {
    slug: 'payment-submitted',
    name: 'Payment Submitted',
    subject: '✅ Payment receive ho gaya — Approval pending',
    bodyHtml: baseLayout(`
      ${blueHeader('Payment Submitted! ✅', 'Admin approval pending')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            Aap ka payment submission successfully receive ho gaya hai!
            Hamari team usually <strong>24 ghantay</strong> mein approve kar deti hai.
          </p>

          <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;padding:24px;margin:24px 0;">
            <h3 style="margin:0 0 16px;color:#1e3a8a;font-size:16px;font-weight:700;">💳 Payment Details:</h3>
            <table style="width:100%;font-size:14px;">
              <tr>
                <td style="padding:6px 0;color:#1e40af;width:40%;">Plan:</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600;">{{planName}}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#1e40af;">Amount:</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:700;">Rs {{amount}}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#1e40af;">Method:</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600;">{{paymentMethod}}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#1e40af;">Reference:</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600;font-family:monospace;">{{reference}}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#1e40af;">Invoice:</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600;">{{invoiceNumber}}</td>
              </tr>
            </table>
          </div>

          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:8px;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;line-height:1.6;">
              ⏰ <strong>Next:</strong> Hamari team verify karke approve karegi.<br/>
              Approval ke turant baad aap ko email aur in-app notification milegi.
            </p>
          </div>

          ${button('Status Check Karein →', '{{appUrl}}/billing', '#2563eb')}
        </td>
      </tr>
    `),
    bodyText: `Aap ka payment Rs {{amount}} ({{planName}}) submit ho gaya. Reference: {{reference}}. Approval 24h mein.`,
    variables: {
      name: 'string', planName: 'string', amount: 'string',
      paymentMethod: 'string', reference: 'string', invoiceNumber: 'string', appUrl: 'string',
    },
  },

  // ───────────────────────────────────────────────────────────
  // 10. PAYMENT APPROVED
  // ───────────────────────────────────────────────────────────
  {
    slug: 'payment-approved',
    name: 'Payment Approved',
    subject: '🎉 Payment Approved — Subscription Active!',
    bodyHtml: baseLayout(`
      ${greenHeader('Payment Approved! 🎉', 'Aap ka subscription active hai')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            Mubarak ho! 🎊 Aap ka payment approve ho gaya hai aur <strong>{{shopName}}</strong>
            par <strong style="color:#16a34a;">{{planName}}</strong> subscription activate ho chuka hai.
          </p>

          <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:24px;margin:24px 0;">
            <h3 style="margin:0 0 16px;color:#15803d;font-size:16px;font-weight:700;">📋 Subscription Details:</h3>
            <table style="width:100%;font-size:14px;">
              <tr>
                <td style="padding:6px 0;color:#15803d;width:40%;">Plan:</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:700;">{{planName}}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#15803d;">Amount Paid:</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:700;">Rs {{amount}}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#15803d;">Billing Cycle:</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:600;">{{interval}}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#15803d;">Active Until:</td>
                <td style="padding:6px 0;color:#1e293b;font-weight:700;">{{periodEnd}}</td>
              </tr>
            </table>
          </div>

          ${button('Dashboard Kholein →', '{{appUrl}}/dashboard')}

          <h3 style="margin:32px 0 12px;color:#1e293b;font-size:16px;font-weight:700;">✨ Ab Aap Ye Sab Kar Sakte Hain:</h3>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.9;">
            <li>Unlimited POS sales</li>
            <li>Advanced reports & analytics</li>
            <li>Multi-shop management</li>
            <li>Priority support</li>
            <li>Plus jo bhi {{planName}} mein included hai</li>
          </ul>

          <p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.6;">
            Thank you for choosing Nafaa! 🙏<br/>
            <strong style="color:#16a34a;">— Nafaa Team</strong>
          </p>
        </td>
      </tr>
    `),
    bodyText: `Payment approved! {{planName}} active until {{periodEnd}}. Dashboard: {{appUrl}}/dashboard`,
    variables: {
      name: 'string', shopName: 'string', planName: 'string',
      amount: 'string', interval: 'string', periodEnd: 'string', appUrl: 'string',
    },
  },

  // ───────────────────────────────────────────────────────────
  // 11. PAYMENT REJECTED
  // ───────────────────────────────────────────────────────────
  {
    slug: 'payment-rejected',
    name: 'Payment Rejected',
    subject: '❌ Payment Rejected — {{shopName}}',
    bodyHtml: baseLayout(`
      ${roseHeader('Payment Rejected ❌', 'Action required')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            Hamain afsos hai, aap ka payment submission verify nahi ho saka.
          </p>

          <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:16px;padding:24px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#991b1b;font-size:16px;font-weight:700;">📋 Rejection Reason:</h3>
            <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.7;">{{reason}}</p>
          </div>

          <h3 style="margin:24px 0 12px;color:#1e293b;font-size:16px;font-weight:700;">🔄 Aap Kya Karein:</h3>
          <ol style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:1.9;">
            <li>Payment details verify karein (account, reference number)</li>
            <li>Sahi screenshot upload karein (clear aur readable)</li>
            <li>Dobara submit karein</li>
            <li>Ya direct hum se contact karein</li>
          </ol>

          ${button('Dobara Submit Karein →', '{{appUrl}}/billing', '#dc2626')}

          <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:16px 20px;border-radius:8px;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#1e3a8a;font-weight:600;">
              💬 <strong>Help chahiye?</strong> Reply karein is email par — hum guide karenge.
            </p>
          </div>
        </td>
      </tr>
    `),
    bodyText: `Aap ka payment reject ho gaya. Reason: {{reason}}. Dobara submit: {{appUrl}}/billing`,
    variables: { name: 'string', shopName: 'string', reason: 'string', appUrl: 'string' },
  },

  // ───────────────────────────────────────────────────────────
  // 12. SUBSCRIPTION EXPIRING SOON (7 days)
  // ───────────────────────────────────────────────────────────
  {
    slug: 'subscription-expiring',
    name: 'Subscription Expiring',
    subject: '⏰ Subscription {{daysLeft}} din mein renew ho gi',
    bodyHtml: baseLayout(`
      ${amberHeader('Renewal Reminder ⏰', '{{daysLeft}} din baki hain')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
            Aap ka <strong>{{planName}}</strong> subscription <strong style="color:#d97706;">{{daysLeft}} din</strong> mein renew ho gi.
            Service uninterrupted rakhne ke liye payment ready rakhein.
          </p>

          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #fbbf24;border-radius:16px;padding:24px;margin:24px 0;text-align:center;">
            <div style="font-size:13px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Renewal Date</div>
            <div style="font-size:28px;color:#78350f;font-weight:900;margin:8px 0;">{{renewalDate}}</div>
            <div style="font-size:14px;color:#92400e;font-weight:600;">Amount: <strong>Rs {{amount}}</strong></div>
          </div>

          ${button('Manage Subscription →', '{{appUrl}}/billing', '#d97706')}

          <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
            💡 Auto-renew enabled ho to manually action ki zaroorat nahi.<br/>
            Plan upgrade/downgrade karna chahein to bhi yahin se kar sakte hain.
          </p>
        </td>
      </tr>
    `),
    bodyText: `{{planName}} subscription {{daysLeft}} din mein renew ho gi. Date: {{renewalDate}}, Amount: Rs {{amount}}`,
    variables: {
      name: 'string', planName: 'string', daysLeft: 'number',
      renewalDate: 'string', amount: 'string', appUrl: 'string',
    },
  },

  // ───────────────────────────────────────────────────────────
  // 13. ADMIN BROADCAST (custom messages)
  // ───────────────────────────────────────────────────────────
  {
    slug: 'admin-broadcast',
    name: 'Admin Broadcast',
    subject: '{{subject}}',
    bodyHtml: baseLayout(`
      ${violetHeader('{{title}}', 'From Nafaa Team')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <div style="font-size:15px;color:#475569;line-height:1.7;">
            {{{message}}}
          </div>
          {{#if ctaUrl}}
          ${button('{{ctaText}}', '{{ctaUrl}}', '#7c3aed')}
          {{/if}}
        </td>
      </tr>
    `),
    bodyText: `{{title}} - {{message}}`,
    variables: { name: 'string', title: 'string', subject: 'string', message: 'string', ctaText: 'string', ctaUrl: 'string', appUrl: 'string' },
  },

  // ───────────────────────────────────────────────────────────
  // 14. LOW STOCK DAILY DIGEST
  // ───────────────────────────────────────────────────────────
  {
    slug: 'low-stock-digest',
    name: 'Low Stock Digest',
    subject: '📦 {{count}} products ka stock low hai — {{shopName}}',
    bodyHtml: baseLayout(`
      ${amberHeader('Low Stock Alert 📦', '{{count}} products need attention')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
            <strong>{{shopName}}</strong> mein <strong>{{count}} products</strong> ka stock low ho gaya hai.
            Restock karein takay sales miss na hon.
          </p>

          <div style="background:#fef3c7;border:2px solid #fbbf24;border-radius:16px;padding:20px;margin:24px 0;">
            {{{productsList}}}
          </div>

          ${button('Stock Manage Karein →', '{{appUrl}}/low-stock', '#d97706')}
        </td>
      </tr>
    `),
    bodyText: `{{count}} products low stock par hain. Manage: {{appUrl}}/low-stock`,
    variables: { name: 'string', shopName: 'string', count: 'number', productsList: 'string', appUrl: 'string' },
  },

  // ───────────────────────────────────────────────────────────
  // 15. DAILY SALES SUMMARY
  // ───────────────────────────────────────────────────────────
  {
    slug: 'daily-summary',
    name: 'Daily Sales Summary',
    subject: '📊 {{date}} ka summary — Rs {{salesTotal}} ki sales',
    bodyHtml: baseLayout(`
      ${greenHeader('Daily Summary 📊', '{{date}}')}
      <tr>
        <td style="padding:40px;">
          <p style="margin:0 0 24px;font-size:16px;color:#1e293b;line-height:1.6;">
            Assalam-o-Alaikum <strong>{{name}}</strong>,
          </p>

          <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:24px;margin:0 0 16px;">
            <h3 style="margin:0 0 16px;color:#15803d;font-size:16px;font-weight:700;">💰 Aaj ki Sales</h3>
            <table style="width:100%;font-size:14px;">
              <tr>
                <td style="padding:8px 0;color:#15803d;width:50%;">Total Sales:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:700;text-align:right;">Rs {{salesTotal}}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#15803d;">Orders:</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;text-align:right;">{{ordersCount}}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#15803d;">Profit:</td>
                <td style="padding:8px 0;color:#15803d;font-weight:700;text-align:right;">Rs {{profitTotal}}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#15803d;">Udhaar:</td>
                <td style="padding:8px 0;color:#d97706;font-weight:600;text-align:right;">Rs {{udhaarTotal}}</td>
              </tr>
            </table>
          </div>

          {{#if topProduct}}
          <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;padding:20px;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#1e40af;font-weight:700;">🏆 TOP SELLING TODAY</p>
            <p style="margin:8px 0 0;font-size:18px;color:#1e3a8a;font-weight:700;">{{topProduct}}</p>
          </div>
          {{/if}}

          ${button('Full Reports Dekhain →', '{{appUrl}}/reports')}
        </td>
      </tr>
    `),
    bodyText: `{{date}} ki sales: Rs {{salesTotal}} ({{ordersCount}} orders). Profit: Rs {{profitTotal}}`,
    variables: {
      name: 'string', date: 'string', salesTotal: 'string',
      ordersCount: 'number', profitTotal: 'string', udhaarTotal: 'string',
      topProduct: 'string', appUrl: 'string',
    },
  },
];

// ═══════════════════════════════════════════════════════════════
// SEEDER
// ═══════════════════════════════════════════════════════════════

async function seedEmailTemplates() {
  console.log('📧 Seeding email templates...\n');

  for (const tpl of templates) {
    try {
      const existing = await prisma.emailTemplate.findUnique({
        where: { slug: tpl.slug },
      });

      if (existing) {
        await prisma.emailTemplate.update({
          where: { slug: tpl.slug },
          data: {
            name: tpl.name,
            subject: tpl.subject,
            bodyHtml: tpl.bodyHtml,
            bodyText: tpl.bodyText,
            variables: tpl.variables,
            isActive: true,
          },
        });
        console.log(`✅ Updated: ${tpl.slug} — ${tpl.name}`);
      } else {
        await prisma.emailTemplate.create({
          data: {
            slug: tpl.slug,
            name: tpl.name,
            subject: tpl.subject,
            bodyHtml: tpl.bodyHtml,
            bodyText: tpl.bodyText,
            variables: tpl.variables,
            isActive: true,
          },
        });
        console.log(`✨ Created: ${tpl.slug} — ${tpl.name}`);
      }
    } catch (e: any) {
      console.error(`❌ Failed: ${tpl.slug} — ${e.message}`);
    }
  }

  console.log(`\n🎉 Done! ${templates.length} email templates seeded.\n`);
  await prisma.$disconnect();
}

seedEmailTemplates().catch((e) => {
  console.error('Seeder failed:', e);
  process.exit(1);
});

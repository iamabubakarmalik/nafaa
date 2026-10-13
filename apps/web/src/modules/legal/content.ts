/** Terms of service and privacy policy text, as published to shops. */

import { SUPPORT } from '@modules/help/support';

export const LEGAL_UPDATED = '1 May 2026';

export const TERMS = [
  {
    title: '1. Acceptance of Terms',
    content:
      'Nafaa app use karne ke liye aap ye terms accept karte hain. Agar aap inn terms se ittefaq nahi karte to app use na karein. Hum waqtan-fawaqtan terms update kar sakte hain — bara change hone par aap ko notify karenge.',
  },
  {
    title: '2. Account Registration',
    content:
      'Account banane ke liye aap ki age 18 saal ya us se zyada honi chahiye. Aap apni account ki security ke khud zimmedaar hain — password kisi ke saath share na karein. Galat ya misleading information dena prohibited hai.',
  },
  {
    title: '3. Subscription & Billing',
    content:
      'Nafaa Free aur Paid plans offer karta hai. Paid plans monthly ya yearly basis pe billed hote hain. Subscription cancel karne pe aap ka data 90 din tak preserved rehta hai — uske baad permanently delete ho jaata hai. Refund 7 din ke andar request kar sakte hain.',
  },
  {
    title: '4. Acceptable Use',
    content:
      'Aap app ka use sirf legal business purposes ke liye karenge. Spam, fraud, illegal content, ya kisi bhi ghair-qanooni kaam ke liye app use karna prohibited hai. Hum koi bhi account jo terms violate kare suspend kar sakte hain.',
  },
  {
    title: '5. Data Ownership',
    content:
      'Aap apne business data ke malik hain — Nafaa sirf service provide karta hai. Aap kabhi bhi apna data export kar sakte hain (Backup feature se). Hum aap ke data ko sell nahi karte, aur na hi 3rd parties ke saath share karte hain.',
  },
  {
    title: '6. Service Availability',
    content:
      'Hum 99.9% uptime ka best effort karte hain, lekin guarantee nahi karte. Scheduled maintenance ke liye aap ko advance notice diya jaayega. Service interruption ki soorat mein hum responsible nahi hain kisi business loss ke liye.',
  },
  {
    title: '7. Limitation of Liability',
    content:
      'Nafaa aur uske developers maximum extent tak liability se exempt hain. Hum kisi indirect, incidental, consequential damages ke responsible nahi hain. Total liability subscription fees ke amount tak limited hai.',
  },
  {
    title: '8. Termination',
    content:
      'Aap kabhi bhi apna account delete kar sakte hain. Hum bhi terms violation ki soorat mein account terminate karne ka haq rakhte hain. Termination ke baad ke 90 din mein aap apna data download kar sakte hain.',
  },
];

export const PRIVACY = [
  {
    title: '1. Information We Collect',
    content:
      'Hum sirf wo information collect karte hain jo zaroori hai service provide karne ke liye:\n\n• Account info: Name, email, phone, business details\n• Business data: Products, customers, sales, expenses\n• Device info: Device type, OS version, app version\n• Usage data: Feature usage patterns (anonymized)\n\nHum kabhi bhi customer\'s personal info external services ke saath share nahi karte.',
  },
  {
    title: '2. How We Use Your Data',
    content:
      'Aap ka data sirf in purposes ke liye use hota hai:\n\n• Service provide karna (POS, inventory, reporting)\n• Account aur subscription management\n• Customer support\n• App improve karna (anonymized analytics)\n• Important updates aur security alerts\n\nHum aap ka data marketing companies ya advertisers ko sell nahi karte.',
  },
  {
    title: '3. Data Storage & Security',
    content:
      'Aap ka data secure cloud servers pe stored hota hai with:\n\n• 256-bit AES encryption (data at rest)\n• TLS 1.3 encryption (data in transit)\n• Regular automated backups\n• Multi-tenant data isolation\n• Access logging aur audit trails\n\nServers AWS aur reliable cloud providers pe hain jin ka SOC 2 compliance hai.',
  },
  {
    title: '4. Data Sharing',
    content:
      'Hum aap ka data sirf in case mein share kar sakte hain:\n\n• Legal requirement (court order, law enforcement)\n• Payment processors (Stripe, JazzCash) — sirf billing ke liye\n• Cloud infrastructure providers (AWS, Google Cloud)\n\nKisi bhi advertising network, marketing company, ya data broker ke saath aap ka data share nahi hota.',
  },
  {
    title: '5. Your Rights',
    content:
      'Aap ke pas full control hai aap ke data ka:\n\n• Access: Apna data kabhi bhi download kar sakte hain\n• Update: Profile aur settings se information edit kar sakte hain\n• Delete: Account delete karne par 90 din mein permanent deletion\n• Portability: Standard JSON format mein export\n• Object: Specific data usage se opt-out\n\nKoi bhi request ke liye support@nafaa.pk pe email karein.',
  },
  {
    title: '6. Cookies & Tracking',
    content:
      'Web app pe hum essential cookies use karte hain authentication ke liye. Mobile app mein push notification tokens aur anonymized analytics events use hote hain. Hum advertising tracking ya cross-site tracking nahi karte.',
  },
  {
    title: '7. Children\'s Privacy',
    content:
      'Nafaa service 18 saal se kam age ke users ke liye intended nahi hai. Hum knowingly children ka data collect nahi karte. Agar aap ko lagey ke kisi minor ne account banaya hai, hamein contact karein — hum account remove kar denge.',
  },
  {
    title: '8. International Data Transfer',
    content:
      'Aap ka data primarily Pakistan aur regional cloud regions mein stored hota hai. Kuch processing US/EU servers pe ho sakti hai (payment processing, etc) — sab standard data protection agreements ke under.',
  },
  {
    title: '9. Changes to Privacy Policy',
    content:
      'Hum is policy ko update kar sakte hain. Bare changes hone par aap ko app aur email ke through notify kiya jaayega. Latest version hamesha is page pe available hogi.',
  },
  {
    title: '10. Contact Us',
    content:
      `Privacy ya data se related koi bhi sawal ho:\n\n• Email: privacy@nafaa.pk\n• Phone: ${SUPPORT.phone}\n• Website: nafaa.pk/privacy\n\nHum 7 working days ke andar respond karenge.`,
  },
];

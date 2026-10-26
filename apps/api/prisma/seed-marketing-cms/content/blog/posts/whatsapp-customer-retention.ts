/**
 * WhatsApp messages that bring customers back: when to send, ready-to-use
 * templates in Roman Urdu and English, and staying polite and within
 * WhatsApp's rules.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { FAKE_AUTHOR, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('WhatsApp Help Center', 'https://faq.whatsapp.com/', 'WhatsApp'),
  src('WhatsApp Business Messaging Policy', 'https://whatsappbusiness.com/policy/', 'WhatsApp'),
];

const spec: PostSpec = {
  slug: 'whatsapp-customer-retention',
  seoTitle: 'WhatsApp Templates for Shops That Bring Customers Back',
  seoDescription: 'When a shop should message customers on WhatsApp, with Roman Urdu templates for thanks, new stock, birthdays and udhaar, and how to stay within the rules.',
  title: 'WhatsApp Messages for Shops: Templates That Bring Customers Back',
  summary:
    'When a shop should message customers on WhatsApp, ready-to-use templates in Roman Urdu for thanks, new stock, birthdays, quiet customers and udhaar, and how to stay polite and within WhatsApp\'s rules.',
  category: 'business',
  cover: PHOTO.whatsappCustomerRetention,
  tags: ['PRODUCT:whatsapp-sms', 'PRODUCT:khata'],
  related: ['PRODUCT:loyalty', 'BLOG_POST:how-to-reduce-udhaar', 'BLOG_POST:ramadan-eid-retail-strategy'],
  blocks: [
    prose(`Almost every customer who walks into a Pakistani shop has WhatsApp on their phone, and most of them read every message they get. That makes WhatsApp the cheapest way for a shop to stay in touch, and also the easiest way to annoy people. The shops that do it well send few messages, each one personal and useful. The shops that do it badly forward the same poster to everyone twice a week until they are muted or blocked.

This post covers when to message, what to say, and a set of templates you can copy.

## Why WhatsApp works for small shops

- Customers already use it; there is nothing new to install.
- Messages arrive from a number they know, often the shop's own.
- Replies come back as normal chats, so a message can turn into an order.
- It costs nothing beyond your mobile data.

## The four rules

1. **Only message people who know you.** Customers who have bought from you and given you their number. Never buy number lists.
2. **Make it personal.** Use their name and the right salutation (bhai, baji, sahib). A message that looks forwarded gets ignored.
3. **Be useful.** A new stock arrival they asked about, an order ready for pickup, their balance. Not a daily poster.
4. **Send less than you think.** A couple of messages a month to the same customer is plenty for most shops.

WhatsApp has its own rules for business use, and accounts that are reported as spam can be limited. Read the [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/) once, and remember that a broadcast from the WhatsApp app reaches only people who have saved your number.`),
    prose(`## Templates you can copy

Change the words to sound like you. Keep them short.

**Thank you after a first purchase**

> Assalam o Alaikum Ahmed bhai, aaj ki khareedari ka shukriya. Kisi cheez ki zaroorat ho to isi number par message kar dein, hum ghar bhijwa denge. — [Shop name]

**New stock they asked about**

> Salam Sana baji, aap ne jo blue lawn suit poocha tha woh aa gaya hai. Aap ke size me 2 piece hain, chahein to rakh doon?

**Order ready for pickup**

> Salam sahib, aap ka order tayyar hai. Shaam 9 baje tak dukaan khuli hai.

**Birthday**

> Ahmed bhai, saalgirah mubarak! Aaj dukaan par aayein to aap ke liye chhota sa tohfa hai.

**A regular who has gone quiet**

> Salam Imran bhai, kaafi din se mulaqat nahi hui. Sab khair hai? Naya maal aaya hai, kabhi chakkar lagayein.

**Udhaar reminder (polite)**

> Salam Rashid bhai, aap ke khaate me 4,500 baqi hain. Jab suhoolat ho ada kar dein. Shukriya.

**Udhaar reminder (firm)**

> Rashid bhai, aap ka 4,500 ka hisaab do mahine se baqi hai. Is hafte tak ada kar dein to meherbani hogi.

The names and amounts above are examples. Never send a message with the wrong name or balance; check before you tap send.`),
    shot({
      heading: 'Reminders from the khata',
      body: 'Each customer row has a WhatsApp button. The message opens with their name, the right salutation and the balance filled in, in the tone you pick.',
      id: SHOT.khataPhone,
      frame: 'phone',
      url: 'app.nafaa.pk/khata',
      layout: 'split-right',
    }),
    steps(
      'Set up a simple routine',
      [
        ['Collect numbers at the counter', 'Ask for the WhatsApp number when you make a bill or add someone to the khata. Ask, do not assume.'],
        ['Save salutation and birthday', 'Add bhai, baji or sahib, and a birthday if the customer is happy to share it.'],
        ['Thank first-time buyers the same day', 'A short thank-you message makes the number feel personal, not promotional.'],
        ['Send reminders on a fixed day', 'Pick one day a week for udhaar reminders, and start polite.'],
        ['Message quiet regulars monthly', 'Look at who has not bought in a month or two and send a personal note.'],
      ],
      undefined,
      true,
    ),
    prose(`## When to send

- **Morning to early afternoon** for reminders and stock news, when people read and reply.
- **Not late at night**, and avoid prayer times and Friday afternoon.
- **Before seasons:** a week before Ramadan, Eid, wedding season and school opening, tell regulars what you have stocked.
- **Right after an event:** an order ready, a payment received ("shukriya, aap ka hisaab saaf ho gaya").

## What not to do

- Do not add customers to groups without asking. A group exposes everyone's number to everyone else.
- Do not send the same message to everyone. Split by what they buy.
- Do not use WhatsApp to shame anyone about udhaar. Keep it private and polite.
- Do not forward chain messages or unverified news from the shop's number.

## How Nafaa helps

Nafaa does not send bulk messages for you; messages go from your own WhatsApp, one at a time, so they stay personal. What it does is fill them in. From the khata, each customer has a WhatsApp reminder in three tones (polite, firm and final) with the balance filled in, and you can edit the wording to your own. Thank-you and birthday messages use the customer's name and a salutation picked from what you saved or guessed from the name. For online customers, Nafaa groups buyers into repeat, new and gone-quiet lists, and the broadcast tab copies a segment's numbers and a ready message so you can paste them into a WhatsApp broadcast list.`),
    tip('After a reminder is paid, send a one-line thank-you. It turns a collection message into a good experience, and the next reminder is easier.', 'Close the loop'),
  ],
  outline: ['Why WhatsApp', 'Four rules', 'Templates', 'Routine', 'When to send', 'What not to do', 'How Nafaa helps'],
  dropped: ['"Proven" templates claim.', 'Open-rate statistics (no source).', FAKE_AUTHOR],
  evidence: [
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/customers/pages/CustomerFormPage.tsx',
    'apps/web/src/integrations/online-orders/pages/OnlineCustomersPage.tsx',
  ],
  sources: SOURCES,
  factNote: 'WhatsApp policy linked, not quoted. Templates are examples with placeholder names and amounts. Product statements checked against the code (see evidence).',
};

export default spec;

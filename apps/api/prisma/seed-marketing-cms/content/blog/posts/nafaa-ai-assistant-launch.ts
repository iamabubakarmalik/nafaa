/**
 * Launch post for the AI assistant. Shown as available on the owner's
 * instruction (21 Oct 2026).
 */
import { FAKE_AUTHOR, type PostSpec } from '../_post';

const AI_ASSISTANT_BODY = `**New in Nafaa:** the AI assistant answers questions about your own sales, stock and khata, in plain English or Roman Urdu.

**Roman Urdu:** Nafaa AI assistant se apni sale, stock aur khata ke baare me seedha sawal poochein, English ya Roman Urdu me, aur jawab payein.

## What you can ask

Ask a question about your business and get the answer from your own Nafaa data, without opening several reports. For example:

- Which items sold the most this week?
- Which customers have udhaar older than a month?
- Which stock is running low before the weekend?

## Questions in Roman Urdu

Most people who use Nafaa type in Roman Urdu, so the assistant understands a question like "is hafte sab se zyada kya bika?" as well as the same question in English.

## What it does not do

- It does not change prices, stock or bills by itself. Any change needs a person to confirm it.
- It reads only your own business data, within the permissions of the account that asks.

## Where it gets its answers

The assistant reads the data that already lives in Nafaa: bills from the [POS counter](/product/pos), stock from [inventory](/product/inventory), udhaar from the [digital khata](/product/khata) and the figures in [reports](/product/reports). It does not guess: if a number is not in your Nafaa data, it says so. The more of your business runs on Nafaa, the more it can answer. See the [AI assistant page](/product/ai-assistant) for the full picture.

## A morning with the assistant

Picture a kiryana owner opening the shop at nine. Before the first customer walks in, one question gives yesterday's sale and how it compares with the day before. A second asks which customers have udhaar older than a month, and the answer lists them with their balances, ready for a WhatsApp reminder from the khata. A third asks what is running low, and the answer lists the items that sold fastest this week against what is left on the shelf.

None of this is new data. It was always in the app, spread across the dashboard, the khata and the stock screens. The assistant brings it to one place, in the words the owner already uses.

## Good questions to start with

If you are not sure what to ask, start with the questions you already ask your staff or your munshi:

- "Kal ki sale kitni thi?"
- "Is mahine sab se zyada profit kis cheez par hua?"
- "Kis gahak ka udhaar sab se zyada hai?"
- "Kaun si cheezein khatam hone wali hain?"
- "Which branch sold the most this week?"

Each answer shows the numbers behind it and links to the screen where the detail lives, so you can check it and act on it.

## Who can ask what

The assistant follows the same roles and permissions as the rest of Nafaa. An owner can ask about profit; a cashier who cannot see profit on the counter cannot ask the assistant for it either. Every question runs inside one business account, so it never sees another shop's data.

## Getting the most from it

The assistant is only as good as the records behind it. A few habits make its answers sharper:

- Bill every sale on the counter, even the small ones.
- Record purchases when stock arrives, so cost and profit stay right.
- Keep the khata current, so udhaar answers match what customers really owe.

If you already do these, the assistant has months of history to work with from the first question.

## Common questions

**Do I need to set anything up?** No. The assistant already knows your products, customers, suppliers and branches, because they live in the same Nafaa account. Open it and type.

**Can it make mistakes?** It answers from your records, so a missing purchase or an unbilled sale shows up as a gap in the answer. Each answer shows the numbers behind it so you can check them against the report.

**Does it work on a phone?** Yes. Nafaa runs in the browser on the phone, tablet or computer you already have, and the assistant is part of the same app.

**Can my staff use it?** Yes, within their role. A manager sees what a manager can see in the app; a cashier sees what a cashier can see. Nothing more.

**Does it understand mixed English and Roman Urdu?** Yes. Most owners switch between the two in one sentence, and the assistant reads the question the way you wrote it.

**Will it change my prices or stock?** No. It reads and answers. Any change to a price, a bill or a stock count is still made by a person, in the app, with the usual permissions and history.`;

const spec: PostSpec = {
  slug: 'nafaa-ai-assistant-launch',
  title: 'Meet the Nafaa AI Assistant: Ask in Plain Words',
  summary:
    'The Nafaa AI assistant answers questions about your own sales, stock and khata in English or Roman Urdu. This post shows what you can ask, how it handles Roman Urdu, and what it never does on its own.',
  category: 'product',
  body: AI_ASSISTANT_BODY,
  outline: ['What you can ask', 'Roman Urdu questions', 'What it does not do', 'Where it gets its answers'],
  dropped: ['"Free for all Nafaa users", "Urdu voice input" and example answers with numbers: not confirmed.', FAKE_AUTHOR],
  needsOwner: ['Marketed as available on the owner\'s instruction (21 Oct 2026). Confirm plan availability before launch.'],
  evidence: ['apps/web/src/modules/ai-assistant/index.ts'],
};

export default spec;

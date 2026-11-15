/**
 * Every merchant-facing text the support backend writes (bot and system
 * lines, defaults, the offline-reply email), in English, Urdu script and
 * Roman Urdu. The merchant's language setting picks one.
 *
 * Wording rule: never "human" / "insaan"; it is "our team" / "support team".
 */

import type { SupportLang, SupportLocalized, SupportSystemCode } from './support.types';

export const SUPPORT_LANGS: SupportLang[] = ['en', 'ur', 'roman'];

export const isSupportLang = (v: unknown): v is SupportLang => v === 'en' || v === 'ur' || v === 'roman';

/** User language first, then the shop's, then English (new accounts start in English). */
export function pickLang(...candidates: Array<string | null | undefined>): SupportLang {
  for (const c of candidates) if (isSupportLang(c)) return c;
  return 'en';
}

const L = (en: string, ur: string, roman: string): SupportLocalized => ({ en, ur, roman });

export const tr = (t: SupportLocalized, lang: SupportLang) => t[lang] || t.en;

const fill = (s: string, params: Record<string, string | number | null | undefined>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => (params[k] == null ? '' : String(params[k])));

export const DEFAULT_WELCOME = L(
  'Hi! Welcome to Nafaa support. Ask your question here, Nafaa AI will help right away, and our team is here too.',
  'السلام علیکم! نفع سپورٹ میں خوش آمدید۔ اپنا سوال لکھیں، نفع AI فوراً مدد کرے گا، اور ہماری ٹیم بھی موجود ہے۔',
  'Assalam o Alaikum! Nafaa support mein khush aamdeed. Apna sawal likhein, Nafaa AI foran help karega, aur hamari team bhi yahin hai.',
);

export const DEFAULT_AWAY = L(
  "Our team isn't online right now. Leave your message, we'll reply as soon as we're back, and you'll get an email too.",
  'اس وقت ہماری ٹیم آن لائن نہیں ہے۔ اپنا میسج چھوڑ دیں، ٹیم واپس آتے ہی جواب دے گی اور آپ کو ای میل بھی آ جائے گی۔',
  'Is waqt team online nahi hai. Apna message chhor dein, team wapas aate hi reply karegi, aur aap ko email bhi aa jayegi.',
);

const SYSTEM: Record<SupportSystemCode, SupportLocalized> = {
  agent_joined: L('{name} (Nafaa team) joined the chat', '{name} (نفع ٹیم) چیٹ میں شامل ہو گئے', '{name} (Nafaa team) chat mein shamil ho gaye'),
  handover: L(
    "Got your message. Connecting you to our support team, we'll reply shortly.",
    'آپ کا میسج مل گیا۔ آپ کو سپورٹ ٹیم سے ملا رہے ہیں، تھوڑی دیر میں جواب ملے گا۔',
    'Aap ka message mil gaya. Support team se mila rahe hain, thori der mein reply karte hain.',
  ),
  transferred: L('{name} (Nafaa team) is now helping you', 'اب {name} (نفع ٹیم) آپ کی مدد کر رہے ہیں', 'Ab {name} (Nafaa team) aap ki help kar rahe hain'),
  resolved: L(
    "Marked as solved. Write again any time if you still need help.",
    'مسئلہ حل ہو گیا۔ مزید مدد چاہیے ہو تو کبھی بھی دوبارہ لکھیں۔',
    'Masla hal ho gaya. Aur help chahiye ho to kabhi bhi dobara likhein.',
  ),
  reopened: L('Chat reopened', 'چیٹ دوبارہ کھل گئی', 'Chat dobara khul gayi'),
  closed: L('Chat closed', 'چیٹ بند ہو گئی', 'Chat band ho gayi'),
  away: L('{away} Usual reply time: {eta}.', '{away} عام طور پر جواب: {eta}۔', '{away} Aam tor par reply: {eta}.'),
  welcome: L('{text}', '{text}', '{text}'),
  rated: L('Thanks for your feedback!', 'آپ کی رائے کا شکریہ!', 'Feedback ka shukriya!'),
};

/** Text of a SYSTEM line in the merchant's language. */
export function systemText(code: SupportSystemCode, lang: SupportLang, params: Record<string, string | number | null | undefined> = {}): string {
  return fill(tr(SYSTEM[code], lang), params).replace(/\s+/g, ' ').trim();
}

/** "15 minutes" / "15 منٹ" / "15 minute" (hours above 90 minutes). */
export function etaText(minutes: number, lang: SupportLang): string {
  if (minutes >= 90) {
    const h = Math.round(minutes / 60);
    return lang === 'en' ? `about ${h} hour${h === 1 ? '' : 's'}` : lang === 'ur' ? `تقریباً ${h} گھنٹے` : `taqreeban ${h} ghante`;
  }
  return lang === 'en' ? `about ${minutes} minutes` : lang === 'ur' ? `تقریباً ${minutes} منٹ` : `taqreeban ${minutes} minute`;
}

/** Short team status line for the chat header. */
export function teamLine(state: 'online' | 'away' | 'offline', withinHours: boolean, lang: SupportLang): string {
  if (state === 'online') return tr(L("Team is online، you'll get a reply soon", 'ٹیم آن لائن ہے، ابھی جواب ملے گا', 'Team online hai, abhi reply milega'), lang);
  if (state === 'away' || withinHours) {
    return tr(L("Team is a little busy، we'll reply shortly", 'ٹیم تھوڑی مصروف ہے، جلد جواب ملے گا', 'Team thori busy hai, jaldi reply milega'), lang);
  }
  return tr(L("Team is offline، leave a message and we'll reply", 'ٹیم ابھی آف لائن ہے، میسج چھوڑ دیں', 'Team abhi offline hai, message chhor dein'), lang);
}

/* ───────────────────────── Nafaa AI lines ───────────────────────── */

export const BOT = {
  notSure: L(
    "I couldn't find a sure answer to this one. Tap \"Talk to our team\" and someone from Nafaa will help you.",
    'اس کا پکا جواب مجھے نہیں ملا۔ "سپورٹ ٹیم سے بات کریں" دبائیں، نفع کی ٹیم آپ کی مدد کرے گی۔',
    'Is ka pakka jawab mujhe nahi mila. "Support team se baat karein" dabayein, Nafaa team aap ki help karegi.',
  ),
  limit: L(
    "Let me bring in our support team for this, they'll reply here shortly.",
    'اس کے لیے سپورٹ ٹیم کو بلا رہا ہوں، وہ یہیں تھوڑی دیر میں جواب دیں گے۔',
    'Is ke liye support team ko bula raha hoon, woh yahin thori der mein reply karenge.',
  ),
  attachment: L(
    "Thanks, got it. I'll pass this to our support team so they can take a look.",
    'شکریہ، مل گیا۔ یہ سپورٹ ٹیم کو دکھا رہا ہوں تاکہ وہ دیکھ لیں۔',
    'Shukriya, mil gaya. Ye support team ko dikha raha hoon taake woh dekh lein.',
  ),
  more: L('Anything else I can help with?', 'کچھ اور مدد چاہیے؟', 'Kuch aur help chahiye?'),
};

/** Shown as the "Talk to our team" chip text. */
export const TALK_TO_TEAM = L('Talk to our team', 'سپورٹ ٹیم سے بات کریں', 'Support team se baat karein');

/* ───────────────────────── offline reply email ───────────────────────── */

export function offlineEmail(lang: SupportLang, p: { name: string; agent: string; preview: string; link: string }) {
  const subject = tr(L('Nafaa support replied to your message', 'نفع سپورٹ نے آپ کے میسج کا جواب دیا', 'Nafaa support ne aap ke message ka reply diya'), lang);
  const hello = tr(L('Hi {name},', '{name} صاحب، السلام علیکم', 'Assalam o Alaikum {name},'), lang);
  const body = tr(L(
    '{agent} from the Nafaa team replied to your support chat:',
    'نفع ٹیم سے {agent} نے آپ کی سپورٹ چیٹ میں جواب دیا ہے:',
    'Nafaa team se {agent} ne aap ki support chat mein reply kiya hai:',
  ), lang);
  const cta = tr(L('Open the chat', 'چیٹ کھولیں', 'Chat kholein'), lang);
  const dir = lang === 'ur' ? 'rtl' : 'ltr';
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  const params = { name: p.name, agent: p.agent };
  const html = `<div dir="${dir}" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p>${esc(fill(hello, params))}</p>
<p>${esc(fill(body, params))}</p>
<blockquote style="margin:12px 0;padding:10px 14px;background:#f3f4f6;border-radius:8px">${esc(p.preview)}</blockquote>
<p><a href="${esc(p.link)}" style="display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none">${esc(cta)}</a></p>
</div>`;
  const text = `${fill(hello, params)}\n\n${fill(body, params)}\n\n${p.preview}\n\n${cta}: ${p.link}`;
  return { subject, html, text };
}

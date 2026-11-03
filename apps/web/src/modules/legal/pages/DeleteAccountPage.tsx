/**
 * Public account-deletion page (no login). Google Play asks for this URL.
 *
 * It shows all three languages from one local switch, so a person can read
 * the steps in the language they know without signing in first. The text is
 * written here per language (t() only speaks the active language).
 *
 * Facts come from the API: owner flow = settings danger zone, 7-day grace;
 * everyone else = request recorded, 30-day schedule, cancellable.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, ShieldCheck, Smartphone, Globe, Trash2, Clock } from 'lucide-react';
import { SUPPORT, supportWhatsapp } from '@modules/help/support';
import { cn } from '@core/lib/cn';
import { currentLocale } from '@core/i18n';

type Lang = 'en' | 'ur' | 'roman';

interface Copy {
  title: string; intro: string;
  appTitle: string; app: string[];
  webTitle: string; web: string[];
  dataTitle: string; deleted: string[]; kept: string[];
  timeTitle: string; time: string[];
  contactTitle: string; contact: string; whatsapp: string; msg: string;
  back: string;
}

const COPY: Record<Lang, Copy> = {
  en: {
    title: 'Delete your Nafaa account',
    intro: 'You can ask for your Nafaa POS account and its data to be deleted at any time. You do not need to contact us, but you can if you need help.',
    appTitle: 'In the Nafaa app',
    app: ['Open the app and sign in.', 'Go to Profile, then Delete account.', 'Enter your password (or the confirmation text shown) and confirm.'],
    webTitle: 'On the website',
    web: ['Sign in at nafaa.pk.', 'Business owner: Settings, then Danger zone, then Delete my shop. Type DELETE MY SHOP and your password.', 'Other team members: Profile, then Delete account. The request is sent to your business owner.'],
    dataTitle: 'What happens to your data',
    deleted: ['Business owner: your shop, team accounts, products, sales, customers, khata and reports are permanently deleted.', 'Team member: your login and personal details are removed.'],
    kept: ['Records the law asks us to keep (for example payment and tax records) and encrypted backups can stay for up to 90 days, then they are removed.', 'Sales you made stay in the business owner\'s records without your personal details where possible.'],
    timeTitle: 'How long it takes',
    time: ['Business owner: 7 days. The shop is switched off at once and you can cancel in these 7 days. After that the data is deleted.', 'Team member: up to 30 days. The owner is told, and you can cancel before then.'],
    contactTitle: 'Need help?',
    contact: 'Cannot sign in or lost your password? Write to us from the email on your account and we will help.',
    whatsapp: 'WhatsApp', msg: 'Hello, I want to delete my Nafaa account.',
    back: 'Back to Nafaa',
  },
  ur: {
    title: 'اپنا نفع اکاؤنٹ ڈیلیٹ کریں',
    intro: 'آپ کسی بھی وقت اپنا نفع POS اکاؤنٹ اور اس کا ڈیٹا ڈیلیٹ کروا سکتے ہیں۔ ہم سے رابطہ ضروری نہیں، لیکن مدد چاہیے ہو تو کر سکتے ہیں۔',
    appTitle: 'نفع ایپ میں',
    app: ['ایپ کھولیں اور لاگ اِن کریں۔', 'Profile میں جائیں، پھر Delete account۔', 'اپنا پاس ورڈ (یا دکھایا گیا تصدیقی لفظ) لکھیں اور تصدیق کریں۔'],
    webTitle: 'ویب سائٹ پر',
    web: ['nafaa.pk پر لاگ اِن کریں۔', 'کاروبار کا مالک: Settings، پھر Danger zone، پھر Delete my shop۔ DELETE MY SHOP اور اپنا پاس ورڈ لکھیں۔', 'دوسرے ٹیم ممبر: Profile، پھر Delete account۔ درخواست آپ کے مالک کو چلی جاتی ہے۔'],
    dataTitle: 'آپ کے ڈیٹا کا کیا ہوتا ہے',
    deleted: ['مالک: آپ کی دکان، ٹیم کے اکاؤنٹ، products، sales، customers، کھاتہ اور رپورٹیں مستقل ڈیلیٹ ہو جاتی ہیں۔', 'ٹیم ممبر: آپ کا لاگ اِن اور ذاتی معلومات ہٹا دی جاتی ہیں۔'],
    kept: ['جو ریکارڈ قانون کے مطابق رکھنا ضروری ہو (مثلاً ادائیگی اور ٹیکس) اور محفوظ backups زیادہ سے زیادہ 90 دن رہ سکتے ہیں، پھر ہٹا دیے جاتے ہیں۔', 'آپ کی کی ہوئی sales مالک کے ریکارڈ میں رہتی ہیں، جہاں ممکن ہو آپ کی ذاتی معلومات کے بغیر۔'],
    timeTitle: 'کتنا وقت لگتا ہے',
    time: ['مالک: 7 دن۔ دکان فوراً بند ہو جاتی ہے اور آپ 7 دن میں cancel کر سکتے ہیں۔ اس کے بعد ڈیٹا ڈیلیٹ ہو جاتا ہے۔', 'ٹیم ممبر: زیادہ سے زیادہ 30 دن۔ مالک کو بتایا جاتا ہے اور آپ اس سے پہلے cancel کر سکتے ہیں۔'],
    contactTitle: 'مدد چاہیے؟',
    contact: 'لاگ اِن نہیں ہو رہا یا پاس ورڈ بھول گئے؟ اپنے اکاؤنٹ والی ای میل سے ہمیں لکھیں، ہم مدد کریں گے۔',
    whatsapp: 'WhatsApp', msg: 'السلام علیکم، میں اپنا نفع اکاؤنٹ ڈیلیٹ کروانا چاہتا ہوں۔',
    back: 'نفع پر واپس',
  },
  roman: {
    title: 'Apna Nafaa account delete karein',
    intro: 'Aap kisi bhi waqt apna Nafaa POS account aur uska data delete karwa sakte hain. Humse rabta zaroori nahi, lekin madad chahiye ho to kar sakte hain.',
    appTitle: 'Nafaa app me',
    app: ['App kholein aur login karein.', 'Profile me jayein, phir Delete account.', 'Apna password (ya dikhaya gaya confirmation lafz) likhein aur confirm karein.'],
    webTitle: 'Website par',
    web: ['nafaa.pk par login karein.', 'Business owner: Settings, phir Danger zone, phir Delete my shop. DELETE MY SHOP aur apna password likhein.', 'Dusre team member: Profile, phir Delete account. Darkhwast aap ke owner ko chali jati hai.'],
    dataTitle: 'Aap ke data ka kya hota hai',
    deleted: ['Owner: aap ki dukaan, team ke accounts, products, sales, customers, khata aur reports hamesha ke liye delete ho jate hain.', 'Team member: aap ka login aur zaati maloomat hata di jati hai.'],
    kept: ['Jo record qanoon ke mutabiq rakhna zaroori ho (masalan payment aur tax) aur mehfooz backups ziyada se ziyada 90 din reh sakte hain, phir hata diye jate hain.', 'Aap ki ki hui sales owner ke record me rehti hain, jahan mumkin ho aap ki zaati maloomat ke baghair.'],
    timeTitle: 'Kitna waqt lagta hai',
    time: ['Owner: 7 din. Dukaan foran band ho jati hai aur aap 7 din me cancel kar sakte hain. Uske baad data delete ho jata hai.', 'Team member: ziyada se ziyada 30 din. Owner ko bataya jata hai aur aap usse pehle cancel kar sakte hain.'],
    contactTitle: 'Madad chahiye?',
    contact: 'Login nahi ho raha ya password bhool gaye? Apne account wali email se humein likhein, hum madad karenge.',
    whatsapp: 'WhatsApp', msg: 'Assalam o alaikum, main apna Nafaa account delete karwana chahta hun.',
    back: 'Nafaa par wapas',
  },
};

const TABS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'ur', label: 'اردو' },
  { id: 'roman', label: 'Roman' },
];

const initialLang = (): Lang => currentLocale() as Lang;

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3 text-[0.9375rem] leading-relaxed text-slate-700">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-[0.75rem] font-bold text-emerald-800">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-[0.9375rem] leading-relaxed text-slate-700">
      {items.map((s, i) => <li key={i} className="flex gap-2.5"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />{s}</li>)}
    </ul>
  );
}

function Card({ icon: Icon, title, children }: { icon: typeof Smartphone; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2.5 text-[1.0625rem] font-bold text-slate-900">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-4 w-4" /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DeleteAccountPage() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const c = COPY[lang];
  const rtl = lang === 'ur';

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} lang={rtl ? 'ur' : 'en'} className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="text-[0.9375rem] font-bold text-emerald-700">Nafaa POS</Link>
          <div role="radiogroup" aria-label="Language" className="grid grid-cols-3 rounded-xl bg-slate-200/70 p-1" dir="ltr">
            {TABS.map((tb) => (
              <button key={tb.id} type="button" role="radio" aria-checked={lang === tb.id} onClick={() => setLang(tb.id)}
                className={cn('h-8 rounded-lg px-3 text-[0.8125rem] font-semibold transition', lang === tb.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                {tb.label}
              </button>
            ))}
          </div>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{c.title}</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-600">{c.intro}</p>
        </header>

        <div className="space-y-4">
          <Card icon={Smartphone} title={c.appTitle}><Steps items={c.app} /></Card>
          <Card icon={Globe} title={c.webTitle}><Steps items={c.web} /></Card>
          <Card icon={Trash2} title={c.dataTitle}>
            <Bullets items={c.deleted} />
            <div className="mt-3 flex gap-2.5 rounded-xl bg-amber-50 p-3.5 ring-1 ring-amber-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="text-[0.875rem] leading-relaxed text-amber-900"><Bullets items={c.kept} /></div>
            </div>
          </Card>
          <Card icon={Clock} title={c.timeTitle}><Bullets items={c.time} /></Card>
          <Card icon={Mail} title={c.contactTitle}>
            <p className="mb-3 text-[0.9375rem] leading-relaxed text-slate-700">{c.contact}</p>
            <div className="flex flex-wrap gap-2" dir="ltr">
              <a href={`mailto:${SUPPORT.email}?subject=Delete%20my%20Nafaa%20account`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-[0.875rem] font-semibold text-white hover:bg-emerald-700"><Mail className="h-4 w-4" />{SUPPORT.email}</a>
              <a href={supportWhatsapp(c.msg)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[0.875rem] font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50"><MessageCircle className="h-4 w-4" />{c.whatsapp} {SUPPORT.phone}</a>
            </div>
          </Card>
        </div>

        <p className="mt-6 text-center text-[0.8125rem] text-slate-500"><Link to="/" className="underline">{c.back}</Link> · <Link to="/legal?tab=privacy" className="underline">Privacy</Link></p>
      </div>
    </div>
  );
}

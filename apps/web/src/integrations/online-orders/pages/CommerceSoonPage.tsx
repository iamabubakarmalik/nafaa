/**
 * "Coming soon" page for commerce modules that are planned but not built
 * yet. It says plainly what the module will do and what to use today, so the
 * menu never shows a button that does nothing.
 */

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Printer, Send, ShoppingCart, Sparkles, type LucideIcon } from 'lucide-react';
import { PageHero, PageShell, heroButton } from '@/design-system/components';
import { t as tr } from '@core/i18n';

type Soon = { title: string; icon: LucideIcon; color: string; intro: string; points: string[]; today?: { to: string; label: string } };

const SOON: Record<string, Soon> = {
  dispatch: {
    title: tr('Dispatch & airway bills'),
    icon: Printer,
    color: '#ea580c',
    intro: tr('Ek click me bahut se orders courier par book, thermal label aur loadsheet print.'),
    points: [
      tr('Bulk courier booking — chune hue sab orders ek saath'),
      tr('Airway bill / thermal label (4x6) aur A4 dono'),
      tr('Loadsheet — rider ko dene wali list, sign ke saath'),
      tr('Dispatch scan — parcel scan karo, status khud Dispatched'),
      tr('Booking cancel aur tracking hatana'),
    ],
    today: { to: '/online-store/couriers', label: tr('Abhi Couriers page se book karein') },
  },
  abandoned: {
    title: tr('Abandoned carts'),
    icon: ShoppingCart,
    color: '#2563eb',
    intro: tr('Jo customer checkout chhod gaye, unki list aur WhatsApp se wapas lane ka tareeqa.'),
    points: [
      tr('Shopify aur WooCommerce ke chhode hue checkout'),
      tr('Ek click WhatsApp message, cart link ke saath'),
      tr('Kitne wapas aaye aur kitni sale bani'),
    ],
    today: { to: '/online-orders/customers', label: tr('Abhi Customers page se WhatsApp karein') },
  },
  'post-office': {
    title: tr('Post office'),
    icon: Send,
    color: '#b91c1c',
    intro: tr('Pakistan Post (VPP / COD) ke orders ki booking, list aur tracking.'),
    points: [
      tr('Post office ke liye alag list aur print'),
      tr('VPP / money order ka hisaab'),
      tr('Tracking number se status'),
    ],
  },
  more: {
    title: tr('Aur bahut kuch aa raha hai'),
    icon: Sparkles,
    color: '#9333ea',
    intro: tr('Nafaa Commerce me ye sab bhi aa raha hai — ek ek kar ke.'),
    points: [
      tr('WhatsApp AI bot — order khud confirm, Roman Urdu me jawab'),
      tr('Marketing hub — Meta, Google, TikTok ads ek jagah'),
      tr('Social media — post schedule, captions, inbox'),
      tr('Loyalty, referral aur win-back'),
      tr('Influencer / affiliate codes aur commission'),
      tr('Automation builder — agar ye ho to wo karo'),
      tr('Call center aur customer portal'),
      tr('AI store manager — bol kar poochein'),
    ],
  },
};

export default function CommerceSoonPage() {
  const { key = 'more' } = useParams();
  const s = SOON[key] ?? SOON.more;
  return (
    <PageShell>
      <PageHero
        title={s.title}
        chip={<><Sparkles />{tr('Jaldi aa raha hai')}</>}
        meta={s.intro}
        actions={<Link to="/online-store" className={heroButton}><ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {tr('Online store')}</Link>}
      />
      <section className="max-w-2xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}><s.icon className="h-5 w-5" /></span>
          <div>
            <h2 className="text-[1rem] font-semibold text-slate-900">{tr('Is me kya hoga')}</h2>
            <p className="text-[0.8125rem] text-slate-500">{tr('Ye hissa abhi ban raha hai. Tayyar hote hi yahin chalu ho jayega.')}</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {s.points.map((p) => (
            <li key={p} className="flex gap-2 text-[0.875rem] text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {p}</li>
          ))}
        </ul>
        {s.today && (
          <Link to={s.today.to} className="mt-5 inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-[0.875rem] font-semibold text-brand-fg hover:bg-brand-700">{s.today.label}</Link>
        )}
      </section>
    </PageShell>
  );
}

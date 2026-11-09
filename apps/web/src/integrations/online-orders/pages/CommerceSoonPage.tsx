/**
 * "Coming soon" page for commerce modules that are planned but not built
 * yet. It says plainly what the module will do and what to use today, so the
 * menu never shows a button that does nothing.
 */

import { Link, Navigate, useParams } from 'react-router-dom';
import { CheckCircle2, GraduationCap, Rocket, Sparkles, Store, type LucideIcon } from 'lucide-react';
import { Card, PageHero, PageShell, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t as tr } from '@core/i18n';
import { commerceNavGroups } from '@/app/shell/navigation/nav-config';
import { MODULE_PATHS, usePlatformControls, type CommerceModule } from '../hooks/usePlatformControls';

/** Names of the modules the Nafaa admin can switch to "Coming soon". */
const MODULE_TITLE: Record<CommerceModule, string> = {
  orders: tr('Orders'), catalog: tr('Products & stock'), dispatch: tr('Dispatch & airway bills'), couriers: tr('Couriers'),
  cod: tr('COD & payments'), returns: tr('Return scan'), abandoned_carts: tr('Abandoned carts'), growth: tr('Ads & Profit'),
  whatsapp: tr('WhatsApp messages'), storefront: tr('Online dukaan'), payment_links: tr('Online payments'), social: tr('Social media'),
  retention: tr('Campaigns, reviews aur loyalty'), affiliates: tr('Influencers & affiliates'),
  marketing: tr('Marketing'),
};

type Soon = { title: string; icon: LucideIcon; color: string; intro: string; points: string[]; today?: { to: string; label: string } };

/** Modules that are live now: old "Soon" links open the real page. */
const MOVED: Record<string, string> = { dispatch: '/online-orders/dispatch', 'post-office': '/online-orders/post-office' };

const SOON: Record<string, Soon> = {
  more: {
    title: tr('Aur bahut kuch aa raha hai'),
    icon: Sparkles,
    color: '#9333ea',
    intro: tr('Nafaa Commerce me ye sab bhi aa raha hai — ek ek kar ke.'),
    points: [
      tr('WhatsApp AI bot — order khud confirm, Roman Urdu me jawab'),
      tr('Ads Nafaa se banana, rokna aur kharcha khud aana — Meta / Google / TikTok ki manzoori ke baad'),
      tr('Social inbox aur khud post — Meta / TikTok ki manzoori ke baad'),
      tr('Automation builder — agar ye ho to wo karo'),
      tr('Call center aur customer portal'),
      tr('AI store manager — bol kar poochein'),
    ],
  },
};

/** Pages in the commerce menu that are live now (not marked Soon). */
const liveModules = commerceNavGroups.flatMap((g) => g.items).filter((it) => !it.badge).length;

export default function CommerceSoonPage() {
  const { key = 'more' } = useParams();
  const controls = usePlatformControls();
  const guide = usePageGuide();
  const adminSoon = key in MODULE_TITLE && !!controls.data?.comingSoon[key as CommerceModule];
  if (controls.isLoading && key in MODULE_TITLE) return <PageShell><div className="h-36" /></PageShell>;
  // A module the admin has not switched off opens its real page.
  if (!adminSoon && key in MODULE_TITLE && MODULE_PATHS[key as CommerceModule][0]) return <Navigate to={MODULE_PATHS[key as CommerceModule][0]} replace />;
  if (!adminSoon && MOVED[key]) return <Navigate to={MOVED[key]} replace />;
  const s: Soon = adminSoon
    ? { title: MODULE_TITLE[key as CommerceModule], icon: Sparkles, color: '#0284c7', intro: tr('Ye hissa abhi tayyar ho raha hai — jaldi aap ke liye khul jayega.'), points: [] }
    : SOON[key] ?? SOON.more;
  return (
    <PageShell>
      <PageHero
        title={s.title}
        chip={<><Sparkles />{tr('Jaldi aa raha hai')}</>}
        meta={s.intro}
        back="/online-store" backLabel={tr('Online store')}
        actions={<button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={[
          { label: tr('Is me aa raha'), value: String(s.points.length || 1), hint: tr('kaam') },
          { label: tr('Abhi chalu modules'), value: String(liveModules) },
        ]}
      />
      <Card>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}><s.icon className="h-5 w-5" /></span>
          <div>
            <h2 className="text-[1rem] font-semibold text-slate-900">{tr('Is me kya hoga')}</h2>
            <p className="text-[0.8125rem] text-slate-500">{tr('Ye hissa abhi ban raha hai. Tayyar hote hi yahin chalu ho jayega.')}</p>
          </div>
        </div>
        {!!s.points.length && <ul className="mt-4 space-y-2">
          {s.points.map((p) => (
            <li key={p} className="flex gap-2 text-[0.875rem] text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {p}</li>
          ))}
        </ul>}
        {s.today && (
          <Link to={s.today.to} className="mt-5 inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-[0.875rem] font-semibold text-brand-fg hover:bg-brand-700">{s.today.label}</Link>
        )}
      </Card>
      {guide.isOpen && (
        <PageGuide title={s.title} onClose={guide.close}
          flow={[
            { label: tr('Ban raha hai'), icon: Sparkles, color: '#9333ea' },
            { label: tr('Tayyar'), icon: Rocket, color: '#0284c7' },
            { label: tr('Yahin chalu'), hint: tr('Menu me khud aa jayega'), icon: Store, color: '#16a34a' },
          ]}
          steps={[
            { icon: Sparkles, color: '#9333ea', title: tr('Abhi kya karein'), text: tr('Ye hissa abhi ban raha hai. Tab tak Online store ke baqi pages istemal karein.') },
            { icon: Store, color: '#16a34a', title: tr('Chalu hone par'), text: tr('Tayyar hote hi ye page khud asli page ban jayega — kuch karna nahi.') },
          ]}
          shortcuts={[['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

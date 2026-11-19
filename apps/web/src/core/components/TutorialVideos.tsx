/**
 * Nafaa's YouTube tutorials: the list shown in the Help centre, the page each
 * one belongs to, and a player that opens the video inside the app.
 *
 * Add a new tutorial by appending to TUTORIALS with the pages it explains.
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ExternalLink, PlayCircle } from 'lucide-react';
import { Modal } from '@/design-system/components';
import { t as tr } from '@core/i18n';

export interface Tutorial {
  id: string;
  youtubeId: string;
  title: string;
  text: string;
  duration: string;
  /** Pages this video explains; the page guide offers it there. */
  pages: RegExp[];
}

export const TUTORIALS: Tutorial[] = [
  {
    id: 'signup', youtubeId: 'aigvntnOm2c', duration: '5:16',
    title: tr('Download, signup aur dukaan ka setup'), text: tr('App kahan se lein, account banayein aur dukaan set karein'),
    pages: [/^\/onboarding/],
  },
  {
    id: 'app-tour', youtubeId: '9rhtzZyKmh0', duration: '16:51',
    title: tr('Poore app ka tour'), text: tr('Har menu aur har screen, ek ek kar ke'),
    pages: [/^\/help/],
  },
  {
    id: 'settings-business', youtubeId: 'FwXPhO7QcKc', duration: '6:40',
    title: tr('Settings 1: business aur staff'), text: tr('Business info, branches, users, roles aur PIN'),
    pages: [/^\/settings\/?$/, /^\/settings\/(store|business-type|language|security)/, /^\/team/, /^\/profile/],
  },
  {
    id: 'settings-counter', youtubeId: 'YI_zF7HYNQA', duration: '7:21',
    title: tr('Settings 2: counter, bill aur rules'), text: tr('Counter rules, bill ka design, printing aur stock rules'),
    pages: [/^\/settings\/(counter|receipt|printing|hardware|payment-qr|stock|credit-loyalty|notifications|whatsapp|appearance)/],
  },
  {
    id: 'products', youtubeId: 'bLmZi7ALw0c', duration: '11:19',
    title: tr('Products poori guide'), text: tr('Haath se, library, Excel, variants, combos aur barcode labels'),
    pages: [/^\/products(\/|$)/, /^\/catalog/, /^\/categories/, /^\/brands/, /^\/tags/, /^\/combos/, /^\/barcode-labels/],
  },
  {
    id: 'stock', youtubeId: '5Q1OO3SbkJc', duration: '5:53',
    title: tr('Stock poori guide'), text: tr('Low stock, damage, transfers aur stock count'),
    pages: [/^\/low-stock/, /^\/inventory\//, /^\/stock-adjustments/, /^\/stock-movements/, /^\/damage/, /^\/transfers/],
  },
  {
    id: 'pos', youtubeId: 'CsHTSUWYt6s', duration: '11:57',
    title: tr('POS counter poori guide'), text: tr('Quick keys, Discount, hold bill, split payment, udhaar aur shift'),
    pages: [/^\/pos/, /^\/quick-keys/, /^\/cash-register/],
  },
  {
    id: 'sales', youtubeId: 'h7KyhZdG2fk', duration: '5:04',
    title: tr('Sales, returns aur bookings'), text: tr('Bill dhoondein, reprint, return, void aur bookings'),
    pages: [/^\/sales/, /^\/returns/, /^\/bookings/],
  },
  {
    id: 'customers', youtubeId: '5ZCseZor2w0', duration: '6:12',
    title: tr('Customers aur udhaar'), text: tr('Customer credit, payment lena, WhatsApp reminder, loyalty aur Discount codes'),
    pages: [/^\/customers/, /^\/khata/, /^\/loyalty/, /^\/discounts/],
  },
  {
    id: 'purchasing', youtubeId: 'YAJXGgepSNE', duration: '7:03',
    title: tr('Purchasing aur suppliers'), text: tr('Suppliers, purchases, order, maal receive aur supplier payments'),
    pages: [/^\/suppliers/, /^\/purchases/],
  },
  {
    id: 'money', youtubeId: 'tuvDWtgcpzc', duration: '5:04',
    title: tr('Expenses aur accounts'), text: tr('Shop accounts, Expense, other income, cash aur bank'),
    pages: [/^\/money/, /^\/expenses/, /^\/income/],
  },
  {
    id: 'reports-1', youtubeId: 'kInck0bQckg', duration: '7:01',
    title: tr('Reports 1: Dashboard aur Day report'), text: tr('Aaj ki Sale, Profit, Day report ke tabs aur Reports'),
    pages: [/^\/dashboard/, /^\/day-report/, /^\/reports\/?$/],
  },
  {
    id: 'reports-2', youtubeId: 'qhSlqqy1e7M', duration: '5:58',
    title: tr('Reports 2: Profit, stock, staff aur Nafaa AI'), text: tr('Profit-loss, product ka Profit, stock report, audit aur Nafaa AI'),
    pages: [/^\/profit-loss/, /^\/profit-report/, /^\/stock-report/, /^\/reports\//, /^\/audit/, /^\/activity-log/, /^\/ai/],
  },
  {
    id: 'staff', youtubeId: 'HdjUp6r1F1s', duration: '5:06',
    title: tr('Staff'), text: tr('Roles, attendance, salary aur commission'),
    pages: [/^\/staff/],
  },
  {
    id: 'tax', youtubeId: 'BQVyj-Xc4KM', duration: '4:58',
    title: tr('Tax aur FBR'), text: tr('Bill par tax, tax invoices, monthly report aur FBR/PRA screen'),
    pages: [/^\/tax/, /^\/fbr/, /^\/settings\/(tax|tax-authority)/],
  },
  {
    id: 'branches', youtubeId: 'L1Vo8qWCAKU', duration: '5:04',
    title: tr('Multi-branch'), text: tr('All shops, branch analytics aur branches ke darmiyan stock transfer'),
    pages: [/^\/shops/],
  },
  {
    id: 'online-website', youtubeId: 'iFVVcXQzfms', duration: '9:24',
    title: tr('Online store 1: apni website'), text: tr('Website 7 steps me, design, products, delivery charges aur payment'),
    pages: [/^\/online-store\/?$/, /^\/online-store\/(site|website|setup|products|payments)/],
  },
  {
    id: 'online-orders', youtubeId: 'CtknnC8iUhk', duration: '8:02',
    title: tr('Online store 2: orders aur couriers'), text: tr('Orders, packing scan, couriers, returns aur COD ka hisaab'),
    pages: [/^\/online-orders(?!\/(customers|abandoned|profit|radar|reports|conversion))/, /^\/online-store\/couriers/],
  },
  {
    id: 'online-growth', youtubeId: '98JtNqS2SdM', duration: '5:40',
    title: tr('Online store 3: growth aur asal Profit'), text: tr('Customers, reviews, WhatsApp campaigns, loyalty, Selling costs aur Profit'),
    pages: [/^\/online-orders\/(customers|abandoned|profit|radar|reports|conversion)/, /^\/online-store\/(campaigns|reviews|loyalty|blocklist|whatsapp|costs|price-calculator|channels|automation|inbox|marketing|connect|affiliates|ads|settings)/],
  },
  {
    id: 'distribution', youtubeId: 'DLsnetvmoZM', duration: '5:05',
    title: tr('Distribution'), text: tr('Orders, order bookers, load sheets, routes aur recoveries'),
    pages: [/^\/distribution/],
  },
  {
    id: 'mobile-app', youtubeId: 'WHPbBOZguRA', duration: '6:20',
    title: tr('Mobile app'), text: tr('Phone par login, bill, products, udhaar aur reports'),
    pages: [],
  },
  {
    id: 'data-plan', youtubeId: '1idsmdGo1HQ', duration: '4:16',
    title: tr('Data, plan aur backup'), text: tr('Sync, backup, data download, plan aur Danger zone'),
    pages: [/^\/backup/, /^\/exports/, /^\/sync/, /^\/billing/, /^\/plans/, /^\/plan-usage/, /^\/apps/, /^\/referrals/, /^\/delete-account/, /^\/settings\/(danger|data-export)/],
  },
];

export function tutorialForPath(path: string): Tutorial | undefined {
  return TUTORIALS.find((v) => v.pages.some((re) => re.test(path)));
}

export const tutorialThumb = (v: Tutorial) => `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`;
const watchUrl = (v: Tutorial) => `https://youtu.be/${v.youtubeId}`;

/** Plays one tutorial in a modal, with a link out to YouTube. */
export function TutorialPlayer({ video, onClose }: { video: Tutorial; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="xl" title={video.title} description={tr('Urdu awaaz, English subtitles')}>
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-900">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <a href={watchUrl(video)} target="_blank" rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-600 hover:text-slate-900">
        <ExternalLink className="h-4 w-4" /> {tr('YouTube par kholein')}
      </a>
    </Modal>
  );
}

/** Small "how to sign up" link for the register page; plays the signup video in place. */
export function SignupVideoLink({ className }: { className?: string }) {
  const [playing, setPlaying] = useState(false);
  const video = TUTORIALS.find((v) => v.id === 'signup');
  if (!video) return null;
  return (
    <>
      <button type="button" onClick={() => setPlaying(true)}
        className={`mx-auto flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900 ${className ?? ''}`}>
        <PlayCircle className="h-5 w-5 text-red-600" />
        {tr('Account kaise banayein? Video dekhein')}
        <span className="font-normal text-slate-400">· {video.duration}</span>
      </button>
      {playing && <TutorialPlayer video={video} onClose={() => setPlaying(false)} />}
    </>
  );
}

/** "Watch the video" row for the page guide; renders nothing when the page has no video. */
export function PageVideoLink() {
  const { pathname } = useLocation();
  const [playing, setPlaying] = useState(false);
  const video = tutorialForPath(pathname);
  if (!video) return null;
  return (
    <>
      <button type="button" onClick={() => setPlaying(true)}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-red-50 p-3 text-start ring-1 ring-red-100 transition hover:bg-red-100/70">
        <img src={tutorialThumb(video)} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.875rem] font-semibold text-slate-900">{tr('Is page ki video dekhein')}</span>
          <span className="block truncate text-[0.75rem] text-slate-600">{video.title} · {video.duration}</span>
        </span>
        <PlayCircle className="h-6 w-6 shrink-0 text-red-600" />
      </button>
      {playing && <TutorialPlayer video={video} onClose={() => setPlaying(false)} />}
    </>
  );
}

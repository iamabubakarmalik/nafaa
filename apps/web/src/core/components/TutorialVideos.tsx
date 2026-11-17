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
    id: 'overview', youtubeId: 'YTVu8Z9v5XM', duration: '2:37',
    title: tr('Nafaa ka taaruf'), text: tr('Nafaa kya kya karta hai, 3 minute me'),
    pages: [],
  },
  {
    id: 'signup', youtubeId: '2vhK_APoleI', duration: '4:46',
    title: tr('Signup aur dukaan ka setup'), text: tr('Account, setup, zabaan aur Appearance'),
    pages: [/^\/onboarding/, /^\/settings\/(language|appearance)/],
  },
  {
    id: 'products', youtubeId: 'X-ifawR4C0Q', duration: '3:24',
    title: tr('Products add karein'), text: tr('Haath se, ready library se, aur stock'),
    pages: [/\/products(\/|$)/, /^\/catalog/, /^\/categories/, /^\/brands/],
  },
  {
    id: 'first-bill', youtubeId: 'GBLlTV3_Tp8', duration: '3:08',
    title: tr('Pehla bill banayein'), text: tr('Search, Discount, payment, WhatsApp bill aur bill ka design'),
    pages: [/^\/pos/, /^\/settings\/(receipt|counter)/, /^\/sales/],
  },
  {
    id: 'day-report', youtubeId: 'i1Kv5rOHbAg', duration: '2:27',
    title: tr('Din ka hisaab aur profit'), text: tr('Dashboard, Day report, Expense, print aur PDF'),
    pages: [/^\/dashboard/, /^\/day-report/, /^\/expenses/],
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

/**
 * /support: the live support chat on its own page. The header shows whether
 * the team is online, the usual reply time and the team timings; the chat
 * fills the rest. On wide screens a side column offers the other ways to
 * reach us (WhatsApp, call, email) and the help center.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock3, Headset, Mail, MessageCircle, Phone } from 'lucide-react';
import { PageHero, PageShell, heroButton } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { t } from '@core/i18n';
import { SUPPORT, supportWhatsapp } from '@modules/help/support';
import { replyTimeText } from '../lib/format';
import { useSupportStore } from '../store';
import { SupportChat } from '../components/SupportChat';

export default function SupportPage() {
  const status = useSupportStore((s) => s.status);
  const conversation = useSupportStore((s) => s.conversation);
  const closePanel = useSupportStore((s) => s.closePanel);
  const tenant = useAuthStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user);

  // The page replaces the floating panel.
  useEffect(() => { closePanel(); }, [closePanel]);

  const team = status?.team.state;
  const teamText = team === 'online' ? t('Online') : team === 'away' ? t('Away') : t('Offline');
  const wa = supportWhatsapp(t('Assalam-o-Alaikum, mujhe Nafaa mein help chahiye.\nShop: {{shop}}\nNaam: {{name}}\n\nIssue: ', { shop: tenant?.name ?? '', name: user?.fullName ?? '' }));

  const contact = 'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition hover:bg-slate-50';

  return (
    <PageShell>
      <PageHero
        title={t('Help & Support')}
        chip={<><Headset />{conversation && conversation.status !== 'CLOSED' && conversation.status !== 'RESOLVED' ? t('Chat jari hai') : t('Live chat')}</>}
        meta={status?.teamLine || t('Nafaa AI foran jawab deta hai, support team bhi yahin hai')}
        actions={<Link to="/help" className={heroButton}><BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">{t('Help center')}</span></Link>}
        loading={!status}
        stats={[
          { label: t('Support team'), value: teamText, hint: status?.team.online ? t('{{count}} online', { count: status.team.online }) : undefined },
          { label: t('Reply time'), value: replyTimeText(status?.expectedReplyMinutes), hint: t('Timings ke andar') },
          { label: t('Team timings'), value: status?.hoursText || '—', hint: status ? (status.withinHours ? t('Abhi team ka time hai') : t('Abhi team ka time nahi')) : undefined },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="h-[calc(100dvh-15rem)] min-h-[30rem] overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 sm:h-[calc(100dvh-17rem)]">
          <SupportChat variant="page" />
        </section>

        <aside className="hidden space-y-3 xl:block">
          <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
            <div className="px-3 pb-1 pt-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">{t('Aur tareeqe')}</div>
            <a href={wa} target="_blank" rel="noreferrer" className={contact}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><MessageCircle className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block text-[0.8125rem] font-semibold text-slate-800">{t('WhatsApp')}</span><span className="block text-[0.75rem] text-slate-500 dir-ltr">{SUPPORT.phone}</span></span>
            </a>
            <a href={`tel:${SUPPORT.phoneIntl}`} className={contact}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Phone className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block text-[0.8125rem] font-semibold text-slate-800">{t('Call')}</span><span className="block text-[0.75rem] text-slate-500 dir-ltr">{SUPPORT.phone}</span></span>
            </a>
            <a href={`mailto:${SUPPORT.email}`} className={contact}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Mail className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block text-[0.8125rem] font-semibold text-slate-800">{t('Email')}</span><span className="block truncate text-[0.75rem] text-slate-500">{SUPPORT.email}</span></span>
            </a>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-slate-800"><Clock3 className="h-4 w-4 text-brand-600" /> {t('Jaldi help ke liye')}</div>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-[0.75rem] leading-relaxed text-slate-600">
              <li>{t('Issue ka screenshot bhejein (Ctrl+V se paste bhi hota hai)')}</li>
              <li>{t('Lambi baat ho to voice note record karein')}</li>
              <li>{t('Screen par dikhana ho to call mein screen share karein')}</li>
            </ul>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

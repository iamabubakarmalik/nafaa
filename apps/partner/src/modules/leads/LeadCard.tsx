/** One lead in a list: name, owner and phone, stage, interest and follow-up. */

import { Link } from 'react-router-dom';
import { CalendarClock, ChevronRight, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/design-system/components';
import type { Lead } from '@/api/types';
import { INTEREST, STAGE } from '@/lib/labels';
import { dayShort, isoToDateInput, relativeDay, todayInput } from '@/lib/format';
import { prettyPhone, telLink } from '@/lib/phone';
import { cn } from '@/lib/cn';

export function LeadCard({ lead }: { lead: Lead }) {
  const open = lead.stage === 'VISITED' || lead.stage === 'DEMO';
  const due = open && lead.followUpAt && isoToDateInput(lead.followUpAt) <= todayInput();
  return (
    <div className="flex items-stretch gap-2 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <Link to={`/leads/${lead.id}`} className="min-w-0 flex-1 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[0.9375rem] font-bold text-slate-900">{lead.shopName}</p>
          <Badge size="sm" variant={STAGE[lead.stage].badge} className="shrink-0">{STAGE[lead.stage].label}</Badge>
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-slate-500">{[lead.ownerName, prettyPhone(lead.phone)].filter(Boolean).join(' · ')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.75rem]">
          {lead.interest && INTEREST[lead.interest] && <Badge size="xs" variant={INTEREST[lead.interest].badge}>{INTEREST[lead.interest].label}</Badge>}
          {open && lead.followUpAt && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold', due ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600')}>
              <CalendarClock className="h-3 w-3" />{relativeDay(lead.followUpAt)}
            </span>
          )}
          {lead.signedUp && lead.planName && <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">{lead.planName}</span>}
          {lead.city && <span className="inline-flex items-center gap-0.5 text-slate-500"><MapPin className="h-3 w-3" />{lead.city}</span>}
          {lead.lastVisitAt && <span className="text-slate-400">· Visit {dayShort(lead.lastVisitAt)}{lead.visitCount && lead.visitCount > 1 ? ` (${lead.visitCount})` : ''}</span>}
        </div>
      </Link>
      <div className="flex flex-col border-s border-slate-100">
        <a href={telLink(lead.phone)} aria-label={`${lead.shopName} ko call`} className="flex flex-1 items-center justify-center px-3.5 text-slate-500 hover:text-brand-700"><Phone className="h-4 w-4" /></a>
        <Link to={`/leads/${lead.id}`} aria-label="Kholein" className="flex flex-1 items-center justify-center border-t border-slate-100 px-3.5 text-slate-400"><ChevronRight className="h-4 w-4 rtl-flip" /></Link>
      </div>
    </div>
  );
}

/**
 * One-line customer rating summary for reports: average stars, how many
 * rated and how many low ratings since a day. Hidden until the shop has
 * review requests.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Star } from 'lucide-react';
import { t } from '@core/i18n';
import { retentionApi } from '../../api/retention.api';

export function RatingSummary({ from }: { from: string }) {
  const days = Math.max(1, Math.ceil((Date.now() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000));
  const q = useQuery({ queryKey: ['online-reviews', 'summary', days], queryFn: () => retentionApi.reviews({ filter: 'RATED', days }), staleTime: 5 * 60_000 });
  const s = q.data?.stats;
  if (!s || !s.requests) return null;
  return (
    <Link to="/online-store/reviews" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-3 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50">
      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{t('Customer rating')}</span>
      <span className="font-bold tabular-nums text-slate-900">{s.average ? `${s.average} / 5` : '—'}</span>
      <span className="text-slate-500">{t('{{count}} ratings · {{rate}}% ne jawab diya', { count: s.rated, rate: s.responseRate })}</span>
      {s.low > 0 && <span className="font-semibold text-rose-600">{t('{{count}} kam rating', { count: s.low })}</span>}
      <ArrowRight className="ms-auto h-4 w-4 text-slate-400 rtl-flip" />
    </Link>
  );
}

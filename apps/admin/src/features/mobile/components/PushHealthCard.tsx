/**
 * Push delivery health: what Expo, Google (FCM) and Apple reported for every
 * staff app push in the last days, with the error codes explained.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { adminMobileApi } from '@/api/admin-mobile.api';
import { cn } from '@/lib/cn';
import { Card, Pill } from './MobileUi';

/** What each Expo receipt error means and what to do. */
const ERROR_HELP: Record<string, string> = {
  MismatchSenderId: 'The FCM V1 key in Expo (EAS credentials) belongs to a different Firebase project than the app\'s google-services.json. Upload a service account key from the same Firebase project.',
  InvalidCredentials: 'Push credentials in Expo are missing or wrong: FCM V1 service account key for Android, or the APNs key for iOS.',
  DeviceNotRegistered: 'The app was uninstalled or the token expired. The token is removed automatically.',
  MessageTooBig: 'The message was larger than 4 KB.',
  MessageRateExceeded: 'Too many pushes to one phone in a short time.',
  NetworkError: 'This server could not reach Expo.',
};

const DAYS = [1, 7, 30];

export function PushHealthCard() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useQuery({ queryKey: ['admin-mobile-push-health', days], queryFn: () => adminMobileApi.pushHealth(days), refetchInterval: 60_000 });
  const pct = (n: number) => (data && data.total ? `${Math.round((n / data.total) * 100)}%` : '–');

  return (
    <Card
      title="Delivery health"
      subtitle="Every push to the staff app (alerts, tests, broadcasts), from Expo's delivery receipts."
      action={(
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {DAYS.map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold', days === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>{d === 1 ? '24 h' : `${d} days`}</button>
          ))}
        </div>
      )}
    >
      {isLoading || !data ? <div className="h-24 animate-pulse rounded-2xl bg-slate-100" /> : (
        <div className="space-y-4">
          {data.delivery === 'dry-run' && <p className="text-sm text-slate-500">This server does not deliver pushes (dry run). Set MOBILE_PUSH_LIVE=true to send for real.</p>}
          {data.credentialsProblem && (
            <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div><b>Push credentials problem.</b> Phones on the affected platform get nothing until it is fixed. See the error list below.</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Sent', value: data.total, hint: 'accepted by Expo or failed' },
              { label: 'Delivered', value: data.delivered, hint: pct(data.delivered) },
              { label: 'Failed', value: data.failed, hint: pct(data.failed), bad: data.failed > 0 },
              { label: 'Waiting', value: data.sent + data.unknown, hint: 'receipt not read yet' },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-slate-200 p-3">
                <div className="text-xs font-semibold text-slate-500">{k.label}</div>
                <div className={cn('text-2xl font-bold tabular-nums', k.bad ? 'text-rose-600' : 'text-slate-900')}>{k.value}</div>
                <div className="text-xs text-slate-400">{k.hint}</div>
              </div>
            ))}
          </div>
          {Object.keys(data.platforms).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.platforms).map(([platform, s]) => (
                <Pill key={platform} tone={(s.ERROR ?? 0) > (s.DELIVERED ?? 0) ? 'rose' : 'slate'}>
                  {platform}: {s.DELIVERED ?? 0} delivered · {s.ERROR ?? 0} failed
                </Pill>
              ))}
            </div>
          )}
          {data.errors.length > 0 && (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {data.errors.map((e) => (
                <div key={e.error} className="flex gap-3 p-3">
                  <span className="w-12 shrink-0 text-right font-bold tabular-nums text-rose-600">{e.count}</span>
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-slate-900">{e.error}</div>
                    <div className="text-xs text-slate-500">{ERROR_HELP[e.error] ?? 'See Expo push error codes.'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.lastError && <p className="text-xs text-slate-400">Last error: {data.lastError.error} ({data.lastError.platform ?? 'older app'}) at {new Date(data.lastError.createdAt).toLocaleString()}</p>}
        </div>
      )}
    </Card>
  );
}

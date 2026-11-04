/**
 * "My notifications": the signed-in person's own choices, shared with the
 * mobile app. Per event: in the app (bell) and push to phone; the sale
 * summary and discount threshold; the tone (played here for live
 * notifications too), vibration, quiet hours; this browser's desktop
 * notifications; and a test push with the real delivery result.
 */

import { useEffect, useState, type ComponentType } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  BadgePercent, BellRing, BookOpen, CalendarClock, Clock, LockKeyhole, Monitor, Moon, Package, Play, Receipt, RotateCcw,
  ShoppingBag, ShoppingCart, Sun, Truck, Volume2, Wallet,
} from 'lucide-react';
import { Alert, Button, Input, Segmented, Skeleton, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t as tr } from '@core/i18n';
import { notificationsApi, type AlertEvent, type AlertSound, type TestPushStatus } from './api/notifications.api';
import { playTone, toneLabel, useAlertPrefs } from './alertPrefs';

type Icon = ComponentType<{ className?: string }>;

const EVENT_META: Record<AlertEvent, { icon: Icon; label: () => string; desc: () => string }> = {
  sale: { icon: ShoppingCart, label: () => tr('Sale'), desc: () => tr('Har bill, ya kuch minute ka khulasa') },
  bigDiscount: { icon: BadgePercent, label: () => tr('Bara Discount'), desc: () => tr('Bill par had se zyada Discount') },
  voidRefund: { icon: RotateCcw, label: () => tr('Void aur return'), desc: () => tr('Bill cancel ho ya maal wapas aaye') },
  expense: { icon: Receipt, label: () => tr('Expense'), desc: () => tr('Koi naya Expense likhe') },
  purchase: { icon: Truck, label: () => tr('Purchase'), desc: () => tr('Supplier ka maal aaye') },
  lowStock: { icon: Package, label: () => tr('Kam stock'), desc: () => tr('Product kam ya khatam ho') },
  khataPayment: { icon: BookOpen, label: () => tr('Udhaar ki wasooli'), desc: () => tr('Customer udhaar ka paisa de') },
  onlineOrder: { icon: ShoppingBag, label: () => tr('Online order'), desc: () => tr('Website ya app se naya order') },
  register: { icon: Wallet, label: () => tr('Cash register'), desc: () => tr('Register khule ya band ho; kami ho to phone par bhi') },
  lateCheckIn: { icon: Clock, label: () => tr('Late check-in'), desc: () => tr('Staff der se aaye') },
  booking: { icon: CalendarClock, label: () => tr('Booking'), desc: () => tr('Nayi booking ya appointment') },
  dailySummary: { icon: Sun, label: () => tr('Daily summary'), desc: () => tr('Din ke aakhir ka hisaab') },
  account: { icon: LockKeyhole, label: () => tr('Account aur billing'), desc: () => tr('Plan, bill aur payment') },
};

const TEST_TEXT: Record<TestPushStatus, { tone: 'success' | 'warning' | 'danger' | 'info'; text: () => string }> = {
  delivered: { tone: 'success', text: () => tr('Pohnch gayi. Phone par dekhein.') },
  sent: { tone: 'info', text: () => tr('Bhej di. Ek do minute me aa jani chahiye.') },
  'no-device': { tone: 'warning', text: () => tr('Is account par koi phone register nahi. Nafaa app me login karein aur notifications ki ijazat dein.') },
  'android-setup': { tone: 'danger', text: () => tr('Android phones par notifications abhi set nahi hain. Nafaa support ko batayein.') },
  'ios-setup': { tone: 'danger', text: () => tr('iPhone par notifications abhi set nahi hain. Nafaa support ko batayein.') },
  'device-gone': { tone: 'warning', text: () => tr('Ye phone ab register nahi. App band kar ke dobara kholein, phir test karein.') },
  failed: { tone: 'danger', text: () => tr('Notification nahi gayi. Thori der baad dobara koshish karein.') },
  'dry-run': { tone: 'info', text: () => tr('Test server: phone par push nahi bheji jati.') },
};

function Block({ title, desc, icon: I, children }: { title: string; desc?: string; icon: Icon; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><I className="h-4 w-4" /></span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {desc && <p className="text-xs text-slate-500">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function useBrowserPermission() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [state, setState] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported');
  useEffect(() => {
    if (!supported) return;
    const read = () => setState(Notification.permission);
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, [supported]);
  const ask = () => { if (supported) void Notification.requestPermission().then(setState); };
  return { state, ask };
}

export function AlertPrefsPanel() {
  const { q, prefs, save } = useAlertPrefs();
  const browser = useBrowserPermission();
  const [minAmount, setMinAmount] = useState('');
  const [result, setResult] = useState<{ status: TestPushStatus; errors: string[] } | null>(null);
  const test = useMutation({
    mutationFn: notificationsApi.testPush,
    onSuccess: (r) => setResult({ status: r.status, errors: r.errors ?? [] }),
    onError: () => setResult({ status: 'failed', errors: [] }),
  });
  useEffect(() => { if (prefs) setMinAmount(prefs.saleMinAmount ? String(prefs.saleMinAmount) : ''); }, [prefs?.saleMinAmount]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!prefs) {
    return q.isError
      ? <Alert tone="warning">{tr('Internet se judne par yahan aap ki choices dikhengi.')} <button type="button" className="font-semibold underline" onClick={() => void q.refetch()}>{tr('Dobara koshish karein')}</button></Alert>
      : <Skeleton className="h-64 rounded-xl" />;
  }
  const sale = prefs.events.find((e) => e.event === 'sale');
  const discount = prefs.events.find((e) => e.event === 'bigDiscount');
  const shown = result ? TEST_TEXT[result.status] : null;

  return (
    <div className="space-y-4">
      <Block icon={BellRing} title={tr('Apne kaam ke alerts bhi')} desc={tr('Staff ke kaam ke alerts owner/manager ko jate hain. Apne kaam ke alerts ke liye neeche on karein.')}>
        <div className="space-y-3">
          <Switch label={tr('Apne kaam ki khabar App me')} description={tr('Aap ka khud ka Sale ya Expense bhi list me aaye')} checked={prefs.ownActionsInApp} onChange={(ev) => save({ ownActionsInApp: ev.target.checked })} />
          <Switch label={tr('Apne kaam ki push')} description={tr('Aap ka khud ka kaam ho to phone par bhi push aaye')} checked={prefs.ownActionsPush} onChange={(ev) => save({ ownActionsPush: ev.target.checked })} />
        </div>
      </Block>

      <Block icon={BellRing} title={tr('Kis baat ki khabar')} desc={tr('Sirf aap ke liye. Web aur app dono par yahi choices lagti hain.')}>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            <span />
            <span className="w-14 text-center">{tr('App')}</span>
            <span className="w-14 text-center">{tr('Phone')}</span>
          </div>
          {prefs.events.map((e) => {
            const m = EVENT_META[e.event];
            const desc = e.event === 'sale' && prefs.saleDigestMinutes > 0 ? `${m.desc()} · ${tr('Push har {{count}} min ka khulasa hai', { count: prefs.saleDigestMinutes })}` : m.desc();
            const I = m.icon;
            return (
              <div key={e.event} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-slate-100 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <I className="h-4 w-4 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">{m.label()}</div>
                    <div className="truncate text-xs text-slate-500">{desc}</div>
                  </div>
                </div>
                <span className="flex w-14 justify-center"><Switch size="sm" aria-label={tr('App me (ghanti)')} checked={e.inApp} onChange={(ev) => save({ events: { [e.event]: { inApp: ev.target.checked } } })} /></span>
                <span className="flex w-14 justify-center"><Switch size="sm" aria-label={tr('Phone par push')} checked={e.push} onChange={(ev) => save({ events: { [e.event]: { push: ev.target.checked } } })} /></span>
              </div>
            );
          })}
        </div>

        {(sale || discount) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sale && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-800">{tr('Sale ki push kab aaye')}</div>
                <Segmented value={String(prefs.saleDigestMinutes)} onChange={(v) => save({ saleDigestMinutes: Number(v) })}
                  items={prefs.digestChoices.map((n) => ({ value: String(n), label: n === 0 ? tr('Har bill') : tr('{{count}} min', { count: n }) }))} />
                <p className="text-xs text-slate-500">{tr('Masroof dukaan ke liye: har kuch minute me ek push, kitni Sale aur kitne ki.')}</p>
                <Input label={tr('Sirf is se bare bill')} hint={tr('0 = har bill')} inputMode="numeric" value={minAmount} placeholder="0"
                  onChange={(ev) => setMinAmount(ev.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => { const n = Number(minAmount || 0); if (n !== prefs.saleMinAmount) save({ saleMinAmount: n }); }} />
              </div>
            )}
            {discount && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-800">{tr('Kitna Discount bara hai')}</div>
                <Segmented value={String(prefs.discountPercent)} onChange={(v) => save({ discountPercent: Number(v) })}
                  items={[5, 10, 20, 30, 50].map((n) => ({ value: String(n), label: `${n}%` }))} />
              </div>
            )}
          </div>
        )}
      </Block>

      <Block icon={Volume2} title={tr('Awaaz')} desc={tr('Web par nayi notification aur phone ki push, dono isi awaaz se.')}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {prefs.sounds.map((s: AlertSound) => (
            <div key={s} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', prefs.sound === s ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white')}>
              <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-start" onClick={() => { save({ sound: s }); playTone(s); }}>
                <span className={cn('h-3.5 w-3.5 shrink-0 rounded-full border-2', prefs.sound === s ? 'border-brand-600 bg-brand-600' : 'border-slate-300')} />
                <span className="truncate text-sm font-medium text-slate-800">{toneLabel(s)}</span>
              </button>
              {s !== 'silent' && (
                <button type="button" onClick={() => playTone(s)} title={tr('Suno')} aria-label={tr('Suno')} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                  <Play className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Switch label={tr('Vibration')} description={tr('Phone par push ke saath')} checked={prefs.vibrate} onChange={(ev) => save({ vibrate: ev.target.checked })} />
        </div>
      </Block>

      <Block icon={Moon} title={tr('Khamosh waqt')} desc={tr('Is waqt push bina awaaz ke aati hai. Dukaan ke time zone ke mutabiq.')}>
        <Switch label={tr('Raat ko khamosh')} checked={prefs.quietHours} onChange={(ev) => save({ quietHours: ev.target.checked })} />
        {prefs.quietHours && (
          <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
            <Input type="time" label={tr('Shuru')} value={prefs.quietStart} onChange={(ev) => ev.target.value && save({ quietStart: ev.target.value })} />
            <Input type="time" label={tr('Khatam')} value={prefs.quietEnd} onChange={(ev) => ev.target.value && save({ quietEnd: ev.target.value })} />
          </div>
        )}
      </Block>

      <Block icon={Monitor} title={tr('Is computer par')} desc={tr('Doosri tab khuli ho tab bhi computer ke kone me khabar aaye')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-slate-700">
            {browser.state === 'granted' ? tr('Chalu') : browser.state === 'denied' ? tr('Browser ne rok diya hai. Address bar ke taale wale nishan se ijazat dein.') : browser.state === 'unsupported' ? tr('Ye browser ye nahi karta') : tr('Abhi band')}
          </span>
          {browser.state === 'default' && <Button size="sm" variant="secondary" onClick={browser.ask}>{tr('Chalu karein')}</Button>}
        </div>
      </Block>

      <Block icon={BellRing} title={tr('Test notification')} desc={tr('Aap ke har phone par ek test push jati hai, aur yahan batate hain ke pohnchi ya nahi.')}>
        <Button size="sm" variant="secondary" loading={test.isPending} onClick={() => test.mutate()}>{tr('Test bhejein')}</Button>
        {shown && result && (
          <Alert className="mt-3" tone={shown.tone}>
            {shown.text()}
            {(result.status === 'android-setup' || result.status === 'ios-setup' || result.status === 'failed') && result.errors.length > 0 && (
              <span dir="ltr" className="mt-1 block text-xs opacity-70">{tr('Code: {{codes}}', { codes: result.errors.join(', ') })}</span>
            )}
          </Alert>
        )}
      </Block>
    </div>
  );
}

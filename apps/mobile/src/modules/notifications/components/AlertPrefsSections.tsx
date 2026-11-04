/**
 * The signed-in person's own notification choices (same data as the web):
 * which events show in the app and come as a push, the tone, vibration,
 * quiet hours, the sale summary and the discount threshold. Changes save at
 * once. Also the test push with the real delivery result.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgePercent, Bell, BellRing, BookOpen, CalendarClock, Check, Clock, LockKeyhole, Package, Play, Receipt, RotateCcw,
  ShoppingBag, ShoppingCart, Sun, Truck, Wallet, type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import {
  Button, Card, DatePicker, Icon, IconButton, Input, ListRow, Segmented, SettingSwitch, SettingsGroup, Sheet, SkeletonRows, Switch, Text, toast, useTheme,
} from '@/design';
import {
  notificationsApi, type AlertEvent, type AlertEventPref, type AlertPrefs, type AlertPrefsPatch, type AlertSound, type TestPushStatus,
} from '../api/notifications';
import { previewTone, registerPushNow, toneLabel } from '../lib/usePushSetup';

export const ALERT_PREFS_KEY = ['notification-prefs'];

const EVENT_META: Record<AlertEvent, { icon: LucideIcon; label: string; desc: string }> = {
  sale: { icon: ShoppingCart, label: msg('Sale'), desc: msg('Har bill, ya kuch minute ka khulasa') },
  bigDiscount: { icon: BadgePercent, label: msg('Bara Discount'), desc: msg('Bill par had se zyada Discount') },
  voidRefund: { icon: RotateCcw, label: msg('Void aur return'), desc: msg('Bill cancel ho ya maal wapas aaye') },
  expense: { icon: Receipt, label: msg('Expense'), desc: msg('Koi naya Expense likhe') },
  purchase: { icon: Truck, label: msg('Purchase'), desc: msg('Supplier ka maal aaye') },
  lowStock: { icon: Package, label: msg('Kam stock'), desc: msg('Product kam ya khatam ho') },
  khataPayment: { icon: BookOpen, label: msg('Udhaar ki wasooli'), desc: msg('Customer udhaar ka paisa de') },
  onlineOrder: { icon: ShoppingBag, label: msg('Online order'), desc: msg('Website ya app se naya order') },
  register: { icon: Wallet, label: msg('Cash register'), desc: msg('Register khule ya band ho; kami ho to phone par bhi') },
  lateCheckIn: { icon: Clock, label: msg('Late check-in'), desc: msg('Staff der se aaye') },
  booking: { icon: CalendarClock, label: msg('Booking'), desc: msg('Nayi booking ya appointment') },
  dailySummary: { icon: Sun, label: msg('Daily summary'), desc: msg('Din ke aakhir ka hisaab') },
  account: { icon: LockKeyhole, label: msg('Account aur billing'), desc: msg('Plan, bill aur payment') },
};

const TEST_TEXT: Record<TestPushStatus, { tone: 'success' | 'warning' | 'danger' | 'info'; text: string }> = {
  delivered: { tone: 'success', text: msg('Pohnch gayi. Phone par dekhein.') },
  sent: { tone: 'info', text: msg('Bhej di. Ek do minute me aa jani chahiye.') },
  'no-device': { tone: 'warning', text: msg('Is account par koi phone register nahi. Nafaa app me login karein aur notifications ki ijazat dein.') },
  'android-setup': { tone: 'danger', text: msg('Android phones par notifications abhi set nahi hain. Nafaa support ko batayein.') },
  'ios-setup': { tone: 'danger', text: msg('iPhone par notifications abhi set nahi hain. Nafaa support ko batayein.') },
  'device-gone': { tone: 'warning', text: msg('Ye phone ab register nahi. App band kar ke dobara kholein, phir test karein.') },
  failed: { tone: 'danger', text: msg('Notification nahi gayi. Thori der baad dobara koshish karein.') },
  'dry-run': { tone: 'info', text: msg('Test server: phone par push nahi bheji jati.') },
};

function applyPatch(prev: AlertPrefs, patch: AlertPrefsPatch): AlertPrefs {
  const { events, ...rest } = patch;
  return {
    ...prev,
    ...rest,
    events: prev.events.map((e) => (events?.[e.event] ? { ...e, ...events[e.event] } : e)),
  };
}

export function useAlertPrefs() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ALERT_PREFS_KEY, queryFn: notificationsApi.prefs, staleTime: 60_000 });
  const m = useMutation({
    mutationFn: notificationsApi.updatePrefs,
    onMutate: async (patch: AlertPrefsPatch) => {
      await qc.cancelQueries({ queryKey: ALERT_PREFS_KEY });
      const prev = qc.getQueryData<AlertPrefs>(ALERT_PREFS_KEY);
      if (prev) qc.setQueryData(ALERT_PREFS_KEY, applyPatch(prev, patch));
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(ALERT_PREFS_KEY, ctx.prev);
      toast.error(t('Save nahi hua'));
    },
    onSuccess: (data) => qc.setQueryData(ALERT_PREFS_KEY, data),
  });
  return { q, save: m.mutate, saving: m.isPending };
}

const stateText = (e: AlertEventPref) => (e.inApp && e.push ? t('App + Push') : e.inApp ? t('Sirf app') : e.push ? t('Sirf push') : t('Band'));

const toDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const toHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Sheet for one event: in-app, push and that event's own options. */
function EventSheet({ pref, prefs, onClose, save, disabled }: {
  pref: AlertEventPref | null; prefs: AlertPrefs; onClose: () => void; save: (p: AlertPrefsPatch) => void; disabled: boolean;
}) {
  const th = useTheme();
  const [minAmount, setMinAmount] = useState(String(prefs.saleMinAmount || ''));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setMinAmount(String(prefs.saleMinAmount || '')); }, [pref?.event]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!pref) return null;
  const meta = EVENT_META[pref.event];
  const set = (field: 'inApp' | 'push', v: boolean) => save({ events: { [pref.event]: { [field]: v } } });

  return (
    <Sheet open={!!pref} onClose={onClose} title={t(meta.label)}>
      <View style={{ gap: th.space(4), paddingBottom: th.space(4) }}>
        <Text size="sm" tone="muted">{t(meta.desc)}</Text>
        <Switch label={t('App me (ghanti)')} description={t('Notifications ki list me aaye')} value={pref.inApp} onChange={(v) => set('inApp', v)} disabled={disabled} />
        <Switch label={t('Phone par push')} description={t('Awaaz ke saath, app band ho tab bhi')} value={pref.push} onChange={(v) => set('push', v)} disabled={disabled} />
        {pref.event === 'sale' && (
          <>
            <View style={{ gap: th.space(2) }}>
              <Text size="sm" weight="semibold">{t('Sale ki push kab aaye')}</Text>
              <Segmented
                value={String(prefs.saleDigestMinutes)}
                onChange={(v) => save({ saleDigestMinutes: Number(v) })}
                options={prefs.digestChoices.map((n) => ({ value: String(n), label: n === 0 ? t('Har bill') : t('{{count}} min', { count: n }) }))}
              />
              <Text size="xs" tone="muted">{t('Masroof dukaan ke liye: har kuch minute me ek push, kitni Sale aur kitne ki.')}</Text>
            </View>
            <Input
              label={t('Sirf is se bare bill')} hint={t('0 = har bill')} ltr keyboardType="number-pad" prefix="Rs" value={minAmount} disabled={disabled}
              onChangeText={(v) => {
                const clean = v.replace(/[^0-9]/g, '');
                setMinAmount(clean);
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => save({ saleMinAmount: Number(clean || 0) }), 700);
              }}
            />
          </>
        )}
        {pref.event === 'bigDiscount' && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold">{t('Kitna Discount bara hai')}</Text>
            <Segmented
              value={String(prefs.discountPercent)}
              onChange={(v) => save({ discountPercent: Number(v) })}
              options={[5, 10, 20, 30, 50].map((n) => ({ value: String(n), label: `${n}%` }))}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}

/** Test push: makes sure this phone's token is saved, sends, and shows what really happened. */
function TestPush({ disabled }: { disabled: boolean }) {
  const th = useTheme();
  const [result, setResult] = useState<TestPushStatus | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const test = useMutation({
    mutationFn: async () => {
      const reg = await registerPushNow(true);
      if (reg === 'denied') throw new Error('denied');
      return notificationsApi.testPush();
    },
    onSuccess: (r) => { setResult(r.status); setCodes(r.errors ?? []); },
    onError: (e: Error) => {
      if (e.message === 'denied') toast.warning(t('Pehle is phone par notifications chalu karein.'));
      else toast.error(t('Test notification nahi gayi'));
    },
  });
  const shown = result ? TEST_TEXT[result] : null;
  return (
    <SettingsGroup title={t('Test notification')}>
      <ListRow icon={BellRing} title={t('Dekhein ke notifications pohnch rahi hain')}
        trailing={<Button size="sm" variant="secondary" loading={test.isPending} disabled={disabled} onPress={() => test.mutate()}>{t('Test bhejein')}</Button>} />
      {shown && (
        <View style={{ padding: th.space(3) }}>
          <Card tone={shown.tone}>
            <Text size="sm">{t(shown.text)}</Text>
            {/* The delivery code helps support find the cause (e.g. a wrong push key on the server). */}
            {(result === 'android-setup' || result === 'ios-setup' || result === 'failed') && codes.length > 0 && (
              <Text size="xs" tone="muted" ltr style={{ marginTop: th.space(1) }}>{t('Code: {{codes}}', { codes: codes.join(', ') })}</Text>
            )}
          </Card>
        </View>
      )}
    </SettingsGroup>
  );
}

export function AlertPrefsSections() {
  const th = useTheme();
  const online = useOnlineStatus();
  const { q, save } = useAlertPrefs();
  const [open, setOpen] = useState<AlertEvent | null>(null);
  const prefs = q.data;

  if (!prefs) {
    return q.isLoading ? <SkeletonRows count={6} /> : (
      <SettingsGroup title={t('Meri notifications')} footnote={t('Internet se judne par yahan aap ki choices dikhengi.')}>
        <ListRow icon={Bell} title={t('Dobara koshish karein')} chevron onPress={() => void q.refetch()} />
      </SettingsGroup>
    );
  }
  const current = prefs.events.find((e) => e.event === open) ?? null;
  const disabled = !online;

  return (
    <>
      <SettingsGroup title={t('Apne kaam ke alerts bhi')} footnote={t('Staff ke kaam ke alerts owner/manager ko jate hain. Apne kaam ke alerts ke liye neeche on karein.')}>
        <SettingSwitch label={t('Apne kaam ki khabar App me')} description={t('Aap ka khud ka Sale ya Expense bhi list me aaye')} value={prefs.ownActionsInApp} onChange={(v) => save({ ownActionsInApp: v })} disabled={disabled} />
        <SettingSwitch label={t('Apne kaam ki push')} description={t('Aap ka khud ka kaam ho to phone par bhi push aaye')} value={prefs.ownActionsPush} onChange={(v) => save({ ownActionsPush: v })} disabled={disabled} />
      </SettingsGroup>

      <TestPush disabled={disabled} />

      <SettingsGroup title={t('Kis baat ki khabar')} footnote={t('Sirf aap ke liye. Web aur app dono par yahi choices lagti hain.')}>
        {prefs.events.map((e) => {
          const meta = EVENT_META[e.event];
          return <ListRow key={e.event} icon={meta.icon} title={t(meta.label)} subtitle={e.event === 'sale' && prefs.saleDigestMinutes > 0 ? `${stateText(e)} · ${t('Push har {{count}} min ka khulasa hai', { count: prefs.saleDigestMinutes })}` : stateText(e)} chevron onPress={() => setOpen(e.event)} />;
        })}
      </SettingsGroup>

      <SettingsGroup title={t('Awaaz')} footnote={Platform.OS === 'android' ? t('Nayi awaazein app ke agle update ke baad milengi; tab tak phone ki apni awaaz.') : undefined}>
        {prefs.sounds.map((s: AlertSound) => (
          <ListRow
            key={s}
            title={toneLabel(s)}
            onPress={() => save({ sound: s })}
            trailing={(
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                {s !== 'silent' && (
                  <IconButton icon={Play} label={t('Suno')} size="sm" onPress={() => void previewTone(s, prefs.vibrate).then((ok) => { if (!ok) toast.warning(t('Pehle is phone par notifications chalu karein.')); })} />
                )}
                {prefs.sound === s ? <Icon icon={Check} color={th.colors.brand.text} /> : <View style={{ width: 20 }} />}
              </View>
            )}
          />
        ))}
        <SettingSwitch label={t('Vibration')} value={prefs.vibrate} onChange={(v) => save({ vibrate: v })} disabled={disabled} />
      </SettingsGroup>

      <SettingsGroup title={t('Khamosh waqt')} footnote={t('Is waqt push bina awaaz ke aati hai. Dukaan ke time zone ke mutabiq.')}>
        <SettingSwitch label={t('Raat ko khamosh')} description={t('{{start}} se {{end}} tak', { start: prefs.quietStart, end: prefs.quietEnd })} value={prefs.quietHours} onChange={(v) => save({ quietHours: v })} disabled={disabled} />
        {prefs.quietHours && (
          <View style={{ flexDirection: 'row', gap: th.space(3), padding: th.space(3) }}>
            <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Shuru')} value={toDate(prefs.quietStart)} onChange={(d) => save({ quietStart: toHHMM(d) })} disabled={disabled} /></View>
            <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Khatam')} value={toDate(prefs.quietEnd)} onChange={(d) => save({ quietEnd: toHHMM(d) })} disabled={disabled} /></View>
          </View>
        )}
      </SettingsGroup>

      <EventSheet pref={current} prefs={prefs} onClose={() => setOpen(null)} save={save} disabled={disabled} />
    </>
  );
}

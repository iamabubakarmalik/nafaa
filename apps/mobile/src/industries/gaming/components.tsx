/** The running-session card and the end-and-bill flow, shared by Cafe live and the counter's Stations tab. */

import { Pause, Play, ReceiptText, Square, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { clockText, liveBill, sessionTotal, type TimerSession } from '@nafaa/core/industries/gaming';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Button, Row, Text, confirm, toast, useTheme } from '@/design';
import { PaySheet, errorText } from '../_shared/deskKit';
import { FormSheet } from '../_shared/serviceKit';
import { gamingApi, type GamingSession } from './api';
import { refreshGaming, useNow } from './meta';

export const timerOf = (s: GamingSession): TimerSession => ({
  startedAt: new Date(s.startedAt).getTime(), totalPauseMinutes: s.totalPauseMinutes, pausedAt: s.pausedAt ? new Date(s.pausedAt).getTime() : null, paused: s.status === 'PAUSED',
  ratePerHour: s.ratePerHour, minimumMinutes: s.station?.minimumMinutes ?? 0,
});

export function SessionCard({ s, canManage, onEnd, onBill }: { s: GamingSession; canManage: boolean; onEnd: (s: GamingSession) => void; /** Puts the time so far on the counter bill (with snacks and cards). */ onBill?: (s: GamingSession) => void }) {
  const th = useTheme();
  const now = useNow();
  const live = liveBill(timerOf(s), now);
  const paused = s.status === 'PAUSED';
  const openPause = paused && s.pausedAt ? now - new Date(s.pausedAt).getTime() : 0;
  const seconds = Math.max((now - new Date(s.startedAt).getTime() - s.totalPauseMinutes * 60_000 - openPause) / 1000, 0);
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); refreshGaming(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  const cancel = async () => { if (await confirm({ title: t('Session cancel karein?'), message: t('Koi bill nahi banega.'), tone: 'danger', confirmLabel: t('Haan, cancel') })) await run(() => gamingApi.sessions.cancel(s.id, t('Cancel'))); };
  return (
    <View style={{ padding: th.space(3), gap: th.space(2), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
      <Row justify="between">
        <View style={{ flex: 1 }}>
          <Text weight="semibold" numberOfLines={1}>{s.station?.name ?? t('Station')}</Text>
          <Text size="xs" tone="muted" numberOfLines={1}>{s.customerName || s.sessionNumber}{s.gameSelected ? ` · ${s.gameSelected}` : ''}</Text>
        </View>
        <Badge tone={paused ? 'warning' : 'success'}>{paused ? t('Ruka hua') : t('Chal raha')}</Badge>
      </Row>
      <Row justify="between">
        <Text size="3xl" weight="bold" tabular ltr>{clockText(seconds)}</Text>
        <Amount value={live.currentAmount} size="xl" weight="bold" />
      </Row>
      <Text size="xs" tone="muted" ltr>{`${formatMoney(s.ratePerHour)}/${t('ghanta')}${live.pauseMinutes ? ` · ${t('{{n}} min ruka', { n: live.pauseMinutes })}` : ''}`}</Text>
      {canManage && (
        <Row gap={2}>
          <Button style={{ flex: 1 }} variant="secondary" icon={paused ? Play : Pause} onPress={() => void run(() => (paused ? gamingApi.sessions.resume(s.id) : gamingApi.sessions.pause(s.id)))}>{paused ? t('Resume') : t('Pause')}</Button>
          {onBill && <Button style={{ flex: 1 }} variant="soft" icon={ReceiptText} onPress={() => onBill(s)}>{t('Bill par')}</Button>}
          <Button style={{ flex: 1 }} icon={Square} onPress={() => onEnd(s)}>{t('Khatam + bill')}</Button>
          <Button variant="ghost" icon={XCircle} onPress={() => void cancel()}>{''}</Button>
        </Row>
      )}
    </View>
  );
}

/** Food and extras, then payment; the server closes the clock and posts the sale. */
export function EndSessionFlow({ s, onClose, onDone }: { s: GamingSession | null; onClose: () => void; onDone?: () => void }) {
  const [extras, setExtras] = useState<{ food: number; extra: number; discount: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const live = s ? liveBill(timerOf(s), now) : null;
  const tot = s && live && extras ? sessionTotal({ billableMinutes: live.billableMinutes, ratePerHour: s.ratePerHour, food: extras.food, extra: extras.extra, discount: extras.discount }) : null;
  const close = () => { setExtras(null); onClose(); };
  return (
    <>
      <FormSheet open={!!s && !extras} title={t('Khatam + bill')} description={s ? `${s.station?.name ?? ''} · ${live ? formatMoney(live.currentAmount) : ''}` : undefined} onClose={close} submitLabel={t('Aage')}
        fields={[{ key: 'food', label: t('Khana / peena'), kind: 'money' }, { key: 'extra', label: t('Aur charges'), kind: 'money' }, { key: 'discount', label: t('Discount'), kind: 'money' }]}
        onSubmit={async (v) => { setNow(Date.now()); const r = sessionTotal({ billableMinutes: liveBill(timerOf(s!), Date.now()).billableMinutes, ratePerHour: s!.ratePerHour, food: v.food ?? 0, extra: v.extra ?? 0, discount: v.discount ?? 0 }); if (!r) throw new Error(t('Discount bill se zyada hai')); setExtras({ food: v.food ?? 0, extra: v.extra ?? 0, discount: v.discount ?? 0 }); }} />
      <PaySheet open={!!s && !!extras} onClose={close} title={t('Payment')} name={s?.customerName || s?.station?.name || ''} due={tot?.total ?? 0} cta={t('Bill banayein')}
        onConfirm={async (p) => {
          await gamingApi.sessions.end(s!.id, { foodCharges: extras!.food || undefined, additionalCharges: extras!.extra || undefined, discount: extras!.discount || undefined, paidAmount: p.paidAmount, paymentMethod: p.paymentMethod });
          refreshGaming(true); toast.success(t('Session khatam, bill ban gaya')); setExtras(null); onDone?.(); onClose();
        }} />
    </>
  );
}

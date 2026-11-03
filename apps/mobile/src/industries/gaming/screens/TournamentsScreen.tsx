/** Tournaments (web GamingTournamentsPage): schedule, entry fee and prize pool; register players (entry fee billed), start, finish with the winner, cancel. */

import { Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Row, Sheet, confirm, toast } from '@/design';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { PaySheet, errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { gamingApi, type GamingTournament } from '../api';
import { GAMING_KEYS, TOURNAMENT_STATUS, dateOf, refreshGaming } from '../meta';


export function TournamentsScreen() {
  const manage = usePermission()(P.POS_USE);
  const { guard } = useDeskOnline('gamingDesk');
  const [form, setForm] = useState(false);
  const [open, setOpen] = useState<GamingTournament | null>(null);
  const [reg, setReg] = useState<{ name: string; phone: string } | null>(null);
  const [regForm, setRegForm] = useState(false);
  const [win, setWin] = useState(false);
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); refreshGaming(true); setOpen(null); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  const live = open && ['UPCOMING', 'REGISTRATION_OPEN', 'IN_PROGRESS'].includes(open.status);
  return (
    <DeskList<GamingTournament[]> title={t('Tournaments')} queryKey={[GAMING_KEYS.tournaments]} fetch={() => gamingApi.tournaments.list()} feature="gamingDesk" emptyIcon={Trophy} empty={t('Abhi koi tournament nahi')}
      rows={(list) => list.map((x) => ({
        id: x.id, icon: Trophy, tone: TOURNAMENT_STATUS[x.status]?.tone ?? 'neutral', search: `${x.name} ${x.gameName}`, title: x.name, subtitle: `${x.gameName} · ${dateOf(x.scheduledDate)} · ${x.currentParticipants}/${x.maxParticipants}`,
        trailing: <Badge tone={TOURNAMENT_STATUS[x.status]?.tone ?? 'neutral'}>{t(TOURNAMENT_STATUS[x.status]?.label ?? x.status)}</Badge>, onPress: () => setOpen(x),
      }))}
      fab={manage ? { label: t('New'), onPress: () => guard(() => setForm(true)) } : undefined}>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name} description={open ? `${open.gameName} · ${t('Entry')} ${formatMoney(open.entryFee)} · ${t('Inaam')} ${formatMoney(open.prizePool)}` : undefined}
        footer={open && manage && live ? (
          <Row gap={2}>
            {open.status !== 'IN_PROGRESS' && open.currentParticipants < open.maxParticipants && <Button style={{ flex: 1 }} onPress={() => guard(() => setRegForm(true))}>{t('Player jorein')}</Button>}
            {open.status !== 'IN_PROGRESS' && <Button style={{ flex: 1 }} variant="secondary" onPress={() => guard(() => void act(() => gamingApi.tournaments.start(open.id)))}>{t('Shuru')}</Button>}
            {open.status === 'IN_PROGRESS' && <Button style={{ flex: 1 }} onPress={() => guard(() => setWin(true))}>{t('Khatam')}</Button>}
            <Button variant="ghost" onPress={() => guard(() => void confirm({ title: t('Tournament cancel karein?'), tone: 'danger', confirmLabel: t('Haan') }).then(async (ok) => { if (ok) await act(() => gamingApi.tournaments.cancel(open.id, t('Cancel'))); }))}>{t('Cancel')}</Button>
          </Row>
        ) : undefined}>
        {open?.winnerName ? <Badge tone="success">{`${t('Jeetne wala')}: ${open.winnerName}`}</Badge> : null}
      </Sheet>
      <FormSheet open={form} title={t('New tournament')} onClose={() => setForm(false)}
        fields={[{ key: 'name', label: t('Naam'), required: true }, { key: 'gameName', label: t('Game'), required: true }, { key: 'platform', label: t('Platform'), required: true }, { key: 'scheduledDate', label: t('Din'), kind: 'date', required: true }, { key: 'maxParticipants', label: t('Kitne players'), kind: 'number', required: true }, { key: 'entryFee', label: t('Entry fee'), kind: 'money' }, { key: 'prizePool', label: t('Inaam'), kind: 'money' }]}
        initial={{ scheduledDate: todayKey(), maxParticipants: 16, platform: 'PC' }}
        onSubmit={async (v) => { await gamingApi.tournaments.create(clean({ ...v, scheduledDate: `${v.scheduledDate}T12:00:00+05:00`, entryFee: v.entryFee ?? 0, prizePool: v.prizePool ?? 0, firstPrize: v.prizePool ?? 0, secondPrize: 0, thirdPrize: 0 })); refreshGaming(); toast.success(t('Tournament ban gaya')); }} />
      <FormSheet open={regForm && !reg} title={t('Player jorein')} onClose={() => setRegForm(false)} submitLabel={open && open.entryFee > 0 ? t('Aage') : t('Jorein')}
        fields={[{ key: 'name', label: t('Naam'), required: true }, { key: 'phone', label: t('Phone'), kind: 'phone' }]}
        onSubmit={async (v) => { if (open && open.entryFee > 0) setReg({ name: v.name.trim(), phone: v.phone?.trim() ?? '' }); else { await gamingApi.tournaments.register(open!.id, clean({ name: v.name.trim(), phone: v.phone?.trim() }) as any); refreshGaming(true); toast.success(t('Player jur gaya')); } }} />
      <PaySheet open={!!reg} onClose={() => { setReg(null); setRegForm(false); }} title={t('Entry fee')} name={reg?.name ?? ''} due={open?.entryFee ?? 0} cta={t('Jorein')}
        onConfirm={async (p) => { await gamingApi.tournaments.register(open!.id, clean({ name: reg!.name, phone: reg!.phone, paidAmount: p.paidAmount, paymentMethod: p.paymentMethod }) as any); refreshGaming(true); toast.success(t('Player jur gaya')); setReg(null); setRegForm(false); }} />
      <FormSheet open={win} title={t('Natija')} onClose={() => setWin(false)} fields={[{ key: 'winner', label: t('Jeetne wala'), required: true }, { key: 'runnerUp', label: t('Doosra number') }]}
        onSubmit={async (v) => { await gamingApi.tournaments.complete(open!.id, v.winner.trim(), v.runnerUp?.trim() || undefined); refreshGaming(); setOpen(null); toast.success(t('Tournament khatam')); }} />
    </DeskList>
  );
}

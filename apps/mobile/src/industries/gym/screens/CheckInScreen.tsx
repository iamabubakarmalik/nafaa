/**
 * Gym check-in (web AttendancePage): type a member number, phone or name (or a
 * card code), see plan, days left and fee due, then check in; who is inside
 * now with check-out; guests. The desk warns about expired, frozen and unpaid.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { LogIn, LogOut, ScanLine, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { daysRemaining } from '@nafaa/core/industries/gym';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Scanner } from '@/core/hardware/scanner';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, DetailRow, IconButton, Input, ListRow, Row, Screen, SearchBar, Text, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { OfflineNote, errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { gymApi, type DeskLookup, type GymMember } from '../api';
import { GYM_KEYS, MEMBER_STATE, dateOf, memberName, refreshGym, timeOf } from '../meta';

export function CheckInScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('gymDesk');
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q.trim(), 200);
  const [desk, setDesk] = useState<DeskLookup | null>(null);
  const [guest, setGuest] = useState('');
  const [scan, setScan] = useState(false);
  const matches = useQuery({ queryKey: [GYM_KEYS.members, 'find', query], queryFn: () => gymApi.members.list({ search: query }), enabled: query.length >= 2 });
  const inside = useQuery({ queryKey: [GYM_KEYS.attendance, 'inside'], queryFn: () => gymApi.attendance.inside(), refetchInterval: 15_000 });
  const pick = async (m: GymMember) => {
    try { setDesk(await gymApi.attendance.lookup(m.memberNumber)); } catch (e) { toast.error(errorText(e, t('Member nahi mila'))); }
  };
  /** A scanned membership card or QR: the member number or card code. */
  const onScan = (code: string) => {
    setScan(false);
    gymApi.attendance.lookup(code.trim()).then((d) => { setDesk(d); setQ(code.trim()); }).catch((e) => toast.error(errorText(e, t('Member nahi mila'))));
    return true;
  };
  const doCheckIn = useMutation({
    mutationFn: (allowExpired: boolean) => gymApi.attendance.checkIn({ memberId: desk!.member.id, allowExpired }),
    onSuccess: (r) => { refreshGym(); toast.success(t('Check-in ho gaya'), { message: r.warnings[0] }); setDesk(null); setQ(''); },
    onError: (e) => toast.error(errorText(e, t('Check-in nahi hua'))),
  });
  const out = useMutation({ mutationFn: (id: string) => gymApi.attendance.checkOut(id), onSuccess: () => { refreshGym(); toast.success(t('Check-out ho gaya')); }, onError: (e) => toast.error(errorText(e, t('Nahi hua'))) });
  const addGuest = async () => {
    try { await gymApi.attendance.checkIn({ isGuest: true, guestName: guest.trim() }); refreshGym(); setGuest(''); toast.success(t('Guest check-in ho gaya')); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  const allow = async () => {
    if (!desk?.block) { doCheckIn.mutate(false); return; }
    if (await confirm({ title: desk.message ?? t('Membership theek nahi'), message: t('Phir bhi andar aane dein?'), confirmLabel: t('Haan, aane dein') })) doCheckIn.mutate(true);
  };
  return (
    <Screen title={t('Check-in')} onRefresh={() => void inside.refetch()} refreshing={inside.isRefetching}>
      <View style={{ gap: th.space(3) }}>
        <OfflineNote feature="gymDesk" />
        <Row gap={2}>
          <View style={{ flex: 1 }}><SearchBar value={q} onChangeText={(s) => { setQ(s); setDesk(null); }} placeholder={t('Member number, phone ya naam')} /></View>
          <IconButton icon={ScanLine} label={t('Card scan karein')} variant="soft" onPress={() => setScan(true)} />
        </Row>
        {scan && <Scanner title={t('Member card scan karein')} onCode={onScan} onClose={() => setScan(false)} />}
        {!desk && (matches.data ?? []).length > 0 && (
          <Card flush>{(matches.data ?? []).slice(0, 8).map((m, i, a) => <ListRow key={m.id} divider={i < a.length - 1} title={memberName(m)} subtitle={`${m.memberNumber}${m.customer?.phone ? ` · ${m.customer.phone}` : ''}`} chevron onPress={() => guard(() => void pick(m))} trailing={<Badge tone={MEMBER_STATE[m.state ?? 'NONE'].tone}>{t(MEMBER_STATE[m.state ?? 'NONE'].label)}</Badge>} />)}</Card>
        )}
        {desk && (
          <Card title={desk.member.customer?.name ?? desk.member.memberNumber}>
            <View style={{ gap: 4 }}>
              <DetailRow label={t('Member')} value={desk.member.memberNumber} />
              <DetailRow label={t('Plan')} value={desk.membership?.plan?.name ?? t('Plan nahi')} />
              {desk.membership && <DetailRow label={t('Muddat')} value={`${dateOf(desk.membership.endDate)} · ${t('{{n}} din', { n: daysRemaining(desk.membership.endDate.slice(0, 10), todayKey()) })}`} />}
              {desk.due > 0 && <DetailRow label={t('Fee baqi')} value={<Text tone="warning" ltr>{formatMoney(desk.due)}</Text>} />}
              {desk.warnings.map((w) => <Text key={w} size="sm" tone="warning">{w}</Text>)}
              {desk.message && <Text size="sm" tone="danger">{desk.message}</Text>}
              {desk.inside ? <Text size="sm" tone="muted">{t('Pehle se andar hai ({{time}} se)', { time: timeOf(desk.inside.checkInAt) })}</Text> : (
                <Button size="lg" icon={LogIn} loading={doCheckIn.isPending} onPress={() => guard(() => void allow())} variant={desk.block ? 'secondary' : 'primary'}>{t('Check-in')}</Button>
              )}
            </View>
          </Card>
        )}
        {can(P.CUSTOMERS_EDIT) && (
          <Row gap={2}>
            <View style={{ flex: 1 }}><Input value={guest} onChangeText={setGuest} placeholder={t('Guest ka naam')} /></View>
            <Button variant="secondary" icon={UserPlus} disabled={!guest.trim()} onPress={() => guard(() => void addGuest())}>{t('Guest')}</Button>
          </Row>
        )}
        <Card title={t('Abhi gym me ({{n}})', { n: inside.data?.length ?? 0 })} flush>
          {(inside.data ?? []).length === 0 && <View style={{ padding: th.space(4) }}><Text tone="muted" size="sm">{t('Abhi koi andar nahi')}</Text></View>}
          {(inside.data ?? []).map((a, i, arr) => (
            <ListRow key={a.id} divider={i < arr.length - 1} title={a.isGuest ? `${a.guestName ?? t('Guest')} (${t('Guest')})` : memberName(a.member)} subtitle={t('{{time}} se', { time: timeOf(a.checkInAt) })}
              trailing={<Button size="sm" variant="secondary" icon={LogOut} onPress={() => guard(() => out.mutate(a.id))}>{t('Check-out')}</Button>} />
          ))}
        </Card>
      </View>
    </Screen>
  );
}

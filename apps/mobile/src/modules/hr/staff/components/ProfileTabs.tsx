/**
 * The tabs of a staff profile. Each tab shows a short note instead of data
 * when the viewer lacks the permission that block needs.
 */

import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Activity, CheckCircle2, KeyRound, Laptop, Lock, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useShops } from '@/core/auth/useShops';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { BarChart, Button, Card, ChipGroup, DetailRow, DetailSection, Icon, Input, ListRow, ProgressBar, Row, StatTile, StatusPill, Text, confirm, toast, useTheme, Amount } from '@/design';
import { peopleApi, type AttendanceStatus, type Profile } from '../api/people';
import { useRefreshPeople } from '../lib/hooks';
import { ASSIGNABLE, ago, day, dayTime, deviceOf, roleLabel, salaryTypeOf, time, type AssignableRole } from '../lib/meta';
import { PermissionPicker } from './PermissionPicker';

const dayLabel = (k: string) => new Date(`${k}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthName = (k: string) => new Date(`${k}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const ATT: Record<AttendanceStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'accent' | 'info' }> = {
  PRESENT: { label: msg('Haazir'), tone: 'success' },
  LATE: { label: msg('Late'), tone: 'warning' },
  HALF_DAY: { label: msg('Aadha din'), tone: 'info' },
  ABSENT: { label: msg('Ghair haazir'), tone: 'danger' },
  ON_LEAVE: { label: msg('Chhutti'), tone: 'neutral' },
  HOLIDAY: { label: msg('Chhutti ka din'), tone: 'accent' },
};
const PAY_STATUS: Record<string, string> = { PAID: msg('Ada'), PARTIAL: msg('Kuch baqi'), PENDING: msg('Baqi'), CANCELLED: msg('Cancel') };
const LEAVE_STATUS: Record<string, string> = { APPROVED: msg('Approve'), REJECTED: msg('Na-approve'), PENDING: msg('Faisla baqi'), CANCELLED: msg('Cancel') };

function Note({ text }: { text: string }) {
  return <Card tone="muted"><Row gap={2} align="start"><Icon icon={Lock} size={16} tone="subtle" /><Text size="sm" tone="secondary" style={{ flex: 1 }}>{text}</Text></Row></Card>;
}
const Tiles = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
const tile = { flexGrow: 1, flexBasis: '30%' } as const;
const kv = (label: string, v?: string | number | null) => ({ label, v: v === null || v === undefined || v === '' ? '—' : String(v) });

// ───────────────────────── Overview ─────────────────────────
export function OverviewTab({ p }: { p: Profile }) {
  const th = useTheme();
  const s = p.staff;
  const docs = [
    s?.cnicFrontUrl && { url: s.cnicFrontUrl, title: t('CNIC saamne') },
    s?.cnicBackUrl && { url: s.cnicBackUrl, title: t('CNIC peeche') },
    ...(s?.documents ?? []).map((d) => ({ url: d.fileUrl, title: d.title })),
  ].filter(Boolean) as Array<{ url: string; title: string }>;
  const contact = [
    kv(t('Phone'), p.person.phone), kv(t('Doosra phone'), s?.altPhone), kv(t('Email'), p.person.email),
    kv(t('Pata'), [s?.address, s?.city].filter(Boolean).join(', ')), kv(t('CNIC'), s?.cnic),
    kv(t('Emergency'), s?.emergencyName ? `${s.emergencyName}${s.emergencyRelation ? ` (${s.emergencyRelation})` : ''} ${s.emergencyPhone ?? ''}` : null),
  ];
  const work = [
    kv(t('Kaam'), p.person.designation), kv(t('Shoba'), s?.department), kv(t('Staff no.'), p.person.staffNumber), kv(t('Joining'), day(p.person.joinDate)),
    ...(p.person.endDate ? [kv(t('Aakhri din'), day(p.person.endDate))] : []),
    kv(t('Branch'), p.person.shop?.name ?? t('Sab branches')),
    kv(t('Tankhwah'), s ? `${salaryTypeOf(s.salaryType).label}${s.salaryType !== 'COMMISSION' ? ` · ${formatMoney(s.baseSalary)}` : ''}` : null),
  ];
  return (
    <View style={{ gap: th.space(4) }}>
      {p.sales && (
        <Card title={t('Sale — pichle 30 din')} description={t('Is ke naam lagi sale, return ghata kar')}>
          <Tiles>
            <StatTile style={tile} label={t('Aaj')} value={<Amount value={p.sales.today.sales} weight="bold" />} hint={t('{{count}} bill', { count: p.sales.today.bills })} />
            <StatTile style={tile} label={t('Is mahine')} value={<Amount value={p.sales.month.sales} weight="bold" />} hint={t('{{count}} bill', { count: p.sales.month.bills })} />
            <StatTile style={tile} label={t('Aksar bill')} value={<Amount value={p.sales.avgBill} weight="bold" />} />
          </Tiles>
          <View style={{ marginTop: th.space(3) }}>
            <BarChart labels={p.sales.daily.map((d) => dayLabel(d.day))} series={[{ key: 'sales', label: t('Sale'), values: p.sales.daily.map((d) => d.sales) }]} format={(v) => formatMoney(v)} />
          </View>
        </Card>
      )}
      <DetailSection title={t('Rabta')}>
        {contact.map((r, i) => <DetailRow key={r.label} label={r.label} value={<Text size="sm" weight="semibold" ltr={['0', '@'].some((c) => r.v.includes(c)) || /^[\d-]+$/.test(r.v)} style={{ flexShrink: 1, textAlign: 'right' }}>{r.v}</Text>} last={i === contact.length - 1} />)}
      </DetailSection>
      <DetailSection title={t('Kaam')}>
        {work.map((r, i) => <DetailRow key={r.label} label={r.label} value={<Text size="sm" weight="semibold" style={{ flexShrink: 1 }}>{r.v}</Text>} last={i === work.length - 1} />)}
      </DetailSection>
      {!!s?.notes && <Card title={t('Note')}><Text size="sm">{s.notes}</Text></Card>}
      {!s && <Note text={t('Is login ka HR record nahi — tankhwah aur haazri ke liye "Edit" se kaam aur tankhwah bhar dein.')} />}
      {docs.length > 0 && (
        <Card title={t('Kaghazat')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }}>
            {docs.map((d) => (
              <View key={d.url} style={{ width: 112, gap: 4 }}>
                <Image source={{ uri: d.url }} style={{ width: 112, height: 80, borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted }} contentFit="cover" />
                <Text size="2xs" tone="muted" numberOfLines={1}>{d.title}</Text>
              </View>
            ))}
          </ScrollView>
        </Card>
      )}
    </View>
  );
}

// ───────────────────────── Permissions ─────────────────────────
export function PermissionsTab({ p }: { p: Profile }) {
  const th = useTheme();
  const refresh = useRefreshPeople();
  const login = p.login;
  const [perms, setPerms] = useState<string[]>(login?.permissions ?? []);
  // Reset only when the saved list really changes, so a background refetch keeps unsaved ticks.
  const savedKey = (login?.permissions ?? []).join(',');
  useEffect(() => { setPerms(savedKey ? savedKey.split(',') : []); }, [savedKey]);
  const save = useMutation({
    mutationFn: () => peopleApi.updatePermissions(login!.id, perms),
    onSuccess: () => { refresh(); toast.success(t('Permissions save — agli dafa app kholne par lagengi')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  if (!p.person.hasLogin) return <Note text={t('Is bande ka login nahi, is liye permission ka sawal nahi. Login dene ke liye upar "Login" dabayein.')} />;
  if (!login) return <Note text={t('Permission dekhne ke liye "Team dekhna" ki permission chahiye.')} />;
  if (login.role === 'OWNER' || login.role === 'SUPER_ADMIN') return <Note text={t('Malik ko har cheez ki permission hai — yahan kuch badalna nahi parta.')} />;
  const editable = p.viewer.owner;
  const original = login.permissions;
  const dirty = perms.length !== original.length || perms.some((x) => !original.includes(x));
  const role = (ASSIGNABLE.includes(login.role as AssignableRole) ? login.role : 'STAFF') as AssignableRole;
  return (
    <View style={{ gap: th.space(4) }}>
      <Card title={t('Kya kya kar sakta hai')}
        description={editable ? t('Role: {{label}}. Nishan lagayein ya hatayein, phir Save.', { label: roleLabel(role) }) : t('Sirf malik permission badal sakta hai')}>
        <PermissionPicker value={perms} onChange={editable ? setPerms : undefined} role={role} readOnly={!editable} />
        {editable && dirty && (
          <Row gap={2} style={{ marginTop: th.space(3) }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => setPerms(original)}>{t('Wapas')}</Button>
            <Button style={{ flex: 1 }} loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>
          </Row>
        )}
      </Card>
      {editable && <ApprovalPinCard userId={login.id} name={p.person.fullName} has={!!login.hasApprovalPin} perms={original} />}
    </View>
  );
}

/** Owner sets or removes this person's own approval PIN. */
function ApprovalPinCard({ userId, name, has, perms }: { userId: string; name: string; has: boolean; perms: string[] }) {
  const th = useTheme();
  const refresh = useRefreshPeople();
  const [pin, setPin] = useState('');
  const [open, setOpen] = useState(false);
  const save = useMutation({
    mutationFn: () => peopleApi.setApprovalPin(userId, pin),
    onSuccess: () => { refresh(); setPin(''); setOpen(false); toast.success(t('{{name}} ka PIN lag gaya', { name })); },
    onError: (e) => toast.error(apiErrorMessage(e, t('PIN nahi laga'))),
  });
  const clear = useMutation({
    mutationFn: () => peopleApi.clearApprovalPin(userId),
    onSuccess: () => { refresh(); toast.success(t('PIN hata diya')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('PIN nahi hata'))),
  });
  const can = [
    perms.includes('pos.discount_override') && t('bari discount'),
    perms.includes('khata.manage') && t('had se zyada udhaar'),
    perms.includes('sales.void') && t('bill void'),
    perms.includes('returns.create') && t('return / refund'),
  ].filter(Boolean) as string[];
  return (
    <Card title={t('Approval PIN')} description={t('Jahan malik ka PIN maanga jata hai, wahan is bande ka apna PIN bhi chal sakta hai — sirf un kaamon ke liye jin ki is ke paas permission hai.')}>
      <Text size="sm" tone="secondary">
        {has ? t('PIN laga hua hai.') : t('Abhi koi PIN nahi.')}{' '}
        {can.length ? `${t('Yeh PIN approve kar sakta hai:')} ${can.join(', ')}.` : t('Is ke paas abhi aisi koi permission nahi jo PIN se approve ho — upar permission dein.')}
      </Text>
      <Row gap={2} wrap style={{ marginTop: th.space(3) }}>
        <Button size="sm" variant={has ? 'secondary' : 'primary'} icon={KeyRound} onPress={() => setOpen((v) => !v)}>{has ? t('Badlein') : t('PIN lagayein')}</Button>
        {has && <Button size="sm" variant="ghost" loading={clear.isPending} onPress={() => clear.mutate()}>{t('Hatayein')}</Button>}
      </Row>
      {open && (
        <View style={{ marginTop: th.space(3), gap: th.space(2) }}>
          <Input label={t('Naya PIN (4 se 8 hindsay)')} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={8} ltr />
          <Button disabled={!/^\d{4,8}$/.test(pin)} loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>
          <Text size="xs" tone="muted">{t('Malik ke PIN ya kisi aur ke PIN jaisa nahi ho sakta. Har approval ka record banta hai ke kis ke PIN se hui.')}</Text>
        </View>
      )}
    </Card>
  );
}

// ───────────────────────── Branches ─────────────────────────
export function BranchesTab({ p }: { p: Profile }) {
  const th = useTheme();
  const refresh = useRefreshPeople();
  const shops = (useShops().data ?? []).filter((s) => s.isActive);
  const login = p.login;
  const isOwnerLogin = login?.role === 'OWNER' || login?.role === 'SUPER_ADMIN';
  const needsShop = login?.role === 'MANAGER' || login?.role === 'CASHIER';
  const [loginShop, setLoginShop] = useState(login?.shop?.id ?? '');
  const [hrShop, setHrShop] = useState(p.staff?.shopId ?? '');
  const saveLogin = useMutation({
    mutationFn: () => peopleApi.updateShop(login!.id, loginShop || null),
    onSuccess: () => { refresh(); toast.success(t('Login ki branch badal gayi')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi badli'))),
  });
  const saveHr = useMutation({
    mutationFn: () => peopleApi.updateStaff(p.staff!.id, { shopId: hrShop || undefined }),
    onSuccess: () => { refresh(); toast.success(t('HR record ki branch badal gayi')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi badli'))),
  });
  const opts = (all: boolean) => [...(all ? [{ value: '', label: t('Sab branches') }] : []), ...shops.map((s) => ({ value: s.id, label: s.isMain ? `${s.name} (${t('Main')})` : s.name }))];
  return (
    <View style={{ gap: th.space(4) }}>
      <Card title={t('Login ki branch')} description={t('App me kaunsi branch ka data khulta hai')}>
        {!p.person.hasLogin ? <Text size="sm" tone="muted">{t('Login nahi hai.')}</Text>
          : !login ? <Note text={t('Dekhne ke liye "Team dekhna" ki permission chahiye.')} />
            : isOwnerLogin ? <Text size="sm" tone="muted">{t('Malik har branch dekh sakta hai.')}</Text> : (
              <View style={{ gap: th.space(3) }}>
                <ChipGroup wrap value={loginShop} onChange={(v) => p.viewer.owner && setLoginShop(v)} options={opts(!needsShop)} />
                <Text size="xs" tone="muted">{needsShop ? t('{{label}} ko ek branch deni zaroori hai', { label: roleLabel(login.role) }) : t('Khali = har branch (jitni permission hai)')}</Text>
                {p.viewer.owner && <Button size="sm" loading={saveLogin.isPending} disabled={loginShop === (login.shop?.id ?? '') || (needsShop && !loginShop)} onPress={() => saveLogin.mutate()}>{t('Save')}</Button>}
              </View>
            )}
      </Card>
      <Card title={t('HR ki branch')} description={t('Haazri aur tankhwah kis branch ki hai')}>
        {!p.staff ? <Text size="sm" tone="muted">{t('HR record nahi hai.')}</Text> : (
          <View style={{ gap: th.space(3) }}>
            <ChipGroup wrap value={hrShop} onChange={(v) => p.viewer.manage && setHrShop(v)} options={opts(true)} />
            {p.viewer.manage && <Button size="sm" loading={saveHr.isPending} disabled={hrShop === (p.staff.shopId ?? '') || !hrShop} onPress={() => saveHr.mutate()}>{t('Save')}</Button>}
          </View>
        )}
      </Card>
      <Card title={t('Kahan sale ki — pichle 30 din')}>
        {!p.sales ? <Note text={t('Dekhne ke liye "Sale dekhna" ki permission chahiye.')} />
          : !p.sales.branches.length ? <Text size="sm" tone="muted">{t('Pichle 30 din me koi sale nahi.')}</Text> : (
            <View style={{ gap: th.space(3) }}>
              {p.sales.branches.map((b) => {
                const max = p.sales!.branches[0].sales || 1;
                return (
                  <View key={b.shopId ?? 'none'} style={{ gap: 4 }}>
                    <Row justify="between"><Text size="sm">{b.name}</Text><Text size="sm" weight="semibold" ltr>{t('{{sales}} · {{bills}} bill', { sales: formatMoney(b.sales), bills: b.bills })}</Text></Row>
                    <ProgressBar value={b.sales / max} />
                  </View>
                );
              })}
            </View>
          )}
      </Card>
    </View>
  );
}

// ───────────────────────── Attendance ─────────────────────────
export function AttendanceTab({ p }: { p: Profile }) {
  const th = useTheme();
  const a = p.attendance;
  if (!a) return <Note text={t('Haazri HR record par lagti hai. Is login ka HR record nahi — "Edit" se bana dein.')} />;
  return (
    <View style={{ gap: th.space(4) }}>
      <Tiles>
        <StatTile style={tile} tone="success" label={t('Haazir')} value={String(a.present)} hint={monthName(a.month)} />
        <StatTile style={tile} tone="warning" label={t('Late')} value={String(a.late)} hint={a.lateMinutes ? t('{{lateMinutes}} min kul', { lateMinutes: a.lateMinutes }) : undefined} />
        <StatTile style={tile} tone="info" label={t('Aadha din')} value={String(a.halfDay)} />
        <StatTile style={tile} tone="danger" label={t('Ghair haazir')} value={String(a.absent)} />
        <StatTile style={tile} tone="neutral" label={t('Chhutti')} value={String(a.leave)} />
        <StatTile style={tile} label={t('Ghante')} value={String(a.hours)} hint={a.overtime ? t('{{overtime}} overtime', { overtime: a.overtime }) : undefined} />
      </Tiles>
      <DetailSection title={t('Is mahine roz ka haal')} action={<Button size="sm" variant="link" onPress={() => router.push('/staff/attendance' as never)}>{t('Haazri ka safha')}</Button>}>
        {!a.days.length ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Is mahine abhi haazri nahi lagi.')}</Text></View> : (
          [...a.days].reverse().map((d, i, arr) => (
            <ListRow key={d.date} dense divider={i < arr.length - 1} title={dayLabel(d.date)}
              subtitle={d.checkIn ? `${time(d.checkIn)} – ${d.checkOut ? time(d.checkOut) : t('abhi')}` : undefined}
              trailing={<Row gap={2}>{!!d.workedHours && <Text size="xs" tone="muted" ltr>{t('{{workedHours}} ghante', { workedHours: d.workedHours })}</Text>}<StatusPill tone={ATT[d.status].tone}>{t(ATT[d.status].label)}</StatusPill></Row>} />
          ))
        )}
      </DetailSection>
      {a.leaves.length > 0 && (
        <DetailSection title={t('Chhuttiyan')}>
          {a.leaves.map((l, i) => (
            <ListRow key={l.id} dense divider={i < a.leaves.length - 1}
              title={t('{{startDate}} – {{endDate}} · {{days}} din', { startDate: day(l.startDate), endDate: day(l.endDate), days: l.days })}
              subtitle={l.reason ?? undefined}
              trailing={<StatusPill tone={l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'}>{t(LEAVE_STATUS[l.status] ?? l.status)}</StatusPill>} />
          ))}
        </DetailSection>
      )}
    </View>
  );
}

// ───────────────────────── Salary and commission ─────────────────────────
export function PayTab({ p }: { p: Profile }) {
  const th = useTheme();
  const s = p.salary;
  return (
    <View style={{ gap: th.space(4) }}>
      {!s ? <Note text={t('Tankhwah HR record par hoti hai. Is login ka HR record nahi — "Edit" se bana dein.')} /> : (
        <>
          <Tiles>
            <StatTile style={tile} label={t('Type')} value={salaryTypeOf(s.salaryType).label} />
            <StatTile style={tile} label={t('Tankhwah')} value={s.salaryType === 'COMMISSION' ? '—' : <Amount value={s.baseSalary} weight="bold" size="lg" />} hint={salaryTypeOf(s.salaryType).unit || undefined} />
            <StatTile style={tile} tone={s.unpaid > 0 ? 'danger' : 'success'} label={t('Baqi dena hai')} value={<Amount value={s.unpaid} weight="bold" size="lg" />} />
            <StatTile style={tile} label={t('Aakhri payment')} value={s.lastPaidAt ? day(s.lastPaidAt) : '—'} />
          </Tiles>
          <DetailSection title={t('Pichli tankhwahein')} action={<Button size="sm" variant="link" onPress={() => router.push('/staff/salary' as never)}>{t('Tankhwah ka safha')}</Button>}>
            {!s.payments.length ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi tankhwah nahi bani.')}</Text></View> : (
              s.payments.map((x, i) => (
                <ListRow key={x.id} dense divider={i < s.payments.length - 1} title={`${day(x.periodStart)} – ${day(x.periodEnd)}`} subtitle={x.paymentNumber}
                  trailing={(
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Amount value={x.netAmount} weight="semibold" size="sm" />
                      <StatusPill tone={x.status === 'PAID' ? 'success' : x.status === 'CANCELLED' ? 'neutral' : 'warning'}>{t(PAY_STATUS[x.status] ?? x.status)}</StatusPill>
                    </View>
                  )} />
              ))
            )}
          </DetailSection>
        </>
      )}
      <Card title={t('Commission')} action={<Button size="sm" variant="link" onPress={() => router.push('/staff/commission' as never)}>{t('Commission ka safha')}</Button>}>
        {!p.person.hasLogin ? <Text size="sm" tone="muted">{t('Commission login ki sale par banti hai — is bande ka login nahi.')}</Text>
          : !p.commission ? <Note text={t('Dekhne ke liye "Sab ki commission" ki permission chahiye.')} />
            : (
              <View style={{ gap: th.space(3) }}>
                <Row gap={2}>
                  <Icon icon={p.commission.enrolled ? CheckCircle2 : XCircle} size={16} tone={p.commission.enrolled ? 'success' : 'subtle'} />
                  <Text size="sm" tone={p.commission.enrolled ? 'success' : 'muted'}>{p.commission.enrolled ? `${t('Commission chalu hai')}${p.commission.since ? ` — ${t('{{since}} se', { since: day(p.commission.since) })}` : ''}` : t('Commission me shamil nahi')}</Text>
                </Row>
                {p.commission.payouts.map((x) => (
                  <Row key={x.period} justify="between"><Text size="sm">{monthName(x.period)}</Text><Amount value={x.amount} weight="semibold" size="sm" /></Row>
                ))}
              </View>
            )}
      </Card>
    </View>
  );
}

// ───────────────────────── Logins and devices ─────────────────────────
export function LoginsTab({ p, onResetPassword }: { p: Profile; onResetPassword: () => void }) {
  const th = useTheme();
  const refresh = useRefreshPeople();
  const login = p.login;
  const owner = p.viewer.owner && !!login && login.role !== 'OWNER' && !p.viewer.self;
  const out = useMutation({
    mutationFn: (sessionId?: string) => peopleApi.signOut(login!.id, sessionId),
    onSuccess: (r) => { refresh(); toast.success(r.sessionsClosed ? t('{{sessionsClosed}} device se logout', { sessionsClosed: r.sessionsClosed }) : t('Koi device khula nahi tha')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Logout nahi hua'))),
  });
  if (!p.person.hasLogin) return <Note text={t('Is bande ka login nahi.')} />;
  if (!login) return <Note text={t('Login history dekhne ke liye "Team dekhna" ki permission chahiye.')} />;
  const failed = p.logins.filter((l) => !l.success).length;
  return (
    <View style={{ gap: th.space(4) }}>
      <Tiles>
        <StatTile style={tile} tone={login.isActive ? 'success' : 'danger'} label={t('Login')} value={login.isActive ? t('Chalu') : t('Band')} />
        <StatTile style={tile} label={t('Aakhri login')} value={ago(login.lastLoginAt)} />
        <StatTile style={tile} label={t('Khule devices')} value={String(p.sessions.length)} />
        <StatTile style={tile} tone={failed ? 'danger' : 'neutral'} label={t('Ghalat koshishein')} value={String(failed)} hint={t('Pichli 30 koshishon me')} />
      </Tiles>
      <Text size="xs" tone="muted" ltr>{login.email}</Text>
      {owner && (
        <Row gap={2} wrap>
          <Button size="sm" variant="secondary" icon={KeyRound} onPress={onResetPassword}>{t('Naya password')}</Button>
          {p.sessions.length > 0 && (
            <Button size="sm" variant="danger" loading={out.isPending} onPress={async () => {
              if (await confirm({ title: t('{{fullName}} ko sab devices se logout karein?', { fullName: p.person.fullName }), tone: 'danger', confirmLabel: t('Haan, logout karein') })) out.mutate(undefined);
            }}>{t('Sab se logout')}</Button>
          )}
        </Row>
      )}
      <DetailSection title={t('Khule devices')}>
        {!p.sessions.length ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi kisi device par login nahi.')}</Text></View> : (
          p.sessions.map((s, i) => (
            <ListRow key={s.id} icon={Laptop} divider={i < p.sessions.length - 1} title={deviceOf(s.deviceName, s.userAgent)}
              subtitle={[s.location, s.ipAddress, t('aakhri istemal {{value}}', { value: ago(s.lastUsedAt) })].filter(Boolean).join(' · ')}
              trailing={owner ? <Button size="sm" variant="ghost" disabled={out.isPending} onPress={() => out.mutate(s.id)}>{t('Logout')}</Button> : undefined} />
          ))
        )}
      </DetailSection>
      <DetailSection title={t('Login history')}>
        {!p.logins.length ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi tak koi login nahi.')}</Text></View> : (
          p.logins.map((l, i) => (
            <ListRow key={l.id} dense divider={i < p.logins.length - 1} icon={l.success ? CheckCircle2 : XCircle} iconTone={l.success ? 'success' : 'danger'}
              title={dayTime(l.createdAt)} subtitle={[l.deviceName ?? t('Anjaan device'), l.location, l.ipAddress].filter(Boolean).join(' · ')}
              trailing={l.isNewDevice ? <StatusPill tone="info">{t('Naya device')}</StatusPill> : !l.success ? <Text size="xs" tone="danger">{l.failureReason ?? t('Ghalat password')}</Text> : undefined} />
          ))
        )}
      </DetailSection>
    </View>
  );
}

// ───────────────────────── Activity ─────────────────────────
export function ActivityTab({ p }: { p: Profile }) {
  const th = useTheme();
  if (!p.person.hasLogin) return <Note text={t('Activity login ke kaam se banti hai — is bande ka login nahi.')} />;
  if (!p.viewer.activity) return <Note text={t('Dekhne ke liye "Activity log" ki permission chahiye.')} />;
  return (
    <DetailSection title={t('Kya kiya')} action={<Button size="sm" variant="link" onPress={() => router.push('/activity-log' as never)}>{t('Poora log')}</Button>}>
      {!p.activity.length ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi kuch darj nahi.')}</Text></View> : (
        p.activity.map((a, i) => <ListRow key={a.id} dense icon={Activity} divider={i < p.activity.length - 1} title={a.description} subtitle={dayTime(a.createdAt)} />)
      )}
    </DetailSection>
  );
}

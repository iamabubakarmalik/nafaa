/**
 * Settings → Reports & daily summary: week and fiscal year, how reports open,
 * the khata profit basis, which figures staff may see, and the automatic daily
 * closing summary: time, channels, people, parts, preview and send now
 * (web ReportsSection). Each change saves at once and shows before the server answers.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Linking, View } from 'react-native';
import { useState } from 'react';
import { Send, Sunrise } from 'lucide-react-native';
import { router } from 'expo-router';
import { t } from '@/core/i18n';
import { usePermission, usePermissions, PERMISSIONS } from '@/core/permissions';
import { Avatar, Button, Card, Checkbox, Chip, DatePicker, ListRow, Segmented, Select, SettingLink, SettingSwitch, SettingsGroup, SettingsTemplate, Skeleton, Text, toast, useTheme } from '@/design';
import { reportsConfigApi, type ReportsConfig, type ReportsConfigPatch, type SummaryChannel, type SummaryPart } from '../api/settings';
import { clock, dateToTime, timeToDate } from '../lib/options';
import { useAutoSave, useSettings, useSettingsOnline } from '../hooks/useSettings';
import { ChoiceCards, Note, OfflineNote, SaveStatus, Section, ownerOnly } from '../components/SettingsParts';

const WEEK_STARTS = [
  { value: 'monday', label: t('Monday'), desc: t('Aam hisaab') },
  { value: 'saturday', label: t('Saturday'), desc: t('Kuch markets') },
  { value: 'sunday', label: t('Sunday'), desc: t('Itwaar se') },
] as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PERIODS = ['auto', 'today', 'yesterday', 'week', 'month', 'thisMonth', 'lastMonth', 'fiscalYear'] as const;
const PERIOD_LABEL: Record<string, string> = { auto: t('Har report ka apna'), today: t('Aaj'), yesterday: t('Kal'), week: t('7 din'), month: t('30 din'), thisMonth: t('Is mahine'), lastMonth: t('Pichhla mahina'), fiscalYear: t('Maali saal') };
const PARTS: Array<{ id: SummaryPart; label: string }> = [
  { id: 'returns', label: t('Return') }, { id: 'voids', label: t('Cancel bill') }, { id: 'discount', label: t('Discount') }, { id: 'payments', label: t('Paisa kaise aaya') },
  { id: 'drawer', label: t('Galla abhi aur farq') }, { id: 'profit', label: t('Profit') }, { id: 'expenses', label: t('Expenses') }, { id: 'khata', label: t('Udhaar diya / wapas aaya') },
  { id: 'lowStock', label: t('Kam stock') }, { id: 'topItems', label: t('Sab se zyada bika') }, { id: 'topStaff', label: t('Sab se zyada sale wala banda') },
  { id: 'branches', label: t('Branch war sale') }, { id: 'trend', label: t('Is hafte / is mahine') },
];
const QUICK_TIMES = ['20:00', '21:00', '22:00', '23:00'];
const toggleIn = <T,>(list: T[], item: T, on: boolean) => (on ? [...new Set([...list, item])] : list.filter((x) => x !== item));

function useReportSettings() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['reports-config'], queryFn: reportsConfigApi.get, staleTime: 60_000 });
  const save = useMutation({
    mutationFn: reportsConfigApi.update,
    onMutate: async (patch: ReportsConfigPatch) => {
      await qc.cancelQueries({ queryKey: ['reports-config'] });
      const before = qc.getQueryData<ReportsConfig>(['reports-config']);
      if (before) qc.setQueryData<ReportsConfig>(['reports-config'], { ...before, ...patch, summary: { ...before.summary, ...(patch.summary ?? {}) } } as ReportsConfig);
      return { before };
    },
    onError: (_e, _p, ctx) => { if (ctx?.before) qc.setQueryData(['reports-config'], ctx.before); toast.error(t('Save nahi hua')); },
    onSuccess: (next, patch) => {
      qc.setQueryData(['reports-config'], next);
      void qc.invalidateQueries({ queryKey: ['daily-summary'] });
      if (patch.creditProfit) void qc.invalidateQueries();
    },
  });
  return { cfg: query.data, loading: query.isLoading, save: (p: ReportsConfigPatch) => save.mutate(p), saving: save.isPending };
}

function ReportsConfigPage() {
  const th = useTheme();
  const online = useSettingsOnline();
  const { isOwner } = usePermissions();
  const can = usePermission();
  const canReports = can(PERMISSIONS.REPORTS_VIEW);
  const q = useSettings();
  const { draft: d, set, saving, dirty, failed } = useAutoSave(q.data?.settings);
  const rc = useReportSettings();
  const cfg = rc.cfg;
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['daily-summary', 'status', d?.dailySummaryTime, d?.notifyDailySummary], queryFn: reportsConfigApi.status, enabled: canReports && !dirty && online, staleTime: 30_000 });
  const st = status.data;
  const [which, setWhich] = useState<'today' | 'yesterday'>('today');
  const day = which === 'today' ? st?.today : st?.today ? shift(st.today, -1) : undefined;
  const preview = useQuery({ queryKey: ['daily-summary', 'preview', day], queryFn: () => reportsConfigApi.preview(day), enabled: canReports && online && (which === 'today' || !!day), staleTime: 60_000 });
  const send = useMutation({
    mutationFn: () => reportsConfigApi.send(day),
    onSuccess: (r) => { toast.success(r.sent ? t('{{sent}} logon ko bhej di', { sent: r.sent }) : t('Koi lene wala nahi mila')); void qc.invalidateQueries({ queryKey: ['daily-summary', 'status'] }); },
    onError: () => toast.error(t('Bhejna nahi hua')),
  });
  const off = !online;
  const time = d?.dailySummaryTime || '21:00';
  const on = !!d?.notifyDailySummary;
  const body = preview.data?.message.body ?? '';

  return (
    <SettingsTemplate title={t('Reports & daily summary')} description={t('Closing report ka waqt, log aur tareeqa')} loading={(!d || !cfg) && (q.isLoading || rc.loading)} error={!d && q.error} onRetry={q.refetch}
      actions={<SaveStatus saving={saving || rc.saving} dirty={dirty} failed={failed} />}>
      {off && <OfflineNote />}
      {d && cfg && (
        <>
          <SettingsGroup title={t('Report ka din aur hafta')} footnote={t('Har report, dashboard aur rozana hisaab inhi par chalta hai')}>
            <SettingLink icon={Sunrise} label={t('Din kab shuru hota hai')} value={`${d.businessDayStartHour ?? 0}:00`} description={`${d.timezone}`} onPress={() => router.push('/settings/localization' as never)} />
          </SettingsGroup>
          <Section title={t('Hafta kis din shuru hota hai')} description={t('Rozana report me "is hafte" ki sale isi din se gini jaati hai.')}>
            <ChoiceCards value={(d.firstDayOfWeek || 'monday').toLowerCase() as 'monday'} disabled={off} onChange={(v) => set('firstDayOfWeek', v, { now: true })} options={WEEK_STARTS.map((o) => ({ ...o }))} />
          </Section>

          <Section title={t('Report kaise khulein')} description={t('Har report pehli dafa kis period aur muqable ke saath khule')}>
            <Select label={t('Maali saal kis mahine se shuru hota hai')} hint={t('Pakistan me tax ka saal July se shuru hota hai.')} value={String(cfg.fiscalYearStartMonth)} disabled={off}
              options={MONTHS.map((m, i) => ({ value: String(i + 1), label: t(m) }))} onChange={(v) => rc.save({ fiscalYearStartMonth: Number(v) })} />
            <Select label={t('Report kis period se khule')} hint={t('Safhe par period badlein to wohi chalti hai.')} value={cfg.defaultPeriod} disabled={off}
              options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABEL[p] }))} onChange={(v) => rc.save({ defaultPeriod: v })} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Muqabla')}</Text>
            <ChoiceCards value={cfg.compareDefault} disabled={off} onChange={(v) => rc.save({ compareDefault: v })}
              options={[{ value: 'prev', label: t('Pichli period'), desc: t('Itne hi din, is se pehle') }, { value: 'year', label: t('Pichla saal'), desc: t('Profit-loss me; baaki me pichli period') }, { value: 'off', label: t('Muqabla band'), desc: t('Report khud on kar sakti hai') }]} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Amount kaise dikhe')}</Text>
            <ChoiceCards value={cfg.roundOff} disabled={off} onChange={(v) => rc.save({ roundOff: v })}
              options={[{ value: 'paisa', label: t('Paise tak'), desc: 'Rs 1,234.50' }, { value: 'rupee', label: t('Poore rupay'), desc: 'Rs 1,235' }]} />
          </Section>

          <Section title={t('Udhaar ka profit kab ginein')} description={t('Khate (udhaar) par bike maal ka profit headline me kab aaye')}>
            <ChoiceCards value={cfg.creditProfit ?? 'paid'} disabled={off} onChange={(v) => rc.save({ creditProfit: v })}
              options={[{ value: 'paid', label: t('Paisa milne par (recommended)'), desc: t('Udhaar bill ka profit tab ginein jab customer paisa de') }, { value: 'bill', label: t('Bill bante hi'), desc: t('Udhaar bill ka poora profit bill ke din hi gin lein') }]} />
            <Note>{t('Dono figures hamesha saath dikhte hain: Haath mein aaya profit aur Udhaar mein profit. Kuch chhupta nahi.')}</Note>
          </Section>

          <SettingsGroup title={t('Staff ko kaun se figures dikhein')} footnote={isOwner ? t('Ye sirf dikhane ka usool hai — kisi ko nayi permission nahi deta. Malik ko hamesha sab dikhta hai.') : t('Sirf malik')}>
            <SettingSwitch label={t('Profit aur cost')} description={t('Profit, margin aur maal ki cost. Phir bhi sirf unhe jin ke paas "Cost aur profit dekhein" ki permission hai.')} value={cfg.staffFigures.includes('profit')} disabled={off || !isOwner} onChange={(v) => rc.save({ staffFigures: toggleIn(cfg.staffFigures, 'profit', v) })} />
            <SettingSwitch label={t('Galle ka hisaab')} description={t('Galle me kitna hona chahiye, kitna gina, kam/zyada aur cash in/out.')} value={cfg.staffFigures.includes('drawer')} disabled={off || !isOwner} onChange={(v) => rc.save({ staffFigures: toggleIn(cfg.staffFigures, 'drawer', v) })} />
          </SettingsGroup>

          <SettingsGroup title={t('Rozana closing report')} footnote={t('Har din ek dafa, chune hue waqt par. Jis din na sale hui na expense, us din nahi aati.')}>
            <SettingSwitch label={t('Rozana report bhejein')} value={on} disabled={off} onChange={(v) => set('notifyDailySummary', v, { now: true })} />
          </SettingsGroup>
          {on && (
            <Section title={t('Kis waqt bhejein')} description={t('Dukaan ke time zone ke mutabiq.')}>
              <DatePicker mode="time" value={timeToDate(time)} onChange={(v) => set('dailySummaryTime', dateToTime(v), { now: true })} disabled={off} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
                {QUICK_TIMES.map((x) => <Chip key={x} label={clock(x)} selected={time === x} disabled={off} onPress={() => set('dailySummaryTime', x, { now: true })} />)}
              </View>
              {st?.nextRunAt && !dirty && <Text size="xs" tone="muted">{t('Agli report: {{when}}', { when: new Date(st.nextRunAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: st.timezone }) })}</Text>}
            </Section>
          )}
          {on && (
            <SettingsGroup title={t('Kahan milti hai')}>
              <SettingSwitch label={t('App notification')} description={t('Hamesha jaati hai — ghanti me aur mobile app par push.')} value disabled onChange={() => undefined} />
              <SettingSwitch label={t('Email')} description={t('Har chune hue bande ki tasdeeq shuda email par.')} value={cfg.summary.channels.includes('email')} disabled={off} onChange={(v) => rc.save({ summary: { channels: toggleIn<SummaryChannel>(cfg.summary.channels, 'email', v) } })} />
              <SettingSwitch label={t('WhatsApp')} description={t('App notification me \'WhatsApp par bhejein\' ka button aata hai. Bhejna aap ke haath me.')} value={cfg.summary.channels.includes('whatsapp')} disabled={off} onChange={(v) => rc.save({ summary: { channels: toggleIn<SummaryChannel>(cfg.summary.channels, 'whatsapp', v) } })} />
            </SettingsGroup>
          )}

          {canReports && (
            <Card title={t('Kis ko milti hai')} description={t('Malik, aur har woh banda jis ke paas \'Reports dekhna\' ki permission hai')}>
              {status.isLoading ? <Skeleton height={44} /> : (
                <RecipientList cfg={cfg} people={st?.recipients ?? []} disabled={off} onSave={rc.save} />
              )}
            </Card>
          )}

          <Section title={t('Report me kya ho')} description={t('Sale aur bill hamesha; baaki jo aap chunein')}>
            {PARTS.map((p) => (
              <Checkbox key={p.id} label={p.label} value={cfg.summary.include.includes(p.id)} disabled={off}
                onChange={(v) => rc.save({ summary: { include: toggleIn(cfg.summary.include, p.id, v) } })} />
            ))}
          </Section>

          {canReports && (
            <Section title={t('Preview aur abhi bhejein')} description={t('Aap ki branch ka hisaab, bilkul waisa jaisa notification me jata hai')}>
              <Segmented value={which} onChange={setWhich} options={[{ value: 'today', label: t('Aaj') }, { value: 'yesterday', label: t('Kal') }]} />
              {preview.isLoading ? <Skeleton height={120} /> : body ? (
                <>
                  <View style={{ backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('lg'), padding: th.space(3) }}><Text size="sm">{body}</Text></View>
                  <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                    <Button icon={Send} style={{ flex: 1 }} loading={send.isPending} disabled={off} onPress={() => send.mutate()}>{t('Abhi sab ko bhejein')}</Button>
                    <Button variant="success" onPress={() => void Linking.openURL(`https://wa.me/${(d.shopWhatsapp || d.shopPhone || '').replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(body)}`)}>{t('WhatsApp')}</Button>
                  </View>
                </>
              ) : <Text size="sm" tone="muted">{t('Preview nahi bana. Thori der baad dobara kholein.')}</Text>}
              {(st?.recent ?? []).slice(0, 5).map((r, i) => (
                <ListRow key={i} title={t('{{day}} ka hisaab', { day: r.day })} subtitle={r.auto ? t('Khud gayi') : t('Haath se bheji')} trailing={<Text size="xs" tone="muted">{t('{{people}} log', { people: r.people })}</Text>} />
              ))}
            </Section>
          )}
        </>
      )}
    </SettingsTemplate>
  );
}

function shift(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function RecipientList({ cfg, people, disabled, onSave }: { cfg: ReportsConfig; people: Array<{ id: string; name: string; role: string; branch: string | null; hasEmail: boolean; seesProfit: boolean }>; disabled: boolean; onSave: (p: ReportsConfigPatch) => void }) {
  const th = useTheme();
  const everyone = cfg.summary.recipientIds === null;
  const chosen = new Set(cfg.summary.recipientIds ?? people.map((p) => p.id));
  return (
    <View style={{ gap: th.space(2) }}>
      <SettingSwitch label={t('Sab ko bhejein')} description={t('Chalu ho to aage jo bhi \'Reports dekhna\' ki permission paye, usay bhi khud milne lagegi.')} value={everyone} disabled={disabled}
        onChange={(v) => onSave({ summary: { recipientIds: v ? null : people.map((p) => p.id) } })} />
      {people.map((p) => (
        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
          <Checkbox value={everyone || chosen.has(p.id)} disabled={disabled || everyone} onChange={(v) => onSave({ summary: { recipientIds: people.map((x) => x.id).filter((id) => (id === p.id ? v : chosen.has(id))) } })} />
          <Avatar name={p.name} size={32} />
          <View style={{ flex: 1 }}>
            <Text size="sm" weight="semibold" numberOfLines={1}>{p.name}</Text>
            <Text size="xs" tone="muted">{`${p.role} · ${p.branch ? p.branch : t('Sab branches')}`}</Text>
          </View>
          <Text size="xs" tone={p.seesProfit ? 'success' : 'muted'}>{p.seesProfit ? t('Profit bhi') : t('Profit nahi')}</Text>
        </View>
      ))}
    </View>
  );
}

export const ReportsConfigScreen = ownerOnly(ReportsConfigPage, 'Reports & daily summary');
